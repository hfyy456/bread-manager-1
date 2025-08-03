const Ingredient = require("../models/Ingredient");
const StoreInventory = require('../models/StoreInventory'); // 新增
const InventorySnapshot = require("../models/InventorySnapshot");
const Store = require('../models/Store');
const { format, getYear, getWeek, startOfWeek } = require('date-fns');
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

// 辅助函数：获取门店名称用于文件名
const getStoreNameForFilename = async (storeId) => {
  try {
    const store = await Store.findById(storeId).select('name').lean();
    if (store && store.name) {
      // 清理门店名称，移除特殊字符以适合文件名
      return store.name.replace(/[<>:"/\\|?*]/g, '_');
    }
  } catch (error) {
    console.warn('获取门店名称失败，使用默认名称:', error.message);
  }
  return '未知门店';
};

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

    const now = new Date();
    const year = getYear(now);
    const weekOfYear = getWeek(now);

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
      message: `库存已成功从 ${format(snapshot.createdAt, 'yyyy-MM-dd')} 的快照中还原。`,
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

// @desc    导出最新库存快照为Excel (支持门店级别)
// @route   GET /api/inventory/export
// @access  Private
const exportInventoryExcel = async (req, res) => {
  try {
    const { currentStoreId } = req.user;
    
    if (!currentStoreId) {
      return res.status(400).json({ 
        success: false, 
        message: "未指定当前操作的门店" 
      });
    }

    // 获取当前门店的最新快照
    const snapshot = await InventorySnapshot.findOne({ storeId: currentStoreId })
      .sort({ createdAt: -1 });
      
    if (!snapshot) {
      return res.status(404).json({ 
        success: false, 
        message: "当前门店没有库存快照可导出" 
      });
    }

    // 获取所有相关原料信息
    const ingredientIds = snapshot.ingredients.map((item) => item.ingredientId);
    const ingredientsData = await Ingredient.find({ _id: { $in: ingredientIds } });
    const ingredientsMap = new Map(ingredientsData.map((ing) => [ing._id.toString(), ing]));

    // 组织Excel数据
    const rows = [];
    // 表头
    rows.push([
      "原料名称", "单位", "规格", "采购单价(元)", "岗位", "岗位名称", 
      "数量", "盘点单位", "单项价值(元)", "最后更新时间"
    ]);

    let totalSnapshotValue = 0;

    for (const item of snapshot.ingredients) {
      const ingredient = ingredientsMap.get(item.ingredientId.toString());
      const name = ingredient ? ingredient.name : "未知原料";
      const unit = ingredient ? ingredient.unit : "-";
      const specs = ingredient ? ingredient.specs : "-";
      const price = ingredient ? (ingredient.price || 0) : 0;
      
      if (item.stockByPost && typeof item.stockByPost === 'object') {
        // 处理Map或Object类型的stockByPost
        const stockEntries = item.stockByPost instanceof Map 
          ? Array.from(item.stockByPost.entries())
          : Object.entries(item.stockByPost);
          
        for (const [postId, stock] of stockEntries) {
          const postName = POSTNAME[postId] || `岗位${postId}`;
          const quantity = stock.quantity || 0;
          const itemValue = quantity * price;
          totalSnapshotValue += itemValue;
          
          rows.push([
            name,
            unit,
            specs,
            price.toFixed(2),
            postId,
            postName,
            quantity.toFixed(2),
            stock.unit || unit,
            itemValue.toFixed(2),
            stock.lastUpdated ? format(new Date(stock.lastUpdated), "yyyy-MM-dd HH:mm:ss") : "-"
          ]);
        }
      } else {
        // 没有库存数据的情况
        rows.push([name, unit, specs, price.toFixed(2), "-", "-", "0.00", "-", "0.00", "-"]);
      }
    }

    // 添加总价值汇总行
    rows.push([
      "【快照总价值】", "", "", "", "", "", "", "", totalSnapshotValue.toFixed(2), ""
    ]);

    // 创建工作表和工作簿
    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 原料名称
      { wch: 10 }, // 单位
      { wch: 15 }, // 规格
      { wch: 12 }, // 采购单价
      { wch: 8 },  // 岗位
      { wch: 12 }, // 岗位名称
      { wch: 10 }, // 数量
      { wch: 10 }, // 盘点单位
      { wch: 12 }, // 单项价值
      { wch: 20 }  // 最后更新时间
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "库存快照");
    
    // 写入buffer
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    
    // 获取门店名称用于文件名
    const storeName = await getStoreNameForFilename(currentStoreId);

    // 设置响应头
    const timestamp = format(snapshot.createdAt, "yyyyMMdd_HHmmss");
    const filename = `${storeName}_库存快照_${timestamp}.xlsx`;
    
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);
    
  } catch (error) {
    console.error("导出库存快照为Excel失败:", error);
    res.status(500).json({ 
      success: false, 
      message: "服务器错误，导出失败: " + error.message 
    });
  }
};

