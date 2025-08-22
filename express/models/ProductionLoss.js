const mongoose = require('mongoose');

/**
 * 生产报损记录模型
 * 用于记录门店的各种报损情况
 */
const productionLossSchema = new mongoose.Schema({
  // 门店ID
  storeId: {
    type: String,
    required: [true, '门店ID是必填项'],
    trim: true,
  },
  // 报损日期
  date: {
    type: Date,
    required: [true, '报损日期是必填项'],
  },
  // 报损类型：production(生产报损), tasting(品尝报损), closing(打烊报损), other(其他报损), shipment(出货登记)
  type: {
    type: String,
    enum: ['production', 'tasting', 'closing', 'other', 'shipment'],
    default: 'production',
    required: true,
  },
  // 报损项目列表
  items: [{
    // 产品ID (对应BreadType的id字段)
    productId: {
      type: String,
      required: [true, '产品ID是必填项'],
      trim: true,
    },
    // 产品名称
    productName: {
      type: String,
      required: [true, '产品名称是必填项'],
      trim: true,
    },
    // 报损数量
    quantity: {
      type: Number,
      required: [true, '报损数量是必填项'],
      min: [0, '报损数量不能为负数'],
    },
    // 单位
    unit: {
      type: String,
      default: '个',
      trim: true,
    },
    // 单价
    unitPrice: {
      type: Number,
      required: [true, '单价是必填项'],
      min: [0, '单价不能为负数'],
    },
    // 总价值
    totalValue: {
      type: Number,
      required: [true, '总价值是必填项'],
      min: [0, '总价值不能为负数'],
    },
    // 报损原因
    reason: {
      type: String,
      trim: true,
      default: '无',
    },
  }],
  // 总报损数量
  totalQuantity: {
    type: Number,
    required: true,
    min: [0, '总数量不能为负数'],
  },
  // 总报损价值
  totalValue: {
    type: Number,
    required: true,
    min: [0, '总价值不能为负数'],
  },
  // 操作人员
  operatedBy: {
    type: String,
    trim: true,
  },
  // 备注
  notes: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  // 创建索引
  index: [
    { storeId: 1, date: -1 },
    { storeId: 1, type: 1, date: -1 },
    { date: -1 },
    { type: 1, date: -1 }
  ]
});

// 创建复合索引，确保同一门店同一天同一类型只有一条记录
productionLossSchema.index(
  { storeId: 1, date: 1, type: 1 }, 
  { unique: true }
);

/**
 * 静态方法：获取门店指定日期的报损记录
 * @param {string} storeId - 门店ID
 * @param {string} date - 日期 (YYYY-MM-DD)
 * @param {string} type - 报损类型 (可选)
 * @returns {Promise<Object|null>} 报损记录
 */
productionLossSchema.statics.getByDate = function(storeId, date, type = null) {
  const query = { storeId, date: new Date(date) };
  if (type) {
    query.type = type;
  }
  return this.findOne(query).sort({ createdAt: -1 });
};

/**
 * 静态方法：获取门店指定时间范围的报损统计
 * @param {string} storeId - 门店ID
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @param {string} type - 报损类型 (可选)
 * @returns {Promise<Array>} 统计结果
 */
productionLossSchema.statics.getStats = function(storeId, startDate, endDate, type = null) {
  const matchQuery = {
    storeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };
  
  if (type && type !== 'all') {
    matchQuery.type = type;
  }

  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalLoss: { $sum: '$totalQuantity' },
        totalValue: { $sum: '$totalValue' },
        productionLoss: {
          $sum: {
            $cond: [{ $eq: ['$type', 'production'] }, '$totalQuantity', 0]
          }
        },
        tastingLoss: {
          $sum: {
            $cond: [{ $eq: ['$type', 'tasting'] }, '$totalQuantity', 0]
          }
        },
        closingLoss: {
          $sum: {
            $cond: [{ $eq: ['$type', 'closing'] }, '$totalQuantity', 0]
          }
        },
        otherLoss: {
          $sum: {
            $cond: [{ $eq: ['$type', 'other'] }, '$totalQuantity', 0]
          }
        },
        recordCount: { $sum: 1 }
      }
    },
    {
      $project: {
        _id: 0,
        totalLoss: 1,
        totalValue: 1,
        productionLoss: 1,
        tastingLoss: 1,
        closingLoss: 1,
        otherLoss: 1,
        recordCount: 1,
        lossRate: {
          $cond: [
            { $gt: ['$totalLoss', 0] },
            { $multiply: [{ $divide: ['$totalLoss', '$totalLoss'] }, 100] },
            0
          ]
        }
      }
    }
  ]);
};

/**
 * 静态方法：创建或更新报损记录
 * @param {string} storeId - 门店ID
 * @param {string} date - 日期
 * @param {string} type - 报损类型
 * @param {Object} data - 报损数据
 * @returns {Promise<Object>} 操作结果
 */
productionLossSchema.statics.createOrUpdate = async function(storeId, date, type, data) {
  const result = await this.findOneAndUpdate(
    { storeId, date: new Date(date), type },
    {
      ...data,
      storeId,
      date: new Date(date),
      type
    },
    { 
      upsert: true, 
      new: true,
      runValidators: true
    }
  );
  return result;
};

/**
 * 静态方法：获取门店报损记录列表
 * @param {string} storeId - 门店ID
 * @param {Object} options - 查询选项
 * @returns {Promise<Array>} 报损记录列表
 */
productionLossSchema.statics.getRecords = function(storeId, options = {}) {
  const {
    startDate,
    endDate,
    type,
    page = 1,
    limit = 20
  } = options;

  const query = { storeId };
  
  if (startDate && endDate) {
    query.date = {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    };
  }
  
  if (type && type !== 'all') {
    query.type = type;
  }

  return this.find(query)
    .sort({ date: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

module.exports = mongoose.model('ProductionLoss', productionLossSchema);