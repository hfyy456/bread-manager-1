const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/filling-recipes';

async function testFillingRecipeUpdate() {
  try {
    console.log('开始测试馅料配方更新功能...');
    
    // 首先获取所有馅料配方
    const listResponse = await axios.post(`${BASE_URL}/list`);
    const recipes = listResponse.data.data;
    
    if (recipes.length === 0) {
      console.log('没有找到馅料配方进行测试');
      return;
    }
    
    // 找一个有 subFillings 的配方进行测试
    const recipeWithSubFillings = recipes.find(recipe => 
      recipe.subFillings && recipe.subFillings.length > 0
    );
    
    if (!recipeWithSubFillings) {
      console.log('没有找到包含 subFillings 的配方进行测试');
      return;
    }
    
    console.log(`找到测试配方: ${recipeWithSubFillings.name}`);
    console.log('原始 subFillings:', recipeWithSubFillings.subFillings);
    
    // 测试1: 正常更新（所有字段都存在）
    console.log('\n测试1: 正常更新...');
    const updateData1 = {
      ...recipeWithSubFillings,
      description: '测试更新 - ' + new Date().toISOString(),
      subFillings: recipeWithSubFillings.subFillings.map(sf => ({
        id: sf.id,
        name: sf.name,
        quantity: sf.quantity,
        unit: sf.unit
      }))
    };
    
    try {
      const updateResponse1 = await axios.put(`${BASE_URL}/${recipeWithSubFillings._id}`, updateData1);
      console.log('✅ 正常更新成功:', updateResponse1.data.message);
    } catch (error) {
      console.log('❌ 正常更新失败:', error.response?.data?.message || error.message);
    }
    
    // 测试2: 缺少 name 字段的更新
    console.log('\n测试2: 缺少 name 字段的更新...');
    const updateData2 = {
      ...recipeWithSubFillings,
      description: '测试缺少name - ' + new Date().toISOString(),
      subFillings: [{
        id: 'test-id',
        // name: '缺少这个字段',
        quantity: 100,
        unit: 'g'
      }]
    };
    
    try {
      const updateResponse2 = await axios.put(`${BASE_URL}/${recipeWithSubFillings._id}`, updateData2);
      console.log('❌ 应该失败但成功了:', updateResponse2.data.message);
    } catch (error) {
      console.log('✅ 正确捕获错误:', error.response?.data?.message || error.message);
    }
    
    // 测试3: 缺少 id 字段的更新（应该自动生成）
    console.log('\n测试3: 缺少 id 字段的更新（应该自动生成）...');
    const updateData3 = {
      ...recipeWithSubFillings,
      description: '测试自动生成id - ' + new Date().toISOString(),
      subFillings: [{
        // id: '缺少这个字段，应该自动生成',
        name: '测试子馅料',
        quantity: 50,
        unit: 'g'
      }]
    };
    
    try {
      const updateResponse3 = await axios.put(`${BASE_URL}/${recipeWithSubFillings._id}`, updateData3);
      console.log('✅ 自动生成id成功:', updateResponse3.data.message);
      console.log('生成的 subFillings:', updateResponse3.data.data.subFillings);
    } catch (error) {
      console.log('❌ 自动生成id失败:', error.response?.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error.message);
  }
}

// 运行测试
testFillingRecipeUpdate();