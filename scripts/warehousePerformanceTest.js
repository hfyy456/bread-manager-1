const mongoose = require('mongoose');
const connectDB = require('../express/config/db');
const Ingredient = require('../express/models/Ingredient');
const StoreInventory = require('../express/models/StoreInventory');
const Store = require('../express/models/Store');

/**
 * Warehouse页面性能测试工具
 * 生成测试数据并测试各种场景的性能
 */

class WarehousePerformanceTest {
  constructor() {
    this.testResults = [];
    this.testStore = null;
  }

  // 记录测试结果
  recordTest(testName, duration, metadata = {}) {
    const result = {
      testName,
      duration,
      timestamp: new Date().toISOString(),
      ...metadata
    };
    this.testResults.push(result);
    
    const color = duration < 100 ? '\x1b[32m' : duration < 500 ? '\x1b[33m' : '\x1b[31m';
    console.log(`${color}✓ ${testName}: ${duration}ms\x1b[0m`, metadata);
  }

  // 创建测试门店
  async createTestStore() {
    console.log('🏪 创建测试门店...');
    
    this.testStore = new Store({
      name: 'Performance Test Store',
      address: 'Test Address',
      warehouseManagers: ['TestManager1', 'TestManager2']
    });
    
    await this.testStore.save();
    console.log(`✅ 测试门店创建完成: ${this.testStore._id}`);
    return this.testStore;
  }

  // 生成测试原料数据
  async generateTestIngredients(count = 1000) {
    console.log(`📦 生成 ${count} 个测试原料...`);
    const startTime = Date.now();
    
    const ingredients = [];
    const categories = ['面粉', '糖类', '油脂', '添加剂', '包装', '调料', '坚果', '水果', '蛋白', '乳制品'];
    const units = ['kg', 'g', 'L', 'ml', '个', '包', '袋', '盒'];
    
    for (let i = 1; i <= count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const unit = units[Math.floor(Math.random() * units.length)];
      
      ingredients.push({
        name: `${category}${String(i).padStart(4, '0')}`,
        unit: unit,
        price: Math.round((Math.random() * 100 + 1) * 100) / 100,
        specs: `规格${i}`,
        min: unit,
        norms: Math.floor(Math.random() * 10) + 1,
        post: ['烘焙', '包装', '销售'][Math.floor(Math.random() * 3)]
      });
    }
    
    await Ingredient.insertMany(ingredients);
    const duration = Date.now() - startTime;
    this.recordTest('Generate Test Ingredients', duration, { count });
    
    return ingredients;
  }

  // 生成测试库存数据
  async generateTestInventory(ingredients) {
    console.log(`📊 生成测试库存数据...`);
    const startTime = Date.now();
    
    const inventories = ingredients.map(ingredient => ({
      storeId: this.testStore._id,
      ingredientId: ingredient._id,
      mainWarehouseStock: {
        quantity: Math.floor(Math.random() * 1000),
        unit: ingredient.unit
      },
      stockByPost: {
        '烘焙': { quantity: Math.floor(Math.random() * 100), unit: ingredient.unit },
        '包装': { quantity: Math.floor(Math.random() * 50), unit: ingredient.unit },
        '销售': { quantity: Math.floor(Math.random() * 20), unit: ingredient.unit }
      }
    }));
    
    await StoreInventory.insertMany(inventories);
    const duration = Date.now() - startTime;
    this.recordTest('Generate Test Inventory', duration, { count: inventories.length });
    
    return inventories;
  }

