const mongoose = require('mongoose');
const FillingRecipe = require('../express/models/FillingRecipe');
const connectDB = require('../express/config/db');

// 连接数据库
connectDB();

async function fixSpecificSubFilling() {
  try {
    console.log('开始修复特定的 subFillings 问题...');
    
    // 查找 ID 为 "6890511828bf9d9220d3289f" 的配方
    const recipe = await FillingRecipe.findById('6890511828bf9d9220d3289f');
    
    if (!recipe) {
      console.log('未找到指定的配方');
      return;
    }
    
    console.log(`找到配方: ${recipe.name}`);
    console.log('当前 subFillings:', JSON.stringify(recipe.subFillings, null, 2));
    
    if (recipe.subFillings && recipe.subFillings.length > 0) {
      let needsUpdate = false;
      
      recipe.subFillings.forEach((subFilling, index) => {
        console.log(`检查 subFilling[${index}]:`, subFilling);
        
        // 如果缺少 name 字段，使用 id 作为 name
        if (!subFilling.name && subFilling.id) {
          subFilling.name = subFilling.id;
          needsUpdate = true;
          console.log(`修复 subFilling[${index}] name 字段: ${subFilling.id}`);
        }
        
        // 确保其他必需字段存在
        if (!subFilling.id) {
          subFilling.id = `sub-${Date.now()}-${index}`;
          needsUpdate = true;
          console.log(`修复 subFilling[${index}] id 字段`);
        }
        
        if (subFilling.quantity === undefined || subFilling.quantity === null) {
          subFilling.quantity = 0;
          needsUpdate = true;
          console.log(`修复 subFilling[${index}] quantity 字段`);
        }
        
        if (!subFilling.unit) {
          subFilling.unit = 'g';
          needsUpdate = true;
          console.log(`修复 subFilling[${index}] unit 字段`);
        }
      });
      
      if (needsUpdate) {
        await recipe.save();
        console.log('✅ 配方已更新');
        console.log('更新后的 subFillings:', JSON.stringify(recipe.subFillings, null, 2));
      } else {
        console.log('✅ 配方无需更新');
      }
    } else {
      console.log('配方没有 subFillings');
    }
    
  } catch (error) {
    console.error('修复过程中出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行修复
fixSpecificSubFilling();