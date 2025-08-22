/**
 * 多应用构建脚本
 * 支持独立构建不同的应用入口，提供灵活的构建选项
 * @author Sirius
 * @date 2025-01-21
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * 应用配置映射
 */
const APP_CONFIGS = {
  main: {
    name: 'PC端主应用',
    description: '面包管理系统主界面',
    entry: 'index.html'
  },
  mobile: {
    name: '移动端申领应用',
    description: '要货通 - 物料申领系统',
    entry: 'mobile.html'
  },
  mobileHome: {
    name: '移动端首页应用',
    description: '移动端功能入口',
    entry: 'mobile-home.html'
  }
};

/**
 * 执行命令并输出结果
 * @param {string} command - 要执行的命令
 * @param {string} description - 命令描述
 */
function executeCommand(command, description) {
  console.log(`\n🚀 ${description}...`);
  console.log(`执行命令: ${command}`);
  
  try {
    const result = execSync(command, { 
      stdio: 'inherit', 
      encoding: 'utf8',
      cwd: path.resolve(__dirname, '..')
    });
    console.log(`✅ ${description} 完成`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} 失败:`, error.message);
    return false;
  }
}

/**
 * 构建指定应用
 * @param {string} appName - 应用名称
 */
function buildApp(appName) {
  const config = APP_CONFIGS[appName];
  if (!config) {
    console.error(`❌ 未找到应用配置: ${appName}`);
    console.log('可用的应用:', Object.keys(APP_CONFIGS).join(', '));
    return false;
  }

  console.log(`\n📦 开始构建 ${config.name}`);
  console.log(`描述: ${config.description}`);
  console.log(`入口文件: ${config.entry}`);

  // 设置环境变量指定构建的应用
  const buildCommand = `cross-env VITE_BUILD_APP=${appName} npm run build`;
  
  return executeCommand(buildCommand, `构建 ${config.name}`);
}

/**
 * 构建所有应用
 */
function buildAllApps() {
  console.log('\n🏗️  开始构建所有应用...');
  
  let successCount = 0;
  const totalApps = Object.keys(APP_CONFIGS).length;
  
  for (const [appName, config] of Object.entries(APP_CONFIGS)) {
    console.log(`\n[${ successCount + 1 }/${totalApps}] 构建 ${config.name}`);
    
    if (buildApp(appName)) {
      successCount++;
    } else {
      console.error(`❌ ${config.name} 构建失败，停止后续构建`);
      break;
    }
  }
  
  console.log(`\n📊 构建结果: ${successCount}/${totalApps} 个应用构建成功`);
  
  if (successCount === totalApps) {
    console.log('🎉 所有应用构建完成！');
    return true;
  } else {
    console.log('⚠️  部分应用构建失败，请检查错误信息');
    return false;
  }
}

/**
 * 清理构建目录
 */
function cleanBuild() {
  const distPath = path.resolve(__dirname, '..', 'dist');
  
  if (fs.existsSync(distPath)) {
    console.log('🧹 清理构建目录...');
    return executeCommand('rimraf dist', '清理构建目录');
  } else {
    console.log('📁 构建目录不存在，跳过清理');
    return true;
  }
}

/**
 * 显示帮助信息
 */
function showHelp() {
  console.log(`
📖 多应用构建脚本使用说明:
`);
  console.log('用法:');
  console.log('  node scripts/build-apps.js [选项] [应用名称]\n');
  
  console.log('选项:');
  console.log('  --all, -a     构建所有应用');
  console.log('  --clean, -c   构建前清理目录');
  console.log('  --help, -h    显示帮助信息\n');
  
  console.log('可用的应用:');
  Object.entries(APP_CONFIGS).forEach(([key, config]) => {
    console.log(`  ${key.padEnd(12)} ${config.name} - ${config.description}`);
  });
  
  console.log('\n示例:');
  console.log('  node scripts/build-apps.js main          # 构建PC端主应用');
  console.log('  node scripts/build-apps.js --all         # 构建所有应用');
  console.log('  node scripts/build-apps.js --clean main  # 清理后构建PC端主应用');
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  
  // 解析命令行参数
  const hasClean = args.includes('--clean') || args.includes('-c');
  const hasAll = args.includes('--all') || args.includes('-a');
  const hasHelp = args.includes('--help') || args.includes('-h');
  
  // 显示帮助信息
  if (hasHelp || args.length === 0) {
    showHelp();
    return;
  }
  
  console.log('🏗️  面包管理系统 - 多应用构建工具');
  console.log('=' .repeat(50));
  
  // 清理构建目录
  if (hasClean) {
    if (!cleanBuild()) {
      process.exit(1);
    }
  }
  
  // 构建应用
  let success = false;
  
  if (hasAll) {
    success = buildAllApps();
  } else {
    // 获取应用名称（排除选项参数）
    const appName = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
    
    if (!appName) {
      console.error('❌ 请指定要构建的应用名称');
      showHelp();
      process.exit(1);
    }
    
    success = buildApp(appName);
  }
  
  // 退出程序
  process.exit(success ? 0 : 1);
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  buildApp,
  buildAllApps,
  cleanBuild,
  APP_CONFIGS
};