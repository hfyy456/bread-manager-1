const mongoose = require('mongoose');

const ingredientUsageSchema = new mongoose.Schema({
  ingredientId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const subFillingSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const fillingRecipeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '馅料名称是必填项'],
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
  subFillings: [subFillingSchema],
}, { timestamps: true });

const FillingRecipe = mongoose.model('FillingRecipe', fillingRecipeSchema);

module.exports = FillingRecipe; 