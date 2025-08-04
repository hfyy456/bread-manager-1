const http = require('http');

const BASE_URL = 'http://localhost:3001';

function makeRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject({ statusCode: res.statusCode, data: response });
          }
        } catch (error) {
          reject({ statusCode: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function simulateUpdateError() {
  try {
    console.log('模拟前端发送错误数据的情况...');
    
    // 模拟前端发送的数据，subFillings 缺少 name 字段
    const problematicData = {
      name: "巧克力酥皮丝",
      id: "巧克力酥皮丝",
      ingredients: [{
        ingredientId: "滋米牌千丝酥皮",
        quantity: 200,
        unit: "g"
      }],
      yield: 200,
      unit: "g",
      subFillings: [{
        id: "巧克力淋面",
        quantity: 80,
        unit: "g"
        // 注意：这里故意缺少 name 字段
      }]
    };
    
    console.log('发送的数据:', JSON.stringify(problematicData, null, 2));
    
    try {
      const response = await makeRequest('PUT', '/api/filling-recipes/6890511828bf9d9220d3289f', problematicData);
      console.log('❌ 更新成功，但应该失败:', response);
    } catch (error) {
      console.log('✅ 正确捕获错误:', error.data?.message || error.message);
      console.log('完整错误响应:', error.data);
    }
    
    // 现在测试正确的数据
    console.log('\n测试正确的数据...');
    const correctData = {
      ...problematicData,
      subFillings: [{
        id: "巧克力淋面",
        name: "巧克力淋面", // 添加 name 字段
        quantity: 80,
        unit: "g"
      }]
    };
    
    try {
      const response = await makeRequest('PUT', '/api/filling-recipes/6890511828bf9d9220d3289f', correctData);
      console.log('✅ 正确数据更新成功:', response.message);
    } catch (error) {
      console.log('❌ 正确数据更新失败:', error.data?.message || error.message);
    }
    
  } catch (error) {
    console.error('测试过程中出错:', error.message);
  }
}

// 运行测试
simulateUpdateError();