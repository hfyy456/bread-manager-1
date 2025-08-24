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
  Info as InfoIcon,
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
    totalShipmentValue: number; // 总出货金额
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
  const [grossProfitData, setGrossProfitData] = useState<any>(null);
  const [grossProfitLoading, setGrossProfitLoading] = useState(false);
  const [period, setPeriod] = useState<'today' | 'yesterday' | 'week' | 'lastWeek' | 'month' | 'lastMonth'>('today');
  const [expanded, setExpanded] = useState(false);
  const [revenueSourceExpanded, setRevenueSourceExpanded] = useState(false);
  const [revenueTipExpanded, setRevenueTipExpanded] = useState(false);
  const [grossProfitTipExpanded, setGrossProfitTipExpanded] = useState(false);
  const [lossStatsTipExpanded, setLossStatsTipExpanded] = useState(false);
  const [inventoryTipExpanded, setInventoryTipExpanded] = useState(false);

  /**
   * 获取毛利数据
   */
  const fetchGrossProfitData = async () => {
    if (!user?.storeId) {
      return;
    }

    setGrossProfitLoading(true);

    try {
      const response = await authFetch(
        `/api/statistics/gross-profit?storeId=${user.storeId}&period=${period}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '获取毛利数据失败');
      }

      const result = await response.json();
      // 处理后端返回的数据结构，将summary中的数据提取到顶层
      const processedData = result.data.summary ? {
        ...result.data.summary,
        grossProfit: result.data.summary.totalProfit,
        grossProfitMargin: result.data.summary.profitMargin,
        lossImpact: result.data.lossImpact,
        breadAnalysis: result.data.breadAnalysis
      } : null;
      setGrossProfitData(processedData);
    } catch (err) {
      console.error('获取毛利数据失败:', err);
      // 毛利数据获取失败不影响主要统计数据的显示
    } finally {
      setGrossProfitLoading(false);
    }
  };

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
      // 并行获取统计数据和毛利数据
      const [statisticsResponse] = await Promise.all([
        authFetch(
          `/api/statistics?storeId=${user.storeId}&period=${period}`,
          {
            method: 'GET',
          }
        ),
        fetchGrossProfitData() // 异步获取毛利数据
      ]);

      if (!statisticsResponse.ok) {
        const errorData = await statisticsResponse.json();
        throw new Error(errorData.message || '获取统计数据失败');
      }

      const statisticsResult = await statisticsResponse.json();
      
      // 调试：打印出货报损率相关数据
      console.log('=== 出货报损率调试信息 ===');
      console.log('统计数据:', statisticsResult.data);
      console.log('出货报损率:', statisticsResult.data.revenue?.shipmentLossRate);
      console.log('报损统计:', statisticsResult.data.productionLoss);
      console.log('出货金额:', statisticsResult.data.revenue?.totalShipmentValue);
      console.log('========================');
      
      setStatisticsData(statisticsResult.data);
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
  const formatCurrency = (amount: number | undefined | null): string => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '¥0.00';
    }
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
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                        <Typography variant="body2" color="text.secondary">
                          总出货金额
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                          {formatCurrency(statisticsData.revenue.totalShipmentValue || 0)}
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                        <Typography variant="body2" color="text.secondary">
                          出货差异
                        </Typography>
                        <Typography variant="h6" sx={{ 
                          color: (() => {
                            const shipmentDifference = (statisticsData.revenue.totalRevenue || 0) + 
                              (statisticsData.productionLoss.total.totalValue || 0) - 
                              (statisticsData.revenue.totalShipmentValue || 0);
                            return shipmentDifference >= 0 ? '#7b1fa2' : '#d32f2f';
                          })(),
                          fontWeight: 600 
                        }}>
                          {(() => {
                            const shipmentDifference = (statisticsData.revenue.totalRevenue || 0) + 
                              (statisticsData.productionLoss.total.totalValue || 0) - 
                              (statisticsData.revenue.totalShipmentValue || 0);
                            return formatCurrency(shipmentDifference);
                          })()}
                        </Typography>
                      </Paper>
                    </Grid>
                   </Grid>

                  {/* 营业数据提示 */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <InfoIcon sx={{ color: '#6c757d', fontSize: 18, mt: 0.2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Stack 
                          direction="row" 
                          alignItems="center" 
                          justifyContent="space-between"
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setRevenueTipExpanded(!revenueTipExpanded)}
                        >
                          <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                            💡 营业数据详细说明
                          </Typography>
                          {revenueTipExpanded ? 
                            <ExpandLessIcon sx={{ color: '#6c757d', fontSize: 18 }} /> : 
                            <ExpandMoreIcon sx={{ color: '#6c757d', fontSize: 18 }} />
                          }
                        </Stack>
                        
                        {revenueTipExpanded && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>📊 核心指标说明：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>实收金额</strong>：实际收到的现金流入，扣除各种优惠、折扣、退款等
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>营业额</strong>：订单总金额，包含所有销售收入（含优惠前金额）
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>订单数量</strong>：统计期间内的总订单笔数
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>客单价</strong>：平均每个订单的金额（营业额÷订单数量）
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              • <strong>实收率</strong>：实收金额占营业额的比例，反映收款效率和优惠力度
                            </Typography>
                            
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>💳 支付渠道分布：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>美团</strong>：美团外卖平台订单收入
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>抖音</strong>：抖音平台订单收入
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>现金</strong>：现金支付收入
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>银行卡</strong>：刷卡支付收入（IN77为商场积分）
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>微信</strong>：微信支付收入
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              • <strong>支付宝</strong>：支付宝支付收入
                            </Typography>
                            
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>📈 报损相关指标：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>出货报损率</strong>：出货报损价值占总出货金额的比例
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              • <strong>营业额报损率</strong>：总报损价值占营业额的比例，反映整体损耗水平
                            </Typography>
                            
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>📦 出货差异说明：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>出货差异</strong>：实际出货金额与预期出货金额的差异
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>正差异</strong>：实际出货超过预期
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>负差异</strong>：实际出货低于预期，可能由于生产报损或者飞单
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block' }}>
                              • <strong>差异分析</strong>：帮助识别生产计划与实际执行的偏差，优化管理
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  
                  {/* 收入来源分布 - 可折叠 */}
                  <Box>
                    <Button
                      onClick={() => setRevenueSourceExpanded(!revenueSourceExpanded)}
                      startIcon={revenueSourceExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      sx={{ 
                        color: '#666',
                        fontSize: '0.875rem',
                        textTransform: 'none',
                        p: 0,
                        minWidth: 'auto',
                        mb: 1
                      }}
                    >
                      收入来源分布
                    </Button>
                    
                    {revenueSourceExpanded && (
                      <>
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
                      </>
                    )}
                  </Box>
                </CardContent>
              </Card>

            {/* 毛利分析 */}
            <Card sx={{ 
                mb: 3, 
                borderRadius: 3,
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
              }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ 
                    color: '#7b1fa2',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    <TrendingUpIcon />
                    毛利分析
                  </Typography>
                  
                  {grossProfitLoading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                      <CircularProgress size={40} />
                    </Box>
                  ) : grossProfitData ? (
                    <>
                      <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={6}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#f3e5f5' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              总收入
                            </Typography>
                            <Typography variant="h6" sx={{ color: '#7b1fa2', fontWeight: 600 }}>
                              {formatCurrency(grossProfitData?.totalRevenue)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#fff3e0' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              总成本
                            </Typography>
                            <Typography variant="h6" sx={{ color: '#f57c00', fontWeight: 600 }}>
                              {formatCurrency(grossProfitData?.totalCost)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e8f5e8' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              毛利润
                            </Typography>
                            <Typography variant="h6" sx={{ color: '#388e3c', fontWeight: 600 }}>
                              {formatCurrency(grossProfitData?.grossProfit)}
                            </Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={6}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#e3f2fd' }}>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              毛利率
                            </Typography>
                            <Typography variant="h6" sx={{ color: '#1976d2', fontWeight: 600 }}>
                              {(grossProfitData?.grossProfitMargin || 0).toFixed(1)}%
                            </Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                      
                      {grossProfitData?.lossImpact && (
                        <Box sx={{ mt: 2 }}>
                          <Typography variant="subtitle2" gutterBottom sx={{ color: '#666' }}>
                            报损影响
                          </Typography>
                          <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                              <Typography variant="body2" color="text.secondary">
                                报损价值
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 500 }}>
                                {formatCurrency(grossProfitData?.lossImpact?.totalLossValue)}
                              </Typography>
                            </Stack>
                            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
                              <Typography variant="body2" color="text.secondary">
                                对毛利率影响
                              </Typography>
                              <Typography variant="body2" sx={{ color: '#d32f2f', fontWeight: 500 }}>
                                -{(grossProfitData?.lossImpact?.profitMarginImpact || 0).toFixed(1)}%
                              </Typography>
                            </Stack>
                          </Paper>
                        </Box>
                      )}
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        暂无毛利数据
                      </Typography>
                    </Box>
                  )}
                  
                  {/* 毛利分析提示 */}
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <InfoIcon sx={{ color: '#6c757d', fontSize: 18, mt: 0.2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Stack 
                          direction="row" 
                          alignItems="center" 
                          justifyContent="space-between"
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setGrossProfitTipExpanded(!grossProfitTipExpanded)}
                        >
                          <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                            💡 毛利分析详细说明
                          </Typography>
                          {grossProfitTipExpanded ? 
                            <ExpandLessIcon sx={{ color: '#6c757d', fontSize: 18 }} /> : 
                            <ExpandMoreIcon sx={{ color: '#6c757d', fontSize: 18 }} />
                          }
                        </Stack>
                        
                        {grossProfitTipExpanded && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>💰 核心财务指标：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>总收入</strong>：当期所有销售收入的总和，包含各渠道营业额
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>总成本</strong>：原材料成本和生产成本的总和，基于配方计算
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>毛利润</strong>：总收入减去总成本的差额，反映基础盈利能力
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              • <strong>毛利率</strong>：毛利润占总收入的百分比，衡量盈利效率
                            </Typography>
                            
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>📉 报损影响分析：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>报损价值</strong>：各类报损造成的直接经济损失
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              • <strong>对毛利率影响</strong>：报损对整体盈利能力的负面影响程度
                            </Typography>
                            
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>📊 计算方式：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • 毛利润 = 总收入 - 总成本
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • 毛利率 = (毛利润 ÷ 总收入) × 100%
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block' }}>
                              • 成本基于面包配方和原料价格自动计算
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                </CardContent>
              </Card>

            {/* 报损统计 */}
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
                    {getPeriodText(statisticsData.period)}报损统计
                  </Typography>
                  
                  {/* 总体统计 */}
                  <Grid container spacing={2} sx={{ mt: 1, mb: 3 }}>
                  
                    <Grid item xs={12}>
                      <Paper sx={{ p: 2, textAlign: 'center', bgcolor: '#ffebee' }}>
                        <Typography variant="body2" color="text.secondary">
                          总报损价值
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#d32f2f', fontWeight: 600 }}>
                          {formatCurrency(statisticsData.productionLoss.total.totalLossValue)}
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  {/* 各类型报损卡片 */}
                  <Typography variant="subtitle2" gutterBottom sx={{ color: '#666', mb: 2 }}>
                    各类型报损详情
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(statisticsData.productionLoss.byType)
                      .filter(([type]) => type !== 'shipment')
                      .map(([type, data]) => {
                      const typeConfig = {
                        production: { label: '生产报损', color: '#ff9800', bgColor: '#fff3e0' },
                        tasting: { label: '品尝报损', color: '#4caf50', bgColor: '#e8f5e8' },
                        closing: { label: '打烊报损', color: '#2196f3', bgColor: '#e3f2fd' },
                        other: { label: '其他报损', color: '#9c27b0', bgColor: '#f3e5f5' }
                      };
                      
                      const config = typeConfig[type] || { label: type, color: '#666', bgColor: '#f5f5f5' };
                      
                      return (
                        <Grid item xs={12} sm={6} key={type}>
                          <Card sx={{ 
                            height: '100%',
                            bgcolor: config.bgColor,
                            border: `1px solid ${config.color}20`,
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                              transform: 'translateY(-2px)',
                              boxShadow: `0 4px 12px ${config.color}30`
                            }
                          }}>
                            <CardContent sx={{ p: 2 }}>
                              <Stack spacing={1}>
                                <Typography variant="subtitle2" sx={{ 
                                  color: config.color,
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.5
                                }}>
                                  {config.label}
                                </Typography>
                                
                                <Box textAlign="center">
                                  <Typography variant="h5" sx={{ color: config.color, fontWeight: 600 }}>
                                    {formatCurrency(data.totalValue)}
                                  </Typography>
                                  {data.totalValue === 0 && (
                                    <Typography variant="caption" color="text.secondary" sx={{ 
                                      fontStyle: 'italic',
                                      mt: 1
                                    }}>
                                      暂无记录
                                    </Typography>
                                  )}
                                </Box>
                              </Stack>
                            </CardContent>
                          </Card>
                        </Grid>
                      );
                    })}
                  </Grid>
                  
                  {/* 报损统计提示 */}
                  <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 2, border: '1px solid #e9ecef' }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <InfoIcon sx={{ color: '#6c757d', fontSize: 18, mt: 0.2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Stack 
                          direction="row" 
                          alignItems="center" 
                          justifyContent="space-between"
                          sx={{ cursor: 'pointer' }}
                          onClick={() => setLossStatsTipExpanded(!lossStatsTipExpanded)}
                        >
                          <Typography variant="body2" sx={{ color: '#495057', fontWeight: 500 }}>
                            💡 报损统计详细说明
                          </Typography>
                          {lossStatsTipExpanded ? 
                            <ExpandLessIcon sx={{ color: '#6c757d', fontSize: 18 }} /> : 
                            <ExpandMoreIcon sx={{ color: '#6c757d', fontSize: 18 }} />
                          }
                        </Stack>
                        
                        {lossStatsTipExpanded && (
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>📋 报损类型分类：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>生产报损</strong>：生产过程中的废料、次品和制作失误
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>品尝报损</strong>：用于客户品尝、试吃的产品消耗
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>打烊报损</strong>：营业结束时的剩余产品和未售完商品
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>其他报损</strong>：意外损坏、过期变质、员工消费等其他原因
                            </Typography>
                         
                            
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>📊 统计指标说明：</strong>
                            </Typography>
                  
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 0.5 }}>
                              • <strong>总报损价值</strong>：按成本价计算的报损金额总和
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              • <strong>出货报损率</strong>：出货报损占总出货量的百分比
                            </Typography>
                            
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block', mb: 1 }}>
                              <strong>💡 管理建议：</strong>
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#6c757d', lineHeight: 1.4, display: 'block' }}>
                              • 关注报损率趋势，及时调整生产和销售策略<br/>
                              • 分析各类报损原因，制定针对性改进措施<br/>
                              • 合理控制报损成本，提升整体盈利能力
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Stack>
                  </Box>
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