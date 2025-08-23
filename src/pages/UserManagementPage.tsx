import React, { useState, useEffect } from 'react';
import { userAPI } from '../utils/apiClient';
import { useFeishuAuth } from '../hooks/useFeishuAuth';

/**
 * 用户信息接口
 */
interface User {
  _id: string;
  feishuUserId: string;
  name: string;
  email?: string;
  avatar?: string;
  role: 'admin' | 'manager' | 'employee';
  storeId?: string;
  isActive: boolean;
  lastLoginAt?: Date;
  registrationSource: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 用户统计信息接口
 */
interface UserStats {
  total: number;
  active: number;
  newThisMonth: number;
  byRole: {
    admin: number;
    manager: number;
    employee: number;
  };
}

/**
 * 用户管理页面组件
 */
const UserManagementPage: React.FC = () => {
  const { user: currentUser, isAuthenticated, loading: authLoading } = useFeishuAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  /**
   * 获取用户列表
   */
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: 10,
      };
      
      if (selectedRole !== 'all') {
        params.role = selectedRole;
      }
      
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      
      const response = await userAPI.getAllUsers(params);
      setUsers(response.users || []);
      setTotalPages(response.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 获取用户统计信息
   */
  const fetchStats = async () => {
    try {
      const response = await userAPI.getUserStats();
      setStats(response);
    } catch (err) {
      console.error('获取用户统计失败:', err);
    }
  };

  /**
   * 更新用户角色
   */
  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      await userAPI.updateUserRole(userId, { role: newRole });
      await fetchUsers(); // 刷新列表
      alert('用户角色更新成功');
    } catch (err) {
      alert('更新用户角色失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  /**
   * 切换用户状态
   */
  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      await userAPI.toggleUserStatus(userId, { 
        isActive: !isActive,
        reason: !isActive ? '管理员启用' : '管理员禁用'
      });
      await fetchUsers(); // 刷新列表
      alert(`用户已${!isActive ? '启用' : '禁用'}`);
    } catch (err) {
      alert('更新用户状态失败: ' + (err instanceof Error ? err.message : '未知错误'));
    }
  };

  /**
   * 角色显示名称映射
   */
  const getRoleDisplayName = (role: string) => {
    const roleMap: { [key: string]: string } = {
      admin: '管理员',
      manager: '经理',
      employee: '员工'
    };
    return roleMap[role] || role;
  };

  /**
   * 格式化日期
   */
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '未知';
    return new Date(date).toLocaleString('zh-CN');
  };

  // 页面加载时获取数据
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
      fetchStats();
    }
  }, [isAuthenticated, currentPage, selectedRole, searchTerm]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage === 1) {
        fetchUsers();
      } else {
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-lg">正在验证身份...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">需要登录</h2>
          <p>请在飞书环境中打开此页面</p>
        </div>
      </div>
    );
  }

  // 检查当前用户是否为管理员
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">权限不足</h2>
          <p>只有管理员可以访问用户管理页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">用户管理</h1>
        
        {/* 当前用户信息 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-2">当前登录用户</h3>
          <div className="flex items-center space-x-4">
            {currentUser?.avatar && (
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{currentUser?.name}</p>
              <p className="text-sm text-gray-600">
                {getRoleDisplayName(currentUser?.role || '')} | {currentUser?.email || '无邮箱'}
              </p>
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">总用户数</h3>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">活跃用户</h3>
              <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">本月新增</h3>
              <p className="text-2xl font-bold text-blue-600">{stats.newThisMonth}</p>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-500">管理员数</h3>
              <p className="text-2xl font-bold text-purple-600">{stats.byRole.admin}</p>
            </div>
          </div>
        )}

        {/* 筛选和搜索 */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">所有角色</option>
              <option value="admin">管理员</option>
              <option value="manager">经理</option>
              <option value="employee">员工</option>
            </select>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div className="text-center py-8">
          <div className="text-lg">加载中...</div>
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-600">{error}</div>
          <button 
            onClick={fetchUsers}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            重试
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后登录
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    注册时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user._id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {user.avatar && (
                          <img 
                            src={user.avatar} 
                            alt={user.name} 
                            className="w-8 h-8 rounded-full mr-3"
                          />
                        )}
                        <div>
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email || '无邮箱'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleUpdate(user._id, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={user._id === currentUser?._id} // 不能修改自己的角色
                      >
                        <option value="admin">管理员</option>
                        <option value="manager">经理</option>
                        <option value="employee">员工</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? '活跃' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.lastLoginAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {user._id !== currentUser?._id && (
                        <button
                          onClick={() => handleStatusToggle(user._id, user.isActive)}
                          className={`px-3 py-1 rounded text-xs ${
                            user.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.isActive ? '禁用' : '启用'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex justify-center mt-6">
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  上一页
                </button>
                <span className="px-4 py-2 text-sm text-gray-700">
                  第 {currentPage} 页，共 {totalPages} 页
                </span>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default UserManagementPage;