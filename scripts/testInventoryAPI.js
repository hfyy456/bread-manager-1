/**
 * 测试库存API脚本
 * 直接调用API接口测试数据返回
 */

const mongoose = require('mongoose');
require('dotenv').config();

// 导入必要的模块
const Ingredient = require('../express/models/Ingredient');
const StoreInventory = require('../express/models/StoreInventory');
const Store = require('../express/models/Store');
const { getAllIngredients } = require('../express/controllers/ingredientController');

// 使用与服务器相同的数据库配置
const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
const DB_PORT = process.env.MONGO_PORT || '32233';
const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';
const MONGODB_URI = process.env.MONGO_URI || `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;

async function testInventoryAPI() {
  try {
    console.log('连接到数据库...');
    await mongoose.connect(MONGODB_URI);
    
    // 1. 获取第一个门店
    const store = await Store.findOne();
    if (!store) {
      console.log('❌ 没有找到门店数据');
      return;
    }
    
    console.log(`📍 使用门店: ${store.name} (${store._id})`);
    
    // 2. 模拟请求对象
    const mockReq = {
      user: {
        currentStoreId: store._id
      },
      body: {}
    };
    
    const mockRes = {
      json: (data) => {
        console.log('\n📊 API响应数据:');
        console.log(`- 成功: ${data.success}`);
        if (data.success) {
          console.log(`- 数据数量: ${data.data?.length || 0}`);
          
          if (data.data && data.data.length > 0) {
            // 统计有库存的原料
            const itemsWithStock = data.data.filter(item => {
              const mainStock = item.mainWarehouseStock?.quantity || 0;
              let postStock = 0;
              
              if (item.stockByPost && typeof item.stockByPost === 'object') {
                Object.values(item.stockByPost).forEach(stock => {
                  if (stock && stock.quantity) {
                    postStock += stock.quantity;
                  }
                });
              }
              
              return mainStock > 0 || postStock > 0;
            });
            
            console.log(`- 有库存的原料数量: ${itemsWithStock.length}`);
            
            if (itemsWithStock.length > 0) {
              console.log('\n前3个有库存的原料:');
              itemsWithStock.slice(0, 3).forEach((item, index) => {
                const mainStock = item.mainWarehouseStock?.quantity || 0;
                let postStock = 0;
                
                if (item.stockByPost && typeof item.stockByPost === 'object') {
                  Object.values(item.stockByPost).forEach(stock => {
                    if (stock && stock.quantity) {
                      postStock += stock.quantity;
                    }
                  });
                }
                
                console.log(`${index + 1}. ${item.name}:`);
                console.log(`   - 主仓库存: ${mainStock} ${item.unit}`);
                console.log(`   - 岗位库存: ${postStock} ${item.unit}`);
                console.log(`   - 总库存: ${mainStock + postStock} ${item.unit}`);
                console.log(`   - stockByPost:`, JSON.stringify(item.stockByPost, null, 2));
              });
            } else {
              console.log('⚠️ API返回的数据中没有库存信息');
              
              // 显示前3个原料的原始数据
              console.log('\n前3个原料的原始数据:');
              data.data.slice(0, 3).forEach((item, index) => {
                console.log(`${index + 1}. ${item.name}:`);
                console.log(`   - mainWarehouseStock:`, item.mainWarehouseStock);
                console.log(`   - stockByPost:`, item.stockByPost);
              });
            }
          } else {
            console.log('⚠️ API没有返回数据');
          }
        } else {
          console.log(`- 错误: ${data.message}`);
        }
        return mockRes;
      },
      status: (code) => {
        console.log(`HTTP状态码: ${code}`);
        return mockRes;
      },
      set: () => mockRes
    };
    
    // 3. 调用API函数
    console.log('\n🔄 调用 getAllIngredients API...');
    await getAllIngredients(mockReq, mockRes);
    
    console.log('\n✅ API测试完成！');
    
  } catch (error) {
    console.error('测试API时出错:', error);
    console.error('错误堆栈:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('数据库连接已关闭');
  }
}

// 运行脚本
if (require.main === module) {
  testInventoryAPI()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { testInventoryAPI };