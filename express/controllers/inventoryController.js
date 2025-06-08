const Ingredient = require("../models/Ingredient");
const InventorySnapshot = require("../models/InventorySnapshot");
const moment = require("moment");
const POSTNAME = {
  1: "搅拌",
  2: "丹麦",
  3: "整形",
  4: "烤炉",
  5: "冷加工",
  6: "收银打包",
  7: "水吧",
  8: "馅料",
  9: "小库房",
  10: "收货入库",
};
// @desc    提交指定岗位的物料盘点数据
// @route   POST /api/inventory/submit
// @access  Private (需要权限验证，例如确认是组长)
const submitStockByPost = async (req, res) => {
  const { postId, stocks } = req.body; // stocks is an array: [{ ingredientId, quantity, unit }, ...]

  if (!postId || !POSTNAME[postId]) {
    return res.status(400).json({ success: false, message: "无效的岗位ID。" });
  }

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "盘点数据不能为空。" });
  }

  const operations = [];
  const errors = [];
  let successCount = 0;

  for (const item of stocks) {
    if (
      !item.ingredientId ||
      typeof item.quantity !== "number" ||
      item.quantity < 0 ||
      !item.unit
    ) {
      errors.push(
        `物料 ${
          item.ingredientName || item.ingredientId
        } 的盘点数据无效 (数量或单位缺失/错误)。`
      );
      continue;
    }

    operations.push(
      Ingredient.findById(item.ingredientId)
        .then((ingredient) => {
          if (!ingredient) {
            errors.push(
              `未找到物料: ${item.ingredientName || item.ingredientId} (ID: ${
                item.ingredientId
              })。`
            );
            return null;
          }

          ingredient.stockByPost.set(String(postId), {
            quantity: item.quantity,
            unit: item.unit,
            lastUpdated: new Date(),
          });

          ingredient.markModified("stockByPost");
          return ingredient.save();
        })
        .then((savedDoc) => {
          if (savedDoc) successCount++;
        })
        .catch((err) => {
          console.error(`处理物料 ${item.ingredientId} 盘点时出错: `, err);
          errors.push(
            `物料 ${item.ingredientName || item.ingredientId} 更新失败: ${
              err.message
            }`
          );
        })
    );
  }

  try {
    await Promise.all(operations);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `部分物料盘点处理失败。成功 ${successCount} 项。请查看错误详情。`,
        errors,
      });
    }

    res.json({
      success: true,
      message: `岗位 ${POSTNAME[postId]} 的 ${successCount} 项物料盘点数据已成功提交。`,
    });
  } catch (globalError) {
    console.error("提交盘点数据时发生意外全局错误:", globalError);
    res
      .status(500)
      .json({
        success: false,
        message: "服务器在处理盘点提交时发生意外错误。",
      });
  }
};

// @desc    创建当前库存的快照
// @route   POST /api/inventory/snapshot
// @access  Private
const createInventorySnapshot = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({});

    let grandTotalValue = 0;
    const snapshotIngredients = ingredients.map((ing) => {
      let totalStock = 0;
      if (ing.stockByPost && typeof ing.stockByPost.values === "function") {
        for (const stock of ing.stockByPost.values()) {
          totalStock += stock.quantity || 0;
        }
      }

      const ingredientValue = totalStock * (ing.price || 0);
      grandTotalValue += ingredientValue;

      // Only store the ID and the stock data, not the rest of the ingredient info
      return {
        ingredientId: ing._id,
        stockByPost: ing.stockByPost,
      };
    });

    const year = moment().year();
    const weekOfYear = moment().week();

    const snapshot = new InventorySnapshot({
      totalValue: grandTotalValue,
      ingredients: snapshotIngredients,
      year: year,
      weekOfYear: weekOfYear,
    });

    await snapshot.save();

    // After successfully saving the snapshot, clear the stock data for all ingredients
    await Ingredient.updateMany({}, { $set: { stockByPost: {} } });

    res.status(201).json({
      success: true,
      message: `成功创建库存快照，并已清空现有库存以便开始新的盘点。`,
      data: snapshot,
    });
  } catch (error) {
    console.error("创建库存快照失败:", error);
    res
      .status(500)
      .json({ success: false, message: `服务器错误: ${error.message}` });
  }
};

