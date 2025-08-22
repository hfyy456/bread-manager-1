const http = require('http');

// 测试API基础URL
const API_BASE = 'http://localhost:10099/api';

// 测试数据
const testData = {
  storeId: 'store001',
  date: '2024-01-15',
  type: 'production',
  items: [
    {
      productId: 'bread001',
      productName: '白吐司',
      quantity: 5,
      unit: '个',
      unitPrice: 8.5,
      totalValue: 42.5,
      reason: '烘烤过度'
    }
  ],
  totalQuantity: 5,
  totalValue: 42.5,
  operatedBy: '张三',
  notes: '测试记录'
};

// HTTP请求辅助函数
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 10099,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'x-current-store-id': '6878def4ae6e08fa4af88e34',
        'x-user-id': 'user001'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testAPI() {
  try {
    console.log('=== 测试报损记录API ===');
    
    // 1. 创建第一条记录
    console.log('\n1. 创建第一条报损记录...');
    const response1 = await makeRequest('POST', '/api/production-loss/register', testData);
    console.log('创建成功:', response1.data);
    
    // 2. 尝试创建同一天同一类型的记录（应该更新而不是创建新记录）
    console.log('\n2. 创建同一天同一类型的记录（应该更新现有记录）...');
    const testData2 = {
      ...testData,
      items: [
        {
          productId: 'bread002',
          productName: '全麦吐司',
          quantity: 3,
          unit: '个',
          unitPrice: 10,
          totalValue: 30,
          reason: '发酵不足'
        }
      ],
      totalQuantity: 3,
      totalValue: 30,
      notes: '更新测试记录'
    };
    
    const response2 = await makeRequest('POST', '/api/production-loss/register', testData2);
    console.log('更新成功:', response2.data);
    
    // 3. 查询该日期的记录
    console.log('\n3. 查询该日期的记录...');
    const queryResponse = await makeRequest('GET', `/api/production-loss/records?startDate=${testData.date}&endDate=${testData.date}&type=production`);
    console.log('查询结果:', JSON.stringify(queryResponse.data, null, 2));

    // 4. 查询所有记录
    console.log('\n4. 查询所有记录...');
    const allRecordsResponse = await makeRequest('GET', `/api/production-loss/records?startDate=2024-01-01&endDate=2024-12-31`);
    console.log('所有记录数量:', allRecordsResponse.data?.data?.length || 0);
    if (allRecordsResponse.data?.data?.length > 0) {
      console.log('记录详情:', JSON.stringify(allRecordsResponse.data.data, null, 2));
    }
    
    console.log('\n=== 测试完成 ===');
    
  } catch (error) {
    console.error('测试失败:', error.message);
  }
}

// 运行测试
testAPI();