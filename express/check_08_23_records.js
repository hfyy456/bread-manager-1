const mongoose = require('mongoose');
const ProductionLoss = require('./models/ProductionLoss');

async function checkRecords() {
  try {
    // 使用与服务器相同的数据库配置
    const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
    const DB_PORT = process.env.MONGO_PORT || '32233';
    const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';
    const mongoUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    
    await mongoose.connect(mongoUrl);
    console.log('已连接到数据库');
    
    // 查询08-23的所有报损记录 - 使用多种日期格式
    console.log('尝试不同的日期查询方式...');
    
    // 方式1: UTC时间
    const records1 = await ProductionLoss.find({
      date: {
        $gte: new Date('2025-08-23T00:00:00.000Z'),
        $lte: new Date('2025-08-23T23:59:59.999Z')
      }
    });
    console.log(`UTC查询找到 ${records1.length} 条记录`);
    
    // 方式2: 本地时间
    const records2 = await ProductionLoss.find({
      date: {
        $gte: new Date('2025-08-23T00:00:00+08:00'),
        $lte: new Date('2025-08-23T23:59:59+08:00')
      }
    });
    console.log(`本地时间查询找到 ${records2.length} 条记录`);
    
    // 方式3: 简单日期字符串
    const records3 = await ProductionLoss.find({
      date: {
        $gte: new Date('2025-08-23'),
        $lte: new Date('2025-08-24')
      }
    });
    console.log(`简单日期查询找到 ${records3.length} 条记录`);
    
    const records = records1.length > 0 ? records1 : (records2.length > 0 ? records2 : records3);
    
    console.log(`找到 ${records.length} 条08-23的报损记录:`);
    records.forEach((record, index) => {
      console.log(`记录 ${index + 1}:`);
      console.log(`  门店ID: ${record.storeId}`);
      console.log(`  日期: ${record.date}`);
      console.log(`  类型: ${record.type}`);
      console.log(`  总数量: ${record.totalQuantity}`);
      console.log(`  总价值: ${record.totalValue}`);
      console.log(`  项目数: ${record.items.length}`);
      console.log('---');
    });
    
    // 也查询一下所有记录的日期范围
    const allRecords = await ProductionLoss.find({}).sort({ date: 1 });
    if (allRecords.length > 0) {
      console.log(`\n数据库中共有 ${allRecords.length} 条报损记录`);
      console.log(`最早记录日期: ${allRecords[0].date}`);
      console.log(`最晚记录日期: ${allRecords[allRecords.length - 1].date}`);
    } else {
      console.log('\n数据库中没有任何报损记录');
    }
    
  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('已断开数据库连接');
  }
}

checkRecords();