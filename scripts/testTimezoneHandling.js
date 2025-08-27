/**
 * 时区处理单元测试
 * 测试不同时区环境下的功能正确性
 * 
 * 使用方法:
 * node scripts/testTimezoneHandling.js
 */

const assert = require('assert');
const { format, parseISO } = require('date-fns');
const { zonedTimeToUtc, utcToZonedTime } = require('date-fns-tz');

// 导入要测试的模块
const timezoneUtils = require('../express/utils/timezone.js');

// 测试用的时区
const TEST_TIMEZONES = {
  SHANGHAI: 'Asia/Shanghai',
  UTC: 'UTC',
  NEW_YORK: 'America/New_York',
  LONDON: 'Europe/London',
  TOKYO: 'Asia/Tokyo'
};

// 测试用的日期时间
const TEST_DATES = {
  // 2024年1月1日 12:00:00 (各时区)
  SHANGHAI_NOON: '2024-01-01T12:00:00+08:00',
  UTC_NOON: '2024-01-01T12:00:00Z',
  // 夏令时测试日期 (2024年7月1日)
  SUMMER_DATE: '2024-07-01T12:00:00',
  // 冬令时测试日期 (2024年12月1日)
  WINTER_DATE: '2024-12-01T12:00:00'
};

/**
 * 测试结果统计
 */
class TestRunner {
  constructor() {
    this.totalTests = 0;
    this.passedTests = 0;
    this.failedTests = 0;
    this.errors = [];
  }

  /**
   * 运行单个测试
   * @param {string} testName - 测试名称
   * @param {Function} testFunction - 测试函数
   */
  async runTest(testName, testFunction) {
    this.totalTests++;
    try {
      await testFunction();
      this.passedTests++;
      console.log(`✅ ${testName}`);
    } catch (error) {
      this.failedTests++;
      this.errors.push({ testName, error: error.message });
      console.log(`❌ ${testName}: ${error.message}`);
    }
  }

  /**
   * 输出测试结果
   */
  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('测试结果统计:');
    console.log('='.repeat(60));
    console.log(`总测试数: ${this.totalTests}`);
    console.log(`通过: ${this.passedTests}`);
    console.log(`失败: ${this.failedTests}`);
    console.log(`成功率: ${((this.passedTests / this.totalTests) * 100).toFixed(2)}%`);

    if (this.errors.length > 0) {
      console.log('\n失败的测试:');
      this.errors.forEach(({ testName, error }) => {
        console.log(`- ${testName}: ${error}`);
      });
    }
  }
}

/**
 * 测试UTC转换功能
 */
function testUTCConversion() {
  // 测试本地时间转UTC
  const localDate = new Date('2024-01-01T12:00:00');
  const utcDate = timezoneUtils.localToUTC(localDate, TEST_TIMEZONES.SHANGHAI);
  
  // 上海时间12:00应该转换为UTC 04:00
  const expectedUTC = new Date('2024-01-01T04:00:00Z');
  assert.strictEqual(utcDate.getTime(), expectedUTC.getTime(), '本地时间转UTC失败');

  // 测试UTC转本地时间
  const convertedLocal = timezoneUtils.utcToLocal(utcDate, TEST_TIMEZONES.SHANGHAI);
  assert.strictEqual(convertedLocal.getTime(), localDate.getTime(), 'UTC转本地时间失败');
}

/**
 * 测试时区偏移计算
 */
function testTimezoneOffset() {
  // 测试上海时区偏移 (UTC+8)
  const shanghaiOffset = timezoneUtils.getTimezoneOffset(TEST_TIMEZONES.SHANGHAI);
  assert.strictEqual(shanghaiOffset, 8, '上海时区偏移计算错误');

  // 测试UTC偏移
  const utcOffset = timezoneUtils.getTimezoneOffset(TEST_TIMEZONES.UTC);
  assert.strictEqual(utcOffset, 0, 'UTC时区偏移计算错误');
}

