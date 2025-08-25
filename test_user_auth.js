/**
 * 测试用户认证和数据库操作的脚本
 * 验证E11000错误是否已修复
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
 * 测试用户创建操作
 */
async function testUserCreation() {
    try {
        console.log('\n🧪 测试用户创建操作...');
        
        // 测试数据
        const testUsers = [
            {
                feishuUserId: 'test_user_001',
                name: '测试用户1',
                email: 'test1@example.com',
                role: 'employee',
                storeId: null
            },
            {
                feishuUserId: 'test_user_002',
                name: '测试用户2',
                email: 'test2@example.com',
                role: 'manager',
                storeId: null
            }
        ];
        
        // 清理可能存在的测试数据
        await User.deleteMany({ 
            feishuUserId: { $in: testUsers.map(u => u.feishuUserId) } 
        });
        console.log('🧹 清理旧的测试数据');
        
        // 创建测试用户
        for (const userData of testUsers) {
            try {
                const user = new User(userData);
                await user.save();
                console.log(`✅ 成功创建用户: ${userData.name} (${userData.feishuUserId})`);
            } catch (error) {
                console.error(`❌ 创建用户失败 ${userData.name}:`, error.message);
                if (error.code === 11000) {
                    console.error('   这是E11000重复键错误！');
                }
            }
        }
        
        // 测试重复创建（应该失败）
        console.log('\n🧪 测试重复用户创建（应该失败）...');
        try {
            const duplicateUser = new User(testUsers[0]);
            await duplicateUser.save();
            console.log('❌ 意外成功：重复用户创建应该失败');
        } catch (error) {
            if (error.code === 11000) {
                console.log('✅ 正确：重复用户创建被阻止（E11000错误）');
            } else {
                console.error('❌ 意外错误:', error.message);
            }
        }
        
    } catch (error) {
        console.error('❌ 测试用户创建失败:', error.message);
        throw error;
    }
}

/**
 * 测试findOrCreateByFeishuId方法
 */
async function testFindOrCreateByFeishuId() {
    try {
        console.log('\n🧪 测试findOrCreateByFeishuId方法...');
        
        const testFeishuData = {
            feishuUserId: 'feishu_test_001',
            name: '飞书测试用户',
            email: 'feishu@example.com',
            avatar: 'https://example.com/avatar.jpg',
            storeId: null
        };
        
        // 清理可能存在的测试数据
        await User.deleteMany({ feishuUserId: testFeishuData.feishuUserId });
        
        // 第一次调用 - 应该创建新用户
        console.log('第一次调用findOrCreateByFeishuId（创建新用户）...');
        const result1 = await User.findOrCreateByFeishuId(testFeishuData);
        const user1 = result1.user;
        console.log(`✅ 用户创建成功: ${user1.name} (ID: ${user1._id}) - 新用户: ${result1.isNewUser}`);
        
        // 第二次调用 - 应该找到现有用户
        console.log('第二次调用findOrCreateByFeishuId（查找现有用户）...');
        const result2 = await User.findOrCreateByFeishuId({
            ...testFeishuData,
            name: '更新的用户名' // 测试更新
        });
        const user2 = result2.user;
        console.log(`✅ 用户找到并更新: ${user2.name} (ID: ${user2._id}) - 新用户: ${result2.isNewUser}`);
        
        // 验证是否是同一个用户
        if (user1._id.toString() === user2._id.toString()) {
            console.log('✅ 正确：两次调用返回同一个用户');
        } else {
            console.log('❌ 错误：两次调用返回不同用户');
        }
        
    } catch (error) {
        console.error('❌ 测试findOrCreateByFeishuId失败:', error.message);
        if (error.code === 11000) {
            console.error('   这是E11000重复键错误！方法可能存在并发问题');
        }
        throw error;
    }
}

/**
 * 测试并发用户创建
 */
async function testConcurrentUserCreation() {
    try {
        console.log('\n🧪 测试并发用户创建...');
        
        const concurrentFeishuData = {
            feishuUserId: 'concurrent_test_001',
            name: '并发测试用户',
            email: 'concurrent@example.com',
            storeId: null
        };
        
        // 清理可能存在的测试数据
        await User.deleteMany({ feishuUserId: concurrentFeishuData.feishuUserId });
        
        // 同时发起多个创建请求
        const promises = Array(3).fill().map((_, index) => 
            User.findOrCreateByFeishuId({
                ...concurrentFeishuData,
                name: `并发测试用户${index + 1}`
            })
        );
        
        const results = await Promise.allSettled(promises);
        
        let successCount = 0;
        let errorCount = 0;
        
        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successCount++;
                const user = result.value.user;
                console.log(`✅ 并发请求${index + 1}成功: ${user.name} - 新用户: ${result.value.isNewUser}`);
            } else {
                errorCount++;
                console.log(`❌ 并发请求${index + 1}失败: ${result.reason.message}`);
            }
        });
        
        console.log(`📊 并发测试结果: ${successCount}个成功, ${errorCount}个失败`);
        
        // 检查数据库中实际创建的用户数量
        const actualCount = await User.countDocuments({ 
            feishuUserId: concurrentFeishuData.feishuUserId 
        });
        console.log(`📊 数据库中实际用户数量: ${actualCount}`);
        
        if (actualCount === 1) {
            console.log('✅ 并发测试通过：只创建了一个用户');
        } else {
            console.log('❌ 并发测试失败：创建了多个重复用户');
        }
        
    } catch (error) {
        console.error('❌ 测试并发用户创建失败:', error.message);
        throw error;
    }
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
    try {
        console.log('\n🧹 清理测试数据...');
        
        const testFeishuIds = [
            'test_user_001',
            'test_user_002', 
            'feishu_test_001',
            'concurrent_test_001'
        ];
        
        const result = await User.deleteMany({ 
            feishuUserId: { $in: testFeishuIds } 
        });
        
        console.log(`✅ 清理完成，删除了${result.deletedCount}个测试用户`);
        
    } catch (error) {
        console.error('❌ 清理测试数据失败:', error.message);
    }
}

/**
 * 主函数
 */
async function main() {
    try {
        console.log('🚀 开始用户认证测试...');
        
        // 连接数据库
        await connectToMongoDB();
        
        // 运行测试
        await testUserCreation();
        await testFindOrCreateByFeishuId();
        await testConcurrentUserCreation();
        
        // 清理测试数据
        await cleanupTestData();
        
        console.log('\n✅ 所有测试完成！');
        console.log('💡 如果没有E11000错误，说明修复成功');
        
    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error.message);
        console.error(error.stack);
    } finally {
        // 关闭数据库连接
        await mongoose.connection.close();
        console.log('🔌 数据库连接已关闭');
        process.exit(0);
    }
}

// 运行测试
if (require.main === module) {
    main();
}

module.exports = {
    connectToMongoDB,
    testUserCreation,
    testFindOrCreateByFeishuId,
    testConcurrentUserCreation,
    cleanupTestData
};