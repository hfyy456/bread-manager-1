import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActionArea,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  IconButton,
  Badge,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Inventory as InventoryIcon,
  BarChart as BarChartIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  AccountCircle as AccountCircleIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';

/**
 * 移动端首页组件
 * 提供生产报损统计、库存盘点、数据统计等功能入口
 */
interface DashboardStats {
  totalPlans: number;
  totalQuantity: number;
  totalProductionAmount: number;
  totalWasteAmount: number;
  avgDailyQuantity: number;
  avgDailyAmount: number;
}

interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  badge?: number;
  onClick: () => void;
}

const MobileHomePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [inventoryStats, setInventoryStats] = useState<InventoryStats | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [storeId, setStoreId] = useState<string | null>(null);
  
  // 飞书认证
  const { user, loading: userLoading, error: userError, isFeishuEnv, checkingEnv } = useFeishuAuth();

  /**
   * 获取门店ID
   */
  useEffect(() => {
    const urlStoreId = new URLSearchParams(window.location.search).get('store');
    const lockedStoreId = sessionStorage.getItem('lockedStoreId');
    const defaultStoreId = localStorage.getItem('defaultStoreId');
    
    const currentStoreId = urlStoreId || lockedStoreId || defaultStoreId;
    setStoreId(currentStoreId);
  }, []);

  /**
   * 更新当前时间
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次

    return () => clearInterval(timer);
  }, []);

  /**
   * 获取仪表板统计数据
   */
  const fetchDashboardStats = async (): Promise<void> => {
    if (!storeId) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const response = await fetch(
        `/api/dashboard/summary?periodType=daily&date=${today}`,
        {
          headers: {
            'x-current-store-id': storeId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('获取仪表板数据失败');
      }

      const result = await response.json();
      if (result.success) {
        // 处理仪表板数据
        const stats: DashboardStats = {
          totalPlans: result.data.periodReports?.length || 0,
          totalQuantity: result.data.periodReports?.reduce((sum: number, report: any) => sum + (report.totalQuantity || 0), 0) || 0,
          totalProductionAmount: result.data.periodReports?.reduce((sum: number, report: any) => sum + (report.totalProductionAmount || 0), 0) || 0,
          totalWasteAmount: result.data.periodReports?.reduce((sum: number, report: any) => sum + (report.totalWasteAmount || 0), 0) || 0,
          avgDailyQuantity: 0,
          avgDailyAmount: 0,
        };
        setDashboardStats(stats);
      }
    } catch (err) {
      console.error('获取仪表板数据失败:', err);
    }
  };

  /**
   * 获取库存统计数据
   */
  const fetchInventoryStats = async (): Promise<void> => {
    if (!storeId) return;

    try {
      const response = await fetch('/api/warehouse/stock', {
        headers: {
          'x-current-store-id': storeId,
        },
      });

      if (!response.ok) {
        throw new Error('获取库存数据失败');
      }

      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        const items = result.data;
        const stats: InventoryStats = {
          totalItems: items.length,
          lowStockItems: items.filter((item: any) => {
            const totalStock = (item.mainWarehouseStock?.quantity || 0) + 
              Object.values(item.stockByPost || {}).reduce((sum: number, stock: any) => sum + (stock?.quantity || 0), 0);
            return totalStock > 0 && totalStock <= (item.minStock || 10);
          }).length,
          outOfStockItems: items.filter((item: any) => {
            const totalStock = (item.mainWarehouseStock?.quantity || 0) + 
              Object.values(item.stockByPost || {}).reduce((sum: number, stock: any) => sum + (stock?.quantity || 0), 0);
            return totalStock === 0;
          }).length,
          totalValue: items.reduce((sum: number, item: any) => {
            const totalStock = (item.mainWarehouseStock?.quantity || 0) + 
              Object.values(item.stockByPost || {}).reduce((sum: number, stock: any) => sum + (stock?.quantity || 0), 0);
            return sum + (totalStock * (item.price || 0));
          }, 0),
        };
        setInventoryStats(stats);
      }
    } catch (err) {
      console.error('获取库存数据失败:', err);
    }
  };

  /**
   * 初始化数据
   */
  useEffect(() => {
    const initData = async (): Promise<void> => {
      if (!storeId) return;
      
      setLoading(true);
      setError('');
      
      try {
        await Promise.all([
          fetchDashboardStats(),
          fetchInventoryStats(),
        ]);
      } catch (err) {
        setError('数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [storeId]);

  /**
   * 刷新数据
   */
  const handleRefresh = async (): Promise<void> => {
    await Promise.all([
      fetchDashboardStats(),
      fetchInventoryStats(),
    ]);
  };

  /**
   * 快捷操作配置
   */
  const quickActions: QuickAction[] = [
    {
      id: 'production-stats',
      title: '生产报损统计',
      description: '查看生产计划和报损情况',
      icon: <AssessmentIcon />,
      color: '#1976d2',
      onClick: () => {
        // 使用路由导航到生产报损统计页面
        navigate('/mobileHome/production-loss');
      },
    },
    {
      id: 'inventory-check',
      title: '库存盘点',
      description: '进行库存盘点和管理',
      icon: <InventoryIcon />,
      color: '#388e3c',
      badge: inventoryStats?.lowStockItems || 0,
      onClick: () => {
        // 在同一页面内显示库存盘点组件
        alert('库存盘点功能开发中...');
      },
    },
    {
      id: 'data-dashboard',
      title: '数据统计',
      description: '查看经营数据和趋势分析',
      icon: <BarChartIcon />,
      color: '#f57c00',
      onClick: () => {
        // 在同一页面内显示数据统计组件
        alert('数据统计功能开发中...');
      },
    },
    {
      id: 'request-center',
      title: '申领中心',
      description: '物料申领和审批管理',
      icon: <TrendingUpIcon />,
      color: '#7b1fa2',
      onClick: () => {
        // 在同一页面内显示申领中心组件
        alert('申领中心功能开发中...');
      },
    },
  ];

  // 飞书环境检测
  if (checkingEnv) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box textAlign="center">
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>检测飞书环境中...</Typography>
        </Box>
      </Container>
    );
  }

  // 非飞书环境提示
  if (!isFeishuEnv) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            请在飞书客户端中打开
          </Typography>
          <Typography variant="body2">
            此页面需要飞书应用环境支持，请复制链接并在飞书中访问。
          </Typography>
        </Alert>
      </Container>
    );
  }

  // 用户认证加载中
  if (userLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box textAlign="center">
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>获取用户信息中...</Typography>
        </Box>
      </Container>
    );
  }

  // 用户认证错误
  if (userError) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">
          <Typography variant="h6" gutterBottom>
            认证失败
          </Typography>
          <Typography variant="body2">
            {userError}
          </Typography>
        </Alert>
      </Container>
    );
  }

  // 门店信息检查
  if (!storeId) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="warning">
          无法获取门店信息，请检查URL参数或重新登录。
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
      {/* 头部信息 */}
      <Paper elevation={2} sx={{ p: 3, mb: 3, borderRadius: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center">
            <Avatar 
              src={user?.avatar} 
              sx={{ bgcolor: 'primary.main', mr: 2 }}
            >
              {user?.avatar ? null : <AccountCircleIcon />}
            </Avatar>
            <Box>
              <Typography variant="h6" fontWeight="bold">
                {user?.name || '面包管理系统'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                门店ID: {storeId}
              </Typography>
              {isFeishuEnv && (
                <Chip 
                  label="飞书用户" 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                  sx={{ mt: 0.5 }}
                />
              )}
            </Box>
          </Box>
          <IconButton onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="body2" color="text.secondary">
              当前时间
            </Typography>
            <Typography variant="h6">
              {format(currentTime, 'MM月dd日 HH:mm', { locale: zhCN })}
            </Typography>
          </Box>
          <Chip
            icon={<ScheduleIcon />}
            label={format(currentTime, 'EEEE', { locale: zhCN })}
            color="primary"
            variant="outlined"
          />
        </Box>
      </Paper>

      {/* 数据概览 */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main" fontWeight="bold">
                {inventoryStats?.totalItems || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                库存物料
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {inventoryStats?.lowStockItems || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                低库存预警
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                ¥{(inventoryStats?.totalValue || 0).toFixed(0)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                库存总价值
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6}>
            <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {inventoryStats?.outOfStockItems || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                缺货物料
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* 快捷操作 */}
      <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
        快捷操作
      </Typography>
      <Grid container spacing={2}>
        {quickActions.map((action) => (
          <Grid item xs={6} key={action.id}>
            <Card elevation={2} sx={{ height: '100%' }}>
              <CardActionArea onClick={action.onClick} sx={{ p: 2, height: '100%' }}>
                <CardContent sx={{ textAlign: 'center', p: 0 }}>
                  <Box position="relative" display="inline-block" mb={1}>
                    <Avatar
                      sx={{
                        bgcolor: action.color,
                        width: 56,
                        height: 56,
                        mx: 'auto',
                      }}
                    >
                      {action.icon}
                    </Avatar>
                    {action.badge && action.badge > 0 && (
                      <Badge
                        badgeContent={action.badge}
                        color="error"
                        sx={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                        }}
                      />
                    )}
                  </Box>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    {action.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {action.description}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 状态指示器 */}
      <Box mt={4}>
        <Paper elevation={1} sx={{ p: 2 }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              <Typography variant="body2">
                系统运行正常
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              最后更新: {format(new Date(), 'HH:mm')}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default MobileHomePage;