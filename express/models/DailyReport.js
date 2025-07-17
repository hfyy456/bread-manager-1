const mongoose = require('mongoose');

const ProductReportSchema = new mongoose.Schema({
    productId: { type: String, required: true },
    productName: { type: String, required: true },
    unitPrice: { type: Number, required: true }, 
    quantityProduced: { type: Number, default: 0 },
    finishedWasteQuantity: { type: Number, default: 0 },
    semiFinishedWasteQuantity: { type: Number, default: 0 },
    remarks: { type: String, default: '' }
});

const DoughWasteSchema = new mongoose.Schema({
    doughId: { type: String, required: true },
    doughName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true, default: 'g' },
    reason: { type: String, default: '' }
});

const FillingWasteSchema = new mongoose.Schema({
    fillingId: { type: String, required: true },
    fillingName: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true, default: 'g' },
    reason: { type: String, default: '' }
});

const DailyReportSchema = new mongoose.Schema({
    date: { 
        type: Date, 
        required: true, 
        unique: true,
        // Ensure date is stored as YYYY-MM-DD 00:00:00 UTC for uniqueness
        set: (val) => {
            const date = new Date(val);
            date.setUTCHours(0, 0, 0, 0);
            return date;
        }
    },
    storeId: { // 新增字段
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true
    },
    products: [ProductReportSchema],
    doughWastes: [DoughWasteSchema],
    fillingWastes: [FillingWasteSchema],
    generalRemarks: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

DailyReportSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

// Consider adding an index on the date for faster queries if you expect many reports.
// DailyReportSchema.index({ date: 1 });
DailyReportSchema.index({ storeId: 1, date: -1 });

module.exports = mongoose.model('DailyReport', DailyReportSchema); 