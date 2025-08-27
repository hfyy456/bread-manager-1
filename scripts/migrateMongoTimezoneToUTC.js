/**
 * MongoDB 时区迁移脚本
 * 将现有数据库中的本地时间数据转换为UTC格式存储
 * 
 * 使用方法:
 * node scripts/migrateMongoTimezoneToUTC.js --dry-run  # 预览模式，不实际修改数据
 * node scripts/migrateMongoTimezoneToUTC.js             # 执行迁移
 * node scripts/migrateMongoTimezoneToUTC.js --collection=revenues  # 只迁移指定集合
 */

const mongoose = require('mongoose');
const moment = require('moment-timezone');
const connectDB = require('../express/config/db');

// 默认时区（北京时间）
const DEFAULT_TIMEZONE = 'Asia/Shanghai';

// 需要迁移的集合和时间字段配置
const MIGRATION_CONFIG = {
  revenues: {
    timeFields: ['date', 'submittedAt', 'createdAt', 'updatedAt'],
    description: '营业数据'
  },
  productionlosses: {
    timeFields: ['date', 'createdAt', 'updatedAt'],
    description: '生产损耗数据'
  },
  expenses: {
    timeFields: ['date', 'createdAt', 'updatedAt'],
    description: '支出数据'
  },
  inventorytransactions: {
    timeFields: ['createdAt', 'updatedAt'],
    description: '库存交易数据'
  },
  transferrequests: {
    timeFields: ['createdAt', 'updatedAt', 'approvedAt', 'rejectedAt'],
    description: '调拨请求数据'
  }
};

/**
 * 将本地时间转换为UTC时间
 * @param {Date|string} localTime - 本地时间
 * @param {string} timezone - 时区
 * @returns {Date} UTC时间
 */
function convertToUTC(localTime, timezone = DEFAULT_TIMEZONE) {
  if (!localTime) return null;
  
  try {
    let momentObj;
    
    if (typeof localTime === 'string') {
      // 尝试解析字符串日期
      momentObj = moment(localTime);
    } else if (localTime instanceof Date) {
      // 处理Date对象
      momentObj = moment(localTime);
    } else {
      return null;
    }
    
    if (!momentObj.isValid()) {
      console.warn(`无效的日期格式: ${localTime}`);
      return null;
    }
    
    const originalDate = momentObj.toDate();
    
    // 对于日期字段（时间为00:00:00的情况），需要特殊处理
    // 检查是否是午夜时间（可能是日期字段）
    const timeStr = momentObj.format('HH:mm:ss');
    if (timeStr === '00:00:00') {
      // 这是一个日期字段，需要将其视为指定时区的午夜时间
      const dateStr = momentObj.format('YYYY-MM-DD');
      const localMoment = moment.tz(dateStr + ' 00:00:00', timezone);
      return localMoment.utc().toDate();
    } else {
      // 这是一个时间戳字段，直接转换
      // 将当前时间视为指定时区的时间，然后转换为UTC
      const localMoment = moment.tz(momentObj.format('YYYY-MM-DD HH:mm:ss'), timezone);
      return localMoment.utc().toDate();
    }
    
  } catch (error) {
    console.warn(`时区转换失败: ${localTime}, 错误: ${error.message}`);
    return localTime instanceof Date ? localTime : null;
  }
}

/**
 * 获取集合文档总数
 * @param {string} collectionName - 集合名称
 * @returns {Promise<number>} 文档总数
 */
async function getCollectionCount(collectionName) {
  try {
    const collection = mongoose.connection.db.collection(collectionName);
    return await collection.countDocuments();
  } catch (error) {
    console.error(`获取集合 ${collectionName} 文档数量失败:`, error.message);
    return 0;
  }
}

/**
 * 迁移单个集合的时间字段
 * @param {string} collectionName - 集合名称
 * @param {Object} config - 迁移配置
 * @param {boolean} isDryRun - 是否为预览模式
 * @returns {Promise<Object>} 迁移结果
 */
