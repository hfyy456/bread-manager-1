const mongoose = require('mongoose');

// 包材Schema
const PackagingItemSchema = new mongoose.Schema({
  ingredientId: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unit: {
    type: String,
    required: true
  }
}, { _id: false });

// 生产计划项目Schema
const ProductionItemSchema = new mongoose.Schema({
  breadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BreadType',
    required: true
  },
  breadName: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  packaging: [PackagingItemSchema],
  timeSlots: {
    type: Map,
    of: Number,
    default: {}
  },
  totalQuantity: {
    type: Number,
    default: 0,
    min: 0
  }
});

// 生产计划Schema
const ProductionPlanSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  weekday: {
    type: String,
    required: true
  },
  weather: {
    type: String,
    enum: ['sunny', 'cloudy', 'rainy', 'snowy'],
    default: 'sunny'
  },
  estimateData: {
    productionWaste: {
      type: Number,
      default: 0,
      min: 0
    },
    tastingWaste: {
      type: Number,
      default: 0,
      min: 0
    },
    customerCount: {
      type: Number,
      default: 0,
      min: 0
    },
    customerPrice: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  items: [ProductionItemSchema],
  totals: {
    totalQuantity: {
      type: Number,
      default: 0
    },
    totalProductionWaste: {
      type: Number,
      default: 0
    },
    totalTastingWaste: {
      type: Number,
      default: 0
    },
    totalSalesAmount: {
      type: Number,
      default: 0
    },
    totalProductionAmount: {
      type: Number,
      default: 0
    }
  },
  status: {
    type: String,
    enum: ['draft', 'confirmed', 'in_progress', 'completed'],
    default: 'draft'
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: String,
    default: 'system'
  },
  updatedBy: {
    type: String,
    default: 'system'
  }
}, {
  timestamps: true
});

// 创建复合索引
ProductionPlanSchema.index({ storeId: 1, date: 1 }, { unique: true });
ProductionPlanSchema.index({ storeId: 1, createdAt: -1 });

// 虚拟字段：计算总报废金额
ProductionPlanSchema.virtual('totalWasteAmount').get(function() {
  return (this.totals.totalProductionWaste || 0) + (this.totals.totalTastingWaste || 0);
});

// 虚拟字段：计算利润率
ProductionPlanSchema.virtual('profitMargin').get(function() {
  const totalAmount = this.totals.totalProductionAmount || 0;
  const totalWaste = this.totalWasteAmount;
  if (totalAmount === 0) return 0;
  return ((totalAmount - totalWaste) / totalAmount * 100).toFixed(2);
});

// 中间件：保存前自动计算totals
ProductionPlanSchema.pre('save', function(next) {
  // 计算总数量
  const totalQuantity = this.items ? this.items.reduce((acc, item) => {
    return acc + (item.totalQuantity || 0);
  }, 0) : 0;
  
  // 从estimateData获取预估数据
  const estimateData = this.estimateData || {};
  const totalProductionWaste = estimateData.productionWaste || 0;
  const totalTastingWaste = estimateData.tastingWaste || 0;
  const totalSalesAmount = (estimateData.customerCount || 0) * (estimateData.customerPrice || 0);
  const totalProductionAmount = totalProductionWaste + totalTastingWaste + totalSalesAmount;
  
  this.totals = {
    totalQuantity,
    totalProductionWaste,
    totalTastingWaste,
    totalSalesAmount,
    totalProductionAmount
  };
  
  next();
});

// 静态方法：获取指定日期范围的生产计划
ProductionPlanSchema.statics.getByDateRange = function(storeId, startDate, endDate) {
  return this.find({
    storeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: -1 });
};

// 静态方法：获取生产统计
ProductionPlanSchema.statics.getProductionStats = function(storeId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        storeId: mongoose.Types.ObjectId(storeId),
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    },
    {
      $group: {
        _id: null,
        totalPlans: { $sum: 1 },
        totalQuantity: { $sum: '$totals.totalQuantity' },
        totalProductionAmount: { $sum: '$totals.totalProductionAmount' },
        totalWasteAmount: { $sum: { $add: ['$totals.totalProductionWaste', '$totals.totalTastingWaste'] } },
        avgDailyQuantity: { $avg: '$totals.totalQuantity' },
        avgDailyAmount: { $avg: '$totals.totalProductionAmount' }
      }
    }
  ]);
};

module.exports = mongoose.model('ProductionPlan', ProductionPlanSchema);