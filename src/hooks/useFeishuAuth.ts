import { useState, useEffect } from 'react';

/**
 * 飞书用户信息接口
 */
interface FeishuUser {
  name: string;
  avatar?: string;
  userId: string;
  email?: string;
  storeId?: string;
  role?: string;
  _id?: string;
  feishuUserId?: string;
  isActive?: boolean;
  permissions?: string[];
}

/**
 * 飞书认证Hook返回值接口
 */
interface UseFeishuAuthReturn {
  user: FeishuUser | null;
  loading: boolean;
  error: string;
  isFeishuEnv: boolean;
  checkingEnv: boolean;
}

/**
 * 飞书认证Hook
 * 处理飞书环境检测、用户认证和状态管理
 */
export const useFeishuAuth = (): UseFeishuAuthReturn => {
  const [user, setUser] = useState<FeishuUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFeishuEnv, setIsFeishuEnv] = useState(false);
  const [checkingEnv, setCheckingEnv] = useState(true);

  /**
   * 统一处理用户认证成功后的逻辑
   * @param userData 用户数据
   */
  const handleAuthSuccess = (userData: any) => {
    console.log('- Processing auth success with user data:', userData);
    
    // 存储用户信息到localStorage
    localStorage.setItem('user', JSON.stringify(userData));
    
    // 如果是新用户，显示欢迎信息
    if (userData.isNewUser) {
      console.log(`Welcome new user: ${userData.name}! Default role: ${userData.role}`);
    } else {
      console.log(`Welcome back: ${userData.name}! Role: ${userData.role}`);
    }
    
    // 设置全局请求头，用于后续API调用的用户识别
    if (userData.userId) {
      window.feishuUserId = userData.userId;
      localStorage.setItem('feishuUserId', userData.userId);
    }
    
    setUser(userData);
    setLoading(false);
  };



  useEffect(() => {
    const getQueryParam = (param: string): string | null => 
      new URLSearchParams(window.location.search).get(param);
    
    const appId = getQueryParam('appId');
    console.log('--- [Feishu Auth Hook] Initializing ---');
    console.log(`- appId from URL: ${appId}`);

    // 轮询检查飞书SDK是否就绪
    let checks = 0;
    const maxChecks = 6; // 6 * 500ms = 3秒超时
    const intervalId = setInterval(() => {
      console.log(`- Polling for SDK, check #${checks + 1}`);
      
      // 检查飞书SDK是否可用
      if (window.h5sdk && window.tt) {
        clearInterval(intervalId);
        console.log('- SDK found! Proceeding with auth.');
        setIsFeishuEnv(true);
        setCheckingEnv(false);

        // 检查本地存储中是否已有用户信息
        const userFromStorage = localStorage.getItem('user');
        if (userFromStorage && userFromStorage !== 'undefined') {
          console.log('- Found user in localStorage. Skipping auth flow.');
          try {
            setUser(JSON.parse(userFromStorage));
            setLoading(false);
            return;
          } catch (err) {
            console.error('- Error parsing user from localStorage:', err);
            localStorage.removeItem('user');
          }
        }
        console.log('- No user in localStorage.');

        // 检查appId参数
        if (!appId) {
          console.error('[Feishu Auth Hook] appId is required for authentication.');
          setError('缺少必要的认证参数，请从飞书应用中访问。');
          setLoading(false);
          return;
        }

        // 如果有appId，初始化飞书SDK认证流程
        if (appId) {
          window.h5sdk.ready(() => {
            console.log('- h5sdk is ready. Calling tt.requestAccess.');
            console.log(`- Passing appId to tt.requestAccess: ${appId}`);

            // 设置认证超时
            const authTimeout = setTimeout(() => {
              console.error('[Feishu Auth Hook Error] tt.requestAccess timed out after 10 seconds.');
              setError('飞书授权请求超时，请稍后重试。');
              setLoading(false);
            }, 10000);

            // 请求飞书访问权限
            window.tt.requestAccess({
              appID: appId,
              scopeList: [], // 权限范围列表
              success: (res: any) => {
                clearTimeout(authTimeout);
                console.log('- tt.requestAccess succeeded. Code:', res.code);
                console.log('- Sending code to backend...');
                
                // 向后端发送认证码获取用户信息
                fetch('/api/feishu/auth', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: res.code, appID: appId }),
                })
                  .then(response => {
                    if (!response.ok) {
                      console.error('[Feishu Auth Hook Error] Backend fetch failed.', response);
                      throw new Error('获取用户信息失败');
                    }
                    return response.json();
                  })
                  .then(userData => {
                    console.log('- Backend returned user data:', userData);
                    
                    // 统一处理用户认证成功后的逻辑
                    handleAuthSuccess(userData);
                  })
                  .catch(err => {
                    console.error('[Feishu Auth Hook Error] Error in fetch chain:', err);
                    setError(err.message);
                  })
                  .finally(() => setLoading(false));
              },
              fail: (err: any) => {
                clearTimeout(authTimeout);
                console.error('[Feishu Auth Hook Error] tt.requestAccess failed:', err);
                setError(`飞书授权失败: ${JSON.stringify(err)}`);
                setLoading(false);
              },
            });
          });
        }

      } else {
        checks++;
        if (checks >= maxChecks) {
          clearInterval(intervalId);
          console.warn('[Feishu Auth Hook] SDK polling timed out.');
          setCheckingEnv(false);
          setIsFeishuEnv(false);
          
          // 如果没有appId参数，显示错误
          if (!appId) {
            console.error('[Feishu Auth Hook] appId is required for authentication.');
            setError('缺少必要的认证参数，请从飞书应用中访问。');
          }
          
          setLoading(false);
        }
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, []);

  return { user, loading, error, isFeishuEnv, checkingEnv };
};

// 扩展Window接口以支持飞书SDK
declare global {
  interface Window {
    h5sdk: any;
    tt: any;
    feishuUserId?: string;
  }
}