/**
 * 测试生产报损API脚本
 */

// 使用Node.js内置的http模块
const http = require('http');
const { URL } = require('url');

/**
 * 简单的fetch实现
 */
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    
    const req = http.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * 测试生产报损统计API
 */
async function testProductionLossAPI() {
  const testUrl = 'http://localhost:10099/api/production-loss/stats?startDate=2025-08-24&endDate=2025-08-24';
  
  console.log('🧪 测试生产报损统计API...');
  console.log('📍 URL:', testUrl);
  
  try {
    console.log('\n🔍 测试API请求...');
    const response = await fetch(testUrl, {
      headers: {
        'x-current-store-id': '6878def4ae6e08fa4af88e34'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API响应成功');
      console.log('📄 响应数据:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`❌ API请求失败: HTTP ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ 请求异常:', error.message);
  }
  
  console.log('\n✅ 测试完成');
}

/**
 * 测试生产报损记录API
 */
async function testProductionLossRecordsAPI() {
  const testUrl = 'http://localhost:10099/api/production-loss/records?startDate=2025-08-24&endDate=2025-08-24';
  
  console.log('\n🧪 测试生产报损记录API...');
  console.log('📍 URL:', testUrl);
  
  try {
    const response = await fetch(testUrl, {
      headers: {
        'x-current-store-id': '6878def4ae6e08fa4af88e34'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 记录API响应成功');
      console.log('📄 记录数据:', JSON.stringify(data, null, 2));
    } else {
      const errorText = await response.text();
      console.log(`❌ 记录API请求失败: HTTP ${response.status}: ${errorText}`);
    }
  } catch (error) {
    console.error('❌ 记录请求异常:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  try {
    await testProductionLossAPI();
    await testProductionLossRecordsAPI();
  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testProductionLossAPI,
  testProductionLossRecordsAPI
};