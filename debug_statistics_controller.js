const mongoose = require('mongoose');
const connectDB = require('./express/config/db');
const { getStatistics, getProductionLossStats, getDateRange } = require('./express/controllers/statisticsController');
const Store = require('./express/models/Store');

/**
 * 调试统计控制器
 */
async function debugStatisticsController() {
  try {
    console.log('🔗 连接数据库...');
    await connectDB();
    console.log('✅ 数据库连接成功');
    
    const storeId = '6878def4ae6e08fa4af88e34';
    const period = 'today';
    
    console.log('\n🔍 调试统计控制器流程...');
    console.log(`📍 门店ID: ${storeId}`);
    console.log(`📅 时间周期: ${period}`);
    
    // 1. 检查门店是否存在
    console.log('\n1️⃣ 检查门店是否存在...');
    const store = await Store.findById(storeId);
    if (store) {
      console.log('✅ 门店存在:', store.name);
    } else {
      console.log('❌ 门店不存在');
      return;
    }
    
    // 2. 获取日期范围
    console.log('\n2️⃣ 获取日期范围...');
    const { startDate, endDate } = getDateRange(period);
    console.log('📅 开始日期:', startDate);
    console.log('📅 结束日期:', endDate);
    
    // 3. 直接调用生产报损统计函数
    console.log('\n3️⃣ 直接调用生产报损统计函数...');
    const productionLossStats = await getProductionLossStats(storeId, startDate, endDate);
    console.log('📊 生产报损统计结果:');
    console.log(JSON.stringify(productionLossStats, null, 2));
    
    // 4. 模拟完整的统计API调用
    console.log('\n4️⃣ 模拟完整的统计API调用...');
    const mockReq = {
      query: {
        storeId: storeId,
        period: period
      }
    };
    
    const mockRes = {
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        console.log('📄 API响应数据:');
        if (data.data && data.data.productionLoss) {
          console.log('生产报损数据:', JSON.stringify(data.data.productionLoss, null, 2));
        } else {
          console.log('完整响应:', JSON.stringify(data, null, 2));
        }
        return this;
      }
    };
    
    await getStatistics(mockReq, mockRes);
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    console.log('\n🔌 数据库连接已断开');
    await mongoose.connection.close();
  }
}

// 执行调试
debugStatisticsController();