import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  Fade,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
  Divider,
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';
import { authFetch } from '../../utils/apiClient';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  AttachMoney as MoneyIcon,
  Warning as WarningIcon,
  Inventory as InventoryIcon,
  Today as TodayIcon,
  DateRange as WeekIcon,
  CalendarMonth as MonthIcon,
  Receipt as ReceiptIcon,
  ShoppingCart as ShoppingCartIcon,
  LocalDining as DiningIcon,
  Storage as StorageIcon,
  Event as YesterdayIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';

/**
 * 统计数据类型定义
 */
interface StatisticsData {
  period: string;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  store: {
    id: string;
    name: string;
  };
  revenue: {
    totalActualRevenue: number;
    totalRevenue: number;
    totalOrderCount: number;
    avgOrderValue: number;
    totalMeituanRevenue: number;
    totalDouyinRevenue: number;
    totalCashRevenue: number;
    totalCardRevenue: number;
    totalWechatRevenue: number;
    totalAlipayRevenue: number;
    recordCount: number;
    // 新增指标
    actualRevenueRate: number;  // 实收率
    shipmentLossRate: number;   // 出货报损率
    revenueLossRate: number;    // 营业额报损率
  };
  productionLoss: {
    byType: {
      production: { totalQuantity: number; totalValue: number; recordCount: number };
      tasting: { totalQuantity: number; totalValue: number; recordCount: number };
      closing: { totalQuantity: number; totalValue: number; recordCount: number };
      other: { totalQuantity: number; totalValue: number; recordCount: number };
      shipment: { totalQuantity: number; totalValue: number; recordCount: number };
    };
    total: { totalQuantity: number; totalValue: number; recordCount: number };
  };
  inventory: {
    totalItems: number;
    lowStockItems: number;
    totalValue: number;
    categoryStats: Record<string, { itemCount: number; totalQuantity: number }>;
  };
  generatedAt: string;
}

/**
 * 移动端数据统计页面组件
 */
const MobileStatisticsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useFeishuAuth();
  
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statisticsData, setStatisticsData] = useState<StatisticsData | null>(null);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth'>('today');
  const [expanded, setExpanded] = useState(false);

  /**
   * 获取统计数据
   */
  const fetchStatistics = async () => {
    if (!user?.storeId) {
      setError('您还未分配到门店，请联系管理员分配门店权限后再查看统计数据');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await authFetch(
        `/api/statistics?storeId=${user.storeId}&period=${period}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取统计数据失败');
      }

      const result = await response.json();
      setStatisticsData(result.data);
    } catch (err) {
      console.error('获取统计数据失败:', err);
      setError(err instanceof Error ? err.message : '获取统计数据失败');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理时间周期变更
   */
  const handlePeriodChange = (
    event: React.MouseEvent<HTMLElement>,
    newPeriod: 'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth' | null
  ) => {
    if (newPeriod !== null) {
      setPeriod(newPeriod);
      setExpanded(false); // 选择后收起展开选项
    }
  };

  /**
   * 格式化金额显示
   */
  const formatCurrency = (amount: number): string => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  /**
   * 获取时间周期显示文本
   */
  const getPeriodText = (period: string): string => {
    switch (period) {
      case 'today': return '今日';
      case 'yesterday': return '昨日';
      case 'week': return '本周';
      case 'lastWeek': return '上周';
      case 'month': return '本月';
      case 'lastMonth': return '上月';
      default: return period;
    }
  };

  /**
   * 获取报损类型显示文本
   */
  const getLossTypeText = (type: string): string => {
    switch (type) {
      case 'production': return '生产报损';
      case 'tasting': return '品尝报损';
      case 'closing': return '打烊报损';
      case 'other': return '其他报损';
      case 'shipment': return '出货登记';
      default: return type;
    }
  };

  // 设置当前门店ID到localStorage（用于API请求头）
  useEffect(() => {
    if (user?.storeId) {
      localStorage.setItem('currentStoreId', user.storeId);
    }
  }, [user?.storeId]);

  // 页面加载时获取数据
  useEffect(() => {
    if (!authLoading && user) {
      fetchStatistics();
    }
  }, [authLoading, user, period]);

  // 认证加载中
  if (authLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  // 用户未认证
  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          用户未认证，请先登录
        </Alert>
        <Button
          variant="contained"
          onClick={() => navigate('/mobile')}
          fullWidth
        >
          返回登录
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      pb: 3
    }}>
      {/* 顶部导航栏 */}
      <AppBar 
        position="sticky" 
        elevation={0}
        sx={{ 
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
        }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            onClick={() => navigate('/mobileHome')}
            sx={{ color: '#1976d2' }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              color: '#1976d2',
              fontWeight: 600,
              ml: 1
            }}
          >
            📊 数据统计
          </Typography>
          <AssessmentIcon sx={{ color: '#1976d2' }} />
        </Toolbar>
      </AppBar>

      {/* 错误提示 */}
      {error && (
        <Container maxWidth="sm" sx={{ pt: 2 }}>
          <Fade in={true}>
            <Alert 
              severity="error" 
              onClose={() => setError(null)}
              sx={{ mb: 2 }}
            >
              {error}
            </Alert>
          </Fade>
        </Container>
      )}

      <Container maxWidth="sm" sx={{ py: 3, px: 2 }}>
        {/* 时间周期选择器 */}
        <Card sx={{ 
            mb: 3, 
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
          }}>
            <CardContent sx={{ pb: '16px !important' }}>
              <Typography variant="h6" gutterBottom sx={{ 
                color: '#1976d2',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <TrendingUpIcon />
                统计周期
              </Typography>
              
              {/* 主要周期选择 */}
              <ToggleButtonGroup
                value={period}
                exclusive
                onChange={handlePeriodChange}
                fullWidth
                sx={{ mt: 2 }}
              >
                <ToggleButton value="today" sx={{ py: 1.5 }}>
                  <TodayIcon sx={{ mr: 1 }} />
                  今日
                </ToggleButton>
                <ToggleButton value="week" sx={{ py: 1.5 }}>
                  <WeekIcon sx={{ mr: 1 }} />
                  本周
                </ToggleButton>
                <ToggleButton value="month" sx={{ py: 1.5 }}>
                  <MonthIcon sx={{ mr: 1 }} />
                  本月
                </ToggleButton>
              </ToggleButtonGroup>
              
              {/* 展开/收起按钮 */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  onClick={() => setExpanded(!expanded)}
                  startIcon={expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  sx={{ 
                    color: '#1976d2',
                    fontSize: '0.875rem',
                    textTransform: 'none'
                  }}
                >
                  {expanded ? '收起' : '更多选项'}
                </Button>
              </Box>
              
              {/* 展开的周期选择 */}
              {expanded && (
                <ToggleButtonGroup
                  value={period}
                  exclusive
                  onChange={handlePeriodChange}
                  fullWidth
                  sx={{ mt: 2 }}
                >
                  <ToggleButton value="yesterday" sx={{ py: 1.5 }}>
                    <YesterdayIcon sx={{ mr: 1 }} />
                    昨日
                  </ToggleButton>
                  <ToggleButton value="lastWeek" sx={{ py: 1.5 }}>
                    <WeekIcon sx={{ mr: 1 }} />
                    上周
                  </ToggleButton>
                  <ToggleButton value="lastMonth" sx={{ py: 1.5 }}>
                    <MonthIcon sx={{ mr: 1 }} />
                    上月
                  </ToggleButton>
                </ToggleButtonGroup>
              )}
            </CardContent>
          </Card>

        {/* 加载状态 */}
        {loading && (
          <Box sx={{ mb: 3 }}>
            <LinearProgress sx={{ borderRadius: 2 }} />
            <Typography variant="body2" sx={{ mt: 1, textAlign: 'center', color: 'white' }}>
              正在加载统计数据...
            </Typography>
          </Box>
        )}

        {/* 统计数据展示 */}
        {statisticsData && (
          <>
            {/* 营业数据统计 */}
            <Card sx={{ 
                mb: 3, 
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#1976d2',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <MoneyIcon />
                    {getPeriodText(statisticsData.period)}营业数据
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                        <Typography variant="body2" color="text.secondary">
                          实收金额
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600 }}>
                          {formatCurrency(statisticsData.revenue.totalActualRevenue)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                        <Typography variant="body2" color="text.secondary">
                          营业额
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#7b1fa2', fontWeight: 600 }}>
                          {formatCurrency(statisticsData.revenue.totalRevenue)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                        <Typography variant="body2" color="text.secondary">
                          订单数量
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#388e3c', fontWeight: 600 }}>
                          {statisticsData.revenue.totalOrderCount}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                        <Typography variant="body2" color="text.secondary">
                          客单价
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 600 }}>
                          {formatCurrency(statisticsData.revenue.avgOrderValue)}
                        </Typography>
                      </Paper>
                    </Grid>
                    
                    {/* 新增业务指标 */}
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e1f5fe' }}>
                        <Typography variant="body2" color="text.secondary">
                          实收率
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#0277bd', fontWeight: 600 }}>
                          {statisticsData.revenue.actualRevenueRate}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fce4ec' }}>
                        <Typography variant="body2" color="text.secondary">
                          出货报损率
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#c2185b', fontWeight: 600 }}>
                          {statisticsData.revenue.shipmentLossRate}%
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff8e1' }}>
                        <Typography variant="body2" color="text.secondary">
                          营业额报损率
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#f9a825', fontWeight: 600 }}>
                          {statisticsData.revenue.revenueLossRate}%
                        </Typography>
                      </Paper>
                    </Grid>
                   </Grid>

                  <Divider sx={{ my: 2 }} />
                  
                  {/* 收入来源饼图 */}
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#666', mb: 2 }}>
                    收入来源分布
                  </Typography>
                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: '美团', value: statisticsData.revenue.totalMeituanRevenue, color: '#ffeb3b' },
                            { name: '抖音', value: statisticsData.revenue.totalDouyinRevenue, color: '#ff5722' },
                            { name: '现金', value: statisticsData.revenue.totalCashRevenue, color: '#4caf50' },
                            { name: '银行卡', value: statisticsData.revenue.totalCardRevenue, color: '#2196f3' },
                            { name: '微信', value: statisticsData.revenue.totalWechatRevenue, color: '#4caf50' },
                            { name: '支付宝', value: statisticsData.revenue.totalAlipayRevenue, color: '#2196f3' },
                          ].filter(item => item.value > 0)}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {[
                            { name: '美团', value: statisticsData.revenue.totalMeituanRevenue, color: '#ffeb3b' },
                            { name: '抖音', value: statisticsData.revenue.totalDouyinRevenue, color: '#ff5722' },
                            { name: '现金', value: statisticsData.revenue.totalCashRevenue, color: '#4caf50' },
                            { name: '银行卡', value: statisticsData.revenue.totalCardRevenue, color: '#2196f3' },
                            { name: '微信', value: statisticsData.revenue.totalWechatRevenue, color: '#4caf50' },
                            { name: '支付宝', value: statisticsData.revenue.totalAlipayRevenue, color: '#2196f3' },
                          ].filter(item => item.value > 0).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#666' }}>
                    收入明细
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    <Chip 
                      label={`美团: ${formatCurrency(statisticsData.revenue.totalMeituanRevenue)}`}
                      size="small"
                      sx={{ bgcolor: '#ffeb3b', color: '#333' }}
                    />
                    <Chip 
                      label={`抖音: ${formatCurrency(statisticsData.revenue.totalDouyinRevenue)}`}
                      size="small"
                      sx={{ bgcolor: '#ff5722', color: 'white' }}
                    />
                    <Chip 
                      label={`现金: ${formatCurrency(statisticsData.revenue.totalCashRevenue)}`}
                      size="small"
                      sx={{ bgcolor: '#4caf50', color: 'white' }}
                    />
                    <Chip 
                      label={`银行卡: ${formatCurrency(statisticsData.revenue.totalCardRevenue)}`}
                      size="small"
                      sx={{ bgcolor: '#2196f3', color: 'white' }}
                    />
                    <Chip 
                      label={`微信: ${formatCurrency(statisticsData.revenue.totalWechatRevenue)}`}
                      size="small"
                      sx={{ bgcolor: '#4caf50', color: 'white' }}
                    />
                    <Chip 
                      label={`支付宝: ${formatCurrency(statisticsData.revenue.totalAlipayRevenue)}`}
                      size="small"
                      sx={{ bgcolor: '#2196f3', color: 'white' }}
                    />
                  </Stack>
                </CardContent>
              </Card>

            {/* 生产报损统计 */}
            <Card sx={{ 
                mb: 3, 
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#d32f2f',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <WarningIcon />
                    {getPeriodText(statisticsData.period)}生产报损
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                        <Typography variant="body2" color="text.secondary">
                          总报损数量
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                          {statisticsData.productionLoss.total.totalQuantity}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                        <Typography variant="body2" color="text.secondary">
                          总报损价值
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                          {formatCurrency(statisticsData.productionLoss.total.totalValue)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Divider sx={{ my: 2 }} />
                  
                  {/* 报损类型柱状图 */}
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#666', mb: 2 }}>
                    报损类型分布
                  </Typography>
                  <Box sx={{ height: 200, mb: 2 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Object.entries(statisticsData.productionLoss.byType)
                          .filter(([, data]) => data.recordCount > 0)
                          .map(([type, data]) => ({
                            name: getLossTypeText(type),
                            数量: data.totalQuantity,
                            价值: data.totalValue,
                          }))}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="name" 
                          fontSize={12}
                          angle={-45}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis fontSize={12} />
                        <Tooltip 
                          formatter={(value, name) => {
                            if (name === '价值') {
                              return [formatCurrency(Number(value)), name];
                            }
                            return [value, name];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="数量" fill="#ff9800" />
                        <Bar dataKey="价值" fill="#d32f2f" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#666' }}>
                    报损类型明细
                  </Typography>
                  <Stack spacing={1}>
                    {Object.entries(statisticsData.productionLoss.byType).map(([type, data]) => (
                      data.recordCount > 0 && (
                        <Paper key={type} sx={{ p: 2, bgcolor: '#fafafa' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {getLossTypeText(type)}
                            </Typography>
                            <Stack direction="row" spacing={2}>
                              <Typography variant="body2" color="text.secondary">
                                数量: {data.totalQuantity}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                价值: {formatCurrency(data.totalValue)}
                              </Typography>
                            </Stack>
                          </Stack>
                        </Paper>
                      )
                    ))}
                  </Stack>
                </CardContent>
              </Card>

            {/* 库存统计 */}
            <Card sx={{ 
                mb: 3, 
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#388e3c',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <InventoryIcon />
                    库存概况
                  </Typography>
                  
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                      <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          库存总价值
                        </Typography>
                        <Typography variant="h5" sx={{ color: '#388e3c', fontWeight: 600 }}>
                          ¥{statisticsData.inventory.totalValue?.toFixed(2) || '0.00'}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>


                </CardContent>
              </Card>

            {/* 刷新按钮 */}
            <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={fetchStatistics}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <AssessmentIcon />}
                sx={{
                  py: 2,
                  mt: 2,
                  borderRadius: 3,
                  background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                  boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                    boxShadow: '0 6px 25px rgba(25, 118, 210, 0.4)',
                    transform: 'translateY(-2px)',
                  },
                  '&:active': {
                    transform: 'translateY(0px)',
                  },
                  '&:disabled': {
                    background: '#e0e0e0',
                    color: '#9e9e9e',
                    boxShadow: 'none',
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                {loading ? '刷新中...' : '🔄 刷新数据'}
              </Button>
          </>
        )}
      </Container>
    </Box>
  );
};

export default MobileStatisticsPage;