const mongoose = require('mongoose');
const StoreInventory = require('../express/models/StoreInventory');
const TransferRequest = require('../express/models/TransferRequest');
const Ingredient = require('../express/models/Ingredient');
const Store = require('../express/models/Store');

// 连接数据库
const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
const DB_PORT = process.env.MONGO_PORT || '32233';
const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';
const mongoUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;

mongoose.connect(mongoUrl, {
    serverSelectionTimeoutMS: 5000,
});

async function checkButterStock() {
    try {
        console.log('=== 检查安佳无盐大黄油25kg库存情况 ===\n');
        
        // 1. 查找这个物料
        const ingredient = await Ingredient.findOne({ name: "安佳无盐大黄油25kg" });
        if (!ingredient) {
            console.log('❌ 未找到该物料');
            return;
        }
        
        console.log('📦 物料信息:');
        console.log(`   ID: ${ingredient._id}`);
        console.log(`   名称: ${ingredient.name}`);
        console.log(`   规格: ${ingredient.specs}`);
        console.log(`   单位: ${ingredient.unit}`);
        console.log(`   价格: ${ingredient.price}\n`);
        
        // 2. 查找所有门店的库存
        const inventories = await StoreInventory.find({ 
            ingredientId: ingredient._id 
        }).populate('storeId', 'name');
        
        console.log('🏪 各门店库存情况:');
        for (const inv of inventories) {
            const storeName = inv.storeId?.name || '未知门店';
            const mainStock = inv.mainWarehouseStock?.quantity || 0;
            console.log(`   ${storeName}: ${mainStock} ${ingredient.unit}`);
        }
        console.log('');
        
        // 3. 查找所有相关的转移申请
        const requests = await TransferRequest.find({
            'items.ingredientId': ingredient._id
        }).populate('storeId', 'name').sort({ createdAt: -1 });
        
        console.log('📋 相关转移申请:');
        if (requests.length === 0) {
            console.log('   无相关申请记录\n');
        } else {
            for (const req of requests) {
                const storeName = req.storeId?.name || '未知门店';
                const item = req.items.find(item => item.ingredientId.toString() === ingredient._id.toString());
                const quantity = item ? item.quantity : 0;
                const statusMap = {
                    'pending': '⏳ 待处理',
                    'approved': '✅ 已批准', 
                    'rejected': '❌ 已拒绝',
                    'completed': '✔️ 已完成'
                };
                const statusText = statusMap[req.status] || req.status;
                
                console.log(`   ${req._id.toString().slice(-6)} | ${storeName} | ${quantity} ${ingredient.unit} | ${statusText} | ${req.requestedBy || '未知'} | ${new Date(req.createdAt).toLocaleString()}`);
            }
            console.log('');
        }
        
        // 4. 计算每个门店的虚拟库存
        console.log('🧮 虚拟库存计算:');
        for (const inv of inventories) {
            const storeName = inv.storeId?.name || '未知门店';
            const storeId = inv.storeId._id;
            const mainStock = inv.mainWarehouseStock?.quantity || 0;
            
            // 计算该门店的pending申请总量（已批准的申请库存已扣除，不应再占用虚拟库存）
            const storeRequests = requests.filter(req => 
                req.storeId._id.toString() === storeId.toString() &&
                req.status === 'pending'
            );
            
            let pendingQuantity = 0;
            for (const req of storeRequests) {
                const item = req.items.find(item => item.ingredientId.toString() === ingredient._id.toString());
                if (item) {
                    pendingQuantity += item.quantity;
                }
            }
            
            const virtualStock = Math.max(0, mainStock - pendingQuantity);
            
            console.log(`   ${storeName}:`);
            console.log(`     主仓库存: ${mainStock} ${ingredient.unit}`);
            console.log(`     待处理申请: ${pendingQuantity} ${ingredient.unit}`);
            console.log(`     虚拟库存: ${virtualStock} ${ingredient.unit}`);
            
            if (storeRequests.length > 0) {
                console.log(`     相关申请:`);
                for (const req of storeRequests) {
                    const item = req.items.find(item => item.ingredientId.toString() === ingredient._id.toString());
                    if (item) {
                        console.log(`       - ${req._id.toString().slice(-6)}: ${item.quantity} ${ingredient.unit} (${req.status})`);
                    }
                }
            }
            console.log('');
        }
        
    } catch (error) {
        console.error('❌ 检查过程中出错:', error);
    } finally {
        mongoose.connection.close();
    }
}

checkButterStock();