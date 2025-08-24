const mongoose = require('mongoose');
const connectDB = require('./express/config/db');
const Revenue = require('./express/models/Revenue');

/**
 * 获取日期范围的开始和结束时间（复制自statisticsController.js）
 * @param {string} period - 时间周期：'today', 'week', 'month'
 * @param {string} timezone - 时区，默认为 'Asia/Shanghai'
 * @returns {Object} 包含startDate和endDate的对象
 */
const getDateRange = (period, timezone = 'Asia/Shanghai') => {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'today':
      // 当天：从00:00:00到23:59:59
      // 创建今天的开始时间（00:00:00）
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      
      // 创建今天的结束时间（23:59:59.999）
      endDate = new Date(now);
      endDate.setHours(23, 59, 59, 999);
      break;
    
    case 'week':
      // 本周：从周一00:00:00到当前时间
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 周日为0，需要特殊处理
      
      startDate = new Date(now);
      startDate.setDate(now.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(now);
      break;
    
    case 'month':
      // 本月：从1号00:00:00到当前时间
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);
      
      endDate = new Date(now);
      break;
    
    default:
      throw new Error('无效的时间周期参数');
  }

  return { startDate, endDate };
};

/**
 * 调试日期范围和营收查询
 */
async function debugDateRange() {
  try {
    console.log('🔍 开始调试日期范围和营收查询...');
    
    // 连接数据库
    await connectDB();
    console.log('✅ 数据库连接成功');
    
    // 获取现有数据
    const allRevenues = await Revenue.find().sort({ date: -1 });
    console.log(`\n📊 数据库中的所有营收记录 (${allRevenues.length}条):`);
    allRevenues.forEach((record, index) => {
      console.log(`${index + 1}. 门店: ${record.storeId}, 日期: ${record.date.toISOString()}, 本地日期: ${record.date.toLocaleDateString()}, 营收: ${record.actualRevenue}`);
    });
    
    // 测试不同时间周期的日期范围
    const periods = ['today', 'week', 'month'];
    const storeId = '6878def4ae6e08fa4af88e34';
    
    for (const period of periods) {
      console.log(`\n🗓️  测试时间周期: ${period}`);
      
      const { startDate, endDate } = getDateRange(period);
      console.log(`日期范围: ${startDate.toISOString()} 到 ${endDate.toISOString()}`);
      console.log(`本地日期范围: ${startDate.toLocaleString()} 到 ${endDate.toLocaleString()}`);
      
      // 执行查询
      const matchingRecords = await Revenue.find({
        storeId: storeId,
        date: {
          $gte: startDate,
          $lte: endDate
        }
      });
      
      console.log(`匹配的记录数: ${matchingRecords.length}`);
      matchingRecords.forEach(record => {
        console.log(`  - ${record.date.toISOString()} (本地: ${record.date.toLocaleString()}), 营收: ${record.actualRevenue}`);
      });
      
      // 执行聚合查询（模拟statisticsController中的逻辑）
      const pipeline = [
        {
          $match: {
            storeId: storeId,
            date: {
              $gte: startDate,
              $lte: endDate
            }
          }
        },
        {
          $group: {
            _id: null,
            totalActualRevenue: { $sum: '$actualRevenue' },
            totalRevenue: { $sum: '$totalRevenue' },
            recordCount: { $sum: 1 }
          }
        }
      ];
      
      const aggregateResult = await Revenue.aggregate(pipeline);
      console.log(`聚合查询结果:`, aggregateResult);
    }
    
    // 测试今天的具体时间
    console.log(`\n⏰ 当前时间信息:`);
    const now = new Date();
    console.log(`当前时间 (UTC): ${now.toISOString()}`);
    console.log(`当前时间 (本地): ${now.toLocaleString()}`);
    console.log(`当前日期字符串: ${now.toISOString().split('T')[0]}`);
    
    // 检查数据库记录的具体时间
    console.log(`\n🕐 数据库记录的详细时间信息:`);
    for (const record of allRevenues) {
      console.log(`记录ID: ${record._id}`);
      console.log(`  原始日期: ${record.date}`);
      console.log(`  UTC时间: ${record.date.toISOString()}`);
      console.log(`  本地时间: ${record.date.toLocaleString()}`);
      console.log(`  日期部分: ${record.date.toISOString().split('T')[0]}`);
      console.log(`  时区偏移: ${record.date.getTimezoneOffset()} 分钟`);
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 调试完成，数据库连接已关闭');
  }
}

// 运行调试
debugDateRange();