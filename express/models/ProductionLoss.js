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
  // 创建日期范围查询，解决时区问题
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  const query = { 
    storeId, 
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
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
  // 处理日期时区问题，确保使用本地时间范围
  // 将本地日期转换为UTC时间进行查询
  const start = new Date(startDate + 'T00:00:00+08:00');
  const end = new Date(endDate + 'T23:59:59+08:00');
  
  // 转换为UTC时间
  const startUTC = new Date(start.getTime() - 8 * 60 * 60 * 1000);
  const endUTC = new Date(end.getTime() - 8 * 60 * 60 * 1000);
  
  const matchQuery = {
    storeId,
    date: {
      $gte: startUTC,
      $lte: endUTC
    }
  };
  
  // 调试日志（可在生产环境中移除）
    // console.log('=== MongoDB查询条件 ===');
    // console.log('原始日期范围:', startDate, '到', endDate);
    // console.log('本地时间范围:', start, '到', end);
    // console.log('UTC时间范围:', startUTC, '到', endUTC);
    // console.log('查询条件:', JSON.stringify(matchQuery, null, 2));
  
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
        // 各类型数量统计
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
        shipmentLoss: {
          $sum: {
            $cond: [{ $eq: ['$type', 'shipment'] }, '$totalQuantity', 0]
          }
        },
        // 各类型金额统计
        productionValue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'production'] }, '$totalValue', 0]
          }
        },
        tastingValue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'tasting'] }, '$totalValue', 0]
          }
        },
        closingValue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'closing'] }, '$totalValue', 0]
          }
        },
        otherValue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'other'] }, '$totalValue', 0]
          }
        },
        shipmentValue: {
          $sum: {
            $cond: [{ $eq: ['$type', 'shipment'] }, '$totalValue', 0]
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
        shipmentLoss: 1,
        productionValue: 1,
        tastingValue: 1,
        closingValue: 1,
        otherValue: 1,
        shipmentValue: 1,
        recordCount: 1,
        // 计算报损金额（不包括出货）
        totalLossValue: {
          $add: ['$productionValue', '$tastingValue', '$closingValue', '$otherValue']
        },
        // 计算报损率：报损金额/出货金额
        lossRate: {
          $cond: [
            { $gt: ['$shipmentValue', 0] },
            {
              $divide: [
                { $add: ['$productionValue', '$tastingValue', '$closingValue', '$otherValue'] },
                '$shipmentValue'
              ]
            },
            0
          ]
        },
        // 计算出货报损率：所有报损金额/出货登记金额
        shipmentLossRate: {
          $cond: [
            { $gt: ['$shipmentValue', 0] },
            {
              $divide: [
                { $add: ['$productionValue', '$tastingValue', '$closingValue', '$otherValue'] },
                '$shipmentValue'
              ]
            },
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
  // 创建日期范围查询，解决时区问题
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);
  
  // 查找现有记录
  const existingRecord = await this.findOne({ 
    storeId, 
    date: {
      $gte: startDate,
      $lte: endDate
    },
    type 
  });
  
  if (existingRecord) {
    // 直接覆盖报损项目，不进行累加
    const newItems = data.items;
    
    // 重新计算总计
    const totalQuantity = newItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = newItems.reduce((sum, item) => sum + item.totalValue, 0);
    
    // 更新记录
    const result = await this.findOneAndUpdate(
      { 
        storeId, 
        date: {
          $gte: startDate,
          $lte: endDate
        },
        type 
      },
      {
        items: newItems,
        totalQuantity,
        totalValue,
        operatedBy: data.operatedBy,
        notes: data.notes
      },
      { 
        new: true,
        runValidators: true
      }
    );
    return result;
  } else {
    // 创建新记录 - 使用标准化的日期（当天00:00:00）
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    
    const result = await this.findOneAndUpdate(
      { storeId, date: normalizedDate, type },
      {
        ...data,
        storeId,
        date: normalizedDate,
        type
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );
    return result;
  }
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
    // 将本地日期转换为UTC时间范围
    const start = new Date(startDate);
    // 本地日期的00:00:00对应UTC的前一天16:00:00（GMT+8时区）
    const utcStart = new Date(start.getTime() - 8 * 60 * 60 * 1000);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    // 本地日期的23:59:59对应UTC的当天15:59:59（GMT+8时区）
    const utcEnd = new Date(end.getTime() - 8 * 60 * 60 * 1000);
    
    query.date = {
      $gte: utcStart,
      $lte: utcEnd
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