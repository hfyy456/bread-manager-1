const mongoose = require('mongoose');

/**
 * 支出记录模型
 * 用于记录门店的各种支出情况
 */
const expenseSchema = new mongoose.Schema({
  // 门店ID
  storeId: {
    type: String,
    required: [true, '门店ID是必填项'],
    trim: true,
  },
  // 支出日期
  date: {
    type: Date,
    required: [true, '支出日期是必填项'],
  },
  // 支出类型：杂费、工资、易耗品、鸡蛋、水果净菜、大货、运费、水电、租金、市场推广
  type: {
    type: String,
    enum: ['杂费', '工资', '易耗品', '鸡蛋', '水果净菜', '大货', '运费', '水电', '租金', '市场推广'],
    default: '杂费',
    required: true,
  }
  // 支出金额
  amount: {
    type: Number,
    required: [true, '支出金额是必填项'],
    min: [0, '支出金额不能为负数'],
  },
  // 支出描述/备注
  description: {
    type: String,
    required: [true, '支出描述是必填项'],
    trim: true,
  },
  // 详细备注
  notes: {
    type: String,
    trim: true,
  },
  // 提交人/操作人员
  operatedBy: {
    type: String,
    required: [true, '提交人是必填项'],
    trim: true,
  },
  // 支出分类标签

  // 是否已审核
  isApproved: {
    type: Boolean,
    default: false,
  },
  // 审核人
  approvedBy: {
    type: String,
    trim: true,
  },
  // 审核时间
  approvedAt: {
    type: Date,
  },
  // 报销状态：已报销、未报销
  reimbursementStatus: {
    type: String,
    enum: ['已报销', '未报销'],
    default: '未报销',
    required: true,
  },
  // 报销时间
  reimbursedAt: {
    type: Date,
  },
  // 报销人
  reimbursedBy: {
    type: String,
    trim: true,
  },
}, {
  timestamps: true,
  // 创建索引以提高查询性能
  index: [
    { storeId: 1, date: -1 },
    { storeId: 1, type: 1, date: -1 },
    { storeId: 1, reimbursementStatus: 1, date: -1 },
    { date: -1 },
    { type: 1, date: -1 },
    { reimbursementStatus: 1, date: -1 },
    { operatedBy: 1, date: -1 }
  ]
});

// 复合索引：确保同一门店同一天同一类型的支出记录唯一性（如果需要的话）
// expenseSchema.index(
//   { storeId: 1, date: 1, type: 1 }, 
//   { unique: true }
// );

/**
 * 根据日期获取支出记录
 * @param {string} storeId - 门店ID
 * @param {Date} date - 日期
 * @param {string} type - 支出类型（可选）
 * @returns {Promise} 支出记录
 */
expenseSchema.statics.getByDate = function(storeId, date, type = null, reimbursementStatus = null) {
  const query = {
    storeId,
    date: {
      $gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      $lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
    }
  };
  
  if (type && type !== 'all') {
    query.type = type;
  }
  
  if (reimbursementStatus && reimbursementStatus !== 'all') {
    query.reimbursementStatus = reimbursementStatus;
  }
  
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * 获取支出统计数据
 * @param {string} storeId - 门店ID
 * @param {Date} startDate - 开始日期
 * @param {Date} endDate - 结束日期
 * @param {string} type - 支出类型（可选）
 * @returns {Promise} 统计数据
 */
expenseSchema.statics.getStats = function(storeId, startDate, endDate, type = null, reimbursementStatus = null) {
  const matchStage = {
    storeId,
    date: {
      $gte: startDate,
      $lte: endDate
    }
  };
  
  if (type && type !== 'all') {
    matchStage.type = type;
  }
  
  if (reimbursementStatus && reimbursementStatus !== 'all') {
    matchStage.reimbursementStatus = reimbursementStatus;
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalExpenses: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        avgAmount: { $avg: '$amount' },
        maxAmount: { $max: '$amount' },
        minAmount: { $min: '$amount' },
        typeBreakdown: {
          $push: {
            type: '$type',
            amount: '$amount',
            date: '$date'
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalExpenses: 1,
        totalAmount: { $round: ['$totalAmount', 2] },
        avgAmount: { $round: ['$avgAmount', 2] },
        maxAmount: { $round: ['$maxAmount', 2] },
        minAmount: { $round: ['$minAmount', 2] },
        typeBreakdown: 1
      }
    }
  ]);
};

/**
 * 获取支出记录列表（分页）
 * @param {string} storeId - 门店ID
 * @param {Object} options - 查询选项
 * @returns {Promise} 支出记录列表
 */
expenseSchema.statics.getRecords = function(storeId, options = {}) {
  const {
    startDate,
    endDate,
    type,
    reimbursementStatus,
    page = 1,
    limit = 20,
    sortBy = 'date',
    sortOrder = 'desc'
  } = options;
  
  const query = { storeId };
  
  if (startDate && endDate) {
    query.date = {
      $gte: startDate,
      $lte: endDate
    };
  }
  
  if (type && type !== 'all') {
    query.type = type;
  }
  
  if (reimbursementStatus && reimbursementStatus !== 'all') {
    query.reimbursementStatus = reimbursementStatus;
  }
  
  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  
  const skip = (page - 1) * limit;
  
  return Promise.all([
    this.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(query)
  ]).then(([records, total]) => ({
    records,
    total,
    page,
    pages: Math.ceil(total / limit)
  }));
};

/**
 * 创建支出记录
 * @param {Object} expenseData - 支出数据
 * @returns {Promise} 创建的支出记录
 */
expenseSchema.statics.createExpense = async function(expenseData) {
  const expense = new this(expenseData);
  return await expense.save();
};

/**
 * 更新支出记录
 * @param {string} expenseId - 支出记录ID
 * @param {Object} updateData - 更新数据
 * @returns {Promise} 更新后的支出记录
 */
expenseSchema.statics.updateExpense = async function(expenseId, updateData) {
  return await this.findByIdAndUpdate(
    expenseId,
    { $set: updateData },
    { new: true, runValidators: true }
  );
};

/**
 * 删除支出记录
 * @param {string} expenseId - 支出记录ID
 * @returns {Promise} 删除结果
 */
expenseSchema.statics.deleteExpense = async function(expenseId) {
  return await this.findByIdAndDelete(expenseId);
};

/**
 * 审核支出记录
 * @param {string} expenseId - 支出记录ID
 * @param {string} approvedBy - 审核人
 * @returns {Promise} 审核后的支出记录
 */
expenseSchema.statics.approveExpense = async function(expenseId, approvedBy) {
  return await this.findByIdAndUpdate(
    expenseId,
    {
      $set: {
        isApproved: true,
        approvedBy,
        approvedAt: new Date()
      }
    },
    { new: true }
  );
};

module.exports = mongoose.model('Expense', expenseSchema);