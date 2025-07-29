/**
 * 检查主仓库存数据脚本
 * 用于诊断主仓库存数据拉取问题
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bread-manager';

async function checkWarehouseStock() {
  try {
    console.log('连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    // 1. 检查门店数量
    const storesCount = await db.collection('stores').countDocuments();
    console.log(`\n📊 数据库统计:`);
    console.log(`- 门店数量: ${storesCount}`);
    
    // 2. 检查原料数量
    const ingredientsCount = await db.collection('ingredients').countDocuments();
    console.log(`- 原料数量: ${ingredientsCount}`);
    
    // 3. 检查库存记录数量
    const inventoriesCount = await db.collection('storeinventories').countDocuments();
    console.log(`- 库存记录数量: ${inventoriesCount}`);
    
    if (inventoriesCount === 0) {
      console.log('\n❌ 没有找到任何库存记录！');
      console.log('建议：请先在系统中添加一些库存数据。');
      return;
    }
    
    // 4. 检查有主仓库存的记录
    const warehouseStockCount = await db.collection('storeinventories').countDocuments({
      'mainWarehouseStock.quantity': { $gt: 0 }
    });
    console.log(`- 有主仓库存的记录: ${warehouseStockCount}`);
    
    if (warehouseStockCount === 0) {
      console.log('\n⚠️ 没有找到任何主仓库存数据！');
      
      // 检查库存记录的结构
      const sampleInventory = await db.collection('storeinventories').findOne();
      if (sampleInventory) {
        console.log('\n📋 库存记录样本结构:');
        console.log(JSON.stringify(sampleInventory, null, 2));
      }
      
      console.log('\n💡 建议解决方案:');
      console.log('1. 检查库存记录中是否有 mainWarehouseStock 字段');
      console.log('2. 确保 mainWarehouseStock.quantity > 0');
      console.log('3. 在大仓库存管理页面添加一些库存数据');
      return;
    }
    
    // 5. 按门店分组显示主仓库存
    const warehouseStockByStore = await db.collection('storeinventories').aggregate([
      {
        $match: {
          'mainWarehouseStock.quantity': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$storeId',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$mainWarehouseStock.quantity' }
        }
      },
      {
        $lookup: {
          from: 'stores',
          localField: '_id',
          foreignField: '_id',
          as: 'store'
        }
      }
    ]).toArray();
    
    console.log('\n🏪 各门店主仓库存统计:');
    for (const storeStock of warehouseStockByStore) {
      const storeName = storeStock.store[0]?.name || '未知门店';
      console.log(`- ${storeName} (${storeStock._id}): ${storeStock.count} 种原料, 总量: ${storeStock.totalQuantity.toFixed(2)}`);
    }
    
    // 6. 显示前5个主仓库存记录
    const topWarehouseStock = await db.collection('storeinventories').aggregate([
      {
        $match: {
          'mainWarehouseStock.quantity': { $gt: 0 }
        }
      },
      {
        $lookup: {
          from: 'ingredients',
          localField: 'ingredientId',
          foreignField: '_id',
          as: 'ingredient'
        }
      },
      {
        $sort: { 'mainWarehouseStock.quantity': -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          ingredientName: { $arrayElemAt: ['$ingredient.name', 0] },
          quantity: '$mainWarehouseStock.quantity',
          unit: '$mainWarehouseStock.unit',
          storeId: 1
        }
      }
    ]).toArray();
    
    console.log('\n🔝 主仓库存前5名:');
    topWarehouseStock.forEach((item, index) => {
      console.log(`${index + 1}. ${item.ingredientName}: ${item.quantity} ${item.unit} (门店: ${item.storeId})`);
    });
    
    console.log('\n✅ 主仓库存数据检查完成！');
    
  } catch (error) {
    console.error('检查主仓库存数据时出错:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  checkWarehouseStock()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { checkWarehouseStock };