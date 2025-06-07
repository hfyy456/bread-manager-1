const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '原料名称是必填项'],
    trim: true,
    unique: true, // 通常原料名称应该是唯一的
  },
  unit: { // 采购单位
    type: String,
    required: [true, '采购单位是必填项'],
    trim: true,
  },
  price: { // 对应采购单位的价格
    type: Number,
    required: [true, '价格是必填项'],
    min: [0, '价格不能为负数'],
  },
  specs: { // 描述性规格，例如 "12包X1KG/箱"
    type: String,
    trim: true,
  },
  thumb: { // 图片的路径或 URL
    type: String,
    trim: true,
  },
  originalCreateTime: { // 用于存储原始的 create_time 字符串，如果需要的话
    type: String, // 或者 Date，取决于是否做转换. 为了兼容原始数据，先用String
    trim: true,
  },
  post: { // 用途尚不明确，暂时定义为数字数组
    type: [Number],
    default: [],
  },
  min: { // 基础单位/最小计算单位，例如 g, ml, 个 (对应原始数据的 min 字段)
    type: String,
    required: [true, '基础单位是必填项'],
    trim: true,
  },
  norms: { // 换算规格：1个[unit] 等于多少个[baseUnit]
    type: Number,
    required: [true, '换算规格是必填项'],
    min: [0.000001, '换算规格必须大于0'], // 避免为0或负数
  },
  storeIds: { // 可能是关联的商店或其他实体的ID (对应原始数据的 store 字段)
    type: [String], // 或者 [mongoose.Schema.Types.ObjectId] 如果它们确实是其他集合的文档ID
    default: [],
  },
  stockByPost: { // 新增字段：按岗位记录库存
    type: Map,
    of: new mongoose.Schema({
      quantity: {
        type: Number,
        required: true,
        default: 0,
        min: [0, '库存数量不能为负数'],
      },
      unit: { // 盘点时使用的单位，通常是该物料的采购单位 this.unit
        type: String,
        required: true,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    }, { _id: false }),
    default: {},
  },
  // Mongoose 会自动添加 createdAt 和 updatedAt 字段
}, { timestamps: true });

// 索引建议：根据实际查询需求添加
// ingredientSchema.index({ name: 'text' }); // 例如，如果常按名称搜索

const Ingredient = mongoose.model('Ingredient', ingredientSchema);

module.exports = Ingredient; 