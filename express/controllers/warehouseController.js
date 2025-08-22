const StoreInventory = require('../models/StoreInventory');
const Ingredient = require('../models/Ingredient');
const { monitorDbQuery } = require('../middleware/performanceMiddleware');
const logger = require('../utils/logger');

// Get all ingredients with their main warehouse stock for the current store
const getWarehouseStock = async (req, res) => {
    const startTime = Date.now();
    
    try {
        const storeId = req.header('x-current-store-id');
        if (!storeId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Store ID is required in headers' 
            });
        }
        
        // 并行查询优化
        const [allIngredients, storeInventories] = await Promise.all([
            monitorDbQuery('find', 'ingredients', () => 
                Ingredient.find({})
                    .select('name unit price specs _id') // 只选择需要的字段
                    .sort({ name: 1 })
                    .lean()
            ),
            monitorDbQuery('find', 'storeInventories', () =>
                StoreInventory.find({ storeId })
                    .select('ingredientId mainWarehouseStock _id') // 只选择需要的字段
                    .lean()
            )
        ]);

        // 使用Map优化查找性能
        const inventoryMap = new Map(
            storeInventories.map(item => [
                item.ingredientId?.toString(),
                item
            ]).filter(([key]) => key) // 过滤掉无效的ingredientId
        );

        // 批量计算，减少循环中的重复操作
        let grandTotal = 0;
        const items = allIngredients.map(ingredient => {
            const inventoryItem = inventoryMap.get(ingredient._id.toString());
            const mainStockQuantity = inventoryItem?.mainWarehouseStock?.quantity || 0;
            const price = ingredient.price || 0;
            const totalPrice = mainStockQuantity * price;
            
            // 累加总价
            grandTotal += totalPrice;

            return {
                ingredient: ingredient,
                mainWarehouseStock: {
                    quantity: mainStockQuantity,
                    unit: inventoryItem?.mainWarehouseStock?.unit || ingredient.unit,
                },
                totalPrice: totalPrice.toFixed(2),
                _id: inventoryItem?._id,
            };
        });

        const duration = Date.now() - startTime;
        
        // 记录性能日志
        logger.performance('Warehouse Stock Fetch', duration, {
            storeId,
            ingredientCount: allIngredients.length,
            inventoryCount: storeInventories.length
        });

        res.json({ 
            success: true, 
            items, 
            grandTotal: grandTotal.toFixed(2),
            meta: {
                totalItems: items.length,
                timestamp: new Date().toISOString(),
                duration: `${duration}ms`
            }
        });

    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Error fetching warehouse stock', error, {
            storeId: req.header('x-current-store-id'),
            duration: `${duration}ms`
        });
        
        res.status(500).json({ 
            success: false, 
            message: 'Server error while fetching stock',
            timestamp: new Date().toISOString()
        });
    }
};

// Transfer stock from main warehouse to a post
const transferStock = async (req, res) => {
    const storeId = req.currentStoreId;
    if (!storeId) {
        return res.status(400).json({ message: '请求头中缺少门店ID (x-current-store-id)，无法进行要货。' });
    }
    const { ingredientId, quantity, targetPostId } = req.body;

    if (!ingredientId || !quantity || !targetPostId) {
        return res.status(400).json({ message: '缺少必要的要货信息' });
    }

    try {
        const storeInventory = await StoreInventory.findOne({ storeId: storeId, ingredientId: ingredientId });

        if (!storeInventory || storeInventory.mainWarehouseStock.quantity < quantity) {
            return res.status(400).json({ message: '主仓库库存不足' });
        }

        storeInventory.mainWarehouseStock.quantity -= quantity;
        
        const postStock = storeInventory.stockByPost.get(targetPostId) || { quantity: 0, unit: '' };
        postStock.quantity += Number(quantity);
        
        if (!postStock.unit) {
            const ingredientDoc = await Ingredient.findById(ingredientId);
            postStock.unit = ingredientDoc ? ingredientDoc.unit : '';
        }

        storeInventory.stockByPost.set(targetPostId, postStock);
        
        storeInventory.markModified('stockByPost');
        storeInventory.markModified('mainWarehouseStock');

        await storeInventory.save();
        const updatedItem = await StoreInventory.findById(storeInventory._id).populate('ingredientId');
        res.json({ message: '要货成功', data: updatedItem });
    } catch (error) {
        console.error('Error transferring stock:', error);
        res.status(500).json({ message: '要货库存失败' });
    }
};

