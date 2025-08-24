const mongoose = require('mongoose');

/**
 * 营业数据模型
 * 用于存储门店每日营业数据
 */
const revenueSchema = new mongoose.Schema({
  // 门店ID
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: [true, '门店ID是必填项'],
    index: true
  },
  
  // 营业日期
  date: {
    type: Date,
    required: [true, '营业日期是必填项'],
    index: true
  },
  
  // 实收金额
  actualRevenue: {
    type: Number,
    required: [true, '实收金额是必填项'],
    min: [0, '实收金额不能为负数']
  },
  
  // 营业额
  totalRevenue: {
    type: Number,
    required: [true, '营业额是必填项'],
    min: [0, '营业额不能为负数']
  },
  
  // 客单价
  avgOrderValue: {
    type: Number,
    required: [true, '客单价是必填项'],
    min: [0, '客单价不能为负数']
  },
  
  // 客单数
  orderCount: {
    type: Number,
    required: [true, '客单数是必填项'],
    min: [0, '客单数不能为负数']
  },
  
  // 美团团购收入
  meituanRevenue: {
    type: Number,
    default: 0,
    min: [0, '美团团购收入不能为负数']
  },
  
  // 抖音团购收入
  douyinRevenue: {
    type: Number,
    default: 0,
    min: [0, '抖音团购收入不能为负数']
  },
  
  // 现金收入
  cashRevenue: {
    type: Number,
    default: 0,
    min: [0, '现金收入不能为负数']
  },
  
  // 银行卡收入
  cardRevenue: {
    type: Number,
    default: 0,
    min: [0, '银行卡收入不能为负数']
  },
  
  // 微信支付收入
  wechatRevenue: {
    type: Number,
    default: 0,
    min: [0, '微信支付收入不能为负数']
  },
  
  // 支付宝收入
  alipayRevenue: {
    type: Number,
    default: 0,
    min: [0, '支付宝收入不能为负数']
  },
  

  
  // 提交人
  submittedBy: {
    type: String,
    required: [true, '提交人是必填项']
  },
  
  // 提交时间
  submittedAt: {
    type: Date,
    default: Date.now
  },
  
  // 创建时间
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  // 更新时间
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'revenues'
});

// 创建复合索引，确保每个门店每天只能有一条营业数据记录
revenueSchema.index({ storeId: 1, date: 1 }, { unique: true });

// 数据验证中间件
revenueSchema.pre('save', function(next) {
  // 验证收入构成是否合理
  const totalPayments = this.meituanRevenue + this.douyinRevenue + this.cashRevenue + this.cardRevenue;
  
  // 允许一定的误差范围（1元以内）
  if (Math.abs(totalPayments - this.actualRevenue) > 1) {
    return next(new Error('各项收入之和与实收金额不匹配'));
  }
  
  // 验证客单价计算是否正确
  if (this.orderCount > 0) {
    const calculatedAvgOrderValue = this.totalRevenue / this.orderCount;
    if (Math.abs(calculatedAvgOrderValue - this.avgOrderValue) > 0.01) {
      return next(new Error('客单价计算不正确'));
    }
  }
  
  next();
});

// 静态方法：根据门店和日期查找营业数据
revenueSchema.statics.findByStoreAndDate = function(storeId, date) {
  // 确保日期使用本地时间而不是UTC时间
  const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
  const startOfDay = new Date(dateStr + 'T00:00:00');
  const endOfDay = new Date(dateStr + 'T23:59:59.999Z');
  
  return this.findOne({
    storeId,
    date: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  });
};

// 静态方法：获取门店指定时间范围的营业数据
revenueSchema.statics.findByStoreAndDateRange = function(storeId, startDate, endDate) {
  return this.find({
    storeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: -1 });
};

// 实例方法：更新营业数据
revenueSchema.methods.updateRevenue = function(updateData) {
  Object.assign(this, updateData);
  this.updatedAt = new Date();
  return this.save();
};

const Revenue = mongoose.model('Revenue', revenueSchema);

module.exports = Revenue;