/**
 * API客户端工具
 * 自动处理用户认证头部和请求配置
 */

/**
 * 获取当前用户的飞书ID
 */
const getFeishuUserId = (): string | null => {
  // 优先从window全局变量获取
  if (window.feishuUserId) {
    return window.feishuUserId;
  }
  
  // 从localStorage获取用户信息
  try {
    const userStr = localStorage.getItem('user');
    if (userStr && userStr !== 'undefined') {
      const user = JSON.parse(userStr);
      return user.userId || null;
    }
  } catch (error) {
    console.error('Failed to parse user from localStorage:', error);
  }
  
  return null;
};

/**
 * 获取当前门店ID
 */
const getCurrentStoreId = (): string | null => {
  return localStorage.getItem('currentStoreId');
};

/**
 * 创建带有认证头部的请求配置
 */
export const createAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  // 添加飞书用户ID头部
  const feishuUserId = getFeishuUserId();
  if (feishuUserId) {
    headers['x-feishu-user-id'] = feishuUserId;
  }
  
  // 添加当前门店ID头部
  const currentStoreId = getCurrentStoreId();
  if (currentStoreId) {
    headers['x-current-store-id'] = currentStoreId;
  }
  
  return headers;
};

/**
 * 封装的fetch函数，自动添加认证头部
 */
export const authFetch = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const authHeaders = createAuthHeaders();
  
  const config: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    },
  };
  
  return fetch(url, config);
};

/**
 * API请求方法封装
 */
export const apiClient = {
  /**
   * GET请求
   */
  get: async (url: string, options: RequestInit = {}): Promise<any> => {
    const response = await authFetch(url, {
      method: 'GET',
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * POST请求
   */
  post: async (url: string, data?: any, options: RequestInit = {}): Promise<any> => {
    const response = await authFetch(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * PUT请求
   */
  put: async (url: string, data?: any, options: RequestInit = {}): Promise<any> => {
    const response = await authFetch(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  /**
   * DELETE请求
   */
  delete: async (url: string, options: RequestInit = {}): Promise<any> => {
    const response = await authFetch(url, {
      method: 'DELETE',
      ...options,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
};

/**
 * 用户管理API
 */
export const userAPI = {
  /**
   * 获取当前用户信息
   */
  getCurrentUser: () => apiClient.get('/api/users/me'),
  
  /**
   * 获取所有用户列表
   */
  getAllUsers: (params?: {
    page?: number;
    limit?: number;
    role?: string;
    storeId?: string;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    const url = `/api/users${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return apiClient.get(url);
  },
  
  /**
   * 获取用户统计信息
   */
  getUserStats: () => apiClient.get('/api/users/stats'),
  
  /**
   * 根据ID获取用户详情
   */
  getUserById: (id: string) => apiClient.get(`/api/users/${id}`),
  
  /**
   * 更新用户角色
   */
  updateUserRole: (id: string, data: {
    role: string;
    storeId?: string;
    notes?: string;
  }) => apiClient.put(`/api/users/${id}/role`, data),
  
  /**
   * 禁用/启用用户
   */
  toggleUserStatus: (id: string, data: {
    isActive: boolean;
    reason?: string;
  }) => apiClient.put(`/api/users/${id}/status`, data),
  
  /**
   * 批量更新用户
   */
  batchUpdateUsers: (data: {
    userIds: string[];
    updates: {
      role?: string;
      storeId?: string;
      isActive?: boolean;
      notes?: string;
    };
  }) => apiClient.put('/api/users/batch/update', data),
};

// 扩展Window接口以支持全局变量
declare global {
  interface Window {
    feishuUserId?: string;
  }
}

export default apiClient;