// Update main warehouse stock for a specific ingredient
const updateWarehouseStock = async (req, res) => {
    const storeId = req.currentStoreId;
    if (!storeId) {
        return res.status(400).json({ message: '请求头中缺少门店ID (x-current-store-id)，无法进行更新。' });
    }
    const { ingredientId, newStock } = req.body;

    if (!ingredientId || newStock === undefined || Number(newStock) < 0) {
        return res.status(400).json({ message: '请提供有效的原料ID和库存数量。' });
    }

    try {
        let storeInventory = await StoreInventory.findOne({ storeId: storeId, ingredientId: ingredientId });

        if (storeInventory) {
            storeInventory.mainWarehouseStock.quantity = Number(newStock);
            storeInventory.markModified('mainWarehouseStock');
        } else {
            const ingredientDoc = await Ingredient.findById(ingredientId).lean();
            storeInventory = new StoreInventory({
                storeId: storeId,
                ingredientId: ingredientId,
                mainWarehouseStock: { 
                    quantity: Number(newStock),
                    unit: ingredientDoc ? ingredientDoc.unit : ''
                },
                stockByPost: {} 
            });
        }

        await storeInventory.save();
        
        const updatedItem = await StoreInventory.findById(storeInventory._id).populate('ingredientId');
        res.json(updatedItem);

    } catch (error) {
        console.error('Error updating main warehouse stock:', error);
        res.status(500).json({ message: '更新主仓库库存失败。' });
    }
};

const bulkUpdateWarehouseStock = async (req, res) => {
    const storeId = req.currentStoreId;
    if (!storeId) {
        return res.status(400).json({ message: '请求头中缺少门店ID (x-current-store-id)，无法进行批量更新。' });
    }
    const { updates } = req.body; // Expects an array of { ingredientId, newStock }

    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ message: '请提供有效的更新数据数组。' });
    }

    try {
        const ingredientIds = updates.map(u => u.ingredientId);
        const ingredients = await Ingredient.find({ '_id': { $in: ingredientIds } }).lean();
        const ingredientMap = ingredients.reduce((map, ing) => {
            map[ing._id.toString()] = ing;
            return map;
        }, {});

        const bulkOps = updates.map(update => {
            const { ingredientId, newStock } = update;
            const ingredient = ingredientMap[ingredientId];
            if (!ingredient) {
                console.warn(`Skipping bulk update for non-existent ingredientId: ${ingredientId}`);
                return null;
            }
            
            return {
                updateOne: {
                    filter: { storeId: storeId, ingredientId: ingredientId },
                    update: {
                        $set: { 
                            'mainWarehouseStock.quantity': Number(newStock)
                        },
                        $setOnInsert: {
                            storeId: storeId,
                            ingredientId: ingredientId,
                            'mainWarehouseStock.unit': ingredient.unit,
                            stockByPost: {}
                        }
                    },
                    upsert: true
                }
            };
        }).filter(Boolean);

        if (bulkOps.length > 0) {
            await StoreInventory.bulkWrite(bulkOps);
        }

        res.json({ message: '批量更新成功！' });

    } catch (error) {
        console.error('Error in bulk updating main warehouse stock:', error);
        res.status(500).json({ message: '批量更新库存失败。' });
    }
};


module.exports = {
    getWarehouseStock,
    transferStock,
    updateWarehouseStock,
    bulkUpdateWarehouseStock,
}; 