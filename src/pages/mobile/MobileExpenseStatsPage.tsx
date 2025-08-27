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
  Checkbox,
  Badge,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
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
  CheckCircle as CheckCircleIcon,
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';
import { useStore } from '../../components/StoreContext';
import { formatUTCToLocal, localDateToUTC, formatDate, DATE_FORMATS } from '../../utils/dateUtils';

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
  const { user: authUser, loading: authLoading, error: authError, isFeishuEnv } = useFeishuAuth();
  const [user, setUser] = useState<any>(null);
  const { currentStore, loading: storeLoading } = useStore();
  
  // 状态管理
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<ExpenseType>('all');
  const [selectedReimbursementStatus, setSelectedReimbursementStatus] = useState<ReimbursementStatus>('all');
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // 数据状态
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [dailyExpenses, setDailyExpenses] = useState<ExpenseRecord[]>([]);
  const [updatingExpenseId, setUpdatingExpenseId] = useState<string | null>(null);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<Set<string>>(new Set());
  const [batchUpdating, setBatchUpdating] = useState(false);

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



  // 获取用户信息
  const fetchUserInfo = useCallback(async () => {
    if (!authUser?.userId) return;
    
    try {
      const response = await fetch('/api/users/me', {
        headers: {
          'Content-Type': 'application/json',
          'x-feishu-user-id': authUser.userId,
        },
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }, [authUser]);

  // 获取支出统计数据
  const fetchExpenseStats = useCallback(async (startDate: Date, endDate: Date, type: ExpenseType, reimbursementStatus: ReimbursementStatus) => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        startDate: localDateToUTC(format(startDate, 'yyyy-MM-dd')).toISOString().split('T')[0],
        endDate: localDateToUTC(format(endDate, 'yyyy-MM-dd')).toISOString().split('T')[0],
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
        startDate: localDateToUTC(format(startDate, 'yyyy-MM-dd')).toISOString().split('T')[0],
        endDate: localDateToUTC(format(endDate, 'yyyy-MM-dd')).toISOString().split('T')[0],
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
        date: localDateToUTC(format(date, 'yyyy-MM-dd')).toISOString().split('T')[0],
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

  /**
   * 更新支出记录报销状态
   * @param expenseId - 支出记录ID
   * @param currentStatus - 当前报销状态
   */
  const handleUpdateReimbursementStatus = async (expenseId: string, currentStatus: '已报销' | '未报销') => {
    // 只允许从"未报销"更改为"已报销"
    if (currentStatus === '已报销') {
      return;
    }

    if (!user?.name) {
      setError('无法获取用户信息，请重新登录');
      return;
    }

    try {
      setUpdatingExpenseId(expenseId);
      setError(null);

      const response = await fetch(`/api/expense/${expenseId}/reimbursement`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reimbursementStatus: '已报销',
          reimbursedBy: user.name,
        }),
      });

      if (response.ok) {
        // 更新本地状态
        const updateExpenseStatus = (expenses: ExpenseRecord[]) => 
          expenses.map(expense => 
            expense._id === expenseId 
              ? { 
                  ...expense, 
                  reimbursementStatus: '已报销' as const,
                  reimbursedAt: new Date().toISOString(),
                  reimbursedBy: user.name 
                }
              : expense
          );

        setExpenseRecords(prev => updateExpenseStatus(prev));
        setDailyExpenses(prev => updateExpenseStatus(prev));
        
        // 刷新统计数据
        await refreshData();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新报销状态失败');
      }
    } catch (error) {
      console.error('更新报销状态失败:', error);
      setError(error instanceof Error ? error.message : '更新报销状态失败，请重试');
    } finally {
       setUpdatingExpenseId(null);
     }
   };

   /**
    * 批量更新支出记录报销状态
    * @param expenseIds - 支出记录ID列表
    */
   const handleBatchUpdateReimbursementStatus = async (expenseIds: string[]) => {
     if (expenseIds.length === 0) {
       setError('请选择要更新的支出记录');
       return;
     }

     if (!user?.name) {
       setError('无法获取用户信息，请重新登录');
       return;
     }

     // 检查用户权限
     if (user?.role !== 'admin') {
       setError('权限不足，只有管理员可以执行批量报销操作');
       return;
     }

     try {
       setBatchUpdating(true);
       setError(null);

       const response = await fetch('/api/expense/batch/reimbursement', {
         method: 'PUT',
         headers: {
           'Content-Type': 'application/json',
         },
         body: JSON.stringify({
           expenseIds,
           reimbursementStatus: '已报销',
           reimbursedBy: user.name,
         }),
       });

       if (response.ok) {
         const result = await response.json();
         
         // 更新本地状态
         const updateExpenseStatus = (expenses: ExpenseRecord[]) => 
           expenses.map(expense => 
             expenseIds.includes(expense._id)
               ? { 
                   ...expense, 
                   reimbursementStatus: '已报销' as const,
                   reimbursedAt: new Date().toISOString(),
                   reimbursedBy: user.name 
                 }
               : expense
           );

         setExpenseRecords(prev => updateExpenseStatus(prev));
         setDailyExpenses(prev => updateExpenseStatus(prev));
         
         // 清空选择
         setSelectedExpenseIds(new Set());
         
         // 刷新统计数据
         await refreshData();
         
         // 显示成功消息
         setError(null);
        } else {
          const errorData = await response.json();
          if (response.status === 403) {
            setError('权限不足，只有管理员可以执行批量报销操作');
          } else {
            setError(errorData.message || '批量更新报销状态失败');
          }
        }
     } catch (error) {
       console.error('批量更新报销状态失败:', error);
       setError(error instanceof Error ? error.message : '批量更新报销状态失败，请重试');
     } finally {
       setBatchUpdating(false);
     }
   };

   /**
    * 切换选择状态
    * @param expenseId - 支出记录ID
    */
   const toggleSelection = (expenseId: string) => {
     const newSelected = new Set(selectedExpenseIds);
     if (newSelected.has(expenseId)) {
       newSelected.delete(expenseId);
     } else {
       newSelected.add(expenseId);
     }
     setSelectedExpenseIds(newSelected);
   };

   /**
    * 全选/取消全选
    * @param expenses - 支出记录列表
    */
   const toggleSelectAll = (expenses: ExpenseRecord[]) => {
     const unreimbursedExpenses = expenses.filter(expense => expense.reimbursementStatus === '未报销');
     const unreimbursedIds = unreimbursedExpenses.map(expense => expense._id);
     
     if (unreimbursedIds.every(id => selectedExpenseIds.has(id))) {
       // 如果全部已选中，则取消全选
       const newSelected = new Set(selectedExpenseIds);
       unreimbursedIds.forEach(id => newSelected.delete(id));
       setSelectedExpenseIds(newSelected);
     } else {
       // 否则全选
       const newSelected = new Set(selectedExpenseIds);
       unreimbursedIds.forEach(id => newSelected.add(id));
       setSelectedExpenseIds(newSelected);
     }
   };

   /**
    * 计算选中项目的总金额
    */
   const getSelectedTotalAmount = () => {
     // 根据当前活跃的标签页选择正确的数据源，避免重复计算
     const currentExpenses = activeTab === 0 ? dailyExpenses : expenseRecords;
     return currentExpenses
       .filter(expense => selectedExpenseIds.has(expense._id))
       .reduce((sum, expense) => sum + expense.amount, 0);
   };

   /**
    * 清空选择
    */
   const clearSelection = () => {
     setSelectedExpenseIds(new Set());
   };

  // 获取用户信息
  useEffect(() => {
    if (authUser?.userId) {
      fetchUserInfo();
    }
  }, [fetchUserInfo]);

  // 初始化数据 - 门店信息现在通过 StoreContext 获取
  useEffect(() => {
    // 只有在门店信息加载完成且存在时才获取数据
    if (!storeLoading && currentStore) {
      refreshData();
    }
  }, [refreshData, storeLoading, currentStore]);

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

  /**
   * 计算报销状态统计
   * @param expenses - 支出记录列表
   * @returns 报销状态统计数据
   */
  const calculateReimbursementStats = (expenses: ExpenseRecord[]) => {
    const reimbursed = expenses.filter(expense => expense.reimbursementStatus === '已报销');
    const unreimbursed = expenses.filter(expense => expense.reimbursementStatus === '未报销');
    
    return {
      reimbursed: {
        count: reimbursed.length,
        amount: reimbursed.reduce((sum, expense) => sum + expense.amount, 0)
      },
      unreimbursed: {
        count: unreimbursed.length,
        amount: unreimbursed.reduce((sum, expense) => sum + expense.amount, 0)
      }
    };
  };

  // 渲染统计卡片
  const renderStatsCards = () => {
    if (!expenseStats) return null;

    // 获取当前显示的支出记录（根据当前选中的标签页）
    const currentExpenses = activeTab === 0 ? dailyExpenses : expenseRecords;
    const reimbursementStats = calculateReimbursementStats(currentExpenses);
    
    // 使用当前显示记录计算总支出，确保数据一致性
    const totalAmount = reimbursementStats.reimbursed.amount + reimbursementStats.unreimbursed.amount;
    const totalCount = reimbursementStats.reimbursed.count + reimbursementStats.unreimbursed.count;

    const cards = [
      {
        title: '总支出',
        value: formatAmount(totalAmount),
        subtitle: `共${totalCount}笔`,
        color: '#1976d2',
        icon: <AccountBalanceIcon />,
      },
      {
        title: '已报销',
        value: formatAmount(reimbursementStats.reimbursed.amount),
        subtitle: `${reimbursementStats.reimbursed.count}笔`,
        color: '#4caf50',
        icon: <CheckCircleIcon />,
      },
      {
        title: '未报销',
        value: formatAmount(reimbursementStats.unreimbursed.amount),
        subtitle: `${reimbursementStats.unreimbursed.count}笔`,
        color: '#ff9800',
        icon: <ScheduleIcon />,
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

    const unreimbursedExpenses = expenses.filter(expense => expense.reimbursementStatus === '未报销');
    const selectedCount = expenses.filter(expense => selectedExpenseIds.has(expense._id)).length;
    const canSelectAll = unreimbursedExpenses.length > 0;
    const isAllSelected = unreimbursedExpenses.length > 0 && unreimbursedExpenses.every(expense => selectedExpenseIds.has(expense._id));

    return (
      <Paper sx={{ mb: 2 }}>
        {/* 批量操作工具栏 - 仅管理员可见 */}
        {unreimbursedExpenses.length > 0 && user?.role === 'admin' && (
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', bgcolor: '#fafafa' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={isAllSelected}
                  indeterminate={selectedCount > 0 && !isAllSelected}
                  onChange={() => toggleSelectAll(expenses)}
                  disabled={!canSelectAll}
                />
                <Typography variant="body2" color="text.secondary">
                  {selectedCount > 0 ? `已选择 ${selectedCount} 项` : '全选未报销项目'}
                </Typography>
                {selectedCount > 0 && (
                  <Chip
                    label={`总计: ¥${getSelectedTotalAmount().toFixed(2)}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>
              {selectedCount > 0 && (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={clearSelection}
                    startIcon={<ClearIcon />}
                  >
                    清空
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    onClick={() => handleBatchUpdateReimbursementStatus(Array.from(selectedExpenseIds))}
                    disabled={batchUpdating}
                    startIcon={<CheckCircleIcon />}
                  >
                    {batchUpdating ? '处理中...' : '批量报销'}
                  </Button>
                </Box>
              )}
            </Box>
          </Box>
        )}
        
        <List sx={{ py: 0 }}>
          {expenses.map((expense, index) => {
            const typeConfig = getTypeConfig(expense.type);
            const canUpdateStatus = expense.reimbursementStatus === '未报销';
            const isUpdating = updatingExpenseId === expense._id;
            const isSelected = selectedExpenseIds.has(expense._id);
            
            return (
              <React.Fragment key={expense._id}>
                <ListItem 
                  sx={{ 
                    py: 1, 
                    px: 2,
                    opacity: isUpdating ? 0.7 : 1,
                    bgcolor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent'
                  }}
                >
                  {/* 多选复选框 - 仅管理员可见 */}
                  {canUpdateStatus && user?.role === 'admin' && (
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelection(expense._id);
                      }}
                      sx={{ mr: 1 }}
                    />
                  )}
                  
                  <ListItemIcon sx={{ color: typeConfig.color, minWidth: 36 }}>
                    {typeConfig.icon}
                  </ListItemIcon>
                  <ListItemText
                    sx={{ my: 0, flex: 1 }}
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                        <Box sx={{ flex: 1, mr: 1 }}>
                          <Typography variant="body2" sx={{ fontWeight: 'medium', lineHeight: 1.2 }}>
                            {expense.description}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                            <Chip
                              label={typeConfig.label}
                              size="small"
                              sx={{ 
                                bgcolor: typeConfig.color, 
                                color: 'white', 
                                fontSize: '0.65rem',
                                height: 18
                              }}
                            />
                            <Chip
                              label={isUpdating ? '更新中...' : expense.reimbursementStatus}
                              size="small"
                              color={expense.reimbursementStatus === '已报销' ? 'success' : 'warning'}
                              variant={expense.reimbursementStatus === '已报销' ? 'filled' : 'outlined'}
                              sx={{ 
                                fontSize: '0.65rem',
                                height: 18,
                                fontWeight: 'medium'
                              }}
                            />
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'right' }}>
                          <Typography variant="body1" sx={{ color: typeConfig.color, fontWeight: 'bold', lineHeight: 1.2 }}>
                            {formatAmount(expense.amount)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                            {format(new Date(expense.date), 'MM-dd HH:mm', { locale: zhCN })}
                          </Typography>
                        </Box>
                      </Box>
                    }
                    secondary={
                      <Box sx={{ mt: 0.25 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                          提交人: {expense.operatedBy}
                        </Typography>
                        {expense.notes && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25, fontSize: '0.7rem' }}>
                            备注: {expense.notes}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  
                  {/* 单个报销按钮已移除，只保留批量操作 */}
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
          {!storeLoading && !currentStore && (
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