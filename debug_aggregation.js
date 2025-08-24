const mongoose = require('mongoose');
const connectDB = require('./express/config/db');
const Revenue = require('./express/models/Revenue');

/**
 * 调试聚合查询问题
 */
async function debugAggregation() {
  try {
    console.log('🔍 开始调试聚合查询问题...');
    
    // 连接数据库
    await connectDB();
    console.log('✅ 数据库连接成功');
    
    const storeId = '6878def4ae6e08fa4af88e34';
    const now = new Date();
    
    // 创建今天的日期范围
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);
    
    console.log(`\n📅 测试日期范围:`);
    console.log(`开始时间: ${startDate.toISOString()} (本地: ${startDate.toLocaleString()})`);
    console.log(`结束时间: ${endDate.toISOString()} (本地: ${endDate.toLocaleString()})`);
    
    // 1. 测试基本的find查询
    console.log(`\n🔍 1. 测试基本find查询:`);
    const findResult = await Revenue.find({
      storeId: storeId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    console.log(`找到 ${findResult.length} 条记录`);
    findResult.forEach(record => {
      console.log(`  - ID: ${record._id}, 日期: ${record.date.toISOString()}, 营收: ${record.actualRevenue}`);
    });
    
    // 2. 测试聚合查询的每个阶段
    console.log(`\n🔍 2. 测试聚合查询各阶段:`);
    
    // 阶段1：只有$match
    console.log(`\n阶段1 - 只有$match:`);
    const matchOnlyPipeline = [
      {
        $match: {
          storeId: storeId,
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      }
    ];
    
    const matchOnlyResult = await Revenue.aggregate(matchOnlyPipeline);
    console.log(`$match阶段结果: ${matchOnlyResult.length} 条记录`);
    matchOnlyResult.forEach(record => {
      console.log(`  - ID: ${record._id}, 日期: ${record.date}, 营收: ${record.actualRevenue}`);
    });
    
    // 阶段2：完整的聚合管道
    console.log(`\n阶段2 - 完整聚合管道:`);
    const fullPipeline = [
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
          totalOrderCount: { $sum: '$orderCount' },
          avgOrderValue: { $avg: '$avgOrderValue' },
          recordCount: { $sum: 1 }
        }
      }
    ];
    
    const fullResult = await Revenue.aggregate(fullPipeline);
    console.log(`完整聚合结果:`, JSON.stringify(fullResult, null, 2));
    
    // 3. 测试不同的storeId类型
    console.log(`\n🔍 3. 测试storeId类型问题:`);
    
    // 获取数据库中实际的storeId
    const sampleRecord = await Revenue.findOne();
    if (sampleRecord) {
      console.log(`数据库中的storeId类型: ${typeof sampleRecord.storeId}`);
      console.log(`数据库中的storeId值: ${sampleRecord.storeId}`);
      console.log(`查询使用的storeId类型: ${typeof storeId}`);
      console.log(`查询使用的storeId值: ${storeId}`);
      console.log(`storeId是否相等: ${sampleRecord.storeId.toString() === storeId}`);
      
      // 使用数据库中实际的storeId进行查询
      const correctStoreId = sampleRecord.storeId;
      console.log(`\n使用正确的storeId (${correctStoreId}) 进行聚合查询:`);
      
      const correctPipeline = [
        {
          $match: {
            storeId: correctStoreId,
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
      
      const correctResult = await Revenue.aggregate(correctPipeline);
      console.log(`使用正确storeId的聚合结果:`, JSON.stringify(correctResult, null, 2));
    }
    
    // 4. 测试ObjectId转换
    console.log(`\n🔍 4. 测试ObjectId转换:`);
    try {
      const objectIdStoreId = new mongoose.Types.ObjectId(storeId);
      console.log(`ObjectId转换成功: ${objectIdStoreId}`);
      
      const objectIdPipeline = [
        {
          $match: {
            storeId: objectIdStoreId,
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
      
      const objectIdResult = await Revenue.aggregate(objectIdPipeline);
      console.log(`使用ObjectId的聚合结果:`, JSON.stringify(objectIdResult, null, 2));
      
    } catch (error) {
      console.log(`ObjectId转换失败: ${error.message}`);
    }
    
  } catch (error) {
    console.error('❌ 调试过程中出错:', error.message);
    console.error('错误堆栈:', error.stack);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ 调试完成，数据库连接已关闭');
  }
}

// 运行调试
debugAggregation();