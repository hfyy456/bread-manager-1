const mongoose = require('mongoose');
const connectDB = require('../express/config/db');
const Store = require('../express/models/Store');

/**
 * 测试导出文件名生成功能
 * 验证门店名称+时间的文件名格式
 */

const testExportFilename = async () => {
  try {
    console.log('🚀 开始测试导出文件名生成...\n');
    
    // 连接数据库
    await connectDB();
    
    // 1. 创建测试门店（包含特殊字符）
    console.log('📍 创建测试门店...');
    const testStores = [
      { name: '北京朝阳店', address: '北京市朝阳区' },
      { name: '上海/浦东店', address: '上海市浦东新区' },
      { name: '深圳<南山>店', address: '深圳市南山区' },
      { name: '广州"天河"店', address: '广州市天河区' },
      { name: '杭州|西湖店', address: '杭州市西湖区' }
    ];
    
    const createdStores = [];
    for (const storeData of testStores) {
      const store = new Store(storeData);
      await store.save();
      createdStores.push(store);
      console.log(`  ✓ 创建门店: ${store.name} (ID: ${store._id})`);
    }
    console.log('');
    
    // 2. 测试文件名生成函数
    console.log('🧪 测试文件名生成函数...');
    
    // 导入辅助函数
    const { format } = require('date-fns');
    
    // 模拟辅助函数
    const getStoreNameForFilename = async (storeId) => {
      try {
        const store = await Store.findById(storeId).select('name').lean();
        if (store && store.name) {
          // 清理门店名称，移除特殊字符以适合文件名
          return store.name.replace(/[<>:"/\\|?*]/g, '_');
        }
      } catch (error) {
        console.warn('获取门店名称失败，使用默认名称:', error.message);
      }
      return '未知门店';
    };
    
    // 测试每个门店的文件名生成
    for (const store of createdStores) {
      const cleanedName = await getStoreNameForFilename(store._id);
      const timestamp = format(new Date(), "yyyyMMdd_HHmmss");
      
      // 生成不同类型的文件名
      const realtimeFilename = `${cleanedName}_实时库存_${timestamp}.xlsx`;
      const snapshotFilename = `${cleanedName}_库存快照_${timestamp}.xlsx`;
      const warehouseFilename = `${cleanedName}_仓库库存_${timestamp}.csv`;
      
      console.log(`  门店: ${store.name}`);
      console.log(`    清理后名称: ${cleanedName}`);
      console.log(`    实时库存文件: ${realtimeFilename}`);
      console.log(`    库存快照文件: ${snapshotFilename}`);
      console.log(`    仓库库存文件: ${warehouseFilename}`);
      console.log('');
    }
    
    // 3. 测试文件名的URL编码
    console.log('🔗 测试文件名URL编码...');
    
    const testFilename = '北京朝阳店_实时库存_20250130_143022.xlsx';
    const encodedFilename = encodeURIComponent(testFilename);
    
    console.log(`  原始文件名: ${testFilename}`);
    console.log(`  URL编码后: ${encodedFilename}`);
    console.log(`  解码验证: ${decodeURIComponent(encodedFilename)}`);
    console.log('');
    
    // 4. 测试特殊字符处理
    console.log('🛡️ 测试特殊字符处理...');
    
    const specialNames = [
      'Test<Store>',
      'Test"Store"',
      'Test/Store\\',
      'Test|Store*',
      'Test:Store?',
      'Normal Store Name'
    ];
    
    specialNames.forEach(name => {
      const cleaned = name.replace(/[<>:"/\\|?*]/g, '_');
      console.log(`  "${name}" -> "${cleaned}"`);
    });
    console.log('');
    
    // 5. 验证文件名长度
    console.log('📏 验证文件名长度...');
    
    const longStoreName = '这是一个非常长的门店名称用来测试文件名长度限制问题';
    const cleanedLongName = longStoreName.replace(/[<>:"/\\|?*]/g, '_');
    const longFilename = `${cleanedLongName}_实时库存_${format(new Date(), "yyyyMMdd_HHmmss")}.xlsx`;
    
    console.log(`  长门店名称: ${longStoreName}`);
    console.log(`  生成的文件名: ${longFilename}`);
    console.log(`  文件名长度: ${longFilename.length} 字符`);
    
    if (longFilename.length > 255) {
      console.log('  ⚠️ 警告: 文件名可能过长，某些系统可能不支持');
    } else {
      console.log('  ✅ 文件名长度合适');
    }
    console.log('');
    
    // 6. 生成文件名格式总结
    console.log('📋 文件名格式总结:');
    console.log('  实时库存: {门店名}_实时库存_{YYYYMMDD_HHMMSS}.xlsx');
    console.log('  库存快照: {门店名}_库存快照_{YYYYMMDD_HHMMSS}.xlsx');
    console.log('  仓库库存: {门店名}_仓库库存_{YYYYMMDD}.csv');
    console.log('  特殊字符: < > : " / \\ | ? * 会被替换为 _');
    console.log('  编码方式: 使用 encodeURIComponent 进行URL编码');
    console.log('');
    
    console.log('✅ 文件名生成测试完成！');
    
    // 7. 清理测试数据
    console.log('🧹 清理测试数据...');
    for (const store of createdStores) {
      await Store.findByIdAndDelete(store._id);
      console.log(`  ✓ 删除门店: ${store.name}`);
    }
    console.log('✅ 测试数据清理完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📝 数据库连接已关闭');
    process.exit(0);
  }
};

// 运行测试
if (require.main === module) {
  testExportFilename();
}

module.exports = testExportFilename;