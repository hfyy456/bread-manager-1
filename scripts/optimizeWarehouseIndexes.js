/**
 * 主仓库存查询优化 - 数据库索引脚本
 * 运行此脚本来创建优化主仓库存查询的数据库索引
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bread-manager';

async function createOptimizedIndexes() {
  try {
    console.log('连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    console.log('创建主仓库存优化索引...');
    
    // 1. 为 StoreInventory 集合创建复合索引
    await db.collection('storeinventories').createIndex(
      { 
        storeId: 1, 
        ingredientId: 1,
        'mainWarehouseStock.quantity': 1 
      },
      { 
        name: 'warehouse_stock_optimization',
        background: true 
      }
    );
    console.log('✓ 创建 StoreInventory 复合索引');
    
    // 2. 为 Ingredient 集合创建常用字段索引
    await db.collection('ingredients').createIndex(
      { name: 1, createdAt: -1 },
      { 
        name: 'ingredient_name_created',
        background: true 
      }
    );
    console.log('✓ 创建 Ingredient 名称和创建时间索引');
    
    // 3. 为主仓库存数量创建稀疏索引（只索引有库存的记录）
    await db.collection('storeinventories').createIndex(
      { 'mainWarehouseStock.quantity': -1 },
      { 
        name: 'warehouse_quantity_desc',
        sparse: true,  // 稀疏索引，只索引非空值
        background: true 
      }
    );
    console.log('✓ 创建主仓库存数量稀疏索引');
    
    // 4. 为门店ID创建索引（如果不存在）
    await db.collection('storeinventories').createIndex(
      { storeId: 1 },
      { 
        name: 'store_id_index',
        background: true 
      }
    );
    console.log('✓ 创建门店ID索引');
    
    // 显示所有索引
    console.log('\n当前 StoreInventory 集合的索引:');
    const storeInventoryIndexes = await db.collection('storeinventories').indexes();
    storeInventoryIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n当前 Ingredient 集合的索引:');
    const ingredientIndexes = await db.collection('ingredients').indexes();
    ingredientIndexes.forEach(index => {
      console.log(`- ${index.name}: ${JSON.stringify(index.key)}`);
    });
    
    console.log('\n✅ 主仓库存查询优化索引创建完成！');
    
    // 测试查询性能
    console.log('\n测试查询性能...');
    const testStoreId = '507f1f77bcf86cd799439011'; // 示例门店ID
    
    const start = Date.now();
    const result = await db.collection('ingredients').aggregate([
      {
        $lookup: {
          from: 'storeinventories',
          let: { ingredientId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$ingredientId', '$$ingredientId'] },
                    { $eq: ['$storeId', testStoreId] },
                    { $gt: ['$mainWarehouseStock.quantity', 0] }
                  ]
                }
              }
            }
          ],
          as: 'storeInventory'
        }
      },
      {
        $match: {
          'storeInventory.0': { $exists: true }
        }
      },
      {
        $limit: 10
      }
    ]).toArray();
    
    const duration = Date.now() - start;
    console.log(`查询耗时: ${duration}ms, 结果数量: ${result.length}`);
    
  } catch (error) {
    console.error('创建索引时出错:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  createOptimizedIndexes()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createOptimizedIndexes };