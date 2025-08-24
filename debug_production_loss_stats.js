/**
 * 调试生产报损统计函数
 */

const mongoose = require('mongoose');
const { getProductionLossStats } = require('./express/controllers/statisticsController');

/**
 * 调试生产报损统计
 */
async function debugProductionLossStats() {
  try {
    console.log('🔗 连接数据库...');
    // 使用与服务器相同的数据库连接
    const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
    const DB_PORT = process.env.MONGO_PORT || '32233';
    const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';
    const mongoUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: false
    });
    console.log('✅ 数据库连接成功');
    
    const storeId = '6878def4ae6e08fa4af88e34';
    const startDate = new Date('2025-08-23T16:00:00.000Z');
    const endDate = new Date('2025-08-24T15:59:59.999Z');
    
    console.log('\n🔍 测试生产报损统计函数...');
    console.log('📍 门店ID:', storeId);
    console.log('📅 开始日期:', startDate.toISOString());
    console.log('📅 结束日期:', endDate.toISOString());
    
    // 调用统计函数
    const stats = await getProductionLossStats(storeId, startDate, endDate);
    
    console.log('\n📊 统计结果:');
    console.log(JSON.stringify(stats, null, 2));
    
    // 验证数据
    console.log('\n🔍 数据验证:');
    console.log('生产报损:', stats.byType.production);
    console.log('出货记录:', stats.byType.shipment);
    console.log('总计:', stats.total);
    
    // 检查是否有数据
    if (stats.total.recordCount > 0) {
      console.log('\n✅ 统计函数工作正常，找到', stats.total.recordCount, '条记录');
    } else {
      console.log('\n❌ 统计函数返回空数据');
    }
    
  } catch (error) {
    console.error('❌ 调试失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已断开');
  }
}

// 执行调试
if (require.main === module) {
  debugProductionLossStats().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { debugProductionLossStats };