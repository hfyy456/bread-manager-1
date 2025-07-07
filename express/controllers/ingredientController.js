const Ingredient = require("../models/Ingredient");
const InventorySnapshot = require('../models/InventorySnapshot');

// @desc    获取所有原料
// @route   POST /api/ingredients/list
// @access  Public
const getAllIngredients = async (req, res) => {
  try {
    const ingredients = await Ingredient.find().lean().sort({ createdAt: -1 });

    // 动态计算每个原料的总库存
    const ingredientsWithTotalStock = ingredients.map(ing => {
      let totalStock = 0;
      if (ing.stockByPost && typeof ing.stockByPost === 'object' && Object.keys(ing.stockByPost).length > 0) {
        for (const stock of Object.values(ing.stockByPost)) {
          totalStock += stock.quantity || 0;
        }
      }
      return {
        ...ing,
        currentStock: totalStock // 将计算出的总库存添加到返回对象中
      };
    });

    res.json({ success: true, data: ingredientsWithTotalStock });
  } catch (err) {
    console.error("获取原料错误:", err.message);
    res
      .status(500)
      .json({ success: false, message: "服务器错误: " + err.message });
  }
};

// @desc    根据ID获取单个原料
// @route   POST /api/ingredients/detail
// @access  Public
const getIngredientById = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: "请求体中缺少原料 ID" });
  }
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ message: "未找到该原料" });
    }
    res.json(ingredient);
  } catch (err) {
    console.error(`获取原料 (ID: ${id}) 错误:`, err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "原料ID格式无效" });
    }
    res.status(500).json({ message: "服务器错误: " + err.message });
  }
};

// @desc    创建新原料
// @route   POST /api/ingredients/create
// @access  Private (将来可以添加权限控制)
const createIngredient = async (req, res) => {
  const {
    name,
    unit,
    price,
    specs,
    thumb,
    originalCreateTime,
    post,
    min,
    norms,
    storeIds,
  } = req.body;

  try {
    if (!name || !unit || price == null || !min || norms == null) {
      return res
        .status(400)
        .json({
          message:
            "缺少必要的原料信息 (名称, 采购单位, 价格, 基础单位, 换算规格)",
        });
    }
    const newIngredient = new Ingredient({
      name,
      unit,
      price,
      specs,
      thumb,
      originalCreateTime: originalCreateTime || new Date().toLocaleString(),
      post,
      min,
      norms,
      storeIds,
    });
    const ingredient = await newIngredient.save();
    res.status(201).json(ingredient);
  } catch (err) {
    console.error("创建原料错误:", err.message);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({ message: "输入数据校验失败", errors });
    }
    if (err.code === 11000) {
      return res.status(400).json({ message: `原料名称 '${name}' 已存在。` });
    }
    res.status(500).json({ message: "服务器错误: " + err.message });
  }
};

// @desc    更新原料
// @route   POST /api/ingredients/update
// @access  Private (将来可以添加权限控制)
const updateIngredient = async (req, res) => {
  const { id, ...updateData } = req.body;
  if (!id) {
    return res.status(400).json({ message: "请求体中缺少原料 ID" });
  }
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ message: "未找到该原料" });
    }
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        ingredient[key] = updateData[key];
      }
    });
    const updatedIngredient = await ingredient.save();
    res.json(updatedIngredient);
  } catch (err) {
    console.error(`更新原料 (ID: ${id}) 错误:`, err.message);
    if (err.name === "ValidationError") {
      const errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message,
      }));
      return res.status(400).json({ message: "输入数据校验失败", errors });
    }
    if (err.code === 11000 && updateData.name) {
      return res
        .status(400)
        .json({ message: `原料名称 '${updateData.name}' 已存在。` });
    }
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "原料ID格式无效" });
    }
    res.status(500).json({ message: "服务器错误: " + err.message });
  }
};

// @desc    删除原料
// @route   POST /api/ingredients/delete
// @access  Private (将来可以添加权限控制)
const deleteIngredient = async (req, res) => {
  const { id } = req.body;
  if (!id) {
    return res.status(400).json({ message: "请求体中缺少原料 ID" });
  }
  try {
    const ingredient = await Ingredient.findById(id);
    if (!ingredient) {
      return res.status(404).json({ message: "未找到该原料" });
    }
    await ingredient.deleteOne();
    res.json({ message: "原料已成功删除" });
  } catch (err) {
    console.error(`删除原料 (ID: ${id}) 错误:`, err.message);
    if (err.kind === "ObjectId") {
      return res.status(404).json({ message: "原料ID格式无效" });
    }
    res.status(500).json({ message: "服务器错误: " + err.message });
  }
};

