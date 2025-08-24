/**
 * 检查生产报损记录脚本
 */

const mongoose = require('mongoose');
const ProductionLoss = require('./express/models/ProductionLoss');

/**
 * 检查生产报损记录
 */
async function checkProductionLossRecords() {
  try {
    console.log('🔗 连接数据库...');
    // 使用与服务器相同的数据库连接
    const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
    const DB_PORT = process.env.MONGO_PORT || '32233';
    const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';
    const mongoUrl = `mongodb://${DB_HOST}:${DB_PORT}/${DB_NAME}`;
    
    console.log('📍 连接地址:', mongoUrl);
    await mongoose.connect(mongoUrl, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: false
    });
    console.log('✅ 数据库连接成功');
    
    const storeId = '6878def4ae6e08fa4af88e34';
    const startDate = new Date('2025-08-23T16:00:00.000Z');
    const endDate = new Date('2025-08-24T15:59:59.999Z');
    
    console.log('\n🔍 检查生产报损记录...');
    console.log('📍 门店ID:', storeId);
    console.log('📅 日期范围:', startDate.toISOString(), '到', endDate.toISOString());
    
    // 查找指定日期范围的记录
    const records = await ProductionLoss.find({
      storeId: storeId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    console.log('\n📊 找到记录数量:', records.length);
    
    if (records.length > 0) {
      console.log('\n📋 记录详情:');
      records.forEach((record, index) => {
        console.log(`\n记录 ${index + 1}:`);
        console.log('  ID:', record._id.toString());
        console.log('  类型:', record.type);
        console.log('  日期:', record.date.toISOString());
        console.log('  总金额:', record.totalValue);
        console.log('  总数量:', record.totalQuantity);
        console.log('  项目数量:', record.items?.length || 0);
        console.log('  操作人:', record.operatedBy);
        
        if (record.items && record.items.length > 0) {
          console.log('  项目明细:');
          record.items.forEach((item, itemIndex) => {
            console.log(`    ${itemIndex + 1}. ${item.productName}: ${item.quantity}${item.unit} × ¥${item.unitPrice} = ¥${item.totalValue}`);
          });
        }
      });
    } else {
      console.log('\n❌ 未找到任何生产报损记录');
      
      // 检查是否有其他日期的记录
      console.log('\n🔍 检查该门店的所有生产报损记录...');
      const allRecords = await ProductionLoss.find({ storeId: storeId }).limit(5);
      console.log('该门店总记录数:', await ProductionLoss.countDocuments({ storeId: storeId }));
      
      if (allRecords.length > 0) {
        console.log('\n最近5条记录:');
        allRecords.forEach((record, index) => {
          console.log(`${index + 1}. ${record.type} - ${record.date.toISOString()} - ¥${record.totalValue}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 数据库连接已断开');
  }
}

// 执行检查
if (require.main === module) {
  checkProductionLossRecords().catch(error => {
    console.error('脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = { checkProductionLossRecords };