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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  ListItemSecondaryAction,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Assessment as AssessmentIcon,
  Restaurant as RestaurantIcon,
  Visibility as VisibilityIcon,
  Schedule as ScheduleIcon,
  MoreHoriz as MoreHorizIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Search as SearchIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 移动端生产报损统计页面
 * 提供四种报损类型的选择和统计功能
 */
interface LossStats {
  totalLoss: number;
  productionLoss: number;
  tastingLoss: number;
  closingLoss: number;
  otherLoss: number;
  lossRate: number;
  totalValue: number;
}

interface LossRecord {
  _id: string;
  type: 'production' | 'tasting' | 'closing' | 'other';
  date: string;
  items: Array<{
    breadId: string;
    breadName: string;
    quantity: number;
    unitPrice: number;
    totalValue: number;
    reason: string;
  }>;
  totalQuantity: number;
  totalValue: number;
  createdAt: string;
}

interface BreadType {
  _id: string;
  name: string;
  price: number;
  category: string;
}

interface LossItem {
  breadId: string;
  breadName: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  reason?: string;
}

type LossType = 'production' | 'tasting' | 'closing' | 'other' | 'all';
type PeriodType = 'daily' | 'weekly' | 'monthly';

const MobileProductionLossPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<LossStats | null>(null);
  const [records, setRecords] = useState<LossRecord[]>([]);
  const [selectedType, setSelectedType] = useState<LossType>('all');
  const [periodType, setPeriodType] = useState<PeriodType>('weekly');
  const [storeId, setStoreId] = useState<string | null>(null);
  
  // 报损登记对话框相关状态
  const [showRegisterDialog, setShowRegisterDialog] = useState<boolean>(false);
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [lossItems, setLossItems] = useState<LossItem[]>([]);
  const [registerLossType, setRegisterLossType] = useState<'production' | 'tasting' | 'closing' | 'other'>('production');
  const [showBreadSelector, setShowBreadSelector] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [globalReason, setGlobalReason] = useState<string>('');
  const [registerLoading, setRegisterLoading] = useState<boolean>(false);

  /**
   * 报损类型配置
   */
  const lossTypes = [
    {
      key: 'production' as LossType,
      label: '生产报损登记',
      description: '生产过程中的报损记录',
      icon: <AssessmentIcon />,
      color: '#ff9800',
    },
    {
      key: 'tasting' as LossType,
      label: '品尝报损',
      description: '产品品尝导致的报损',
      icon: <RestaurantIcon />,
      color: '#4caf50',
    },
    {
      key: 'closing' as LossType,
      label: '打烊报损',
      description: '营业结束时的报损',
      icon: <ScheduleIcon />,
      color: '#2196f3',
    },
    {
      key: 'other' as LossType,
      label: '其他报损',
      description: '其他原因导致的报损',
      icon: <MoreHorizIcon />,
      color: '#9c27b0',
    },
  ];

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
   * 获取报损统计数据
   */
  const fetchLossStats = useCallback(async () => {
    if (!storeId) return;

    try {
      const { startDate, endDate } = getDateRange(periodType);
      const typeParam = selectedType === 'all' ? '' : `&type=${selectedType}`;
      const response = await fetch(
        `/api/production-loss/stats?startDate=${startDate}&endDate=${endDate}${typeParam}`,
        {
          headers: {
            'x-current-store-id': storeId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('获取报损统计数据失败');
      }

      const result = await response.json();
      if (result.success) {
        setStats(result.data);
      } else {
        throw new Error(result.message || '获取统计数据失败');
      }
    } catch (err) {
      console.error('获取报损统计数据失败:', err);
      setError(err instanceof Error ? err.message : '获取统计数据失败');
    }
  }, [storeId, periodType, selectedType, getDateRange]);

  /**
   * 获取报损记录列表
   */
  const fetchLossRecords = useCallback(async () => {
    if (!storeId) return;

    try {
      const { startDate, endDate } = getDateRange(periodType);
      const typeParam = selectedType === 'all' ? '' : `&type=${selectedType}`;
      const response = await fetch(
        `/api/production-loss/records?startDate=${startDate}&endDate=${endDate}${typeParam}&limit=20`,
        {
          headers: {
            'x-current-store-id': storeId,
          },
        }
      );

      if (!response.ok) {
        throw new Error('获取报损记录失败');
      }

      const result = await response.json();
      if (result.success) {
        setRecords(result.data || []);
      } else {
        throw new Error(result.message || '获取报损记录失败');
      }
    } catch (err) {
      console.error('获取报损记录失败:', err);
    }
  }, [storeId, selectedType, periodType, getDateRange]);

  /**
   * 获取门店上架产品列表
   */
  const fetchBreadTypes = useCallback(async () => {
    if (!storeId) return;

    try {
      const response = await fetch('/api/production-loss/products', {
        headers: {
          'x-current-store-id': storeId,
        },
      });

      if (!response.ok) {
        throw new Error('获取门店产品失败');
      }

      const result = await response.json();
      if (result.success) {
        setBreadTypes(result.data || []);
      } else {
        throw new Error(result.message || '获取门店产品失败');
      }
    } catch (err) {
      console.error('获取门店产品失败:', err);
      setError(err instanceof Error ? err.message : '获取门店产品失败');
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
          fetchLossStats(),
          fetchLossRecords(),
          fetchBreadTypes(),
        ]);
      } catch (err) {
        setError('数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [storeId, fetchLossStats, fetchLossRecords, fetchBreadTypes]);

  /**
   * 当打开报损登记对话框时获取面包类型
   */
  useEffect(() => {
    if (showRegisterDialog && storeId && breadTypes.length === 0) {
      fetchBreadTypes();
    }
  }, [showRegisterDialog, storeId, breadTypes.length, fetchBreadTypes]);

  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    await Promise.all([
      fetchLossStats(),
      fetchLossRecords(),
    ]);
  };

  /**
   * 添加报损项目
   */
  const handleAddLossItem = (bread: BreadType) => {
    const existingItem = lossItems.find(item => item.breadId === bread._id);
    
    if (existingItem) {
      // 如果已存在，增加数量
      setLossItems(prev => prev.map(item => 
        item.breadId === bread._id 
          ? { ...item, quantity: item.quantity + 1, totalValue: (item.quantity + 1) * item.unitPrice }
          : item
      ));
    } else {
      // 添加新项目
      const newItem: LossItem = {
        breadId: bread._id,
        breadName: bread.name,
        quantity: 1,
        unitPrice: bread.price,
        totalValue: bread.price,
        reason: '',
      };
      setLossItems(prev => [...prev, newItem]);
    }
    
    setShowBreadSelector(false);
  };

  /**
   * 更新报损项目数量
   */
  const handleUpdateQuantity = (breadId: string, quantity: number) => {
    if (quantity <= 0) {
      setLossItems(prev => prev.filter(item => item.breadId !== breadId));
    } else {
      setLossItems(prev => prev.map(item => 
        item.breadId === breadId 
          ? { ...item, quantity, totalValue: quantity * item.unitPrice }
          : item
      ));
    }
  };

  /**
   * 更新报损原因
   */
  const handleUpdateReason = (breadId: string, reason: string) => {
    setLossItems(prev => prev.map(item => 
      item.breadId === breadId 
        ? { ...item, reason }
        : item
    ));
  };

  /**
   * 提交报损记录
   */
  const handleSubmitLoss = async () => {
    if (lossItems.length === 0) {
      setError('请至少添加一个报损项目');
      return;
    }

    setRegisterLoading(true);
    setError('');

    try {
      const submitData = {
        type: registerLossType,
        date: new Date().toISOString(),
        items: lossItems.map(item => ({
          ...item,
          reason: item.reason || globalReason || '无',
        })),
        totalQuantity: lossItems.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: lossItems.reduce((sum, item) => sum + item.totalValue, 0),
      };

      const response = await fetch('/api/production-loss/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-store-id': storeId!,
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        throw new Error('提交报损记录失败');
      }

      const result = await response.json();
      if (result.success) {
        setLossItems([]);
        setGlobalReason('');
        setShowRegisterDialog(false);
        
        // 刷新数据
        handleRefresh();
      } else {
        throw new Error(result.message || '提交报损记录失败');
      }
    } catch (err) {
      console.error('提交报损记录失败:', err);
      setError(err instanceof Error ? err.message : '提交报损记录失败');
    } finally {
      setRegisterLoading(false);
    }
  };

  /**
   * 返回首页
   */
  const handleGoBack = () => {
    window.history.back();
  };

  /**
   * 获取报损类型标签
   */
  const getLossTypeLabel = (type: 'production' | 'tasting' | 'closing' | 'other') => {
    const typeMap = {
      production: '生产报损',
      tasting: '品尝报损',
      closing: '打烊报损',
      other: '其他报损',
    };
    return typeMap[type];
  };

  /**
   * 过滤后的面包类型
   */
  const filteredBreadTypes = breadTypes.filter(bread => 
    bread.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    bread.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * 计算报损项目总计
   */
  const totalQuantity = lossItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = lossItems.reduce((sum, item) => sum + item.totalValue, 0);

  /**
   * 处理报损类型选择
   */
  const handleTypeSelect = (type: LossType) => {
    setSelectedType(type);
  };

  /**
   * 跳转到报损登记页面
   */
  const handleNavigateToRegister = (type: LossType) => {
    const params = new URLSearchParams();
    if (storeId) params.set('store', storeId);
    params.set('type', type);
    window.location.href = `/mobileHome/loss-register?${params.toString()}`;
  };



  /**
   * 获取报损类型颜色
   */
  const getLossTypeColor = (type: string) => {
    const typeConfig = lossTypes.find(t => t.key === type);
    return typeConfig ? typeConfig.color : '#666';
  };

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      {/* 顶部导航栏 */}
      <AppBar position="sticky" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleGoBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            生产报损统计
          </Typography>
          <IconButton color="inherit" onClick={handleRefresh}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 时间周期选择 */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>统计周期</InputLabel>
            <Select
              value={periodType}
              label="统计周期"
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
            >
              <MenuItem value="daily">今日</MenuItem>
              <MenuItem value="weekly">本周</MenuItem>
              <MenuItem value="monthly">本月</MenuItem>
            </Select>
          </FormControl>
        </Paper>

        {/* 报损类型选择卡片 */}
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
          报损类型选择
        </Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {lossTypes.map((type) => (
            <Grid item xs={6} key={type.key}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  border: selectedType === type.key ? `2px solid ${type.color}` : '1px solid #e0e0e0',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 3,
                  },
                }}
                onClick={() => handleTypeSelect(type.key)}
              >
                <CardContent sx={{ textAlign: 'center', py: 2 }}>
                  <Box sx={{ color: type.color, mb: 1 }}>
                    {type.icon}
                  </Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {type.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {type.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ justifyContent: 'center', pt: 0 }}>
                  <Button 
                    size="small" 
                    variant="outlined"
                    sx={{ borderColor: type.color, color: type.color }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNavigateToRegister(type.key);
                    }}
                  >
                    立即登记
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* 统计概览 */}
        {stats && (
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 1, color: '#ff9800' }} />
              统计概览
              {selectedType !== 'all' && (
                <Chip 
                  label={getLossTypeLabel(selectedType)} 
                  size="small" 
                  sx={{ ml: 1, bgcolor: getLossTypeColor(selectedType), color: 'white' }}
                />
              )}
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
                    {stats.totalLoss}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总报损数量
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h4" color="error" sx={{ fontWeight: 'bold' }}>
                    ¥{stats.totalValue.toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总报损金额
                  </Typography>
                </Box>
              </Grid>
              {selectedType === 'all' && (
                <>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" sx={{ color: '#ff9800' }}>
                        {stats.productionLoss}
                      </Typography>
                      <Typography variant="caption">
                        生产报损
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" sx={{ color: '#4caf50' }}>
                        {stats.tastingLoss}
                      </Typography>
                      <Typography variant="caption">
                        品尝报损
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" sx={{ color: '#2196f3' }}>
                        {stats.closingLoss}
                      </Typography>
                      <Typography variant="caption">
                        打烊报损
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Box textAlign="center">
                      <Typography variant="h6" sx={{ color: '#9c27b0' }}>
                        {stats.otherLoss}
                      </Typography>
                      <Typography variant="caption">
                        其他报损
                      </Typography>
                    </Box>
                  </Grid>
                </>
              )}
            </Grid>
            {stats.lossRate > 0 && (
              <Box sx={{ mt: 2, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon sx={{ mr: 1, color: '#ff9800', fontSize: 16 }} />
                  报损率: {(stats.lossRate * 100).toFixed(2)}%
                </Typography>
              </Box>
            )}
          </Paper>
        )}

        {/* 最近报损记录 */}
        <Paper elevation={2} sx={{ mb: 2 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6">
              最近报损记录
            </Typography>
          </Box>
          {records.length > 0 ? (
            <List>
              {records.map((record, index) => (
                <React.Fragment key={record._id}>
                  <ListItem>
                    <ListItemIcon>
                      <Box 
                        sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%', 
                          bgcolor: getLossTypeColor(record.type) 
                        }} 
                      />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle2">
                            {record.breadName}
                          </Typography>
                          <Chip 
                            label={getLossTypeLabel(record.type)} 
                            size="small"
                            sx={{ 
                              bgcolor: getLossTypeColor(record.type), 
                              color: 'white',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            数量: {record.quantity} | 金额: ¥{record.totalValue.toFixed(2)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {format(new Date(record.date), 'MM-dd HH:mm', { locale: zhCN })}
                          </Typography>
                          {record.reason && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              原因: {record.reason}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < records.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                暂无报损记录
              </Typography>
            </Box>
          )}
        </Paper>

        {/* 快速操作按钮 */}
        <Paper elevation={2} sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            快速操作
          </Typography>
          <Grid container spacing={1}>
            {lossTypes.map((type) => (
              <Grid item xs={6} key={`quick-${type.key}`}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={type.icon}
                  sx={{ 
                    borderColor: type.color, 
                    color: type.color,
                    '&:hover': {
                      borderColor: type.color,
                      bgcolor: `${type.color}10`,
                    },
                  }}
                  onClick={() => handleNavigateToRegister(type.key)}
                >
                  {type.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>

      {/* 报损登记对话框 */}
      <Dialog
        open={showRegisterDialog}
        onClose={() => setShowRegisterDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          报损登记 - {getLossTypeLabel(registerLossType)}
        </DialogTitle>
        <DialogContent>
          {/* 报损类型选择 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>报损类型</InputLabel>
            <Select
              value={registerLossType}
              label="报损类型"
              onChange={(e) => setRegisterLossType(e.target.value as 'production' | 'tasting' | 'closing' | 'other')}
            >
              {lossTypes.map((type) => (
                <MenuItem key={type.key} value={type.key}>
                  {type.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 全局报损原因 */}
          <TextField
            fullWidth
            label="报损原因（可选）"
            value={globalReason}
            onChange={(e) => setGlobalReason(e.target.value)}
            sx={{ mb: 2 }}
            placeholder="输入报损原因，将应用到所有项目"
          />

          {/* 已添加的报损项目 */}
          {lossItems.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                报损项目列表
              </Typography>
              <List>
                {lossItems.map((item) => (
                  <ListItem key={item.breadId}>
                    <ListItemText
                      primary={item.breadName}
                      secondary={`单价: ¥${item.unitPrice} | 小计: ¥${item.totalValue.toFixed(2)}`}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.breadId, item.quantity - 1)}
                      >
                        <RemoveIcon />
                      </IconButton>
                      <Typography sx={{ minWidth: 20, textAlign: 'center' }}>
                        {item.quantity}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => handleUpdateQuantity(item.breadId, item.quantity + 1)}
                      >
                        <AddIcon />
                      </IconButton>
                    </Box>
                  </ListItem>
                ))}
              </List>
              <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="subtitle2">
                  总计: {lossItems.reduce((sum, item) => sum + item.quantity, 0)} 个 | 
                  ¥{lossItems.reduce((sum, item) => sum + item.totalValue, 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>
          )}

          {/* 添加面包按钮 */}
          <Button
            fullWidth
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowBreadSelector(true)}
            sx={{ mb: 2 }}
          >
            添加面包
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowRegisterDialog(false)}>
            取消
          </Button>
          <Button
            onClick={handleSubmitLoss}
            variant="contained"
            disabled={lossItems.length === 0 || registerLoading}
            startIcon={registerLoading ? <CircularProgress size={16} /> : <SaveIcon />}
          >
            {registerLoading ? '提交中...' : '提交报损'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 面包选择对话框 */}
      <Dialog
        open={showBreadSelector}
        onClose={() => setShowBreadSelector(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          选择面包
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="搜索面包..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
            sx={{ mb: 2 }}
          />
          <List>
             {filteredBreadTypes.map((bread) => (
               <ListItem
                 key={bread._id}
                 button
                 onClick={() => handleAddLossItem(bread)}
               >
                 <ListItemText
                   primary={bread.name}
                   secondary={`${bread.category} | ¥${bread.price}`}
                 />
                 <ListItemSecondaryAction>
                   <IconButton
                     edge="end"
                     onClick={() => handleAddLossItem(bread)}
                   >
                     <AddIcon />
                   </IconButton>
                 </ListItemSecondaryAction>
               </ListItem>
             ))}
             {filteredBreadTypes.length === 0 && (
               <Box sx={{ p: 2, textAlign: 'center' }}>
                 <Typography color="text.secondary">
                   {searchTerm ? '未找到匹配的面包类型' : '暂无面包类型数据'}
                 </Typography>
               </Box>
             )}
           </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowBreadSelector(false)}>
            关闭
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileProductionLossPage;