const mongoose = require('mongoose');

const requestItemSchema = new mongoose.Schema({
    ingredientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ingredient',
        required: true,
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    // targetPostId and targetPostName are removed as per new requirement
}, { _id: false });

const transferRequestSchema = new mongoose.Schema({
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        required: true,
        index: true,
    },
    requestedBy: { // In a real app, this would be a user ID
        type: String, 
        required: true,
        default: '移动端用户' 
    },
    items: [requestItemSchema],
    status: {
        type: String,
        required: true,
        enum: ['pending', 'approved', 'rejected', 'completed'],
        default: 'pending',
        index: true,
    },
    notes: {
        type: String,
        trim: true,
    }
}, { timestamps: true });


const TransferRequest = mongoose.model('TransferRequest', transferRequestSchema);

module.exports = TransferRequest; 