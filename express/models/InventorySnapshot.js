const mongoose = require('mongoose');
const moment = require('moment');

const inventorySnapshotSchema = new mongoose.Schema({
  snapshotDate: {
    type: Date,
    default: Date.now,
  },
  weekOfYear: {
    type: Number,
    default: () => moment().week(),
  },
  year: {
    type: Number,
    default: () => moment().year(),
  },
  totalValue: {
    type: Number,
    required: true,
  },
  ingredients: [
    {
      ingredientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ingredient',
        required: true,
      },
      stockByPost: {
        type: Map,
        of: new mongoose.Schema({
          quantity: Number,
          unit: String,
          lastUpdated: Date,
        }, { _id: false }),
      },
    },
  ],
}, { timestamps: true });

inventorySnapshotSchema.index({ year: 1, weekOfYear: 1 }, { unique: true });

const InventorySnapshot = mongoose.model('InventorySnapshot', inventorySnapshotSchema);

module.exports = InventorySnapshot; 