// @desc    导出实时库存为Excel (支持门店级别)
// @route   GET /api/inventory/export-realtime
// @access  Private
const exportInventoryRealtimeExcel = async (req, res) => {
  try {
    const { currentStoreId } = req.user;
    
    if (!currentStoreId) {
      return res.status(400).json({ 
        success: false, 
        message: "未指定当前操作的门店" 
      });
    }

    // 获取所有原料基础信息
    const allIngredients = await Ingredient.find({})
      .select('name unit specs price _id')
      .lean();

    // 获取当前门店的库存数据
    const storeInventories = await StoreInventory.find({ storeId: currentStoreId })
      .select('ingredientId stockByPost mainWarehouseStock')
      .lean();

    // 创建库存映射
    const inventoryMap = new Map(
      storeInventories.map(inv => [inv.ingredientId.toString(), inv])
    );

    // 收集所有岗位信息
    const allPosts = new Set();
    storeInventories.forEach(inv => {
      if (inv.stockByPost && typeof inv.stockByPost === 'object') {
        Object.keys(inv.stockByPost).forEach(post => allPosts.add(post));
      }
    });

    const sortedPosts = Array.from(allPosts).sort((a, b) => parseInt(a) - parseInt(b));

    // 构建表头
    const header = [
      "原料名称", 
      "采购单位", 
      "规格",
      "采购单价(元)",
      "主仓库存",
      "主仓价值(元)",
      "岗位库存小计",
      "岗位价值(元)",
      "总库存",
      "总价值(元)"
    ];
    
    // 添加各岗位列
    sortedPosts.forEach(postId => {
      const postName = POSTNAME[postId] || `岗位${postId}`;
      header.push(`${postName}库存`);
      header.push(`${postName}价值(元)`);
    });

    const rows = [header];

    // 统计数据
    let totalMainWarehouse = 0;
    let totalMainValue = 0;
    let totalPostStock = 0;
    let totalPostValue = 0;
    let totalOverall = 0;
    let totalOverallValue = 0;
    const postTotals = {};
    const postValueTotals = {};
    sortedPosts.forEach(post => {
      postTotals[post] = 0;
      postValueTotals[post] = 0;
    });

    // 处理每个原料
    allIngredients.forEach(ingredient => {
      const inventory = inventoryMap.get(ingredient._id.toString());
      const price = ingredient.price || 0;
      
      // 主仓库存
      const mainStock = inventory?.mainWarehouseStock?.quantity || 0;
      const mainValue = mainStock * price;
      totalMainWarehouse += mainStock;
      totalMainValue += mainValue;

      // 岗位库存
      let postStockSubtotal = 0;
      let postValueSubtotal = 0;
      const postStocks = [];
      const postValues = [];
      
      sortedPosts.forEach(postId => {
        let qty = 0;
        if (inventory?.stockByPost && inventory.stockByPost[postId]) {
          qty = inventory.stockByPost[postId].quantity || 0;
        }
        const value = qty * price;
        
        postStocks.push(qty);
        postValues.push(value);
        postStockSubtotal += qty;
        postValueSubtotal += value;
        postTotals[postId] += qty;
        postValueTotals[postId] += value;
      });

      totalPostStock += postStockSubtotal;
      totalPostValue += postValueSubtotal;
      const itemTotal = mainStock + postStockSubtotal;
      const itemTotalValue = mainValue + postValueSubtotal;
      totalOverall += itemTotal;
      totalOverallValue += itemTotalValue;

      // 添加数据行
      const dataRow = [
        ingredient.name,
        ingredient.unit || '',
        ingredient.specs || '',
        price.toFixed(2),
        mainStock.toFixed(2),
        mainValue.toFixed(2),
        postStockSubtotal.toFixed(2),
        postValueSubtotal.toFixed(2),
        itemTotal.toFixed(2),
        itemTotalValue.toFixed(2)
      ];
      
      // 添加各岗位的库存和价值
      for (let i = 0; i < sortedPosts.length; i++) {
        dataRow.push(postStocks[i].toFixed(2));
        dataRow.push(postValues[i].toFixed(2));
      }
      
      rows.push(dataRow);
    });

    // 添加总计行
    const totalRow = [
      "【总计】",
      "",
      "",
      "", // 单价列留空
      totalMainWarehouse.toFixed(2),
      totalMainValue.toFixed(2),
      totalPostStock.toFixed(2),
      totalPostValue.toFixed(2),
      totalOverall.toFixed(2),
      totalOverallValue.toFixed(2)
    ];
    
    // 添加各岗位的总计
    sortedPosts.forEach(post => {
      totalRow.push(postTotals[post].toFixed(2));
      totalRow.push(postValueTotals[post].toFixed(2));
    });
    
    rows.push(totalRow);

    // 创建工作表
    const ws = XLSX.utils.aoa_to_sheet(rows);
    
    // 设置列宽
    const colWidths = [
      { wch: 20 }, // 原料名称
      { wch: 10 }, // 采购单位
      { wch: 15 }, // 规格
      { wch: 12 }, // 采购单价
      { wch: 12 }, // 主仓库存
      { wch: 12 }, // 主仓价值
      { wch: 12 }, // 岗位库存小计
      { wch: 12 }, // 岗位价值小计
      { wch: 12 }, // 总库存
      { wch: 12 }, // 总价值
      ...sortedPosts.flatMap(() => [
        { wch: 12 }, // 岗位库存
        { wch: 12 }  // 岗位价值
      ])
    ];
    ws['!cols'] = colWidths;

    // 创建工作簿
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "实时库存");
    
    // 生成Excel文件
    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 获取门店名称用于文件名
    const storeName = await getStoreNameForFilename(currentStoreId);

    // 设置响应头
    const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
    const filename = `${storeName}_实时库存_${timestamp}.xlsx`;
    
    res.setHeader("Content-Disposition", `attachment; filename=${encodeURIComponent(filename)}`);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buf);

  } catch (error) {
    console.error("导出实时库存为Excel失败:", error);
    res.status(500).json({ 
      success: false, 
      message: "服务器错误，导出失败: " + error.message 
    });
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
