const http = require('http');

// 测试营业数据API
const API_BASE = 'http://localhost:10099';

// 测试数据
const testRevenueData = {
  storeId: '6878def4ae6e08fa4af88e34', // 使用现有的门店ID
  date: '2025-01-24',
  actualRevenue: 1600.00, // 这个值会被后端自动计算覆盖
  totalRevenue: 1620.00,
  avgOrderValue: 40.50,
  orderCount: 40,
  meituanRevenue: 800.00,
  douyinRevenue: 300.00,
  cashRevenue: 200.00,
  cardRevenue: 200.00,
  wechatRevenue: 60.00, // 微信支付
  alipayRevenue: 40.00, // 支付宝
  
  submittedBy: '测试用户'
};

/**
 * 发送HTTP请求的辅助函数
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
        // 不设置x-feishu-user-id，使用开发模式的模拟用户
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonBody
          });
        } catch (error) {
          console.error('响应解析失败:', body);
          reject(new Error(`JSON解析失败: ${error.message}\n响应内容: ${body}`));
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

/**
 * 测试营业数据API
 */
async function testRevenueAPI() {
  try {
    console.log('=== 测试营业数据API ===');
    
    // 1. 测试提交营业数据
    console.log('\n1. 测试提交营业数据...');
    const submitResponse = await makeRequest('POST', '/api/revenue/register', testRevenueData);
    console.log('状态码:', submitResponse.statusCode);
    console.log('响应数据:', JSON.stringify(submitResponse.data, null, 2));
    
    if (submitResponse.statusCode === 200 && submitResponse.data.success) {
      console.log('✅ 营业数据提交成功!');
    } else {
      console.log('❌ 营业数据提交失败:', submitResponse.data.message);
      return;
    }
    
    // 2. 测试获取营业数据列表
    console.log('\n2. 测试获取营业数据列表...');
    const listResponse = await makeRequest('GET', `/api/revenue/list?storeId=${testRevenueData.storeId}`);
    console.log('状态码:', listResponse.statusCode);
    console.log('响应数据:', JSON.stringify(listResponse.data, null, 2));
    
    if (listResponse.statusCode === 200 && listResponse.data.success) {
      console.log('✅ 获取营业数据列表成功!');
    } else {
      console.log('❌ 获取营业数据列表失败:', listResponse.data.message);
    }
    
    // 3. 测试根据门店和日期获取营业数据
    console.log('\n3. 测试根据门店和日期获取营业数据...');
    const dateResponse = await makeRequest('GET', `/api/revenue/store/${testRevenueData.storeId}/date/${testRevenueData.date}`);
    console.log('状态码:', dateResponse.statusCode);
    console.log('响应数据:', JSON.stringify(dateResponse.data, null, 2));
    
    if (dateResponse.statusCode === 200 && dateResponse.data.success) {
      console.log('✅ 根据门店和日期获取营业数据成功!');
    } else {
      console.log('❌ 根据门店和日期获取营业数据失败:', dateResponse.data.message);
    }
    
    // 4. 测试更新营业数据（提交相同日期的数据）
    console.log('\n4. 测试更新营业数据...');
    const updateData = {
      ...testRevenueData,
      actualRevenue: 1800.00,
      totalRevenue: 1900.00,
      avgOrderValue: 42.50,
      orderCount: 40,
      meituanRevenue: 900.00,
      douyinRevenue: 400.00,
      cashRevenue: 250.00,
      cardRevenue: 250.00,
      wechatRevenue: 90.00, // 更新微信支付金额
  alipayRevenue: 60.00, // 更新支付宝金额
      
      submittedBy: '测试用户'
    };
    
    const updateResponse = await makeRequest('POST', '/api/revenue/register', updateData);
    console.log('状态码:', updateResponse.statusCode);
    console.log('响应数据:', JSON.stringify(updateResponse.data, null, 2));
    
    if (updateResponse.statusCode === 200 && updateResponse.data.success) {
      console.log('✅ 营业数据更新成功!');
    } else {
      console.log('❌ 营业数据更新失败:', updateResponse.data.message);
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试过程中发生错误:', error.message);
  }
}

// 运行测试
testRevenueAPI();