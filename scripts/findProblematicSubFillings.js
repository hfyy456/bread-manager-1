const mongoose = require('mongoose');
const FillingRecipe = require('../express/models/FillingRecipe');
const connectDB = require('../express/config/db');

// 连接数据库
connectDB();

async function findProblematicSubFillings() {
  try {
    console.log('查找所有有问题的 subFillings...');
    
    // 查找所有馅料配方
    const recipes = await FillingRecipe.find({});
    console.log(`总共找到 ${recipes.length} 个馅料配方`);
    
    const problematicRecipes = [];
    
    for (const recipe of recipes) {
      if (recipe.subFillings && recipe.subFillings.length > 0) {
        let hasProblems = false;
        const problems = [];
        
        recipe.subFillings.forEach((subFilling, index) => {
          const missingFields = [];
          
          if (!subFilling.id) missingFields.push('id');
          if (!subFilling.name) missingFields.push('name');
          if (subFilling.quantity === undefined || subFilling.quantity === null) missingFields.push('quantity');
          if (!subFilling.unit) missingFields.push('unit');
          
          if (missingFields.length > 0) {
            hasProblems = true;
            problems.push({
              index,
              subFilling: subFilling.toObject ? subFilling.toObject() : subFilling,
              missingFields
            });
          }
        });
        
        if (hasProblems) {
          problematicRecipes.push({
            _id: recipe._id,
            name: recipe.name,
            problems
          });
        }
      }
    }
    
    console.log(`\n找到 ${problematicRecipes.length} 个有问题的配方:`);
    
    problematicRecipes.forEach(recipe => {
      console.log(`\n配方: ${recipe.name} (ID: ${recipe._id})`);
      recipe.problems.forEach(problem => {
        console.log(`  subFilling[${problem.index}]:`, problem.subFilling);
        console.log(`  缺失字段: ${problem.missingFields.join(', ')}`);
      });
    });
    
    // 特别查找名为 "巧克力酥皮丝" 的配方
    console.log('\n\n特别查找 "巧克力酥皮丝" 配方:');
    const chocolateRecipes = await FillingRecipe.find({ name: "巧克力酥皮丝" });
    
    chocolateRecipes.forEach(recipe => {
      console.log(`配方: ${recipe.name} (ID: ${recipe._id})`);
      console.log(`subFillings:`, JSON.stringify(recipe.subFillings, null, 2));
    });
    
  } catch (error) {
    console.error('查找过程中出错:', error);
  } finally {
    mongoose.connection.close();
  }
}

// 运行查找
findProblematicSubFillings();