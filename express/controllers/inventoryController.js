const Ingredient = require("../models/Ingredient");
const StoreInventory = require('../models/StoreInventory'); // 新增
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
const XLSX = require("xlsx");
// @desc    提交指定岗位的物料盘点数据
// @route   POST /api/inventory/submit
// @access  Private (需要权限验证，例如确认是组长)
const submitStockByPost = async (req, res) => {
  const { postId, stocks } = req.body; // stocks is an array: [{ ingredientId, quantity, unit }, ...]
  const { currentStoreId } = req.user; // 从模拟认证中间件获取门店ID

  if (!currentStoreId) {
    return res.status(400).json({ success: false, message: "未指定当前操作的门店。" });
  }

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
      (async () => {
        try {
          // 查找或创建特定门店、特定原料的库存记录
          const inventory = await StoreInventory.findOneAndUpdate(
            { storeId: currentStoreId, ingredientId: item.ingredientId },
            { $set: { 
                [`stockByPost.${postId}`]: {
                  quantity: item.quantity,
                  unit: item.unit,
                  lastUpdated: new Date(),
                } 
              } 
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
          );

          if (inventory) {
            successCount++;
          } else {
            // 这个分支理论上在 upsert:true 的情况下不会发生
            errors.push(`物料 ${item.ingredientName || item.ingredientId} 的库存记录更新失败。`);
          }
        } catch (err) {
          console.error(`处理物料 ${item.ingredientId} 盘点时出错: `, err);
          errors.push(`物料 ${item.ingredientName || item.ingredientId} 更新失败: ${err.message}`);
        }
      })()
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
    const { notes, clearData } = req.body;
    const { currentStoreId } = req.user;

    const now = moment();
    const year = now.year();
    const weekOfYear = now.week();

    // 1. 获取当前门店的所有库存记录，并关联查询原料信息
    const storeInventories = await StoreInventory.find({ storeId: currentStoreId })
      .populate('ingredientId', 'name unit price norms'); // 查询关联的原料信息

    let grandTotalValue = 0;
    const snapshotIngredients = storeInventories.map((inv) => {
      const { ingredientId: ing, stockByPost } = inv;
      if (!ing) return null; // 如果原料被删除，则跳过

      let totalStock = 0;
      if (stockByPost && stockByPost.size > 0) {
        for (const stock of stockByPost.values()) {
          totalStock += stock.quantity || 0;
        }
      }

      const pricePerBaseUnit = (ing.price && ing.norms) ? (ing.price / ing.norms) : 0;
      const ingredientValue = totalStock * pricePerBaseUnit;
      grandTotalValue += ingredientValue;

      return {
        ingredientId: ing._id,
        // 注意：这里不再保存name和unit，因为快照详情查询时会重新populate
        stockByPost: stockByPost,
      };
    }).filter(Boolean); // 过滤掉为null的项

    const snapshot = new InventorySnapshot({
      storeId: currentStoreId, // 关联门店ID
      year,
      weekOfYear,
      notes: notes || '',
      totalValue: grandTotalValue,
      ingredients: snapshotIngredients,
    });

    await snapshot.save();
    
    let message = `成功为门店创建库存快照。`;

    if (clearData === true) {
      // 2. 如果需要，清空当前门店的库存数据
      await StoreInventory.deleteMany({ storeId: currentStoreId });
      message += ' 已清空当前门店的库存以便开始新的盘点。';
    }

    res.status(201).json({
      success: true,
      message: message,
      data: snapshot,
    });
  } catch (error) {
    console.error("创建库存快照失败:", error);
    res.status(500).json({ success: false, message: `服务器错误: ${error.message}` });
  }
};