// @desc    获取当前总库存价值
// @route   GET /api/ingredients/current-total-value
// @access  Public
const getCurrentTotalInventoryValue = async (req, res) => {
  try {
    const ingredients = await Ingredient.find({}).lean();
    let totalValue = 0;

    ingredients.forEach(ingredient => {
      let ingredientTotalStockInPurchaseUnit = 0;

      // Check if stockByPost exists and is an object with keys
      if (ingredient.stockByPost && typeof ingredient.stockByPost === 'object' && Object.keys(ingredient.stockByPost).length > 0) {
        // Iterate over the values of the stockByPost object
        Object.values(ingredient.stockByPost).forEach(stockEntry => {
          // stockEntry is { quantity, unit, lastUpdated }
          // We assume stockEntry.quantity is in ingredient.unit (purchase unit)
          ingredientTotalStockInPurchaseUnit += (parseFloat(stockEntry.quantity) || 0);
        });
      }

      const price = parseFloat(ingredient.price);

      if (isNaN(price)) {
        console.warn(`计算库存价值时跳过原料 '${ingredient.name}' (ID: ${ingredient._id})，原因：价格无效 (${ingredient.price}).`);
        return; // Skip this ingredient if price is invalid
      }
      
      if (ingredientTotalStockInPurchaseUnit > 0 && !isNaN(price)) {
         totalValue += ingredientTotalStockInPurchaseUnit * price;
      }
    });

    res.json({ success: true, totalValue: parseFloat(totalValue.toFixed(2)) });

  } catch (err) {
    console.error('获取总库存价值错误:', err.message);
    res.status(500).json({ success: false, message: '服务器错误，无法获取总库存价值: ' + err.message });
  }
};

const compareSnapshots = async (req, res) => {
  try {
    const { from, to } = req.query;

    if (!from || !to) {
      return res.status(400).json({ success: false, message: '必须提供起始和结束两个节点。' });
    }

    // Helper function to get data either from a snapshot or from current inventory
    const getSnapshotData = async (id) => {
      if (id === 'current') {
        const ingredients = await Ingredient.find({}).lean();
        return {
          ingredients: ingredients.map(ing => ({
            ingredientId: ing._id,
            stockByPost: ing.stockByPost || {},
          })),
        };
      } else {
        const snapshot = await InventorySnapshot.findById(id).lean();
        if (!snapshot) throw new Error(`ID为 ${id} 的快照未找到。`);
        return snapshot;
      }
    };
    
    const [snapshotA, snapshotB] = await Promise.all([
      getSnapshotData(from),
      getSnapshotData(to)
    ]);

    const allIngredientIds = [
      ...snapshotA.ingredients.map(i => i.ingredientId),
      ...snapshotB.ingredients.map(i => i.ingredientId)
    ];
    
    // Fetch all necessary ingredient data, including price info
    const ingredientsData = await Ingredient.find({ '_id': { $in: allIngredientIds } }).lean();
    const ingredientsMap = new Map(ingredientsData.map(i => [String(i._id), {
      name: i.name, 
      unit: i.unit,
      pricePerBaseUnit: (i.price && i.norms) ? (i.price / i.norms) : 0
    }]));
    
    let totalValueA = 0;
    let totalValueB = 0;

    const stockA_Map = new Map();
    for(const item of snapshotA.ingredients) {
        let totalStock = 0;
        if(item.stockByPost) {
             for (const postStock of Object.values(item.stockByPost)) {
                totalStock += postStock.quantity || 0;
            }
        }
        stockA_Map.set(String(item.ingredientId), totalStock);
        const ingredientInfo = ingredientsMap.get(String(item.ingredientId));
        if (ingredientInfo) {
            totalValueA += totalStock * ingredientInfo.pricePerBaseUnit;
        }
    }

    const comparisonResult = [];
    const processedIds = new Set();

    for (const itemB of snapshotB.ingredients) {
      const ingredientId = String(itemB.ingredientId);
      let totalStockB = 0;
      if(itemB.stockByPost) {
        for (const postStock of Object.values(itemB.stockByPost)) {
            totalStockB += postStock.quantity || 0;
        }
      }
      
      const ingredientInfo = ingredientsMap.get(ingredientId);
      if (ingredientInfo) {
          totalValueB += totalStockB * ingredientInfo.pricePerBaseUnit;
      }

      const quantityA = stockA_Map.get(ingredientId) || 0;

      comparisonResult.push({
        ingredientId: ingredientId,
        ingredientName: ingredientInfo ? ingredientInfo.name : '未知原料',
        quantityA: quantityA,
        quantityB: totalStockB,
        consumption: quantityA - totalStockB,
        unit: ingredientInfo ? ingredientInfo.unit : '未知单位'
      });
      processedIds.add(ingredientId);
    }
    
    for (const [ingredientId, quantityA] of stockA_Map.entries()) {
        if(!processedIds.has(ingredientId)){
            const ingredientInfo = ingredientsMap.get(ingredientId);
            comparisonResult.push({
                ingredientId: ingredientId,
                ingredientName: ingredientInfo ? ingredientInfo.name : '未知原料',
                quantityA: quantityA,
                quantityB: 0,
                consumption: quantityA,
                unit: ingredientInfo ? ingredientInfo.unit : '未知单位'
            });
        }
    }

    res.json({ 
      success: true, 
      data: {
        items: comparisonResult,
        totals: {
          valueA: totalValueA,
          valueB: totalValueB,
          valueConsumption: totalValueA - totalValueB
        }
      }
    });

  } catch (error) {
    console.error('Error comparing snapshots:', error);
    res.status(500).json({ success: false, message: `服务器内部错误: ${error.message}` });
  }
};

module.exports = {
  getAllIngredients,
  getIngredientById,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  getCurrentTotalInventoryValue,
  compareSnapshots
};
