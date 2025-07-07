const mongoose = require('mongoose');
const moment = require('moment');

const inventorySnapshotSchema = new mongoose.Schema({
  year: {
    type: Number,
    required: true,
  },
  weekOfYear: {
    type: Number,
    required: true,
  },
  snapshotDate: {
    type: Date,
    default: Date.now,
  },
  notes: {
    type: String,
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

inventorySnapshotSchema.index({ createdAt: -1 });

const InventorySnapshot = mongoose.model('InventorySnapshot', inventorySnapshotSchema);

module.exports = InventorySnapshot; 