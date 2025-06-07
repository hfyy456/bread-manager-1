const mongoose = require('mongoose');

const ingredientUsageSchema = new mongoose.Schema({
  ingredientId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const preFermentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const doughRecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '面团名称是必填项'],
    trim: true,
    unique: true,
  },
  id: {
    type: String,
    required: [true, 'ID 是必填项'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  ingredients: [ingredientUsageSchema],
  yield: {
    type: Number,
    required: true,
  },
  unit: {
    type: String,
    required: true,
  },
  preFerments: [preFermentSchema],
}, { timestamps: true });

const DoughRecipe = mongoose.model('DoughRecipe', doughRecipeSchema);

module.exports = DoughRecipe; 