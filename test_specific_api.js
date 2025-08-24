/**
 * 测试特定API端点脚本
 * 用于测试用户提供的统计API URL
 */

// 使用Node.js内置的fetch或简单的http请求
let fetch;
try {
  fetch = global.fetch || require('undici').fetch;
} catch (e) {
  // 如果没有fetch，使用简单的http模块
  const http = require('http');
  const https = require('https');
  const { URL } = require('url');
  
  fetch = async (url, options = {}) => {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const client = parsedUrl.protocol === 'https:' ? https : http;
      
      const req = client.request({
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
  };
}

/**
 * 测试特定的API端点
 */
async function testSpecificAPI() {
  const testUrl = 'http://localhost:10099/api/statistics?storeId=6878def4ae6e08fa4af88e34&period=today';
  
  console.log('🧪 测试特定API端点...');
  console.log('📍 URL:', testUrl);
  
  try {
    // 1. 测试不带认证头的请求
    console.log('\n🔍 测试不带认证头的请求...');
    const response1 = await fetch(testUrl, {
      method: 'GET',
      timeout: 10000
    });
    
    if (response1.ok) {
      const data1 = await response1.json();
      console.log('✅ API响应成功 (不带认证头)');
      console.log('📄 响应数据:', JSON.stringify(data1, null, 2));
    } else {
      const errorText = await response1.text();
      console.log(`❌ API响应失败 (不带认证头): HTTP ${response1.status}`);
      console.log('📄 错误信息:', errorText);
      
      // 2. 如果失败，尝试带认证头的请求
      console.log('\n🔍 测试带认证头的请求...');
      const response2 = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'x-feishu-user-id': 'test-user-id',
          'x-current-store-id': '6878def4ae6e08fa4af88e34',
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      if (response2.ok) {
        const data2 = await response2.json();
        console.log('✅ API响应成功 (带认证头)');
        console.log('📄 响应数据:', JSON.stringify(data2, null, 2));
      } else {
        const errorText2 = await response2.text();
        console.log(`❌ API响应失败 (带认证头): HTTP ${response2.status}`);
        console.log('📄 错误信息:', errorText2);
      }
    }
    
  } catch (error) {
    console.error('❌ 请求失败:', error.message);
    
    // 检查是否是端口问题
    if (error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed')) {
      console.log('\n💡 可能的问题:');
      console.log('1. 服务器未在端口 10098 上运行');
      console.log('2. 当前服务器运行在端口 10099');
      console.log('3. 请检查服务器配置或使用正确的端口');
      
      // 尝试正确的端口
      const correctUrl = testUrl.replace('10098', '10099');
      console.log(`\n🔄 尝试正确的端口: ${correctUrl}`);
      
      try {
        const response3 = await fetch(correctUrl, {
          method: 'GET',
          headers: {
            'x-feishu-user-id': 'test-user-id',
            'x-current-store-id': '6878def4ae6e08fa4af88e34',
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        if (response3.ok) {
          const data3 = await response3.json();
          console.log('✅ 正确端口API响应成功');
          console.log('📄 响应数据:', JSON.stringify(data3, null, 2));
        } else {
          const errorText3 = await response3.text();
          console.log(`❌ 正确端口API响应失败: HTTP ${response3.status}`);
          console.log('📄 错误信息:', errorText3);
        }
        
      } catch (error3) {
        console.error('❌ 正确端口请求也失败:', error3.message);
      }
    }
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始测试特定API端点...');
  await testSpecificAPI();
  console.log('\n✅ 测试完成');
}

// 运行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  testSpecificAPI
};