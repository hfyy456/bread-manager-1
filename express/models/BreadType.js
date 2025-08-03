const mongoose = require('mongoose');

const fillingSchema = new mongoose.Schema({
  fillingId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const decorationSchema = new mongoose.Schema({
  ingredientId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const packagingSchema = new mongoose.Schema({
  ingredientId: { type: String, required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const breadTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, '面包种类名称是必填项'],
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
  doughId: {
    type: String,
    required: true,
  },
  doughWeight: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  fillings: [fillingSchema],
  decorations: [decorationSchema],
  packaging: [packagingSchema],
}, { timestamps: true });

const BreadType = mongoose.model('BreadType', breadTypeSchema);

module.exports = BreadType; 