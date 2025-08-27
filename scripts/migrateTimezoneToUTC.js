/**
 * 数据库时区迁移脚本
 * 将现有的本地时间数据转换为UTC时间存储
 * 
 * 使用方法:
 * node scripts/migrateTimezoneToUTC.js [--dry-run] [--table=tableName]
 * 
 * 参数:
 * --dry-run: 仅预览更改，不实际执行
 * --table: 指定要迁移的表名，不指定则迁移所有表
 */

const mysql = require('mysql2/promise');
const { format } = require('date-fns');
const { zonedTimeToUtc } = require('date-fns-tz');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bread_manager',
  timezone: '+00:00' // 确保连接使用UTC时区
};

// 源时区 (中国标准时间)
const SOURCE_TIMEZONE = 'Asia/Shanghai';

// 需要迁移的表和字段配置
const MIGRATION_CONFIG = {
  revenue: {
    tableName: 'revenue',
    timeFields: ['date', 'submittedAt', 'createdAt', 'updatedAt'],
    primaryKey: 'id'
  },
  production_loss: {
    tableName: 'production_loss',
    timeFields: ['date', 'createdAt', 'updatedAt'],
    primaryKey: 'id'
  },
  expense: {
    tableName: 'expense',
    timeFields: ['date', 'createdAt', 'updatedAt'],
    primaryKey: 'id'
  },
  inventory_transactions: {
    tableName: 'inventory_transactions',
    timeFields: ['transactionDate', 'createdAt', 'updatedAt'],
    primaryKey: 'id'
  },
  requests: {
    tableName: 'requests',
    timeFields: ['createdAt', 'updatedAt'],
    primaryKey: 'id'
  }
};

/**
 * 将本地时间转换为UTC时间
 * @param {string|Date} localTime - 本地时间
 * @param {string} timezone - 源时区
 * @returns {Date} UTC时间
 */
function convertToUTC(localTime, timezone = SOURCE_TIMEZONE) {
  if (!localTime) return null;
  
  try {
    // 如果是字符串，先解析为Date对象
    const dateObj = typeof localTime === 'string' ? new Date(localTime) : localTime;
    
    // 检查日期是否有效
    if (isNaN(dateObj.getTime())) {
      console.warn(`无效的日期格式: ${localTime}`);
      return null;
    }
    
    // 将本地时间转换为UTC时间
    return zonedTimeToUtc(dateObj, timezone);
  } catch (error) {
    console.error(`时间转换错误: ${localTime}`, error);
    return null;
  }
}

/**
 * 获取表中的数据总数
 * @param {Object} connection - 数据库连接
 * @param {string} tableName - 表名
 * @returns {number} 数据总数
 */
async function getTableCount(connection, tableName) {
  try {
    const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    return rows[0].count;
  } catch (error) {
    console.error(`获取表 ${tableName} 数据总数失败:`, error);
    return 0;
  }
}

/**
 * 迁移单个表的时区数据
 * @param {Object} connection - 数据库连接
 * @param {Object} config - 表配置
 * @param {boolean} dryRun - 是否为预览模式
 */
