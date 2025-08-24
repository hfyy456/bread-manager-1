# 飞书认证 storeId 传递测试

## 修改内容

### 1. 前端修改 (useFeishuAuth.ts)
- 导入了 `createAuthHeaders` 函数
- 在飞书认证请求中使用 `createAuthHeaders()` 替代手动设置headers
- 这样会自动包含 `x-current-store-id` 头信息

### 2. 后端修改 (feishuController.js)
- 从请求头中提取 `x-current-store-id`
- 将 storeId 添加到 feishuUserData 对象中
- 传递给 `User.findOrCreateByFeishuId` 方法

### 3. 数据库模型修改 (User.js)
- 修改 `findOrCreateByFeishuId` 方法接受 storeId 参数
- 在创建新用户时设置 storeId 字段

## 测试流程

1. 用户在移动端访问页面时，storeId 会通过以下方式获取：
   - URL 参数 `?store=xxx`
   - sessionStorage 中的 `lockedStoreId`
   - localStorage 中的 `defaultStoreId`

2. 当用户进行飞书认证时：
   - `createAuthHeaders()` 会自动从 localStorage 获取 `currentStoreId`
   - 将其作为 `x-current-store-id` 头信息发送

3. 后端接收到认证请求后：
   - 从请求头提取 storeId
   - 在创建新用户时将 storeId 保存到用户记录中

## 验证方法

可以通过以下方式验证功能：

1. 在浏览器开发者工具中检查网络请求
2. 查看 `/api/feishu/auth` 请求是否包含 `x-current-store-id` 头
3. 检查新创建的用户记录是否包含正确的 storeId

## 注意事项

- 确保在认证前已经设置了正确的 storeId
- 如果没有 storeId，新用户的 storeId 字段将为 undefined
- 建议在移动端页面加载时优先设置 storeId