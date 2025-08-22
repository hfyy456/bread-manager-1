import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  List,
  ListItem,
  ListItemText,
  AppBar,
  Toolbar,
  LinearProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Analytics as AnalyticsIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
  Store as StoreIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
} from '@mui/icons-material';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 移动端数据统计页面
 * 提供综合数据分析和统计功能
 */
interface DashboardSummary {
  totalSales: number;
  totalOrders: number;
  totalProducts: number;
  totalRevenue: number;
  averageOrderValue: number;
  topSellingProducts: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  salesTrend: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  recentActivity: Array<{
    type: string;
    description: string;
    timestamp: string;
  }>;
}

interface InventoryStats {
  totalItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: number;
  categories: Array<{
    name: string;
    count: number;
    value: number;
  }>;
}

type PeriodType = 'daily' | 'weekly' | 'monthly';

const MobileDataStatsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [dashboardData, setDashboardData] = useState<DashboardSummary | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryStats | null>(null);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory'>('overview');

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
   * 获取仪表板数据
   */
  const fetchDashboardData = useCallback(async () => {
    if (!storeId) return;

    try {
      const response = await fetch(
        `/api/dashboard/summary?periodType=${periodType}`,
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
        setDashboardData(result.data);
      } else {
        throw new Error(result.message || '获取仪表板数据失败');
      }
    } catch (err) {
      console.error('获取仪表板数据失败:', err);
      setError(err instanceof Error ? err.message : '获取数据失败');
    }
  }, [storeId, periodType]);

  /**
   * 获取库存统计数据
   */
  const fetchInventoryStats = useCallback(async () => {
    if (!storeId) return;

    try {
      const response = await fetch(
        '/api/warehouse/stock',
        {
          headers: {
            'x-current-store-id': storeId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('获取库存数据失败');
      }

      const result = await response.json();
      if (result.success && result.data) {
        // 处理库存数据，计算统计信息
        const items = result.data;
        const totalItems = items.length;
        const lowStockItems = items.filter((item: any) => item.currentStock <= item.minStock).length;
        const outOfStockItems = items.filter((item: any) => item.currentStock === 0).length;
        const totalValue = items.reduce((sum: number, item: any) => sum + (item.currentStock * (item.price || 0)), 0);
        
        // 按类别分组（这里简化处理）
        const categories = [
          { name: '面包类', count: Math.floor(totalItems * 0.6), value: totalValue * 0.7 },
          { name: '原料类', count: Math.floor(totalItems * 0.3), value: totalValue * 0.2 },
          { name: '其他', count: Math.floor(totalItems * 0.1), value: totalValue * 0.1 },
        ];

        setInventoryData({
          totalItems,
          lowStockItems,
          outOfStockItems,
          totalValue,
          categories,
        });
      }
    } catch (err) {
      console.error('获取库存统计数据失败:', err);
    }
  }, [storeId]);

  /**
   * 初始化数据
   */
  useEffect(() => {
    const initData = async () => {
      if (!storeId) return;
      
      setLoading(true);
      setError('');
      
      try {
        await Promise.all([
          fetchDashboardData(),
          fetchInventoryStats(),
        ]);
      } catch (err) {
        setError('数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [storeId, fetchDashboardData, fetchInventoryStats]);

  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    await Promise.all([
      fetchDashboardData(),
      fetchInventoryStats(),
    ]);
  };

  /**
   * 返回首页
   */
  const handleGoBack = () => {
    window.history.back();
  };

  /**
   * 获取趋势图标
   */
  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUpIcon sx={{ color: 'success.main', fontSize: 16 }} />;
    } else if (current < previous) {
      return <TrendingDownIcon sx={{ color: 'error.main', fontSize: 16 }} />;
    }
    return null;
  };

  /**
   * 获取库存状态颜色
   */
  const getStockStatusColor = (current: number, min: number) => {
    if (current === 0) return 'error';
    if (current <= min) return 'warning';
    return 'success';
  };

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
    <Box sx={{ flexGrow: 1 }}>
      {/* 顶部导航栏 */}
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            数据统计
          </Typography>
          <IconButton color="inherit" onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
        {/* 时间范围选择 */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Box display="flex" alignItems="center" mb={2}>
            <DateRangeIcon sx={{ mr: 1, color: 'text.secondary' }} />
            <Typography variant="subtitle1" fontWeight="bold">
              统计周期
            </Typography>
          </Box>
          <FormControl fullWidth size="small">
            <InputLabel>选择统计周期</InputLabel>
            <Select
              value={periodType}
              label="选择统计周期"
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            >
              <MenuItem value="daily">今日</MenuItem>
              <MenuItem value="weekly">本周</MenuItem>
              <MenuItem value="monthly">本月</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* 标签切换 */}
        <Paper elevation={1} sx={{ mb: 3 }}>
          <Box display="flex">
            <Button
              fullWidth
              variant={activeTab === 'overview' ? 'contained' : 'text'}
              onClick={() => setActiveTab('overview')}
              startIcon={<AnalyticsIcon />}
              sx={{ borderRadius: 0 }}
            >
              概览
            </Button>
            <Button
              fullWidth
              variant={activeTab === 'sales' ? 'contained' : 'text'}
              onClick={() => setActiveTab('sales')}
              startIcon={<ShoppingCartIcon />}
              sx={{ borderRadius: 0 }}
            >
              销售
            </Button>
            <Button
              fullWidth
              variant={activeTab === 'inventory' ? 'contained' : 'text'}
              onClick={() => setActiveTab('inventory')}
              startIcon={<InventoryIcon />}
              sx={{ borderRadius: 0 }}
            >
              库存
            </Button>
          </Box>
        </Paper>

        {/* 加载状态 */}
        {loading && (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        )}

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* 概览标签页 */}
        {!loading && !error && activeTab === 'overview' && (
          <>
            {/* 核心指标 */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {dashboardData?.totalOrders || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    总订单数
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    ¥{dashboardData?.totalRevenue?.toFixed(0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    总收入
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {dashboardData?.totalProducts || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    产品种类
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    ¥{dashboardData?.averageOrderValue?.toFixed(0) || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平均订单价值
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* 库存概览 */}
            {inventoryData && (
              <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <InventoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    库存概览
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body1">
                        库存总价值
                      </Typography>
                      <Typography variant="h6" color="primary.main" fontWeight="bold">
                        ¥{inventoryData.totalValue.toFixed(0)}
                      </Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="text.secondary">
                        总商品数
                      </Typography>
                      <Typography variant="body1">
                        {inventoryData.totalItems} 种
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" color="warning.main">
                        低库存商品
                      </Typography>
                      <Typography variant="body1" color="warning.main">
                        {inventoryData.lowStockItems} 种
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="body2" color="error.main">
                        缺货商品
                      </Typography>
                      <Typography variant="body1" color="error.main">
                        {inventoryData.outOfStockItems} 种
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            )}
          </>
        )}

        {/* 销售标签页 */}
        {!loading && !error && activeTab === 'sales' && dashboardData && (
          <>
            {/* 销售趋势 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <TrendingUpIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  销售趋势
                </Typography>
              </Box>
              {dashboardData.salesTrend && dashboardData.salesTrend.length > 0 ? (
                <List>
                  {dashboardData.salesTrend.slice(0, 7).map((trend, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1">
                              {format(new Date(trend.date), 'MM月dd日', { locale: zhCN })}
                            </Typography>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Typography variant="body2" color="text.secondary">
                                ¥{trend.sales.toFixed(0)}
                              </Typography>
                              {index > 0 && getTrendIcon(trend.sales, dashboardData.salesTrend[index - 1].sales)}
                            </Box>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            订单数: {trend.orders}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
                  暂无销售趋势数据
                </Typography>
              )}
            </Paper>

            {/* 热销产品 */}
            <Paper elevation={2} sx={{ mb: 3 }}>
              <Box p={2} pb={1}>
                <Box display="flex" alignItems="center" mb={2}>
                  <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="bold">
                    热销产品
                  </Typography>
                </Box>
              </Box>
              
              {dashboardData.topSellingProducts && dashboardData.topSellingProducts.length > 0 ? (
                <List>
                  {dashboardData.topSellingProducts.slice(0, 5).map((product, index) => (
                    <React.Fragment key={index}>
                      <ListItem>
                        <ListItemText
                          primary={
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Typography variant="subtitle1" fontWeight="bold">
                                {product.name}
                              </Typography>
                              <Chip
                                label={`#${index + 1}`}
                                color="primary"
                                size="small"
                              />
                            </Box>
                          }
                          secondary={
                            <Box mt={1}>
                              <Typography variant="body2" color="text.secondary">
                                销量: {product.quantity} 个
                              </Typography>
                              <Typography variant="body2" color="success.main">
                                收入: ¥{product.revenue.toFixed(0)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < dashboardData.topSellingProducts.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box p={3} textAlign="center">
                  <Typography variant="body1" color="text.secondary">
                    暂无热销产品数据
                  </Typography>
                </Box>
              )}
            </Paper>
          </>
        )}

        {/* 库存标签页 */}
        {!loading && !error && activeTab === 'inventory' && inventoryData && (
          <>
            {/* 库存分类 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <StoreIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  库存分类
                </Typography>
              </Box>
              <List>
                {inventoryData.categories.map((category, index) => (
                  <React.Fragment key={index}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body1" fontWeight="bold">
                              {category.name}
                            </Typography>
                            <Typography variant="body1" color="primary.main">
                              ¥{category.value.toFixed(0)}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            <Typography variant="body2" color="text.secondary">
                              商品数量: {category.count} 种
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={(category.value / inventoryData.totalValue) * 100}
                              sx={{ mt: 1, height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < inventoryData.categories.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>

            {/* 库存警告 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <InventoryIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  库存警告
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="warning.light" borderRadius={2}>
                    <Typography variant="h4" color="warning.dark" fontWeight="bold">
                      {inventoryData.lowStockItems}
                    </Typography>
                    <Typography variant="body2" color="warning.dark">
                      低库存商品
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box textAlign="center" p={2} bgcolor="error.light" borderRadius={2}>
                    <Typography variant="h4" color="error.dark" fontWeight="bold">
                      {inventoryData.outOfStockItems}
                    </Typography>
                    <Typography variant="body2" color="error.dark">
                      缺货商品
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}

        {/* 操作按钮 */}
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AssessmentIcon />}
            onClick={() => {
              alert('详细报告功能开发中...');
            }}
          >
            详细报告
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<TrendingUpIcon />}
            onClick={() => {
              alert('数据导出功能开发中...');
            }}
          >
            数据导出
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default MobileDataStatsPage;