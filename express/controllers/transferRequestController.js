const TransferRequest = require('../models/TransferRequest');
const StoreInventory = require('../models/StoreInventory');
const Store = require('../models/Store');
const mongoose = require('mongoose');

// Create a new transfer request
exports.createRequest = async (req, res) => {
    const { items, notes, requestedBy } = req.body;
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
            requestedBy: requestedBy || '移动端用户', // Use provided name or fallback
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
        const { startDate, endDate } = req.query;
        let filter = { storeId };

        if (startDate && endDate) {
            filter.createdAt = {
                $gte: new Date(new Date(startDate).setHours(0, 0, 0, 0)),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
            };
        }

        const requests = await TransferRequest.find(filter)
            .sort({ createdAt: -1 }) // Show latest requests first
            .limit(200); // Limit to a reasonable number

        res.json(requests);
    } catch (error) {
        console.error('Error fetching transfer requests:', error);
        res.status(500).json({ message: '获取申请记录失败。' });
    }
};

// Get all transfer requests from all stores (for admin/approval view)
exports.getAllRequests = async (req, res) => {
    try {
        const { status, startDate, endDate } = req.query;
        let filter = {};

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Add 1 day to endDate to include the entire day
                const endOfDay = new Date(endDate);
                endOfDay.setDate(endOfDay.getDate() + 1);
                filter.createdAt.$lt = endOfDay;
            }
        }

        const requests = await TransferRequest.find(filter)
            .populate('storeId', 'name') // Populate store name
            .populate({
                path: 'items.ingredientId',
                select: 'price' // Only select the price field
            })
            .sort({ createdAt: -1 })
            .lean(); // Use lean for better performance
        res.json(requests);
    } catch (error) {
        console.error('Error fetching all transfer requests:', error);
        res.status(500).json({ message: '获取所有调拨申请失败。' });
    }
};

// Update a transfer request status
exports.updateRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ message: '无效的状态' });
    }

    try {
        // We need to populate storeId to get its details if needed, though not strictly required for the logic itself.
        const request = await TransferRequest.findById(id).populate('storeId');
        if (!request) {
            return res.status(404).json({ message: '申请未找到' });
        }

        if (request.status === 'completed' || request.status === 'rejected') {
            return res.status(400).json({ message: `无法更改已${request.status}的申请状态。` });
        }
        
        // Corrected Logic: If approved, deduct stock from the requesting store's main warehouse.
        if (status === 'approved' && request.status === 'pending') {
            try {
                const requestingStoreId = request.storeId._id;

                // 1. Pre-check all items in the requesting store's inventory
                const ingredientIds = request.items.map(item => item.ingredientId);
                const inventoryItems = await StoreInventory.find({
                    storeId: requestingStoreId,
                    ingredientId: { $in: ingredientIds }
                });

                const inventoryMap = inventoryItems.reduce((map, item) => {
                    map[item.ingredientId.toString()] = item;
                    return map;
                }, {});

                for (const item of request.items) {
                    const inventoryItem = inventoryMap[item.ingredientId.toString()];
                    if (!inventoryItem || inventoryItem.mainWarehouseStock.quantity < item.quantity) {
                        throw new Error(`门店 "${request.storeId.name}" 库存不足: ${item.name}`);
                    }
                }

                // 2. If all checks pass, proceed with deduction
                for (const item of request.items) {
                    const inventoryItem = inventoryMap[item.ingredientId.toString()];
                    inventoryItem.mainWarehouseStock.quantity -= item.quantity;
                    // No need for markModified if it's a direct update to a path Mongoose tracks
                    await inventoryItem.save();
                }

                // 3. Update request status
                request.status = status;
                await request.save();

                res.json({ message: `申请已批准，门店主仓库库存已扣除`, request });

            } catch (error) {
                console.error('Error during approval process:', error);
                return res.status(400).json({ message: error.message || '批准申请并扣除库存时出错' });
            }
        } else { // For 'rejected' or other status changes that don't affect inventory
            request.status = status;
            await request.save();
            res.json({ message: `申请已更新为 ${status}`, request });
        }
    } catch (error) {
        console.error(`Error updating request ${id} to ${status}:`, error);
        res.status(500).json({ message: '更新申请状态失败。' });
    }
}; 

// Bulk approve transfer requests
exports.bulkApproveRequests = async (req, res) => {
    const { requestIds } = req.body;

    if (!Array.isArray(requestIds) || requestIds.length === 0) {
        return res.status(400).json({ message: '请提供需要批准的申请ID列表。' });
    }

    try {
        // --- Phase 1: Pre-flight checks and data aggregation ---
        const requestsToApprove = await TransferRequest.find({
            _id: { $in: requestIds },
            status: 'pending'
        }).populate('storeId', 'name');

        if (requestsToApprove.length === 0) {
            return res.status(400).json({ message: '在所选申请中，未找到任何有效的待处理项。' });
        }

        // Group requests by storeId and aggregate item quantities
        const requestsByStore = requestsToApprove.reduce((acc, req) => {
            const storeId = req.storeId._id.toString();
            if (!acc[storeId]) {
                acc[storeId] = {
                    storeName: req.storeId.name,
                    requests: [],
                    aggregatedItems: {}
                };
            }
            acc[storeId].requests.push(req);
            for (const item of req.items) {
                 const ingredientId = item.ingredientId.toString();
                 if (!acc[storeId].aggregatedItems[ingredientId]) {
                    acc[storeId].aggregatedItems[ingredientId] = { quantity: 0, name: item.name };
                 }
                 acc[storeId].aggregatedItems[ingredientId].quantity += item.quantity;
            }
            return acc;
        }, {});

        // --- Phase 2: Stock validation for each store ---
        for (const storeId in requestsByStore) {
            const storeData = requestsByStore[storeId];
            const ingredientIdsForStore = Object.keys(storeData.aggregatedItems);

            const inventoryItems = await StoreInventory.find({
                storeId: storeId,
                ingredientId: { $in: ingredientIdsForStore }
            });

            const inventoryMap = inventoryItems.reduce((map, item) => {
                map[item.ingredientId.toString()] = item.mainWarehouseStock.quantity;
                return map;
            }, {});

            for (const ingredientId in storeData.aggregatedItems) {
                const required = storeData.aggregatedItems[ingredientId];
                const available = inventoryMap[ingredientId] || 0;
                if (available < required.quantity) {
                    throw new Error(`门店 "${storeData.storeName}" 库存不足: ${required.name} (共需要 ${required.quantity}, 当前可用 ${available})`);
                }
            }
        }

        // --- Phase 3: If all checks pass, perform updates ---
        let approvedCount = 0;
        for (const req of requestsToApprove) {
             for (const item of req.items) {
                const inventoryItem = await StoreInventory.findOne({
                    storeId: req.storeId._id,
                    ingredientId: item.ingredientId
                });
                inventoryItem.mainWarehouseStock.quantity -= item.quantity;
                await inventoryItem.save();
            }
            req.status = 'approved';
            await req.save();
            approvedCount++;
        }

        res.json({ message: `成功批准 ${approvedCount} 条申请。` });

    } catch (error) {
        console.error("Bulk approve error:", error);
        res.status(400).json({ message: error.message || "一键批准操作失败。" });
    }
}; 