async function migrateCollection(collectionName, config, isDryRun = false) {
  const { timeFields, description } = config;
  const collection = mongoose.connection.db.collection(collectionName);
  
  console.log(`\n开始迁移集合: ${collectionName} (${description})`);
  console.log(`时间字段: ${timeFields.join(', ')}`);
  
  const totalCount = await getCollectionCount(collectionName);
  console.log(`总文档数: ${totalCount}`);
  
  if (totalCount === 0) {
    console.log(`集合 ${collectionName} 为空，跳过迁移`);
    return { processed: 0, updated: 0, errors: 0 };
  }
  
  let processed = 0;
  let updated = 0;
  let errors = 0;
  const batchSize = 100;
  
  try {
    // 分批处理文档
    const cursor = collection.find({});
    
    while (await cursor.hasNext()) {
      const batch = [];
      
      // 收集一批文档
      for (let i = 0; i < batchSize && await cursor.hasNext(); i++) {
        batch.push(await cursor.next());
      }
      
      // 处理批次
      for (const doc of batch) {
        try {
          const updateFields = {};
          let hasChanges = false;
          
          // 检查每个时间字段
          for (const field of timeFields) {
            if (doc[field]) {
              const originalTime = doc[field];
              const utcTime = convertToUTC(originalTime);
              
              if (utcTime && utcTime.getTime() !== originalTime.getTime()) {
                updateFields[field] = utcTime;
                hasChanges = true;
                
                if (isDryRun) {
                  console.log(`[预览] ${collectionName}.${doc._id}.${field}: ${originalTime} -> ${utcTime}`);
                }
              }
            }
          }
          
          // 如果有变更且不是预览模式，执行更新
          if (hasChanges && !isDryRun) {
            await collection.updateOne(
              { _id: doc._id },
              { $set: updateFields }
            );
            updated++;
          } else if (hasChanges) {
            updated++; // 预览模式下也计数
          }
          
          processed++;
          
          // 显示进度
          if (processed % 100 === 0) {
            console.log(`已处理: ${processed}/${totalCount} (${Math.round(processed/totalCount*100)}%)`);
          }
          
        } catch (error) {
          console.error(`处理文档 ${doc._id} 时出错:`, error.message);
          errors++;
        }
      }
    }
    
    await cursor.close();
    
  } catch (error) {
    console.error(`迁移集合 ${collectionName} 时出错:`, error.message);
    errors++;
  }
  
  console.log(`集合 ${collectionName} 迁移完成:`);
  console.log(`- 处理文档数: ${processed}`);
  console.log(`- 更新文档数: ${updated}`);
  console.log(`- 错误数: ${errors}`);
  
  return { processed, updated, errors };
}

/**
 * 主迁移函数
 */
async function runMigration() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const collectionArg = args.find(arg => arg.startsWith('--collection='));
  const targetCollection = collectionArg ? collectionArg.split('=')[1] : null;
  
  console.log('='.repeat(60));
  console.log('MongoDB 时区迁移脚本');
  console.log('='.repeat(60));
  console.log(`模式: ${isDryRun ? '预览模式（不会修改数据）' : '执行模式'}`);
  console.log(`目标时区: ${DEFAULT_TIMEZONE}`);
  
  if (targetCollection) {
    console.log(`目标集合: ${targetCollection}`);
    if (!MIGRATION_CONFIG[targetCollection]) {
      console.error(`错误: 未找到集合 ${targetCollection} 的配置`);
      process.exit(1);
    }
  }
  
  try {
    // 连接数据库
    console.log('\n连接数据库...');
    await connectDB();
    console.log('数据库连接成功');
    
    const totalResults = {
      processed: 0,
      updated: 0,
      errors: 0
    };
    
    // 确定要迁移的集合
    const collectionsToMigrate = targetCollection 
      ? { [targetCollection]: MIGRATION_CONFIG[targetCollection] }
      : MIGRATION_CONFIG;
    
    // 执行迁移
    for (const [collectionName, config] of Object.entries(collectionsToMigrate)) {
      const result = await migrateCollection(collectionName, config, isDryRun);
      totalResults.processed += result.processed;
      totalResults.updated += result.updated;
      totalResults.errors += result.errors;
    }
    
    // 输出总结
    console.log('\n' + '='.repeat(60));
    console.log('迁移总结');
    console.log('='.repeat(60));
    console.log(`总处理文档数: ${totalResults.processed}`);
    console.log(`总更新文档数: ${totalResults.updated}`);
    console.log(`总错误数: ${totalResults.errors}`);
    
    if (isDryRun) {
      console.log('\n注意: 这是预览模式，没有实际修改数据');
      console.log('要执行实际迁移，请运行: node scripts/migrateMongoTimezoneToUTC.js');
    } else {
      console.log('\n迁移完成！');
    }
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    process.exit(1);
  } finally {
    // 关闭数据库连接
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('数据库连接已关闭');
    }
  }
}

// 处理未捕获的异常
process.on('unhandledRejection', (error) => {
  console.error('未处理的Promise拒绝:', error);
  process.exit(1);
});

process.on('SIGINT', async () => {
  console.log('\n收到中断信号，正在关闭...');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

// 如果直接运行此脚本，则执行迁移
if (require.main === module) {
  runMigration();
}

module.exports = {
  convertToUTC,
  migrateCollection,
  runMigration
};