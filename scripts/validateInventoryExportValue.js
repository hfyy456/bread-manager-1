const mongoose = require('mongoose');
const connectDB = require('../express/config/db');
const Ingredient = require('../express/models/Ingredient');
const StoreInventory = require('../express/models/StoreInventory');
const Store = require('../express/models/Store');
const XLSX = require('xlsx');

/**
 * 验证库存导出中的价值计算
 * 确保价格和总价值计算正确
 */

const validateInventoryExportValue = async () => {
  try {
    console.log('🧮 开始验证库存导出价值计算...\n');
    
    // 连接数据库
    await connectDB();
    
    // 1. 创建测试门店
    console.log('📍 创建测试门店...');
    const testStore = new Store({
      name: '价值计算验证门店',
      address: '测试地址'
    });
    await testStore.save();
    console.log(`✅ 测试门店创建完成: ${testStore._id}\n`);
    
    // 2. 创建测试原料（带明确价格）
    console.log('📦 创建测试原料...');
    const testIngredients = [
      { name: '面粉A', price: 10.00, unit: 'kg', specs: '高筋面粉' },
      { name: '糖B', price: 5.50, unit: 'kg', specs: '细砂糖' },
      { name: '油C', price: 20.00, unit: 'L', specs: '菜籽油' }
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
    
    // 3. 创建测试库存数据（精确数量）
    console.log('📊 创建测试库存数据...');
    const testInventories = [
      {
        ingredientId: createdIngredients[0]._id, // 面粉A: ¥10.00/kg
        mainWarehouseStock: { quantity: 100, unit: 'kg' }, // 100kg * 10 = 1000
        stockByPost: {
          '1': { quantity: 20, unit: 'kg' }, // 20kg * 10 = 200
          '2': { quantity: 10, unit: 'kg' }  // 10kg * 10 = 100
        }
        // 总计: 130kg * 10 = 1300元
      },
      {
        ingredientId: createdIngredients[1]._id, // 糖B: ¥5.50/kg
        mainWarehouseStock: { quantity: 50, unit: 'kg' }, // 50kg * 5.5 = 275
        stockByPost: {
          '1': { quantity: 15, unit: 'kg' }, // 15kg * 5.5 = 82.5
          '3': { quantity: 5, unit: 'kg' }   // 5kg * 5.5 = 27.5
        }
        // 总计: 70kg * 5.5 = 385元
      },
      {
        ingredientId: createdIngredients[2]._id, // 油C: ¥20.00/L
        mainWarehouseStock: { quantity: 30, unit: 'L' }, // 30L * 20 = 600
        stockByPost: {
          '2': { quantity: 8, unit: 'L' }    // 8L * 20 = 160
        }
        // 总计: 38L * 20 = 760元
      }
    ];
    
    let expectedTotalValue = 0;
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
      
      const mainStock = inventoryData.mainWarehouseStock.quantity;
      const mainValue = mainStock * ingredient.price;
      expectedMainValue += mainValue;
      
      let postStock = 0;
      Object.values(inventoryData.stockByPost).forEach(stock => {
        postStock += stock.quantity;
      });
      const postValue = postStock * ingredient.price;
      expectedPostValue += postValue;
      
      const totalValue = mainValue + postValue;
      expectedTotalValue += totalValue;
      
      console.log(`  ✓ ${ingredient.name}:`);
      console.log(`    主仓: ${mainStock}${ingredient.unit} × ¥${ingredient.price} = ¥${mainValue.toFixed(2)}`);
      console.log(`    岗位: ${postStock}${ingredient.unit} × ¥${ingredient.price} = ¥${postValue.toFixed(2)}`);
      console.log(`    小计: ¥${totalValue.toFixed(2)}`);
    }
    
    console.log('\n📈 预期价值计算结果:');
    console.log(`  主仓总价值: ¥${expectedMainValue.toFixed(2)}`);
    console.log(`  岗位总价值: ¥${expectedPostValue.toFixed(2)}`);
    console.log(`  库存总价值: ¥${expectedTotalValue.toFixed(2)}`);
    
    // 4. 测试导出并验证价值计算
    console.log('\n🧪 测试导出API并验证价值计算...');
    
    const { exportInventoryRealtimeExcel } = require('../express/controllers/inventoryController');
    
    const mockReq = {
      user: {
        currentStoreId: testStore._id.toString()
      }
    };
    
    let exportBuffer = null;
    const mockRes = {
      setHeader: () => {},
      send: (buffer) => {
        exportBuffer = buffer;
      },
      status: (code) => ({
        json: (data) => {
          console.log('❌ 导出失败:', data);
        }
      }),
      json: (data) => {
        console.log('❌ 导出失败:', data);
      }
    };
    
    await exportInventoryRealtimeExcel(mockReq, mockRes);
    
    if (exportBuffer) {
      console.log('✅ Excel文件生成成功');
      
      // 解析Excel文件验证价值计算
      const workbook = XLSX.read(exportBuffer, { type: 'buffer' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      console.log('\n🔍 验证Excel中的价值计算:');
      
      if (data.length > 0) {
        const header = data[0];
        console.log(`  表头: ${header.join(' | ')}`);
        
        // 找到关键列的索引
        const nameIndex = header.findIndex(col => col && col.includes('原料名称'));
        const priceIndex = header.findIndex(col => col && col.includes('采购单价'));
        const mainStockIndex = header.findIndex(col => col && col.includes('主仓库存'));
        const mainValueIndex = header.findIndex(col => col && col.includes('主仓价值'));
        const totalValueIndex = header.findIndex(col => col && col.includes('总价值'));
        
        console.log(`  关键列索引: 名称=${nameIndex}, 单价=${priceIndex}, 主仓库存=${mainStockIndex}, 主仓价值=${mainValueIndex}, 总价值=${totalValueIndex}`);
        
        let calculatedTotalValue = 0;
        let calculatedMainValue = 0;
        
        // 验证每行数据的价值计算
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row[nameIndex] === '【总计】') {
            // 总计行
            const excelMainValue = parseFloat(row[mainValueIndex]) || 0;
            const excelTotalValue = parseFloat(row[totalValueIndex]) || 0;
            
            console.log(`\n  📊 Excel总计行验证:`);
            console.log(`    主仓价值: Excel=¥${excelMainValue.toFixed(2)}, 预期=¥${expectedMainValue.toFixed(2)}, 差异=¥${Math.abs(excelMainValue - expectedMainValue).toFixed(2)}`);
            console.log(`    总价值: Excel=¥${excelTotalValue.toFixed(2)}, 预期=¥${expectedTotalValue.toFixed(2)}, 差异=¥${Math.abs(excelTotalValue - expectedTotalValue).toFixed(2)}`);
            
            // 验证精度
            const mainValueDiff = Math.abs(excelMainValue - expectedMainValue);
            const totalValueDiff = Math.abs(excelTotalValue - expectedTotalValue);
            
            if (mainValueDiff < 0.01 && totalValueDiff < 0.01) {
              console.log('  ✅ 价值计算验证通过！');
            } else {
              console.log('  ❌ 价值计算验证失败！');
            }
            break;
          } else if (row[nameIndex] && !row[nameIndex].includes('【')) {
            // 普通数据行
            const name = row[nameIndex];
            const price = parseFloat(row[priceIndex]) || 0;
            const mainStock = parseFloat(row[mainStockIndex]) || 0;
            const mainValue = parseFloat(row[mainValueIndex]) || 0;
            const totalValue = parseFloat(row[totalValueIndex]) || 0;
            
            const expectedMainValueForRow = mainStock * price;
            const mainValueDiff = Math.abs(mainValue - expectedMainValueForRow);
            
            console.log(`  ${name}: 主仓${mainStock} × ¥${price} = ¥${expectedMainValueForRow.toFixed(2)} (Excel: ¥${mainValue.toFixed(2)}) ${mainValueDiff < 0.01 ? '✅' : '❌'}`);
            
            calculatedMainValue += mainValue;
            calculatedTotalValue += totalValue;
          }
        }
        
        console.log(`\n  📈 累计验证结果:`);
        console.log(`    累计主仓价值: ¥${calculatedMainValue.toFixed(2)}`);
        console.log(`    累计总价值: ¥${calculatedTotalValue.toFixed(2)}`);
        
      } else {
        console.log('❌ Excel文件为空');
      }
      
    } else {
      console.log('❌ 导出失败，未生成Excel文件');
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
    console.error('❌ 验证失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行验证
if (require.main === module) {
  validateInventoryExportValue();
}

module.exports = validateInventoryExportValue;