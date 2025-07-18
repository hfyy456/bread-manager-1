const TransferRequest = require('../models/TransferRequest');
const Ingredient = require('../models/Ingredient');
const mongoose = require('mongoose');
// No longer need Ingredient or POSTNAME for validation here

// Create a new transfer request
exports.createRequest = async (req, res) => {
    const { items, notes } = req.body;
    const storeId = req.currentStoreId;

    if (!storeId) {
        return res.status(400).json({ message: '请求头中缺少门店ID。' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ message: '申请物品列表不能为空。' });
    }
    
    // All post-related validation is removed.

    try {
        const newRequest = new TransferRequest({
            storeId,
            items,
            notes,
            requestedBy: req.user?._id || '移动端匿名用户',
        });

        await newRequest.save();

        res.status(201).json({ message: '调拨申请已成功提交！', request: newRequest });

    } catch (error) {
        console.error('Error creating transfer request:', error);
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: '数据验证失败', details: error.errors });
        }
        res.status(500).json({ message: '创建调拨申请失败。' });
    }
};

// Get all transfer requests for the current store
exports.getRequestsByStore = async (req, res) => {
    const storeId = req.currentStoreId;

    if (!storeId) {
        return res.status(400).json({ message: '请求头中缺少门店ID。' });
    }

    try {
        const requests = await TransferRequest.find({ storeId })
            .sort({ createdAt: -1 }) // Show latest requests first
            .limit(100); // Limit to a reasonable number for mobile view

        res.json(requests);
    } catch (error) {
        console.error('Error fetching transfer requests:', error);
        res.status(500).json({ message: '获取申请记录失败。' });
    }
};

// Get all transfer requests for all stores (for admin)
exports.getAllRequests = async (req, res) => {
    try {
        const requests = await TransferRequest.find({})
            .populate('storeId', 'name') // Populate the store's name
            .sort({ createdAt: -1 })
            .limit(200); // Limit to a reasonable number for admin dashboard

        res.json(requests);
    } catch (error) {
        console.error('Error fetching all transfer requests:', error);
        res.status(500).json({ message: '获取所有申请记录失败。' });
    }
};


// Update a transfer request's status
exports.updateRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ message: '无效的状态值。' });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const request = await TransferRequest.findById(id).session(session);
        if (!request) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: '未找到指定的调拨申请。' });
        }
        
        // Prevent re-processing a completed or rejected request
        if (request.status === 'completed' || request.status === 'rejected') {
             await session.abortTransaction();
             session.endSession();
             return res.status(400).json({ message: `无法更改一个已${request.status === 'completed' ? '完成' : '拒绝'}的申请状态。` });
        }

        // The core logic for stock deduction on approval
        if (status === 'approved' && request.status === 'pending') {
            for (const item of request.items) {
                const ingredient = await Ingredient.findById(item.ingredientId).session(session);
                if (!ingredient) {
                    throw new Error(`物料 ${item.name} (ID: ${item.ingredientId}) 不存在。`);
                }
                if (!ingredient.mainWarehouseStock) {
                    throw new Error(`物料 ${item.name} 在主仓库没有库存记录。`);
                }
                if (ingredient.mainWarehouseStock.quantity < item.quantity) {
                    throw new Error(`物料 ${item.name} 库存不足。需要 ${item.quantity}, 但只有 ${ingredient.mainWarehouseStock.quantity}。`);
                }
                ingredient.mainWarehouseStock.quantity -= item.quantity;
                await ingredient.save({ session });
            }
        }

        request.status = status;
        await request.save({ session });

        await session.commitTransaction();
        session.endSession();

        res.json({ message: `申请状态已成功更新为 ${status}`, request });

    } catch (error) {
        await session.abortTransaction();
        session.endSession();
        console.error('Error updating transfer request status:', error);
        res.status(500).json({ message: `更新申请状态失败: ${error.message}` });
    }
}; 