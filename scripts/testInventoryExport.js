const mongoose = require('mongoose');
const connectDB = require('../express/config/db');
const Ingredient = require('../express/models/Ingredient');
const StoreInventory = require('../express/models/StoreInventory');
const Store = require('../express/models/Store');

/**
 * 测试库存导出功能
 * 验证Excel导出API的正确性
 */

const testInventoryExport = async () => {
  try {
    console.log('🚀 开始测试库存导出功能...\n');
    
    // 连接数据库
    await connectDB();
    
    // 1. 创建测试门店
    console.log('📍 创建测试门店...');
    const testStore = new Store({
      name: '库存导出测试门店',
      address: '测试地址'
    });
    await testStore.save();
    console.log(`✅ 测试门店创建完成: ${testStore._id}\n`);
    
    // 2. 创建测试原料
    console.log('📦 创建测试原料...');
    const testIngredients = [
      { name: '面粉A', price: 10.5, unit: 'kg', specs: '高筋面粉' },
      { name: '糖B', price: 8.2, unit: 'kg', specs: '细砂糖' },
      { name: '油C', price: 15.0, unit: 'L', specs: '菜籽油' }
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
      console.log(`  ✓ 创建原料: ${ingredient.name}`);
    }
    console.log('');
    
    // 3. 创建测试库存数据
    console.log('📊 创建测试库存数据...');
    const testInventories = [
      {
        ingredientId: createdIngredients[0]._id,
        mainWarehouseStock: { quantity: 100, unit: 'kg' },
        stockByPost: {
          '1': { quantity: 20, unit: 'kg' }, // 搅拌
          '2': { quantity: 15, unit: 'kg' }  // 丹麦
        }
      },
      {
        ingredientId: createdIngredients[1]._id,
        mainWarehouseStock: { quantity: 50, unit: 'kg' },
        stockByPost: {
          '1': { quantity: 10, unit: 'kg' }, // 搅拌
          '3': { quantity: 5, unit: 'kg' }   // 整形
        }
      },
      {
        ingredientId: createdIngredients[2]._id,
        mainWarehouseStock: { quantity: 30, unit: 'L' },
        stockByPost: {
          '2': { quantity: 8, unit: 'L' }    // 丹麦
        }
      }
    ];
    
    for (const inventoryData of testInventories) {
      const inventory = new StoreInventory({
        storeId: testStore._id,
        ...inventoryData
      });
      await inventory.save();
      
      const ingredient = createdIngredients.find(ing => 
        ing._id.toString() === inventoryData.ingredientId.toString()
      );
      console.log(`  ✓ ${ingredient.name}: 主仓${inventoryData.mainWarehouseStock.quantity}${ingredient.unit}, 岗位${Object.values(inventoryData.stockByPost).reduce((sum, stock) => sum + stock.quantity, 0)}${ingredient.unit}`);
    }
    console.log('');
    
    // 4. 测试导出API
    console.log('🧪 测试导出API...');
    
    const { exportInventoryRealtimeExcel } = require('../express/controllers/inventoryController');
    
    // 创建模拟的req和res对象
    const mockReq = {
      user: {
        currentStoreId: testStore._id.toString()
      }
    };
    
    let exportResult = null;
    let exportError = null;
    
    const mockRes = {
      setHeader: (name, value) => {
        console.log(`  设置响应头: ${name} = ${value}`);
      },
      send: (buffer) => {
        exportResult = buffer;
        console.log(`  ✓ Excel文件生成成功，大小: ${buffer.length} 字节`);
      },
      status: (code) => ({
        json: (data) => {
          exportError = { statusCode: code, ...data };
        }
      }),
      json: (data) => {
        exportError = data;
      }
    };
    
    console.log('  调用导出函数...');
    await exportInventoryRealtimeExcel(mockReq, mockRes);
    
    if (exportResult) {
      console.log('✅ 导出测试成功！');
      console.log(`  文件大小: ${exportResult.length} 字节`);
      console.log(`  文件类型: Excel (.xlsx)`);
      
      // 验证Excel文件结构
      const XLSX = require('xlsx');
      try {
        const workbook = XLSX.read(exportResult, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        console.log(`  工作表数量: ${sheetNames.length}`);
        console.log(`  工作表名称: ${sheetNames.join(', ')}`);
        
        if (sheetNames.length > 0) {
          const worksheet = workbook.Sheets[sheetNames[0]];
          const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          console.log(`  数据行数: ${data.length}`);
          console.log(`  表头: ${data[0] ? data[0].join(', ') : '无'}`);
          
          // 验证数据内容
          if (data.length > 1) {
            console.log('  前3行数据预览:');
            for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
              console.log(`    行${i}: ${data[i].slice(0, 10).join(' | ')}`);
            }
            
            // 验证价格和价值列
            const header = data[0];
            const priceIndex = header.findIndex(col => col && col.includes('单价'));
            const valueIndex = header.findIndex(col => col && col.includes('价值'));
            
            if (priceIndex >= 0) {
              console.log(`  ✓ 找到价格列: 第${priceIndex + 1}列`);
            }
            if (valueIndex >= 0) {
              console.log(`  ✓ 找到价值列: 第${valueIndex + 1}列`);
            }
          }
        }
        
        console.log('✅ Excel文件结构验证通过！');
        
      } catch (xlsxError) {
        console.log('❌ Excel文件结构验证失败:', xlsxError.message);
      }
      
    } else if (exportError) {
      console.log('❌ 导出测试失败:', exportError);
    } else {
      console.log('❌ 导出测试异常: 无结果返回');
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
  testInventoryExport();
}

module.exports = testInventoryExport;