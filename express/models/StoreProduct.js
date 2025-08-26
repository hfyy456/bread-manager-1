const mongoose = require('mongoose');

/**
 * 门店产品模型
 * 用于管理门店的产品上下架状态
 */
const storeProductSchema = new mongoose.Schema({
  storeId: {
    type: String,
    required: [true, '门店ID是必填项'],
    trim: true,
  },
  breadTypeId: {
    type: String,
    required: [true, '面包类型ID是必填项'],
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    required: true,
  },
  // 上架时间
  activatedAt: {
    type: Date,
    default: Date.now,
  },
  // 下架时间
  deactivatedAt: {
    type: Date,
    default: null,
  },
  // 操作人员
  operatedBy: {
    type: String,
    trim: true,
  },
  // 备注信息
  notes: {
    type: String,
    trim: true,
  },
  // 排序顺序（数值越小排序越靠前）
  sortOrder: {
    type: Number,
    default: 0,
    min: [0, '排序顺序不能为负数'],
  },
}, { 
  timestamps: true,
  // 创建复合索引，确保同一门店的同一产品只有一条记录
  index: [
    { storeId: 1, breadTypeId: 1 },
    { storeId: 1, isActive: 1 },
    { breadTypeId: 1, isActive: 1 },
    { storeId: 1, isActive: 1, sortOrder: 1 }
  ]
});

// 创建唯一索引，防止同一门店同一产品有多条记录
storeProductSchema.index(
  { storeId: 1, breadTypeId: 1 }, 
  { unique: true }
);

/**
 * 静态方法：获取门店的所有上架产品
 * @param {string} storeId - 门店ID
 * @returns {Promise<Array>} 上架产品列表
 */
storeProductSchema.statics.getActiveProducts = function(storeId) {
  return this.find({ storeId, isActive: true })
    .populate('breadTypeId')
    .sort({ sortOrder: 1, activatedAt: -1 });
};

/**
 * 静态方法：获取门店的所有下架产品
 * @param {string} storeId - 门店ID
 * @returns {Promise<Array>} 下架产品列表
 */
storeProductSchema.statics.getInactiveProducts = function(storeId) {
  return this.find({ storeId, isActive: false })
    .populate('breadTypeId')
    .sort({ deactivatedAt: -1 });
};

/**
 * 静态方法：产品上架
 * @param {string} storeId - 门店ID
 * @param {string} breadTypeId - 面包类型ID
 * @param {string} operatedBy - 操作人员
 * @param {string} notes - 备注
 * @param {number} sortOrder - 排序顺序（可选）
 * @returns {Promise<Object>} 操作结果
 */
storeProductSchema.statics.activateProduct = async function(storeId, breadTypeId, operatedBy, notes, sortOrder) {
  const updateData = {
    isActive: true,
    activatedAt: new Date(),
    deactivatedAt: null,
    operatedBy,
    notes
  };
  
  // 如果提供了排序顺序，则更新排序
  if (typeof sortOrder === 'number') {
    updateData.sortOrder = sortOrder;
  }
  
  const result = await this.findOneAndUpdate(
    { storeId, breadTypeId },
    updateData,
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  );
  return result;
};

/**
 * 静态方法：产品下架
 * @param {string} storeId - 门店ID
 * @param {string} breadTypeId - 面包类型ID
 * @param {string} operatedBy - 操作人员
 * @param {string} notes - 备注
 * @returns {Promise<Object>} 操作结果
 */
storeProductSchema.statics.deactivateProduct = async function(storeId, breadTypeId, operatedBy, notes) {
  const result = await this.findOneAndUpdate(
    { storeId, breadTypeId },
    {
      isActive: false,
      deactivatedAt: new Date(),
      operatedBy,
      notes
    },
    { 
      new: true,
      runValidators: true
    }
  );
  return result;
};

/**
 * 静态方法：更新产品排序
 * @param {string} storeId - 门店ID
 * @param {string} breadTypeId - 面包类型ID
 * @param {number} sortOrder - 新的排序顺序
 * @param {string} operatedBy - 操作人员
 * @returns {Promise<Object>} 操作结果
 */
storeProductSchema.statics.updateProductSort = async function(storeId, breadTypeId, sortOrder, operatedBy) {
  const result = await this.findOneAndUpdate(
    { storeId, breadTypeId },
    {
      sortOrder,
      operatedBy
    },
    { 
      new: true,
      runValidators: true
    }
  );
  return result;
};

/**
 * 静态方法：批量更新产品排序
 * @param {string} storeId - 门店ID
 * @param {Array} sortUpdates - 排序更新列表 [{ breadTypeId, sortOrder }]
 * @param {string} operatedBy - 操作人员
 * @returns {Promise<Array>} 操作结果列表
 */
storeProductSchema.statics.batchUpdateSort = async function(storeId, sortUpdates, operatedBy) {
  const results = [];
  
  for (const update of sortUpdates) {
    const { breadTypeId, sortOrder } = update;
    const result = await this.updateProductSort(storeId, breadTypeId, sortOrder, operatedBy);
    if (result) {
      results.push(result);
    }
  }
  
  return results;
};

/**
 * 静态方法：批量操作产品状态
 * @param {string} storeId - 门店ID
 * @param {Array} operations - 操作列表 [{ breadTypeId, isActive, operatedBy, notes }]
 * @returns {Promise<Array>} 操作结果列表
 */
storeProductSchema.statics.batchUpdateProducts = async function(storeId, operations) {
  const results = [];
  
  for (const operation of operations) {
    const { breadTypeId, isActive, operatedBy, notes } = operation;
    
    if (isActive) {
      const result = await this.activateProduct(storeId, breadTypeId, operatedBy, notes);
      results.push(result);
    } else {
      const result = await this.deactivateProduct(storeId, breadTypeId, operatedBy, notes);
      results.push(result);
    }
  }
  
  return results;
};

const StoreProduct = mongoose.model('StoreProduct', storeProductSchema);

module.exports = StoreProduct;