// @desc    获取所有库存快照的列表
// @route   GET /api/inventory/snapshots
// @access  Private
const listSnapshots = async (req, res) => {
  try {
    const snapshots = await InventorySnapshot.find({})
      .sort({ year: -1, weekOfYear: -1 })
      .select("year weekOfYear createdAt");

    res.json({ success: true, data: snapshots });
  } catch (error) {
    console.error("获取快照列表失败:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
};

// @desc    获取单个库存快照的详细信息
// @route   GET /api/inventory/snapshots/:id
// @access  Private
const getSnapshotDetails = async (req, res) => {
  try {
    const snapshot = await InventorySnapshot.findById(req.params.id);

    if (!snapshot) {
      return res.status(404).json({ success: false, message: "快照未找到" });
    }

    // 获取所有相关的原料信息
    const ingredientIds = snapshot.ingredients.map((item) => item.ingredientId);
    const ingredientsData = await Ingredient.find({
      _id: { $in: ingredientIds },
    });
    const ingredientsMap = new Map(
      ingredientsData.map((ing) => [ing._id.toString(), ing])
    );

    const populatedIngredients = snapshot.ingredients.map((item) => {
      const ingredientDetails = ingredientsMap.get(
        item.ingredientId.toString()
      );
      if (!ingredientDetails) {
        return {
          _id: item.ingredientId,
          name: "（已删除或未知的原料）",
          unit: "-",
          price: 0,
          post: [],
          specs: "",
          norms: 0,
          baseUnit: "",
          stockByPost: item.stockByPost,
        };
      }
      return {
        ...ingredientDetails.toObject(),
        stockByPost: item.stockByPost, // 使用快照中的库存数据
      };
    });

    const responseData = {
      _id: snapshot._id,
      year: snapshot.year,
      weekOfYear: snapshot.weekOfYear,
      createdAt: snapshot.createdAt,
      totalValue: snapshot.totalValue,
      ingredients: populatedIngredients,
    };

    res.json({ success: true, data: responseData });
  } catch (error) {
    console.error("获取快照详情失败:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
};

// @desc    从快照还原库存
// @route   POST /api/inventory/restore/:id
// @access  Private
const restoreInventoryFromSnapshot = async (req, res) => {
  const { id } = req.params;
  try {
    const snapshot = await InventorySnapshot.findById(id);
    if (!snapshot) {
      return res.status(404).json({ success: false, message: "快照未找到" });
    }

    // Step 1: Clear all current stock data
    await Ingredient.updateMany({}, { $set: { stockByPost: {} } });

    // Step 2: Restore stock data from the snapshot
    const restorePromises = snapshot.ingredients.map((item) => {
      return Ingredient.findByIdAndUpdate(item.ingredientId, {
        $set: { stockByPost: item.stockByPost },
      });
    });

    await Promise.all(restorePromises);

    res.json({
      success: true,
      message: `库存已成功从 ${moment(snapshot.createdAt).format(
        "YYYY-MM-DD"
      )} 的快照中还原。`,
    });
  } catch (error) {
    console.error("从快照还原库存失败:", error);
    res
      .status(500)
      .json({ success: false, message: `服务器错误: ${error.message}` });
  }
};

// @desc    获取当前所有原料的库存状态
// @route   GET /api/inventory/state
// @access  Private
const getInventoryState = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({}).lean();
    const inventoryState = ingredients.map(ing => ({
      ingredientId: ing._id, // lean() so it's ing._id, not ing.id
      stockByPost: ing.stockByPost,
    }));
    res.json({ success: true, data: inventoryState });
  } catch (error) {
    console.error("获取库存状态失败:", error);
    res.status(500).json({ success: false, message: "服务器错误" });
  }
};

module.exports = {
  submitStockByPost,
  createInventorySnapshot,
  listSnapshots,
  getSnapshotDetails,
  restoreInventoryFromSnapshot,
  getInventoryState,
};