async function migrateTable(connection, config, dryRun = false) {
  const { tableName, timeFields, primaryKey } = config;
  
  console.log(`\n开始迁移表: ${tableName}`);
  console.log(`时间字段: ${timeFields.join(', ')}`);
  
  try {
    // 获取数据总数
    const totalCount = await getTableCount(connection, tableName);
    console.log(`数据总数: ${totalCount}`);
    
    if (totalCount === 0) {
      console.log(`表 ${tableName} 无数据，跳过迁移`);
      return { success: true, updated: 0, errors: 0 };
    }
    
    // 分批处理数据
    const batchSize = 1000;
    let offset = 0;
    let totalUpdated = 0;
    let totalErrors = 0;
    
    while (offset < totalCount) {
      console.log(`处理批次: ${offset + 1} - ${Math.min(offset + batchSize, totalCount)}`);
      
      // 查询当前批次的数据
      const selectFields = [primaryKey, ...timeFields].join(', ');
      const [rows] = await connection.execute(
        `SELECT ${selectFields} FROM ${tableName} LIMIT ${batchSize} OFFSET ${offset}`
      );
      
      // 处理每一行数据
      for (const row of rows) {
        try {
          const updates = [];
          const values = [];
          
          // 转换每个时间字段
          for (const field of timeFields) {
            if (row[field]) {
              const utcTime = convertToUTC(row[field]);
              if (utcTime) {
                updates.push(`${field} = ?`);
                values.push(utcTime);
              }
            }
          }
          
          // 如果有需要更新的字段
          if (updates.length > 0) {
            values.push(row[primaryKey]);
            
            const updateSql = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${primaryKey} = ?`;
            
            if (dryRun) {
              console.log(`[预览] ${updateSql}`);
              console.log(`[预览] 参数:`, values);
            } else {
              await connection.execute(updateSql, values);
            }
            
            totalUpdated++;
          }
        } catch (error) {
          console.error(`处理记录 ${row[primaryKey]} 时出错:`, error);
          totalErrors++;
        }
      }
      
      offset += batchSize;
    }
    
    console.log(`表 ${tableName} 迁移完成:`);
    console.log(`- 更新记录数: ${totalUpdated}`);
    console.log(`- 错误记录数: ${totalErrors}`);
    
    return { success: true, updated: totalUpdated, errors: totalErrors };
    
  } catch (error) {
    console.error(`迁移表 ${tableName} 失败:`, error);
    return { success: false, updated: 0, errors: 1 };
  }
}

/**
 * 主迁移函数
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const tableArg = args.find(arg => arg.startsWith('--table='));
  const specificTable = tableArg ? tableArg.split('=')[1] : null;
  
  console.log('='.repeat(60));
  console.log('数据库时区迁移脚本');
  console.log('='.repeat(60));
  console.log(`模式: ${dryRun ? '预览模式 (不会实际修改数据)' : '执行模式'}`);
  console.log(`源时区: ${SOURCE_TIMEZONE}`);
  console.log(`目标时区: UTC`);
  
  if (specificTable) {
    console.log(`指定表: ${specificTable}`);
  }
  
  let connection;
  
  try {
    // 建立数据库连接
    console.log('\n连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');
    
    // 开始事务
    if (!dryRun) {
      await connection.beginTransaction();
      console.log('开始事务');
    }
    
    const results = {};
    
    // 迁移指定表或所有表
    const tablesToMigrate = specificTable 
      ? { [specificTable]: MIGRATION_CONFIG[specificTable] }
      : MIGRATION_CONFIG;
    
    for (const [key, config] of Object.entries(tablesToMigrate)) {
      if (!config) {
        console.warn(`未找到表 ${key} 的配置，跳过`);
        continue;
      }
      
      results[key] = await migrateTable(connection, config, dryRun);
    }
    
    // 提交事务
    if (!dryRun) {
      await connection.commit();
      console.log('\n事务提交成功');
    }
    
    // 输出总结
    console.log('\n' + '='.repeat(60));
    console.log('迁移总结:');
    console.log('='.repeat(60));
    
    let totalUpdated = 0;
    let totalErrors = 0;
    
    for (const [tableName, result] of Object.entries(results)) {
      console.log(`${tableName}: 更新 ${result.updated} 条记录, 错误 ${result.errors} 条`);
      totalUpdated += result.updated;
      totalErrors += result.errors;
    }
    
    console.log('-'.repeat(40));
    console.log(`总计: 更新 ${totalUpdated} 条记录, 错误 ${totalErrors} 条`);
    
    if (dryRun) {
      console.log('\n注意: 这是预览模式，数据未实际修改');
      console.log('要执行实际迁移，请运行: node scripts/migrateTimezoneToUTC.js');
    }
    
  } catch (error) {
    console.error('迁移过程中发生错误:', error);
    
    if (connection && !dryRun) {
      try {
        await connection.rollback();
        console.log('事务已回滚');
      } catch (rollbackError) {
        console.error('回滚失败:', rollbackError);
      }
    }
    
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('数据库连接已关闭');
    }
  }
}

// 运行脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  convertToUTC,
  migrateTable,
  MIGRATION_CONFIG
};