  // 测试数据库查询性能
  async testDatabaseQueries() {
    console.log('🔍 测试数据库查询性能...');
    
    // 测试原料查询
    let startTime = Date.now();
    const ingredients = await Ingredient.find({})
      .select('name unit price specs _id')
      .sort({ name: 1 })
      .lean();
    let duration = Date.now() - startTime;
    this.recordTest('Ingredient Query', duration, { count: ingredients.length });
    
    // 测试库存查询
    startTime = Date.now();
    const inventories = await StoreInventory.find({ storeId: this.testStore._id })
      .select('ingredientId mainWarehouseStock _id')
      .lean();
    duration = Date.now() - startTime;
    this.recordTest('Inventory Query', duration, { count: inventories.length });
    
    // 测试复合查询（模拟实际API）
    startTime = Date.now();
    const [allIngredients, storeInventories] = await Promise.all([
      Ingredient.find({})
        .select('name unit price specs _id')
        .sort({ name: 1 })
        .lean(),
      StoreInventory.find({ storeId: this.testStore._id })
        .select('ingredientId mainWarehouseStock _id')
        .lean()
    ]);
    
    // 模拟数据合并
    const inventoryMap = new Map(
      storeInventories.map(item => [item.ingredientId?.toString(), item])
    );
    
    let grandTotal = 0;
    const items = allIngredients.map(ingredient => {
      const inventoryItem = inventoryMap.get(ingredient._id.toString());
      const mainStockQuantity = inventoryItem?.mainWarehouseStock?.quantity || 0;
      const price = ingredient.price || 0;
      const totalPrice = mainStockQuantity * price;
      grandTotal += totalPrice;
      
      return {
        ingredient: ingredient,
        mainWarehouseStock: {
          quantity: mainStockQuantity,
          unit: inventoryItem?.mainWarehouseStock?.unit || ingredient.unit,
        },
        totalPrice: totalPrice.toFixed(2),
        _id: inventoryItem?._id,
      };
    });
    
    duration = Date.now() - startTime;
    this.recordTest('Complete Warehouse Query', duration, { 
      ingredientCount: allIngredients.length,
      inventoryCount: storeInventories.length,
      totalValue: grandTotal.toFixed(2)
    });
    
    return items;
  }

  // 测试批量更新性能
  async testBulkUpdate(count = 100) {
    console.log(`📝 测试批量更新性能 (${count} 项)...`);
    
    const ingredients = await Ingredient.find({}).limit(count).lean();
    const updates = ingredients.map(ingredient => ({
      ingredientId: ingredient._id,
      newStock: Math.floor(Math.random() * 500)
    }));
    
    const startTime = Date.now();
    
    const bulkOps = updates.map(update => ({
      updateOne: {
        filter: { storeId: this.testStore._id, ingredientId: update.ingredientId },
        update: {
          $set: { 
            'mainWarehouseStock.quantity': Number(update.newStock)
          }
        },
        upsert: true
      }
    }));
    
    await StoreInventory.bulkWrite(bulkOps);
    
    const duration = Date.now() - startTime;
    this.recordTest('Bulk Update', duration, { updateCount: updates.length });
  }

  // 测试索引效果
  async testIndexPerformance() {
    console.log('📈 测试索引性能...');
    
    // 测试有索引的查询
    let startTime = Date.now();
    await StoreInventory.find({ storeId: this.testStore._id }).lean();
    let duration = Date.now() - startTime;
    this.recordTest('Indexed Query (storeId)', duration);
    
    // 测试复合索引查询
    startTime = Date.now();
    await StoreInventory.find({ 
      storeId: this.testStore._id,
      'mainWarehouseStock.quantity': { $gt: 0 }
    }).lean();
    duration = Date.now() - startTime;
    this.recordTest('Indexed Query (storeId + quantity)', duration);
    
    // 测试排序查询
    startTime = Date.now();
    await Ingredient.find({}).sort({ name: 1 }).limit(100).lean();
    duration = Date.now() - startTime;
    this.recordTest('Indexed Sort Query (name)', duration);
  }

  // 测试内存使用
  testMemoryUsage() {
    const usage = process.memoryUsage();
    const formatBytes = (bytes) => Math.round(bytes / 1024 / 1024 * 100) / 100;
    
    const memoryInfo = {
      rss: formatBytes(usage.rss),
      heapTotal: formatBytes(usage.heapTotal),
      heapUsed: formatBytes(usage.heapUsed),
      external: formatBytes(usage.external)
    };
    
    console.log('💾 内存使用情况:');
    console.log(`  RSS: ${memoryInfo.rss} MB`);
    console.log(`  Heap Total: ${memoryInfo.heapTotal} MB`);
    console.log(`  Heap Used: ${memoryInfo.heapUsed} MB`);
    console.log(`  External: ${memoryInfo.external} MB`);
    
    return memoryInfo;
  }

