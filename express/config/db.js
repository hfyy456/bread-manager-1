const mongoose = require("mongoose");

// --- 连接参数配置 ---
// 优先从环境变量读取，否则使用默认值
const DB_USER = process.env.MONGO_USER;
const DB_PASS = process.env.MONGO_PASS;
const DB_HOST = process.env.MONGO_HOST || '47.121.31.68';
const DB_PORT = process.env.MONGO_PORT || '32233';
const DB_NAME = process.env.MONGO_DB_NAME || 'hot_crush';

// 构建 MongoDB URI 函数
function getMongoUrl() {
  // 如果环境变量中直接提供了 MONGO_URI，则优先使用它
  if (process.env.MONGO_URI) {
    return process.env.MONGO_URI;
  }
  // 否则，根据单独的参数构建
  let mongoUrlPrefix = 'mongodb://';
  if (DB_USER && DB_PASS) {
    // 如果环境变量中设置了用户和密码，则添加到 URI
    // 注意：如果服务器实际上不进行认证，这里的用户和密码可能被忽略或导致错误
    mongoUrlPrefix += `${DB_USER}:${DB_PASS}@`;
  }
  // 即使提供了用户/密码，如果服务器不强制认证或它们无效，连接行为将取决于服务器配置
  return `${mongoUrlPrefix}${DB_HOST}:${DB_PORT}/${DB_NAME}`;
}

// Mongoose 连接选项函数
function getMongoConnectOptions() {
  const options = {
    // useNewUrlParser: true, // 在 Mongoose 6.x+ 中已弃用且默认为 true
    // useUnifiedTopology: true, // 在 Mongoose 6.x+ 中已弃用且默认为 true
    // poolSize: 5, // 可以根据需要设置，Mongoose 6+ 默认为 5
    // keepAlive: 120, // 在 Mongoose 6.x 中已移除
    serverSelectionTimeoutMS: 5000, // 如果5秒内无法选择服务器，则超时
    autoIndex: process.env.NODE_ENV !== 'production', // 不在生产环境中自动创建索引
  };
  return options;
}

const connectDB = async () => {
  const mongoUrl = getMongoUrl();
  const mongoOptions = getMongoConnectOptions();

  // 隐藏日志中的密码
  const logSafeUrl = mongoUrl.includes('@') ? mongoUrl.replace(/:.*@/, ':<password>@') : mongoUrl;

  try {
    console.log(`尝试连接到 MongoDB: ${logSafeUrl}...`);
    await mongoose.connect(mongoUrl, mongoOptions);
    // `mongoose.connection` 是默认连接的引用
    console.log('成功连接到 MongoDB:', logSafeUrl);
  } catch (err) {
    console.error('MongoDB 连接错误:', err.message);
    process.exit(1); // 在连接失败时退出进程
  }

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB 连接发生错误: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('MongoDB 连接已断开');
  });

  // 如果应用关闭，则关闭 Mongoose 连接
  process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('MongoDB 连接因应用终止而关闭');
    process.exit(0);
  });
};

module.exports = connectDB;
