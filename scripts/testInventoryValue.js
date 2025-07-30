const mongoose = require('mongoose');
const connectDB = require('../express/config/db');
const Ingredient = require('../express/models/Ingredient');
const StoreInventory = require('../express/models/StoreInventory');
const Store = require('../express/models/Store');

/**
 * 测试库存价值计算功能
 * 验证仓库+岗位库存价值计算的正确性
 */

const testInventoryValue = async () => {
  try {
    console.log('🚀 开始测试库存价值计算...\n');
    
    // 连接数据库
    await connectDB();
    
    // 1. 创建测试门店
    console.log('📍 创建测试门店...');
    const testStore = new Store({
      name: '库存价值测试门店',
      address: '测试地址'
    });
    await testStore.save();
    console.log(`✅ 测试门店创建完成: ${testStore._id}\n`);
    
    // 2. 创建测试原料
    console.log('📦 创建测试原料...');
    const testIngredients = [
      { name: '面粉A', price: 10.5, unit: 'kg' },
      { name: '糖B', price: 8.2, unit: 'kg' },
      { name: '油C', price: 15.0, unit: 'L' },
      { name: '盐D', price: 3.5, unit: 'kg' },
      { name: '酵母E', price: 25.0, unit: 'g' }
    ];
    
    const createdIngredients = [];
    for (const ingredientData of testIngredients) {
      const ingredient = new Ingredient({
        ...ingredientData,
        min: ingredientData.unit,
        norms: 1,
        post: '烘焙'
      });
      await ingredient.save();
      createdIngredients.push(ingredient);
      console.log(`  ✓ 创建原料: ${ingredient.name} - ¥${ingredient.price}/${ingredient.unit}`);
    }
    console.log('');
    
    // 3. 创建测试库存数据
    console.log('📊 创建测试库存数据...');
    const testInventories = [
      {
        ingredientId: createdIngredients[0]._id, // 面粉A
        mainWarehouseStock: { quantity: 100, unit: 'kg' }, // 100kg * 10.5 = 1050
        stockByPost: {
          '烘焙': { quantity: 20, unit: 'kg' }, // 20kg * 10.5 = 210
          '包装': { quantity: 5, unit: 'kg' }   // 5kg * 10.5 = 52.5
        }
      },
      {
        ingredientId: createdIngredients[1]._id, // 糖B
        mainWarehouseStock: { quantity: 50, unit: 'kg' }, // 50kg * 8.2 = 410
        stockByPost: {
          '烘焙': { quantity: 10, unit: 'kg' }  // 10kg * 8.2 = 82
        }
      },
      {
        ingredientId: createdIngredients[2]._id, // 油C
        mainWarehouseStock: { quantity: 30, unit: 'L' }, // 30L * 15.0 = 450
        stockByPost: {
          '烘焙': { quantity: 8, unit: 'L' },   // 8L * 15.0 = 120
          '包装': { quantity: 2, unit: 'L' }    // 2L * 15.0 = 30
        }
      },
      {
        ingredientId: createdIngredients[3]._id, // 盐D
        mainWarehouseStock: { quantity: 0, unit: 'kg' }, // 0
        stockByPost: {
          '烘焙': { quantity: 3, unit: 'kg' }   // 3kg * 3.5 = 10.5
        }
      },
      {
        ingredientId: createdIngredients[4]._id, // 酵母E
        mainWarehouseStock: { quantity: 1000, unit: 'g' }, // 1000g * 25.0 = 25000
        stockByPost: {} // 无岗位库存
      }
    ];
    
    let expectedMainValue = 0;
    let expectedPostValue = 0;
    
    for (const inventoryData of testInventories) {
      const inventory = new StoreInventory({
        storeId: testStore._id,
        ...inventoryData
      });
      await inventory.save();
      
      const ingredient = createdIngredients.find(ing => 
        ing._id.toString() === inventoryData.ingredientId.toString()
      );
      
      // 计算预期价值
      const mainValue = (inventoryData.mainWarehouseStock?.quantity || 0) * ingredient.price;
      expectedMainValue += mainValue;
      
      let postValue = 0;
      if (inventoryData.stockByPost) {
        Object.values(inventoryData.stockByPost).forEach(stock => {
          postValue += (stock.quantity || 0) * ingredient.price;
        });
      }
      expectedPostValue += postValue;
      
      console.log(`  ✓ ${ingredient.name}:`);
      console.log(`    主仓: ${inventoryData.mainWarehouseStock?.quantity || 0}${ingredient.unit} = ¥${mainValue.toFixed(2)}`);
      console.log(`    岗位: ${Object.values(inventoryData.stockByPost || {}).reduce((sum, stock) => sum + (stock.quantity || 0), 0)}${ingredient.unit} = ¥${postValue.toFixed(2)}`);
    }
    
    const expectedTotalValue = expectedMainValue + expectedPostValue;
    
    console.log('\n📈 预期计算结果:');
    console.log(`  主仓价值: ¥${expectedMainValue.toFixed(2)}`);
    console.log(`  岗位价值: ¥${expectedPostValue.toFixed(2)}`);
    console.log(`  总价值: ¥${expectedTotalValue.toFixed(2)}`);
    
    // 4. 测试API计算结果
    console.log('\n🧪 测试API计算结果...');
    
    // 模拟API调用
    const { getStoreInventoryValue } = require('../express/controllers/inventoryValueController');
    
    // 创建模拟的req和res对象
    const mockReq = {
      header: (name) => name === 'x-current-store-id' ? testStore._id.toString() : null
    };
    
    let apiResult = null;
    const mockRes = {
      json: (data) => {
        apiResult = data;
      },
      status: (code) => ({
        json: (data) => {
          apiResult = { statusCode: code, ...data };
        }
      })
    };
    
    await getStoreInventoryValue(mockReq, mockRes);
    
    if (apiResult && apiResult.success) {
      const { summary } = apiResult.data;
      
      console.log('  API计算结果:');
      console.log(`    主仓价值: ¥${summary.mainWarehouseValue.toFixed(2)}`);
      console.log(`    岗位价值: ¥${summary.postStockValue.toFixed(2)}`);
      console.log(`    总价值: ¥${summary.totalValue.toFixed(2)}`);
      
      // 验证结果
      const mainDiff = Math.abs(summary.mainWarehouseValue - expectedMainValue);
      const postDiff = Math.abs(summary.postStockValue - expectedPostValue);
      const totalDiff = Math.abs(summary.totalValue - expectedTotalValue);
      
      console.log('\n✅ 验证结果:');
      console.log(`  主仓价值差异: ¥${mainDiff.toFixed(2)} ${mainDiff < 0.01 ? '✓' : '✗'}`);
      console.log(`  岗位价值差异: ¥${postDiff.toFixed(2)} ${postDiff < 0.01 ? '✓' : '✗'}`);
      console.log(`  总价值差异: ¥${totalDiff.toFixed(2)} ${totalDiff < 0.01 ? '✓' : '✗'}`);
      
      if (mainDiff < 0.01 && postDiff < 0.01 && totalDiff < 0.01) {
        console.log('\n🎉 所有测试通过！库存价值计算正确。');
      } else {
        console.log('\n❌ 测试失败！计算结果与预期不符。');
      }
      
      // 显示详细统计
      console.log('\n📊 详细统计:');
      console.log(`  总原料数: ${apiResult.data.counts.totalIngredients}`);
      console.log(`  有主仓库存: ${apiResult.data.counts.itemsWithMainStock}种`);
      console.log(`  有岗位库存: ${apiResult.data.counts.itemsWithPostStock}种`);
      console.log(`  主仓占比: ${summary.mainPercentage.toFixed(1)}%`);
      console.log(`  岗位占比: ${summary.postPercentage.toFixed(1)}%`);
      
    } else {
      console.log('❌ API调用失败:', apiResult);
    }
    
    // 5. 清理测试数据
    console.log('\n🧹 清理测试数据...');
    await StoreInventory.deleteMany({ storeId: testStore._id });
    await Store.findByIdAndDelete(testStore._id);
    await Ingredient.deleteMany({ 
      _id: { $in: createdIngredients.map(ing => ing._id) }
    });
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行测试
if (require.main === module) {
  testInventoryValue();
}

module.exports = testInventoryValue;