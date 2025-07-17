const TransferRequest = require('../models/TransferRequest');
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