  // 生成性能报告
  generateReport() {
    console.log('\n📊 性能测试报告');
    console.log('=' .repeat(50));
    
    const totalTests = this.testResults.length;
    const avgDuration = this.testResults.reduce((sum, test) => sum + test.duration, 0) / totalTests;
    const slowTests = this.testResults.filter(test => test.duration > 1000);
    const fastTests = this.testResults.filter(test => test.duration < 100);
    
    console.log(`总测试数: ${totalTests}`);
    console.log(`平均耗时: ${avgDuration.toFixed(2)}ms`);
    console.log(`快速测试 (<100ms): ${fastTests.length}`);
    console.log(`慢速测试 (>1s): ${slowTests.length}`);
    
    if (slowTests.length > 0) {
      console.log('\n⚠️  慢速测试:');
      slowTests.forEach(test => {
        console.log(`  - ${test.testName}: ${test.duration}ms`);
      });
    }
    
    console.log('\n🏆 最佳性能测试:');
    const bestTests = this.testResults
      .sort((a, b) => a.duration - b.duration)
      .slice(0, 3);
    
    bestTests.forEach((test, index) => {
      console.log(`  ${index + 1}. ${test.testName}: ${test.duration}ms`);
    });
    
    console.log('\n💡 优化建议:');
    if (slowTests.length > 0) {
      console.log('  - 考虑添加更多数据库索引');
      console.log('  - 优化查询语句');
      console.log('  - 使用数据库连接池');
    }
    if (avgDuration > 500) {
      console.log('  - 考虑实施缓存策略');
      console.log('  - 优化数据结构');
    }
    
    return {
      totalTests,
      avgDuration,
      slowTests: slowTests.length,
      fastTests: fastTests.length,
      results: this.testResults
    };
  }

  // 清理测试数据
  async cleanup() {
    console.log('🧹 清理测试数据...');
    
    if (this.testStore) {
      await StoreInventory.deleteMany({ storeId: this.testStore._id });
      await Store.findByIdAndDelete(this.testStore._id);
    }
    
    // 删除测试原料（名称包含数字的）
    await Ingredient.deleteMany({ 
      name: { $regex: /\d{4}$/ } 
    });
    
    console.log('✅ 测试数据清理完成');
  }

  // 运行完整测试套件
  async runFullTest(ingredientCount = 1000) {
    try {
      console.log('🚀 开始Warehouse性能测试...\n');
      
      // 连接数据库
      await connectDB();
      
      // 记录初始内存
      const initialMemory = this.testMemoryUsage();
      
      // 创建测试数据
      await this.createTestStore();
      const ingredients = await this.generateTestIngredients(ingredientCount);
      await this.generateTestInventory(ingredients);
      
      // 运行性能测试
      await this.testDatabaseQueries();
      await this.testBulkUpdate(Math.min(100, ingredientCount));
      await this.testIndexPerformance();
      
      // 记录最终内存
      const finalMemory = this.testMemoryUsage();
      
      // 生成报告
      const report = this.generateReport();
      
      // 清理测试数据
      await this.cleanup();
      
      return report;
      
    } catch (error) {
      console.error('❌ 测试失败:', error);
      await this.cleanup();
      throw error;
    } finally {
      await mongoose.connection.close();
    }
  }
}

// 运行测试
if (require.main === module) {
  const tester = new WarehousePerformanceTest();
  
  // 从命令行参数获取测试数据量
  const count = parseInt(process.argv[2]) || 1000;
  
  tester.runFullTest(count)
    .then(report => {
      console.log('\n🎉 性能测试完成！');
      process.exit(0);
    })
    .catch(error => {
      console.error('测试失败:', error);
      process.exit(1);
    });
}

module.exports = WarehousePerformanceTest;