import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Box,
  Paper,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Alert,
  AppBar,
  Toolbar,
  IconButton,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Fab,
} from '@mui/material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  AccountBalance as AccountBalanceIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  MoreHoriz as MoreHorizIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Business as BusinessIcon,
  Build as BuildIcon,
  ShoppingCart as ShoppingCartIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';

// 支出统计数据接口
interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  avgAmount: number;
  maxAmount: number;
  minAmount: number;
  typeBreakdown: Array<{
    type: string;
    amount: number;
    date: string;
  }>;
}

// 支出记录接口
interface ExpenseRecord {
  _id: string;
  type: '杂费' | '工资' | '易耗品' | '鸡蛋' | '水果净菜' | '大货' | '运费' | '水电' | '租金' | '市场推广';
  date: string;
  amount: number;
  description: string;
  notes?: string;
  operatedBy: string;
  category?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  reimbursementStatus: '已报销' | '未报销';
  reimbursedAt?: string;
  reimbursedBy?: string;
  createdAt: string;
}

// 支出类型定义
type ExpenseType = '杂费' | '工资' | '易耗品' | '鸡蛋' | '水果净菜' | '大货' | '运费' | '水电' | '租金' | '市场推广' | 'all';

// 报销状态类型定义
type ReimbursementStatus = '已报销' | '未报销' | 'all';

const MobileExpenseStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, error: authError, isFeishuEnv } = useFeishuAuth();
  
  // 状态管理
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<ExpenseType>('all');
  const [selectedReimbursementStatus, setSelectedReimbursementStatus] = useState<ReimbursementStatus>('all');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  
  // 数据状态
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<ExpenseRecord[]>([]);

  // 支出类型配置
  const expenseTypes = [
    { value: 'all', label: '全部', icon: <CategoryIcon />, color: '#1976d2' },
    { value: '杂费', label: '杂费', icon: <BusinessIcon />, color: '#ff9800' },
    { value: '工资', label: '工资', icon: <BusinessIcon />, color: '#4caf50' },
    { value: '易耗品', label: '易耗品', icon: <ShoppingCartIcon />, color: '#2196f3' },
    { value: '鸡蛋', label: '鸡蛋', icon: <ShoppingCartIcon />, color: '#ffeb3b' },
    { value: '水果净菜', label: '水果净菜', icon: <ShoppingCartIcon />, color: '#8bc34a' },
    { value: '大货', label: '大货', icon: <ShoppingCartIcon />, color: '#ff5722' },
    { value: '运费', label: '运费', icon: <BuildIcon />, color: '#607d8b' },
    { value: '水电', label: '水电', icon: <BuildIcon />, color: '#03a9f4' },
    { value: '租金', label: '租金', icon: <BusinessIcon />, color: '#9c27b0' },
    { value: '市场推广', label: '市场推广', icon: <TrendingUpIcon />, color: '#e91e63' },
  ];

  // 报销状态配置
  const reimbursementStatusOptions = [
    { value: 'all', label: '全部状态', color: '#1976d2' },
    { value: '未报销', label: '未报销', color: '#ff9800' },
    { value: '已报销', label: '已报销', color: '#4caf50' },
  ];

  // 获取门店信息
  const fetchStoreInfo = useCallback(async () => {
    try {
      const response = await fetch('/api/stores/current', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setStoreInfo(data.data);
      }
    } catch (error) {
      console.error('获取门店信息失败:', error);
    }
  }, []);

  // 获取支出统计数据
  const fetchExpenseStats = useCallback(async (startDate: Date, endDate: Date, type: ExpenseType, reimbursementStatus: ReimbursementStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      });
      
      if (type !== 'all') {
        params.append('type', type);
      }
      
      if (reimbursementStatus !== 'all') {
        params.append('reimbursementStatus', reimbursementStatus);
      }
      
      const response = await fetch(`/api/expense/stats?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenseStats(data.data);
      } else {
        throw new Error('获取支出统计失败');
      }
    } catch (error) {
      console.error('获取支出统计失败:', error);
      setError('获取支出统计失败，请重试');
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取支出记录列表
  const fetchExpenseRecords = useCallback(async (startDate: Date, endDate: Date, type: ExpenseType, reimbursementStatus: ReimbursementStatus) => {
    try {
      const params = new URLSearchParams({
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
        limit: '50',
      });
      
      if (type !== 'all') {
        params.append('type', type);
      }
      
      if (reimbursementStatus !== 'all') {
        params.append('reimbursementStatus', reimbursementStatus);
      }
      
      const response = await fetch(`/api/expense/records?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setExpenseRecords(data.data.records || []);
      }
    } catch (error) {
      console.error('获取支出记录失败:', error);
    }
  }, []);

  // 获取当日支出记录
  const fetchDailyExpenses = useCallback(async (date: Date, type: ExpenseType, reimbursementStatus: ReimbursementStatus) => {
    try {
      const params = new URLSearchParams({
        date: format(date, 'yyyy-MM-dd'),
      });
      
      if (type !== 'all') {
        params.append('type', type);
      }
      
      if (reimbursementStatus !== 'all') {
        params.append('reimbursementStatus', reimbursementStatus);
      }
      
      const response = await fetch(`/api/expense/by-date?${params}`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDailyExpenses(data.data || []);
      }
    } catch (error) {
      console.error('获取当日支出记录失败:', error);
    }
  }, []);

  // 刷新数据
  const refreshData = useCallback(() => {
    const startOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const endOfMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    fetchExpenseStats(startOfMonth, endOfMonth, selectedType, selectedReimbursementStatus);
    fetchExpenseRecords(startOfMonth, endOfMonth, selectedType, selectedReimbursementStatus);
    fetchDailyExpenses(selectedDate, selectedType, selectedReimbursementStatus);
  }, [selectedDate, selectedType, selectedReimbursementStatus, fetchExpenseStats, fetchExpenseRecords, fetchDailyExpenses]);

  // 初始化数据
  useEffect(() => {
    fetchStoreInfo();
  }, [fetchStoreInfo]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // 处理日期变化
  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setSelectedDate(newDate);
    }
  };

  // 处理类型变化
  const handleTypeChange = (event: any) => {
    setSelectedType(event.target.value as ExpenseType);
  };

  // 处理报销状态变化
  const handleReimbursementStatusChange = (event: any) => {
    setSelectedReimbursementStatus(event.target.value as ReimbursementStatus);
  };

  // 处理标签页变化
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  // 获取类型配置
  const getTypeConfig = (type: string) => {
    return expenseTypes.find(t => t.value === type) || expenseTypes[0];
  };

  // 格式化金额
  const formatAmount = (amount: number) => {
    return `¥${amount.toFixed(2)}`;
  };

  // 渲染统计卡片
  const renderStatsCards = () => {
    if (!expenseStats) return null;

    const cards = [
      {
        title: '总支出',
        value: formatAmount(expenseStats.totalAmount),
        subtitle: `共${expenseStats.totalExpenses}笔`,
        color: '#1976d2',
        icon: <AccountBalanceIcon />,
      },
      {
        title: '平均支出',
        value: formatAmount(expenseStats.avgAmount),
        subtitle: '每笔平均',
        color: '#2e7d32',
        icon: <TrendingUpIcon />,
      },
      {
        title: '最大支出',
        value: formatAmount(expenseStats.maxAmount),
        subtitle: '单笔最高',
        color: '#ed6c02',
        icon: <WarningIcon />,
      },
    ];

    return (
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {cards.map((card, index) => (
          <Grid item xs={4} key={index}>
            <Card sx={{ textAlign: 'center', minHeight: 120 }}>
              <CardContent sx={{ pb: 1 }}>
                <Box sx={{ color: card.color, mb: 1 }}>
                  {card.icon}
                </Box>
                <Typography variant="h6" component="div" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  {card.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                  {card.subtitle}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  // 渲染支出记录列表
  const renderExpenseList = (expenses: ExpenseRecord[], title: string) => {
    if (expenses.length === 0) {
      return (
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">暂无{title}数据</Typography>
        </Paper>
      );
    }

    return (
      <Paper sx={{ mb: 2 }}>
        <List>
          {expenses.map((expense, index) => {
            const typeConfig = getTypeConfig(expense.type);
            return (
              <React.Fragment key={expense._id}>
                <ListItem>
                  <ListItemIcon sx={{ color: typeConfig.color }}>
                    {typeConfig.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                          {expense.description}
                        </Typography>
                        <Typography variant="h6" sx={{ color: typeConfig.color, fontWeight: 'bold' }}>
                          {formatAmount(expense.amount)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Chip
                            label={typeConfig.label}
                            size="small"
                            sx={{ bgcolor: typeConfig.color, color: 'white', fontSize: '0.7rem' }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(expense.date), 'MM-dd HH:mm', { locale: zhCN })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            提交人: {expense.operatedBy}
                          </Typography>
                          {expense.isApproved && (
                            <Chip
                              label="已审核"
                              size="small"
                              color="success"
                              sx={{ fontSize: '0.6rem', height: 16 }}
                            />
                          )}
                        </Box>
                        {expense.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                            备注: {expense.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                </ListItem>
                {index < expenses.length - 1 && <Divider />}
              </React.Fragment>
            );
          })}
        </List>
      </Paper>
    );
  };

  // 渲染主要内容
  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
          <CircularProgress />
        </Box>
      );
    }

    return (
      <>
        {renderStatsCards()}
        
        <Paper sx={{ mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
            <Tab label={`当日支出 (${dailyExpenses.length})`} />
            <Tab label={`月度记录 (${expenseRecords.length})`} />
          </Tabs>
        </Paper>

        {activeTab === 0 && renderExpenseList(dailyExpenses, '当日支出')}
        {activeTab === 1 && renderExpenseList(expenseRecords, '月度支出记录')}
      </>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
      <Box sx={{ pb: 8 }}>
        {/* 顶部导航栏 */}
        <AppBar position="sticky" sx={{ bgcolor: '#1976d2' }}>
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => navigate('/mobileHome')}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>
              支出统计
            </Typography>
            <IconButton color="inherit" onClick={refreshData}>
              <RefreshIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="sm" sx={{ mt: 2, px: 2 }}>
          {/* 飞书环境检测 */}
          {!isFeishuEnv && (
            <Alert severity="info" sx={{ mb: 2 }}>
              当前不在飞书环境中，部分功能可能受限
            </Alert>
          )}

          {/* 用户认证状态检查 */}
          {authLoading && (
            <Alert severity="info" sx={{ mb: 2 }}>
              正在获取用户信息...
            </Alert>
          )}

          {authError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              获取用户信息失败: {authError}
            </Alert>
          )}

          {/* 门店信息警告 */}
          {!storeInfo && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              无法获取门店信息，请检查网络连接
            </Alert>
          )}

          {/* 错误提示 */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {/* 日期和类型选择器 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12}>
                <DatePicker
                  label="选择日期"
                  value={selectedDate}
                  onChange={handleDateChange}
                  format="yyyy-MM-dd"
                  slotProps={{
                    textField: {
                      size: 'small',
                      fullWidth: true,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>支出类型</InputLabel>
                  <Select
                    value={selectedType}
                    label="支出类型"
                    onChange={handleTypeChange}
                  >
                    {expenseTypes.map((type) => (
                      <MenuItem key={type.value} value={type.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {type.icon}
                          {type.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>报销状态</InputLabel>
                  <Select
                    value={selectedReimbursementStatus}
                    label="报销状态"
                    onChange={handleReimbursementStatusChange}
                  >
                    {reimbursementStatusOptions.map((status) => (
                      <MenuItem key={status.value} value={status.value}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {status.icon}
                          {status.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          {/* 主要内容 */}
          {renderContent()}
        </Container>

        {/* 浮动添加按钮 */}
        <Fab
          color="primary"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
          }}
          onClick={() => navigate('/mobileHome/expense-register')}
        >
          <AddIcon />
        </Fab>
      </Box>
    </LocalizationProvider>
  );
};

export default MobileExpenseStatsPage;