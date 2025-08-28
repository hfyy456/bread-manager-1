const mongoose = require('mongoose');
const Revenue = require('./express/models/Revenue');

// 使用与服务器相同的数据库配置
const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
const DB_PORT = process.env.MONGO_PORT || '32233';
const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';
const mongoUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;

// 连接数据库
mongoose.connect(mongoUrl, {
  serverSelectionTimeoutMS: 5000,
})
  .then(async () => {
    console.log('连接数据库成功');
    
    // 查看最近的营业数据记录
    const records = await Revenue.find({})
      .sort({date: -1, createdAt: -1})
      .limit(10);
    
    console.log('\n最近10条营业数据记录:');
    records.forEach((r, i) => {
      const dateStr = r.date.toISOString();
      const localDateStr = r.date.toISOString().split('T')[0];
      console.log(`${i+1}. 门店: ${r.storeId}, UTC日期: ${dateStr}, 本地日期: ${localDateStr}, 营业额: ${r.totalRevenue}`);
    });
    
    // 检查28号的数据
    console.log('\n检查包含"28"的记录:');
    const records28 = await Revenue.find({
      $or: [
        { date: { $gte: new Date('2024-01-28T00:00:00.000Z'), $lt: new Date('2024-01-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-02-28T00:00:00.000Z'), $lt: new Date('2024-02-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-03-28T00:00:00.000Z'), $lt: new Date('2024-03-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-04-28T00:00:00.000Z'), $lt: new Date('2024-04-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-05-28T00:00:00.000Z'), $lt: new Date('2024-05-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-06-28T00:00:00.000Z'), $lt: new Date('2024-06-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-07-28T00:00:00.000Z'), $lt: new Date('2024-07-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-08-28T00:00:00.000Z'), $lt: new Date('2024-08-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-09-28T00:00:00.000Z'), $lt: new Date('2024-09-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-10-28T00:00:00.000Z'), $lt: new Date('2024-10-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-11-28T00:00:00.000Z'), $lt: new Date('2024-11-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-12-28T00:00:00.000Z'), $lt: new Date('2024-12-29T00:00:00.000Z') } },
        { date: { $gte: new Date('2025-01-28T00:00:00.000Z'), $lt: new Date('2025-01-29T00:00:00.000Z') } }
      ]
    }).sort({ date: -1 });
    
    if (records28.length > 0) {
      console.log(`找到 ${records28.length} 条28号的记录:`);
      records28.forEach((r, i) => {
        const dateStr = r.date.toISOString();
        const localDateStr = r.date.toISOString().split('T')[0];
        console.log(`${i+1}. 门店: ${r.storeId}, UTC日期: ${dateStr}, 本地日期: ${localDateStr}, 营业额: ${r.totalRevenue}`);
      });
    } else {
      console.log('没有找到28号的记录');
    }
    
    // 检查27号的数据
    console.log('\n检查包含"27"的记录:');
    const records27 = await Revenue.find({
      $or: [
        { date: { $gte: new Date('2024-01-27T00:00:00.000Z'), $lt: new Date('2024-01-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-02-27T00:00:00.000Z'), $lt: new Date('2024-02-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-03-27T00:00:00.000Z'), $lt: new Date('2024-03-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-04-27T00:00:00.000Z'), $lt: new Date('2024-04-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-05-27T00:00:00.000Z'), $lt: new Date('2024-05-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-06-27T00:00:00.000Z'), $lt: new Date('2024-06-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-07-27T00:00:00.000Z'), $lt: new Date('2024-07-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-08-27T00:00:00.000Z'), $lt: new Date('2024-08-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-09-27T00:00:00.000Z'), $lt: new Date('2024-09-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-10-27T00:00:00.000Z'), $lt: new Date('2024-10-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-11-27T00:00:00.000Z'), $lt: new Date('2024-11-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2024-12-27T00:00:00.000Z'), $lt: new Date('2024-12-28T00:00:00.000Z') } },
        { date: { $gte: new Date('2025-01-27T00:00:00.000Z'), $lt: new Date('2025-01-28T00:00:00.000Z') } }
      ]
    }).sort({ date: -1 });
    
    if (records27.length > 0) {
      console.log(`找到 ${records27.length} 条27号的记录:`);
      records27.forEach((r, i) => {
        const dateStr = r.date.toISOString();
        const localDateStr = r.date.toISOString().split('T')[0];
        console.log(`${i+1}. 门店: ${r.storeId}, UTC日期: ${dateStr}, 本地日期: ${localDateStr}, 营业额: ${r.totalRevenue}`);
      });
    } else {
      console.log('没有找到27号的记录');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('连接失败:', err);
    process.exit(1);
  });