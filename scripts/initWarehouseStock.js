/**
 * 初始化主仓库存测试数据
 * 用于快速添加一些主仓库存数据进行测试
 */

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/bread-manager';

async function initWarehouseStock() {
  try {
    console.log('连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    
    const db = mongoose.connection.db;
    
    // 1. 获取第一个门店
    const store = await db.collection('stores').findOne();
    if (!store) {
      console.log('❌ 没有找到门店数据，请先创建门店');
      return;
    }
    
    console.log(`📍 使用门店: ${store.name} (${store._id})`);
    
    // 2. 获取前10个原料
    const ingredients = await db.collection('ingredients').find().limit(10).toArray();
    if (ingredients.length === 0) {
      console.log('❌ 没有找到原料数据，请先添加原料');
      return;
    }
    
    console.log(`🥖 找到 ${ingredients.length} 个原料`);
    
    // 3. 为每个原料创建或更新库存记录
    let createdCount = 0;
    let updatedCount = 0;
    
    for (const ingredient of ingredients) {
      const randomQuantity = Math.floor(Math.random() * 100) + 10; // 10-110之间的随机数量
      
      const existingInventory = await db.collection('storeinventories').findOne({
        storeId: store._id,
        ingredientId: ingredient._id
      });
      
      if (existingInventory) {
        // 更新现有记录
        await db.collection('storeinventories').updateOne(
          { _id: existingInventory._id },
          {
            $set: {
              'mainWarehouseStock.quantity': randomQuantity,
              'mainWarehouseStock.unit': ingredient.unit,
              'mainWarehouseStock.lastUpdated': new Date()
            }
          }
        );
        updatedCount++;
        console.log(`✏️ 更新 ${ingredient.name}: ${randomQuantity} ${ingredient.unit}`);
      } else {
        // 创建新记录
        await db.collection('storeinventories').insertOne({
          storeId: store._id,
          ingredientId: ingredient._id,
          stockByPost: {},
          mainWarehouseStock: {
            quantity: randomQuantity,
            unit: ingredient.unit,
            lastUpdated: new Date()
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
        createdCount++;
        console.log(`➕ 创建 ${ingredient.name}: ${randomQuantity} ${ingredient.unit}`);
      }
    }
    
    console.log(`\n✅ 初始化完成！`);
    console.log(`- 创建了 ${createdCount} 条新记录`);
    console.log(`- 更新了 ${updatedCount} 条现有记录`);
    
    // 4. 验证结果
    const warehouseStockCount = await db.collection('storeinventories').countDocuments({
      storeId: store._id,
      'mainWarehouseStock.quantity': { $gt: 0 }
    });
    
    console.log(`- 门店 ${store.name} 现在有 ${warehouseStockCount} 种原料有主仓库存`);
    
    // 5. 显示总价值
    const inventoriesWithIngredients = await db.collection('storeinventories').aggregate([
      {
        $match: {
          storeId: store._id,
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
      }
    ]).toArray();
    
    const totalValue = inventoriesWithIngredients.reduce((sum, item) => {
      const quantity = item.mainWarehouseStock?.quantity || 0;
      const price = item.ingredient[0]?.price || 0;
      return sum + (quantity * price);
    }, 0);
    
    console.log(`- 主仓库存总价值: ¥${totalValue.toFixed(2)}`);
    
    console.log('\n🎉 现在可以测试主仓库存功能了！');
    
  } catch (error) {
    console.error('初始化主仓库存数据时出错:', error);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  initWarehouseStock()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { initWarehouseStock };