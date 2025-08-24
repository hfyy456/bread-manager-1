/**
 * 营收数据验证脚本
 * 用于验证数据库连接、数据存在性和API逻辑
 */

const mongoose = require('mongoose');
const Revenue = require('./express/models/Revenue');
const connectDB = require('./express/config/db');

/**
 * 连接数据库
 */
async function connectDatabase() {
  try {
    await connectDB();
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    return false;
  }
}

/**
 * 验证营收数据
 */
async function verifyRevenueData() {
  try {
    // 1. 检查总记录数
    const totalCount = await Revenue.countDocuments();
    console.log(`📊 营收记录总数: ${totalCount}`);

    if (totalCount === 0) {
      console.log('⚠️  数据库中没有营收记录');
      return;
    }

    // 2. 显示最近的5条记录
    const recentRecords = await Revenue.find()
      .sort({ date: -1 })
      .limit(5)
      .lean();
    
    console.log('\n📋 最近5条营收记录:');
    recentRecords.forEach((record, index) => {
      console.log(`${index + 1}. 门店ID: ${record.storeId}, 日期: ${record.date.toISOString().split('T')[0]}, 实际营收: ${record.actualRevenue || 0}`);
    });

    // 3. 按门店统计
    const storeStats = await Revenue.aggregate([
      {
        $group: {
          _id: '$storeId',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$actualRevenue' },
          avgRevenue: { $avg: '$actualRevenue' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    console.log('\n🏪 按门店统计:');
    storeStats.forEach(stat => {
      console.log(`门店 ${stat._id}: ${stat.count}条记录, 总营收: ${stat.totalRevenue || 0}, 平均营收: ${(stat.avgRevenue || 0).toFixed(2)}`);
    });

    // 4. 测试特定查询（最近7天）
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);

    console.log(`\n📅 查询最近7天数据 (${startDate.toISOString().split('T')[0]} 到 ${endDate.toISOString().split('T')[0]}):`);
    
    const recentData = await Revenue.find({
      date: {
        $gte: startDate,
        $lte: endDate
      }
    }).sort({ date: -1 });

    if (recentData.length === 0) {
      console.log('⚠️  最近7天没有营收数据');
    } else {
      console.log(`找到 ${recentData.length} 条最近7天的记录`);
      recentData.forEach(record => {
        console.log(`- ${record.date.toISOString().split('T')[0]}: 门店${record.storeId}, 营收${record.actualRevenue || 0}`);
      });
    }

    // 5. 测试findByStoreAndDateRange方法
    if (storeStats.length > 0) {
      const testStoreId = storeStats[0]._id;
      console.log(`\n🔍 测试门店 ${testStoreId} 的findByStoreAndDateRange方法:`);
      
      const rangeData = await Revenue.findByStoreAndDateRange(
        testStoreId,
        startDate,
        endDate
      );
      
      console.log(`找到 ${rangeData.length} 条记录`);
      rangeData.forEach(record => {
        console.log(`- ${record.date.toISOString().split('T')[0]}: 营收${record.actualRevenue || 0}`);
      });
    }

  } catch (error) {
    console.error('❌ 验证营收数据时出错:', error.message);
  }
}

/**
 * 创建测试数据（如果没有数据）
 */
async function createTestData() {
  try {
    const count = await Revenue.countDocuments();
    if (count > 0) {
      console.log('数据库中已有数据，跳过创建测试数据');
      return;
    }

    console.log('🔧 创建测试营收数据...');
    
    const testData = [];
    const today = new Date();
    
    // 创建最近7天的测试数据
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      
      testData.push({
        storeId: 'store001',
        date: date,
        actualRevenue: Math.floor(Math.random() * 5000) + 1000,
        totalRevenue: Math.floor(Math.random() * 5500) + 1200,
        cashRevenue: Math.floor(Math.random() * 2000) + 500,
        cardRevenue: Math.floor(Math.random() * 2000) + 500,
        wechatRevenue: Math.floor(Math.random() * 1000) + 200,
        alipayRevenue: Math.floor(Math.random() * 1000) + 200,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    await Revenue.insertMany(testData);
    console.log(`✅ 成功创建 ${testData.length} 条测试数据`);
    
  } catch (error) {
    console.error('❌ 创建测试数据时出错:', error.message);
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 开始验证营收数据...');
  
  const connected = await connectDatabase();
  if (!connected) {
    console.log('❌ 无法连接数据库，请检查MongoDB服务是否启动');
    process.exit(1);
  }

  await verifyRevenueData();
  
  // 如果没有数据，询问是否创建测试数据
  const totalCount = await Revenue.countDocuments();
  if (totalCount === 0) {
    console.log('\n💡 检测到没有营收数据，正在创建测试数据...');
    await createTestData();
    console.log('\n🔄 重新验证数据:');
    await verifyRevenueData();
  }

  await mongoose.connection.close();
  console.log('\n✅ 验证完成，数据库连接已关闭');
}

// 运行脚本
if (require.main === module) {
  main().catch(error => {
    console.error('❌ 脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  connectDatabase,
  verifyRevenueData,
  createTestData
};