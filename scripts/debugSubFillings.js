const mongoose = require('mongoose');
const FillingRecipe = require('../express/models/FillingRecipe');
const connectDB = require('../express/config/db');

// 连接数据库
connectDB();

async function debugSubFillings() {
  try {
    console.log('开始调试 subFillings 问题...');
    
    // 查找所有馅料配方
    const recipes = await FillingRecipe.find({});
    console.log(`找到 ${recipes.length} 个馅料配方`);
    
    // 检查每个配方的 subFillings
    for (const recipe of recipes) {
      console.log(`\n检查配方: ${recipe.name} (ID: ${recipe._id})`);
      
      if (recipe.subFillings && recipe.subFillings.length > 0) {
        console.log(`  subFillings 数量: ${recipe.subFillings.length}`);
        
        recipe.subFillings.forEach((subFilling, index) => {
          console.log(`  subFilling[${index}]:`, {
            id: subFilling.id,
            name: subFilling.name,
            quantity: subFilling.quantity,
            unit: subFilling.unit
          });
          
          // 检查缺失的必需字段
          const missingFields = [];
          if (!subFilling.id) missingFields.push('id');
          if (!subFilling.name) missingFields.push('name');
          if (subFilling.quantity === undefined || subFilling.quantity === null) missingFields.push('quantity');
          if (!subFilling.unit) missingFields.push('unit');
          
          if (missingFields.length > 0) {
            console.log(`    ❌ 缺失字段: ${missingFields.join(', ')}`);
          } else {
            console.log(`    ✅ 所有必需字段都存在`);
          }
        });
      } else {
        console.log(`  没有 subFillings`);
      }
    }
    
  } catch (error) {
    console.error('调试过程中出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 修复有问题的 subFillings
async function fixSubFillings() {
  try {
    console.log('\n开始修复 subFillings 问题...');
    
    const recipes = await FillingRecipe.find({});
    
    for (const recipe of recipes) {
      let needsUpdate = false;
      
      if (recipe.subFillings && recipe.subFillings.length > 0) {
        recipe.subFillings.forEach((subFilling, index) => {
          // 修复缺失的字段
          if (!subFilling.name && subFilling.id) {
            subFilling.name = `子馅料-${subFilling.id}`;
            needsUpdate = true;
            console.log(`修复配方 ${recipe.name} 的 subFilling[${index}] name 字段`);
          }
          
          if (!subFilling.id) {
            subFilling.id = `sub-${Date.now()}-${index}`;
            needsUpdate = true;
            console.log(`修复配方 ${recipe.name} 的 subFilling[${index}] id 字段`);
          }
          
          if (subFilling.quantity === undefined || subFilling.quantity === null) {
            subFilling.quantity = 0;
            needsUpdate = true;
            console.log(`修复配方 ${recipe.name} 的 subFilling[${index}] quantity 字段`);
          }
          
          if (!subFilling.unit) {
            subFilling.unit = 'g';
            needsUpdate = true;
            console.log(`修复配方 ${recipe.name} 的 subFilling[${index}] unit 字段`);
          }
        });
        
        if (needsUpdate) {
          await recipe.save();
          console.log(`✅ 已更新配方: ${recipe.name}`);
        }
      }
    }
    
    console.log('\n修复完成！');
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 根据命令行参数决定执行哪个功能
const action = process.argv[2];

if (action === 'fix') {
  fixSubFillings();
} else {
  debugSubFillings();
}