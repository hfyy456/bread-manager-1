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
  ListItemSecondaryAction,
  AppBar,
  Toolbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 移动端生产报损统计页面
 * 提供生产计划统计、报损分析等功能
 */
interface ProductionStats {
  totalPlans: number;
  totalQuantity: number;
  totalProductionAmount: number;
  totalWasteAmount: number;
  avgDailyQuantity: number;
  avgDailyAmount: number;
}

interface ProductionPlan {
  _id: string;
  date: string;
  weekday: string;
  status: string;
  totals: {
    totalQuantity: number;
    totalProductionAmount: number;
    totalProductionWaste: number;
    totalTastingWaste: number;
    totalSalesAmount: number;
  };
  items: Array<{
    breadId: string;
    breadName: string;
    totalQuantity: number;
    price: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

type PeriodType = 'daily' | 'weekly' | 'monthly';

const MobileProductionStatsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [plans, setPlans] = useState<ProductionPlan[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [storeId, setStoreId] = useState<string | null>(null);

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
   * 获取日期范围
   */
  const getDateRange = useCallback((period: PeriodType) => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'daily':
        startDate = now;
        endDate = now;
        break;
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case 'monthly':
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        break;
      default:
        startDate = startOfWeek(now, { weekStartsOn: 1 });
        endDate = endOfWeek(now, { weekStartsOn: 1 });
    }

    return {
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd'),
    };
  }, []);

  /**
   * 获取生产统计数据
   */
  const fetchProductionStats = useCallback(async () => {
    if (!storeId) return;

    try {
      const { startDate, endDate } = getDateRange(periodType);
      const response = await fetch(
        `/api/production-plans/stats?startDate=${startDate}&endDate=${endDate}`,
        {
          headers: {
            'x-current-store-id': storeId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('获取生产统计数据失败');
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.message || '获取统计数据失败');
      }
    } catch (err) {
      console.error('获取生产统计数据失败:', err);
      setError(err instanceof Error ? err.message : '获取统计数据失败');
    }
  }, [storeId, periodType, getDateRange]);

  /**
   * 获取生产计划列表
   */
  const fetchProductionPlans = useCallback(async () => {
    if (!storeId) return;

    try {
      const { startDate, endDate } = getDateRange(periodType);
      const response = await fetch(
        `/api/production-plans?startDate=${startDate}&endDate=${endDate}&limit=10`,
        {
          headers: {
            'x-current-store-id': storeId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('获取生产计划列表失败');
      }

      const result = await response.json();
      if (result.success) {
        setPlans(result.data || []);
      } else {
        throw new Error(result.message || '获取生产计划失败');
      }
    } catch (err) {
      console.error('获取生产计划列表失败:', err);
    }
  }, [storeId, periodType, getDateRange]);

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
          fetchProductionStats(),
          fetchProductionPlans(),
        ]);
      } catch (err) {
        setError('数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [storeId, fetchProductionStats, fetchProductionPlans]);

  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    await Promise.all([
      fetchProductionStats(),
      fetchProductionPlans(),
    ]);
  };

  /**
   * 返回首页
   */
  const handleGoBack = () => {
    window.history.back();
  };

  /**
   * 获取状态颜色
   */
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'in_progress':
        return 'warning';
      case 'confirmed':
        return 'info';
      default:
        return 'default';
    }
  };

  /**
   * 获取状态文本
   */
  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return '已完成';
      case 'in_progress':
        return '进行中';
      case 'confirmed':
        return '已确认';
      case 'draft':
        return '草稿';
      default:
        return status;
    }
  };

  /**
   * 计算报损率
   */
  const getWasteRate = (wasteAmount: number, productionAmount: number) => {
    if (productionAmount === 0) return 0;
    return ((wasteAmount / productionAmount) * 100).toFixed(1);
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
            生产报损统计
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

        {/* 统计数据概览 */}
        {!loading && !error && stats && (
          <>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {stats.totalPlans}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    生产计划数
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {stats.totalQuantity}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    总生产数量
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    ¥{stats.totalProductionAmount.toFixed(0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    生产总价值
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={6}>
                <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="h4" color="error.main" fontWeight="bold">
                    ¥{stats.totalWasteAmount.toFixed(0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    报损总价值
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            {/* 报损率分析 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
              <Box display="flex" alignItems="center" mb={2}>
                <WarningIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  报损分析
                </Typography>
              </Box>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body1">
                      报损率
                    </Typography>
                    <Typography variant="h5" color="error.main" fontWeight="bold">
                      {getWasteRate(stats.totalWasteAmount, stats.totalProductionAmount)}%
                    </Typography>
                  </Box>
                  <Divider sx={{ my: 1 }} />
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="body2" color="text.secondary">
                      日均生产量
                    </Typography>
                    <Typography variant="body1">
                      {stats.avgDailyQuantity.toFixed(0)} 个
                    </Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                      日均生产价值
                    </Typography>
                    <Typography variant="body1">
                      ¥{stats.avgDailyAmount.toFixed(0)}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          </>
        )}

        {/* 生产计划列表 */}
        {!loading && !error && (
          <Paper elevation={2} sx={{ mb: 3 }}>
            <Box p={2} pb={1}>
              <Box display="flex" alignItems="center" mb={2}>
                <AssessmentIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  最近生产计划
                </Typography>
              </Box>
            </Box>
            
            {plans.length === 0 ? (
              <Box p={3} textAlign="center">
                <Typography variant="body1" color="text.secondary">
                  暂无生产计划数据
                </Typography>
              </Box>
            ) : (
              <List>
                {plans.map((plan, index) => (
                  <React.Fragment key={plan._id}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" justifyContent="space-between">
                            <Typography variant="subtitle1" fontWeight="bold">
                              {format(new Date(plan.date), 'MM月dd日', { locale: zhCN })} ({plan.weekday})
                            </Typography>
                            <Chip
                              label={getStatusText(plan.status)}
                              color={getStatusColor(plan.status) as any}
                              size="small"
                            />
                          </Box>
                        }
                        secondary={
                          <Box mt={1}>
                            <Typography variant="body2" color="text.secondary">
                              生产数量: {plan.totals.totalQuantity} 个
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              生产价值: ¥{plan.totals.totalProductionAmount.toFixed(0)}
                            </Typography>
                            <Typography variant="body2" color="error.main">
                              报损价值: ¥{(plan.totals.totalProductionWaste + plan.totals.totalTastingWaste).toFixed(0)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < plans.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        )}

        {/* 操作按钮 */}
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<TrendingUpIcon />}
            onClick={() => {
              // 可以跳转到详细的趋势分析页面
              alert('趋势分析功能开发中...');
            }}
          >
            趋势分析
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AssessmentIcon />}
            onClick={() => {
              // 可以跳转到详细报告页面
              alert('详细报告功能开发中...');
            }}
          >
            详细报告
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

export default MobileProductionStatsPage;