/**
 * 测试日期格式化
 */
function testDateFormatting() {
  const testDate = new Date('2024-01-01T12:00:00Z');
  
  // 测试UTC格式化
  const utcFormatted = timezoneUtils.formatInTimezone(testDate, 'yyyy-MM-dd HH:mm:ss', TEST_TIMEZONES.UTC);
  assert.strictEqual(utcFormatted, '2024-01-01 12:00:00', 'UTC格式化失败');

  // 测试上海时区格式化
  const shanghaiFormatted = timezoneUtils.formatInTimezone(testDate, 'yyyy-MM-dd HH:mm:ss', TEST_TIMEZONES.SHANGHAI);
  assert.strictEqual(shanghaiFormatted, '2024-01-01 20:00:00', '上海时区格式化失败');
}

/**
 * 测试日期范围处理
 */
function testDateRangeHandling() {
  const startDate = '2024-01-01';
  const endDate = '2024-01-02';
  
  // 测试日期范围转UTC
  const utcRange = timezoneUtils.convertDateRangeToUTC(startDate, endDate, TEST_TIMEZONES.SHANGHAI);
  
  // 上海时间2024-01-01 00:00:00应该转换为UTC 2023-12-31 16:00:00
  const expectedStartUTC = new Date('2023-12-31T16:00:00Z');
  const expectedEndUTC = new Date('2024-01-01T15:59:59.999Z');
  
  assert.strictEqual(utcRange.startDate.getTime(), expectedStartUTC.getTime(), '开始日期转UTC失败');
  assert.strictEqual(utcRange.endDate.getTime(), expectedEndUTC.getTime(), '结束日期转UTC失败');
}

/**
 * 测试夏令时处理
 */
function testDaylightSavingTime() {
  // 测试纽约夏令时 (7月)
  const summerDate = new Date('2024-07-01T12:00:00');
  const nyUtcSummer = timezoneUtils.localToUTC(summerDate, TEST_TIMEZONES.NEW_YORK);
  
  // 纽约夏令时UTC-4，所以12:00应该转换为UTC 16:00
  const expectedSummerUTC = new Date('2024-07-01T16:00:00Z');
  assert.strictEqual(nyUtcSummer.getTime(), expectedSummerUTC.getTime(), '夏令时转换失败');

  // 测试纽约标准时间 (12月)
  const winterDate = new Date('2024-12-01T12:00:00');
  const nyUtcWinter = timezoneUtils.localToUTC(winterDate, TEST_TIMEZONES.NEW_YORK);
  
  // 纽约标准时间UTC-5，所以12:00应该转换为UTC 17:00
  const expectedWinterUTC = new Date('2024-12-01T17:00:00Z');
  assert.strictEqual(nyUtcWinter.getTime(), expectedWinterUTC.getTime(), '标准时间转换失败');
}

/**
 * 测试边界情况
 */
function testEdgeCases() {
  // 测试null/undefined输入
  assert.strictEqual(timezoneUtils.formatInTimezone(null, 'yyyy-MM-dd'), null, 'null输入处理失败');
  assert.strictEqual(timezoneUtils.formatInTimezone(undefined, 'yyyy-MM-dd'), null, 'undefined输入处理失败');

  // 测试无效日期
  const invalidDate = new Date('invalid');
  assert.strictEqual(timezoneUtils.formatInTimezone(invalidDate, 'yyyy-MM-dd'), null, '无效日期处理失败');

  // 测试无效时区
  try {
    timezoneUtils.localToUTC(new Date(), 'Invalid/Timezone');
    assert.fail('应该抛出无效时区错误');
  } catch (error) {
    assert.ok(error.message.includes('Invalid timezone'), '无效时区错误处理失败');
  }
}

/**
 * 测试数据库查询日期范围
 */
