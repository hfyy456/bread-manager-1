const mongoose = require('mongoose');
const connectDB = require('../express/config/db');

/**
 * 优化仓库相关的数据库索引
 * 提高查询性能
 */

const optimizeIndexes = async () => {
  try {
    console.log('🚀 开始优化数据库索引...');
    
    // 连接数据库
    await connectDB();
    
    const db = mongoose.connection.db;
    
    // 1. 优化 Ingredient 集合索引
    console.log('📦 优化 Ingredient 集合索引...');
    const ingredientCollection = db.collection('ingredients');
    
    // 创建复合索引用于排序和查询
    await ingredientCollection.createIndex({ name: 1 }, { background: true });
    await ingredientCollection.createIndex({ price: 1 }, { background: true });
    await ingredientCollection.createIndex({ name: 1, price: 1 }, { background: true });
    
    console.log('✅ Ingredient 索引优化完成');
    
    // 2. 优化 StoreInventory 集合索引
    console.log('🏪 优化 StoreInventory 集合索引...');
    const storeInventoryCollection = db.collection('storeinventories');
    
    // 创建复合索引用于快速查找门店库存
    await storeInventoryCollection.createIndex(
      { storeId: 1, ingredientId: 1 }, 
      { unique: true, background: true }
    );
    await storeInventoryCollection.createIndex({ storeId: 1 }, { background: true });
    await storeInventoryCollection.createIndex({ ingredientId: 1 }, { background: true });
    
    // 为主仓库存数量创建索引（用于库存不足检查）
    await storeInventoryCollection.createIndex(
      { 'mainWarehouseStock.quantity': 1 }, 
      { background: true }
    );
    
    console.log('✅ StoreInventory 索引优化完成');
    
    // 3. 优化 TransferRequest 集合索引
    console.log('📋 优化 TransferRequest 集合索引...');
    const transferRequestCollection = db.collection('transferrequests');
    
    // 创建复合索引用于查询申请记录
    await transferRequestCollection.createIndex({ storeId: 1 }, { background: true });
    await transferRequestCollection.createIndex({ status: 1 }, { background: true });
    await transferRequestCollection.createIndex({ createdAt: -1 }, { background: true });
    await transferRequestCollection.createIndex(
      { storeId: 1, status: 1, createdAt: -1 }, 
      { background: true }
    );
    await transferRequestCollection.createIndex(
      { requestedBy: 1, createdAt: -1 }, 
      { background: true }
    );
    
    console.log('✅ TransferRequest 索引优化完成');
    
    // 4. 优化 Store 集合索引
    console.log('🏢 优化 Store 集合索引...');
    const storeCollection = db.collection('stores');
    
    await storeCollection.createIndex({ name: 1 }, { background: true });
    await storeCollection.createIndex({ warehouseManagers: 1 }, { background: true });
    
    console.log('✅ Store 索引优化完成');
    
    // 5. 显示所有索引信息
    console.log('\n📊 当前索引状态:');
    
    const collections = ['ingredients', 'storeinventories', 'transferrequests', 'stores'];
    
    for (const collectionName of collections) {
      console.log(`\n${collectionName}:`);
      const collection = db.collection(collectionName);
      const indexes = await collection.indexes();
      
      indexes.forEach(index => {
        console.log(`  - ${JSON.stringify(index.key)} ${index.unique ? '(unique)' : ''}`);
      });
    }
    
    // 6. 分析查询性能
    console.log('\n🔍 分析查询性能...');
    
    // 测试仓库库存查询性能
    const testStoreId = new mongoose.Types.ObjectId();
    
    console.log('测试仓库库存查询...');
    const warehouseQueryStart = Date.now();
    
    await ingredientCollection.find({}).sort({ name: 1 }).limit(1).toArray();
    await storeInventoryCollection.find({ storeId: testStoreId }).limit(1).toArray();
    
    const warehouseQueryTime = Date.now() - warehouseQueryStart;
    console.log(`仓库查询耗时: ${warehouseQueryTime}ms`);
    
    // 测试申请记录查询性能
    console.log('测试申请记录查询...');
    const requestQueryStart = Date.now();
    
    await transferRequestCollection.find({ storeId: testStoreId })
      .sort({ createdAt: -1 })
      .limit(1)
      .toArray();
    
    const requestQueryTime = Date.now() - requestQueryStart;
    console.log(`申请记录查询耗时: ${requestQueryTime}ms`);
    
    console.log('\n🎉 数据库索引优化完成！');
    
    // 提供性能建议
    console.log('\n💡 性能优化建议:');
    console.log('1. 定期运行此脚本以保持索引最新');
    console.log('2. 监控慢查询日志');
    console.log('3. 考虑使用数据库连接池');
    console.log('4. 在生产环境中启用查询缓存');
    
  } catch (error) {
    console.error('❌ 索引优化失败:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('📝 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行优化
if (require.main === module) {
  optimizeIndexes();
}

module.exports = optimizeIndexes;