// @desc    获取所有库存快照的列表
// @route   GET /api/inventory/snapshots
// @access  Private
const listSnapshots = async (req, res) => {
  const { currentStoreId } = req.user;
  try {
    const snapshots = await InventorySnapshot.find({ storeId: currentStoreId }) // 按门店查询
      .sort({ createdAt: -1 })
      .select("createdAt notes totalValue year weekOfYear");

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
  const { currentStoreId } = req.user;
  try {
    const snapshot = await InventorySnapshot.findById(req.params.id);

    if (!snapshot || snapshot.storeId.toString() !== currentStoreId) { // 验证门店归属
      return res.status(404).json({ success: false, message: "快照未找到或不属于当前门店" });
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
      createdAt: snapshot.createdAt,
      totalValue: snapshot.totalValue,
      notes: snapshot.notes,
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
  const { currentStoreId } = req.user;
  try {
    const snapshot = await InventorySnapshot.findById(id);
    if (!snapshot || snapshot.storeId.toString() !== currentStoreId) { // 验证门店归属
      return res.status(404).json({ success: false, message: "快照未找到或不属于当前门店" });
    }

    // 1. 清空当前门店的所有库存
    await StoreInventory.deleteMany({ storeId: currentStoreId });

    // 2. 从快照还原库存到当前门店
    const restorePromises = snapshot.ingredients.map((item) => {
      // 使用 findOneAndUpdate 和 upsert:true 更安全
      return StoreInventory.findOneAndUpdate(
        { storeId: currentStoreId, ingredientId: item.ingredientId },
        { stockByPost: item.stockByPost },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
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

// @desc    导出最新库存快照为Excel
// @route   GET /api/inventory/export
// @access  Private
const exportInventoryExcel = async (req, res) => {
  try {
    // 获取最新快照
    const snapshot = await InventorySnapshot.findOne({}).sort({ createdAt: -1 });
    if (!snapshot) {
      return res.status(404).json({ success: false, message: "没有库存快照可导出" });
    }
    // 获取所有相关原料信息
    const ingredientIds = snapshot.ingredients.map((item) => item.ingredientId);
    const ingredientsData = await Ingredient.find({ _id: { $in: ingredientIds } });
    const ingredientsMap = new Map(ingredientsData.map((ing) => [ing._id.toString(), ing]));

    // 组织Excel数据
    const rows = [];
    // 表头
    rows.push([
      "原料名称", "单位", "规格", "岗位", "数量", "盘点单位", "最后更新时间"
    ]);
    for (const item of snapshot.ingredients) {
      const ingredient = ingredientsMap.get(item.ingredientId.toString());
      const name = ingredient ? ingredient.name : "未知原料";
      const unit = ingredient ? ingredient.unit : "-";
      const specs = ingredient ? ingredient.specs : "-";
      if (item.stockByPost) {
        for (const [post, stock] of item.stockByPost.entries()) {
          rows.push([
            name,
            unit,
            specs,
            post,
            stock.quantity,
            stock.unit,
            stock.lastUpdated ? moment(stock.lastUpdated).format("YYYY-MM-DD HH:mm:ss") : "-"
          ]);
        }
      } else {
        rows.push([name, unit, specs, "-", "-", "-", "-"]);
      }
    }
    // 创建工作表和工作簿
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "库存快照");
    // 写入buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    // 设置响应头
    res.setHeader("Content-Disposition", `attachment; filename=inventory_snapshot_${moment(snapshot.createdAt).format("YYYYMMDD_HHmmss")}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (error) {
    console.error("导出库存快照为Excel失败:", error);
    res.status(500).json({ success: false, message: "服务器错误，导出失败" });
  }
};

// @desc    导出实时库存为Excel
// @route   GET /api/inventory/export-realtime
// @access  Private
const exportInventoryRealtimeExcel = async (req, res) => {
  try {
    // 使用流式处理避免内存过大
    const batchSize = 100;  // 每批处理数量
    
    // 表头初始化
    const header = ["原料名称", "采购单位", "规格", "总库存"];
    const rows = [header];
    
    // 获取所有原料并按批次处理
    let batchCount = 0;
    let totalStocks = {};
    
    while (true) {
      const ingredients = await Ingredient.find({})
        .skip(batchCount * batchSize)
        .limit(batchSize)
        .lean();
        
      if (ingredients.length === 0) break;
      
      // 首次循环时确定所有岗位
      if (batchCount === 0) {
        const allPosts = new Set();
        for (const ing of ingredients) {
          if (ing.stockByPost && typeof ing.stockByPost === 'object') {
            // 使用Object.keys代替Map.keys
            for (const post of Object.keys(ing.stockByPost)) {
              allPosts.add(post);
            }
          }
        }
        // 排序后的岗位列表
        const sortedPosts = Array.from(allPosts).sort((a, b) => a - b);
        // 完成表头
        header.push(...sortedPosts.map(p => `岗位${p}库存`));
        // 初始化总库存统计
        for (const post of sortedPosts) {
          totalStocks[post] = 0;
        }
        
        // 添加总库存统计
        for (const ing of ingredients) {
          if (ing.stockByPost && typeof ing.stockByPost === 'object') {
            // 使用Object.entries同时获取键和值
            for (const [post, stock] of Object.entries(ing.stockByPost)) {
              if (!totalStocks[post]) {
                totalStocks[post] = 0;
              }
              totalStocks[post] += stock.quantity || 0;
            }
          }
        }
      }
      
      // 处理当前批次的数据
      for (const ing of ingredients) {
        let total = 0;
        const postStocks = [];
        
        // 收集所有岗位的库存数据
        for (const post of Object.keys(totalStocks)) {
          let qty = 0;
          if (ing.stockByPost && typeof ing.stockByPost === 'object' && ing.stockByPost.hasOwnProperty(post)) {
            qty = ing.stockByPost[post].quantity || 0;
          }
          postStocks.push(qty);
          total += qty;
        }
        
        // 添加该原料到表格
        rows.push([
          ing.name,
          ing.unit,
          ing.specs || '',
          total,
          ...postStocks
        ]);
      }
      
      batchCount++;
    }
    
    // 添加总库存行
    if (Object.keys(totalStocks).length > 0) {
      const totalRow = ["总库存", "", "", ""];
      for (const post of Object.keys(totalStocks)) {
        totalRow.push(totalStocks[post] || 0);
      }
      rows.unshift(totalRow);  // 将总库存行放在第二行
    }
    
    // 添加总库存行
    if (Object.keys(totalStocks).length > 0) {
      const totalRow = ["总库存", "", "", ""];
      for (const post of Object.keys(totalStocks)) {
        totalRow.push(totalStocks[post] || 0);
      }
      rows.unshift(totalRow);  // 将总库存行放在第二行
    }

    // 创建工作表和工作簿
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "实时库存");
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 设置响应头
    res.setHeader("Content-Disposition", `attachment; filename=realtime_inventory_${moment().format("YYYYMMDD_HHmmss")}.xlsx`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
  } catch (error) {
    console.error("导出实时库存为Excel失败:", error);
    res.status(500).json({ success: false, message: "服务器错误，导出失败" });
  }
};

module.exports = {
  submitStockByPost,
  createInventorySnapshot,
  listSnapshots,
  getSnapshotDetails,
  restoreInventoryFromSnapshot,
  getInventoryState,
  exportInventoryExcel,
  exportInventoryRealtimeExcel,
};
