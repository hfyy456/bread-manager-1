const http = require('http');

/**
 * 自定义fetch实现
 * @param {string} url - 请求URL
 * @param {object} options - 请求选项
 * @returns {Promise<object>} 响应对象
 */
function customFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            json: () => Promise.resolve(jsonData)
          });
        } catch (error) {
          reject(new Error(`解析JSON失败: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * 测试统计API
 * @param {string} storeId - 门店ID
 * @param {string} period - 时间周期
 */
async function testStatisticsAPI(storeId, period) {
  try {
    console.log('🧪 测试统计API...');
    console.log(`📍 门店ID: ${storeId}`);
    console.log(`📅 时间周期: ${period}`);
    
    const url = `http://localhost:10099/api/statistics?storeId=${storeId}&period=${period}`;
    console.log(`📍 URL: ${url}`);
    
    const response = await customFetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-feishu-user-id': 'ou_c27582fa69d1672dcade53be67291e02',
        'x-current-store-id': storeId
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ 统计API响应成功');
      
      // 重点检查生产报损数据
      if (data.data && data.data.productionLoss) {
        console.log('\n📊 生产报损统计数据:');
        console.log('总计:', JSON.stringify(data.data.productionLoss.total, null, 2));
        console.log('\n按类型分类:');
        console.log('生产报损:', JSON.stringify(data.data.productionLoss.byType.production, null, 2));
        console.log('出货报损:', JSON.stringify(data.data.productionLoss.byType.shipment, null, 2));
        console.log('试吃报损:', JSON.stringify(data.data.productionLoss.byType.tasting, null, 2));
        console.log('收档报损:', JSON.stringify(data.data.productionLoss.byType.closing, null, 2));
        console.log('其他报损:', JSON.stringify(data.data.productionLoss.byType.other, null, 2));
        
        // 检查数据是否为零
        const total = data.data.productionLoss.total;
        if (total.totalValue === 0 && total.recordCount === 0) {
          console.log('\n❌ 警告: 生产报损数据仍为零!');
        } else {
          console.log('\n✅ 生产报损数据已正常返回!');
        }
      } else {
        console.log('❌ 响应中没有生产报损数据');
      }
      
      // 也检查收入数据作为对比
      if (data.data && data.data.revenue) {
        console.log('\n💰 收入数据:');
        console.log(`总收入: ${data.data.revenue.totalRevenue}`);
        console.log(`实际收入: ${data.data.revenue.totalActualRevenue}`);
        console.log(`订单数量: ${data.data.revenue.totalOrderCount}`);
      }
      
    } else {
      console.log(`❌ 统计API请求失败: ${response.status}`);
    }
    
  } catch (error) {
    console.error('❌ 测试统计API失败:', error.message);
  }
}

// 执行测试
const storeId = '6878def4ae6e08fa4af88e34';
const period = 'today';

testStatisticsAPI(storeId, period)
  .then(() => {
    console.log('\n✅ 测试完成');
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
  });