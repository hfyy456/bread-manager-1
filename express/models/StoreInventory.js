const mongoose = require('mongoose');

const storeInventorySchema = new mongoose.Schema({
  storeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Store', 
    required: true,
    index: true
  },
  ingredientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Ingredient', 
    required: true,
    index: true
  },
  mainWarehouseStock: { // 本店主仓库库存
    type: new mongoose.Schema({
      quantity: { type: Number, required: true, default: 0 },
      unit: { type: String, required: false }, // 单位通常与原料采购单位一致
    }, { _id: false }),
    default: () => ({ quantity: 0, unit: '' })
  },
  stockByPost: {
    type: Map,
    of: new mongoose.Schema({
      quantity: { type: Number, required: true, default: 0 },
      unit: { type: String, required: true },
      lastUpdated: { type: Date, default: Date.now },
    }, { _id: false }),
    default: {},
  }
}, { timestamps: true });

// 复合唯一索引：确保一个门店对同一种原料只有一条库存记录
storeInventorySchema.index({ storeId: 1, ingredientId: 1 }, { unique: true });

const StoreInventory = mongoose.model('StoreInventory', storeInventorySchema);

module.exports = StoreInventory; 