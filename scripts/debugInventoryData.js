/**
 * 调试库存数据脚本
 * 检查原料和库存数据的结构和内容
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 使用与服务器相同的数据库配置
const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
const DB_PORT = process.env.MONGO_PORT || '32233';
const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';
const MONGODB_URI = process.env.MONGO_URI || `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;

async function debugInventoryData() {
  try {
    console.log('连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    // 1. 检查门店
    const stores = await db.collection('stores').find().toArray();
    console.log(`\n📍 门店列表 (${stores.length} 个):`);
    stores.forEach(store => {
      console.log(`- ${store.name} (${store._id})`);
    });
    
    if (stores.length === 0) {
      console.log('❌ 没有门店数据！');
      return;
    }
    
    const firstStore = stores[0];
    console.log(`\n🔍 使用门店: ${firstStore.name} (${firstStore._id})`);
    
    // 2. 检查原料数据
    const ingredients = await db.collection('ingredients').find().limit(5).toArray();
    console.log(`\n🥖 原料样本 (前5个):`);
    ingredients.forEach(ing => {
      console.log(`- ${ing.name} (${ing._id}): ${ing.unit}, ¥${ing.price}`);
    });
    
    // 3. 检查库存数据结构
    const inventories = await db.collection('storeinventories').find({
      storeId: firstStore._id
    }).limit(3).toArray();
    
    console.log(`\n📦 库存记录样本 (${inventories.length} 个):`);
    inventories.forEach((inv, index) => {
      console.log(`\n--- 库存记录 ${index + 1} ---`);
      console.log(`门店ID: ${inv.storeId}`);
      console.log(`原料ID: ${inv.ingredientId}`);
      console.log(`主仓库存:`, inv.mainWarehouseStock);
      console.log(`岗位库存:`, inv.stockByPost);
      console.log(`创建时间: ${inv.createdAt}`);
    });
    
    // 4. 检查有库存的记录
    const inventoriesWithStock = await db.collection('storeinventories').find({
      storeId: firstStore._id,
      $or: [
        { 'mainWarehouseStock.quantity': { $gt: 0 } },
        { 'stockByPost': { $exists: true, $ne: {} } }
      ]
    }).toArray();
    
    console.log(`\n📊 有库存的记录数量: ${inventoriesWithStock.length}`);
    
    if (inventoriesWithStock.length > 0) {
      console.log(`\n有库存的记录详情:`);
      inventoriesWithStock.slice(0, 3).forEach((inv, index) => {
        console.log(`\n--- 有库存记录 ${index + 1} ---`);
        
        // 计算岗位总库存
        let postTotal = 0;
        if (inv.stockByPost && typeof inv.stockByPost === 'object') {
          Object.entries(inv.stockByPost).forEach(([postId, stock]) => {
            console.log(`  岗位 ${postId}: ${stock?.quantity || 0} ${stock?.unit || ''}`);
            if (stock?.quantity) {
              postTotal += stock.quantity;
            }
          });
        }
        
        const mainStock = inv.mainWarehouseStock?.quantity || 0;
        console.log(`  主仓库存: ${mainStock}`);
        console.log(`  岗位总库存: ${postTotal}`);
        console.log(`  总库存: ${mainStock + postTotal}`);
      });
    } else {
      console.log('⚠️ 没有找到有库存的记录！');
      
      // 检查是否有任何库存记录
      const totalInventories = await db.collection('storeinventories').countDocuments({
        storeId: firstStore._id
      });
      
      if (totalInventories === 0) {
        console.log('❌ 该门店没有任何库存记录！');
        console.log('💡 建议运行: npm run init:warehouse');
      } else {
        console.log(`📝 该门店有 ${totalInventories} 个库存记录，但都没有库存数量`);
      }
    }
    
    console.log(`\n✅ 调试完成！`);
    
  } catch (error) {
    console.error('调试库存数据时出错:', error);
    console.error('错误堆栈:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  debugInventoryData()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { debugInventoryData };