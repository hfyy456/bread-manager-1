/*
 * @Author: Sirius 540363975@qq.com
 * @Date: 2025-08-23 00:57:22
 * @LastEditors: Sirius 540363975@qq.com
 * @LastEditTime: 2025-08-23 01:04:40
 */
const mongoose = require('mongoose');
const ProductionLoss = require('./models/ProductionLoss');

mongoose.connect('mongodb://localhost:27017/bread-manager')
  .then(async () => {
    console.log('连接数据库成功');
    
    // 查看最近的记录
    const records = await ProductionLoss.find({})
      .sort({date: -1, createdAt: -1})
      .limit(10);
    
    console.log('\n最近10条记录:');
    records.forEach((r, i) => {
      const dateStr = r.date.toISOString().split('T')[0];
      console.log(`${i+1}. 门店: ${r.storeId}, 日期: ${dateStr}, 类型: ${r.type}, 数量: ${r.totalQuantity}, 价值: ${r.totalValue}`);
    });
    
    // 检查是否有重复记录
    console.log('\n检查重复记录:');
    const duplicates = await ProductionLoss.aggregate([
      {
        $group: {
          _id: {
            storeId: '$storeId',
            date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            type: '$type'
          },
          count: { $sum: 1 },
          records: { $push: '$$ROOT' }
        }
      },
      {
        $match: {
          count: { $gt: 1 }
        }
      }
    ]);
    
    if (duplicates.length > 0) {
      console.log('发现重复记录:');
      duplicates.forEach(dup => {
        console.log(`门店: ${dup._id.storeId}, 日期: ${dup._id.date}, 类型: ${dup._id.type}, 重复数量: ${dup.count}`);
      });
    } else {
      console.log('没有发现重复记录');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('连接失败:', err);
    process.exit(1);
  });