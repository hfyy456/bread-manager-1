/**
 * 简化版本的索引修复脚本
 * 专注于删除有问题的username_1索引
 */

const mongoose = require('mongoose');
const { User } = require('./express/models/User');
const connectDB = require('./express/config/db');

/**
 * 连接到MongoDB数据库
 */
async function connectToMongoDB() {
    try {
        await connectDB();
        console.log('✅ MongoDB连接成功');
    } catch (error) {
        console.error('❌ MongoDB连接失败:', error.message);
        process.exit(1);
    }
}

/**
 * 检查当前用户集合的索引
 */
async function checkIndexes() {
    try {
        const indexes = await User.collection.getIndexes();
        console.log('\n📋 当前用户集合索引:');
        Object.keys(indexes).forEach(indexName => {
            console.log(`  - ${indexName}:`, indexes[indexName]);
        });
        return indexes;
    } catch (error) {
        console.error('❌ 获取索引失败:', error.message);
        throw error;
    }
}

/**
 * 删除有问题的username索引
 */
async function dropUsernameIndex() {
    try {
        console.log('\n🗑️  删除username_1索引...');
        
        // 尝试删除username_1索引
        try {
            await User.collection.dropIndex('username_1');
            console.log('✅ 成功删除username_1索引');
            return true;
        } catch (error) {
            if (error.code === 27) {
                console.log('ℹ️  username_1索引不存在，跳过删除');
                return false;
            } else {
                console.error('❌ 删除username_1索引失败:', error.message);
                throw error;
            }
        }
    } catch (error) {
        console.error('❌ 删除索引操作失败:', error.message);
        throw error;
    }
}

/**
 * 检查重复的用户记录
 */
async function checkDuplicateUsers() {
    try {
        console.log('\n🔍 检查重复用户记录...');
        
        // 检查feishuUserId重复
        const feishuDuplicates = await User.aggregate([
            {
                $group: {
                    _id: '$feishuUserId',
                    count: { $sum: 1 },
                    docs: { $push: { _id: '$_id', name: '$name', email: '$email' } }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        if (feishuDuplicates.length > 0) {
            console.log('⚠️  发现feishuUserId重复记录:');
            feishuDuplicates.forEach(dup => {
                console.log(`  feishuUserId: ${dup._id}, 重复数量: ${dup.count}`);
                dup.docs.forEach(doc => {
                    console.log(`    - ID: ${doc._id}, name: ${doc.name}, email: ${doc.email}`);
                });
            });
        } else {
            console.log('✅ 未发现feishuUserId重复记录');
        }

        return feishuDuplicates;
    } catch (error) {
        console.error('❌ 检查重复记录失败:', error.message);
        throw error;
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('🚀 开始修复MongoDB索引问题...');
        
        // 连接数据库
        await connectToMongoDB();
        
        // 检查当前索引
        console.log('\n=== 修复前索引状态 ===');
        await checkIndexes();
        
        // 检查重复记录
        const duplicates = await checkDuplicateUsers();
        
        // 删除有问题的username索引
        const indexDropped = await dropUsernameIndex();
        
        // 最终检查
        console.log('\n=== 修复后索引状态 ===');
        await checkIndexes();
        
        if (indexDropped) {
            console.log('\n✅ 修复完成！username_1索引已删除');
            console.log('💡 现在可以重新启动应用程序，E11000错误应该已解决');
        } else {
            console.log('\n✅ 检查完成！未发现需要删除的索引');
        }
        
        if (duplicates.length > 0) {
            console.log('\n⚠️  注意：发现重复的用户记录，建议手动清理');
        }
        
    } catch (error) {
        console.error('❌ 修复过程中出现错误:', error.message);
        console.error(error.stack);
    } finally {
        // 关闭数据库连接
        await mongoose.connection.close();
        console.log('🔌 数据库连接已关闭');
        process.exit(0);
    }
}

// 运行脚本
if (require.main === module) {
    main();
}

module.exports = {
    connectToMongoDB,
    checkIndexes,
    dropUsernameIndex,
    checkDuplicateUsers
};