function testDatabaseDateRange() {
  const queryDate = '2024-01-01';
  
  // 测试获取查询日期范围
  const range = timezoneUtils.getQueryDateRange(queryDate, TEST_TIMEZONES.SHANGHAI);
  
  // 验证返回的是UTC时间范围
  assert.ok(range.startDate instanceof Date, '开始日期应该是Date对象');
  assert.ok(range.endDate instanceof Date, '结束日期应该是Date对象');
  
  // 验证时间范围覆盖整天
  const dayDuration = range.endDate.getTime() - range.startDate.getTime();
  const expectedDuration = 24 * 60 * 60 * 1000 - 1; // 23:59:59.999
  assert.strictEqual(dayDuration, expectedDuration, '日期范围持续时间错误');
}

/**
 * 测试时区检测
 */
function testTimezoneDetection() {
  // 测试时区验证
  assert.strictEqual(timezoneUtils.isValidTimezone(TEST_TIMEZONES.SHANGHAI), true, '上海时区验证失败');
  assert.strictEqual(timezoneUtils.isValidTimezone('Invalid/Timezone'), false, '无效时区验证失败');

  // 测试时区标准化
  assert.strictEqual(timezoneUtils.normalizeTimezone('Asia/Shanghai'), 'Asia/Shanghai', '时区标准化失败');
  assert.strictEqual(timezoneUtils.normalizeTimezone('shanghai'), 'Asia/Shanghai', '时区别名标准化失败');
}

/**
 * 测试性能
 */
function testPerformance() {
  const iterations = 10000;
  const testDate = new Date();
  
  console.log(`\n性能测试 (${iterations} 次迭代):`);
  
  // 测试UTC转换性能
  const startTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    timezoneUtils.localToUTC(testDate, TEST_TIMEZONES.SHANGHAI);
  }
  const utcConversionTime = Date.now() - startTime;
  console.log(`UTC转换: ${utcConversionTime}ms (平均 ${(utcConversionTime / iterations).toFixed(3)}ms/次)`);
  
  // 测试格式化性能
  const formatStartTime = Date.now();
  for (let i = 0; i < iterations; i++) {
    timezoneUtils.formatInTimezone(testDate, 'yyyy-MM-dd HH:mm:ss', TEST_TIMEZONES.SHANGHAI);
  }
  const formatTime = Date.now() - formatStartTime;
  console.log(`格式化: ${formatTime}ms (平均 ${(formatTime / iterations).toFixed(3)}ms/次)`);
  
  // 性能断言 (每次操作应该在1ms以内)
  assert.ok(utcConversionTime / iterations < 1, 'UTC转换性能不达标');
  assert.ok(formatTime / iterations < 1, '格式化性能不达标');
}

/**
 * 主测试函数
 */
async function runAllTests() {
  const runner = new TestRunner();
  
  console.log('开始时区处理单元测试...');
  console.log('='.repeat(60));
  
  // 运行所有测试
  await runner.runTest('UTC转换功能测试', testUTCConversion);
  await runner.runTest('时区偏移计算测试', testTimezoneOffset);
  await runner.runTest('日期格式化测试', testDateFormatting);
  await runner.runTest('日期范围处理测试', testDateRangeHandling);
  await runner.runTest('夏令时处理测试', testDaylightSavingTime);
  await runner.runTest('边界情况测试', testEdgeCases);
  await runner.runTest('数据库日期范围测试', testDatabaseDateRange);
  await runner.runTest('时区检测测试', testTimezoneDetection);
  await runner.runTest('性能测试', testPerformance);
  
  // 输出测试结果
  runner.printResults();
  
  // 如果有失败的测试，退出码为1
  if (runner.failedTests > 0) {
    process.exit(1);
  }
  
  console.log('\n🎉 所有测试通过！');
}

// 运行测试
if (require.main === module) {
  runAllTests().catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = {
  TestRunner,
  testUTCConversion,
  testTimezoneOffset,
  testDateFormatting,
  testDateRangeHandling,
  testDaylightSavingTime,
  testEdgeCases,
  testDatabaseDateRange,
  testTimezoneDetection,
  testPerformance
};