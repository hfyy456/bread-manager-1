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
} from '@mui/material';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
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

  LocalShipping as LocalShippingIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
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
  shipmentLoss: number;
  lossRate: number;
  totalValue: number;
  // 各类型金额统计
  productionValue: number;
  tastingValue: number;
  closingValue: number;
  otherValue: number;
  shipmentValue: number;
  totalLossValue: number;
}

interface LossRecord {
  _id: string;
  type: 'production' | 'tasting' | 'closing' | 'other' | 'shipment';
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



type LossType = 'production' | 'tasting' | 'closing' | 'other' | 'shipment' | 'all';

const MobileProductionLossPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<LossStats | null>(null);
  const [records, setRecords] = useState<LossRecord[]>([]);
  const [selectedType, setSelectedType] = useState<LossType>('all');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [dailyRecords, setDailyRecords] = useState<{[key: string]: LossRecord | null}>({});
  


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
    {
      key: 'shipment' as LossType,
      label: '出货记录',
      description: '产品销售出货记录',
      icon: <LocalShippingIcon />,
      color: '#795548',
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
   * 获取选定日期范围
   */
  const getDateRange = useCallback(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    return {
      startDate: dateStr,
      endDate: dateStr,
    };
  }, [selectedDate]);

  /**
   * 获取报损统计数据
   */
  const fetchLossStats = useCallback(async () => {
    if (!storeId) return;

    try {
      const { startDate, endDate } = getDateRange();
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
  }, [storeId, selectedType, getDateRange]);

  /**
   * 获取报损记录列表
   */
  const fetchLossRecords = useCallback(async () => {
    if (!storeId) return;

    try {
      const { startDate, endDate } = getDateRange();
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
  }, [storeId, selectedType, getDateRange]);



  /**
   * 获取或创建指定日期的报损记录
   */
  const fetchLossRecordByDate = useCallback(async (date: string, type: string) => {
    if (!storeId) return null;

    try {
      const response = await fetch(`/api/production-loss/by-date?date=${date}&type=${type}`, {
        headers: {
          'x-current-store-id': storeId,
        },
      });

      if (!response.ok) {
        throw new Error('获取报损记录失败');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || '获取报损记录失败');
      }
    } catch (err) {
      console.error('获取报损记录失败:', err);
      // 如果没有记录，返回空的记录模板
      return {
        storeId,
        date: new Date(date),
        type,
        items: [],
        totalQuantity: 0,
        totalValue: 0
      };
    }
  }, [storeId]);

  /**
   * 加载选定日期的所有报损记录
   */
  const loadDailyRecords = useCallback(async () => {
    if (!storeId) return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const records: {[key: string]: LossRecord | null} = {};
    
    // 为每个报损类型加载记录
    const lossTypeKeys = ['production', 'tasting', 'closing', 'other', 'shipment'];
    
    for (const type of lossTypeKeys) {
      try {
        const record = await fetchLossRecordByDate(dateStr, type);
        records[type] = record;
      } catch (err) {
        console.error(`加载${type}报损记录失败:`, err);
        records[type] = null;
      }
    }
    
    setDailyRecords(records);
  }, [storeId, selectedDate, fetchLossRecordByDate]);

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
          loadDailyRecords(),
        ]);
      } catch (err) {
        setError('数据加载失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    initData();
  }, [storeId, fetchLossStats, fetchLossRecords, loadDailyRecords]);

  /**
   * 当日期改变时，重新加载该日期的报损记录
   */
  useEffect(() => {
    if (storeId) {
      loadDailyRecords();
    }
  }, [selectedDate, loadDailyRecords, storeId]);



  /**
   * 刷新数据
   */
  const handleRefresh = async () => {
    await Promise.all([
      fetchLossStats(),
      fetchLossRecords(),
      loadDailyRecords(),
    ]);
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
  const getLossTypeLabel = (type: 'production' | 'tasting' | 'closing' | 'other' | 'shipment') => {
    const typeMap = {
      production: '生产报损',
      tasting: '品尝报损',
      closing: '打烊报损',
      other: '其他报损',
      shipment: '出货记录',
    };
    return typeMap[type];
  };



  /**
   * 处理报损类型选择
   */
  const handleTypeSelect = (type: LossType) => {
    setSelectedType(type);
  };

  /**
   * 跳转到报损登记页面
   */
  const handleNavigateToRegister = async (type: LossType) => {
    if (type === 'all') return;
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // 先尝试获取或创建该日期的报损记录
    try {
      await fetchLossRecordByDate(dateStr, type);
    } catch (err) {
      console.error('获取报损记录失败:', err);
    }
    
    const params = new URLSearchParams();
    if (storeId) params.set('store', storeId);
    params.set('type', type);
    params.set('date', dateStr);
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

        {/* 日期选择器 */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            选择日期
          </Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
            <DatePicker
              label="报损日期"
              value={selectedDate}
              onChange={(newValue) => {
                if (newValue) {
                  setSelectedDate(newValue);
                }
              }}
              slotProps={{
                textField: {
                  fullWidth: true,
                  variant: 'outlined',
                  size: 'medium'
                }
              }}
            />
          </LocalizationProvider>
        </Paper>

        {/* 快速操作按钮 */}
        <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
            快速操作
          </Typography>
          <Grid container spacing={1}>
            {/* 出货记录 - 占据第一行整行 */}
            {lossTypes.filter(type => type.key === 'shipment').map((type) => (
              <Grid item xs={12} key={`quick-${type.key}`}>
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
            {/* 其他操作 - 2x2布局 */}
            {lossTypes.filter(type => type.key !== 'shipment').map((type) => (
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

        {/* 统计概览 */}
        {stats && (
          <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
              <TrendingUpIcon sx={{ mr: 1, color: '#ff9800' }} />
              今日统计概览
              {selectedType !== 'all' && (
                <Chip 
                  label={getLossTypeLabel(selectedType)} 
                  size="small" 
                  sx={{ ml: 1, bgcolor: getLossTypeColor(selectedType), color: 'white' }}
                />
              )}
            </Typography>
            
            {/* 总金额显示 */}
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h5" color="error" sx={{ fontWeight: 'bold' }}>
                    ¥{(stats.totalLossValue || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    总报损金额
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box textAlign="center">
                  <Typography variant="h5" color="primary" sx={{ fontWeight: 'bold' }}>
                    ¥{(stats.shipmentValue || 0).toFixed(2)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    出货金额
                  </Typography>
                </Box>
              </Grid>
            </Grid>
            
            {/* 各类型金额明细 */}
            <Grid container spacing={1} sx={{ mb: 2 }}>
              {stats.productionValue > 0 && (
                <Grid item xs={6}>
                  <Box sx={{ p: 1, bgcolor: '#fff3e0', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="body2" color="#ff9800" sx={{ fontWeight: 'bold' }}>
                      ¥{stats.productionValue.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      生产报损
                    </Typography>
                  </Box>
                </Grid>
              )}
              {stats.tastingValue > 0 && (
                <Grid item xs={6}>
                  <Box sx={{ p: 1, bgcolor: '#e8f5e8', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="body2" color="#4caf50" sx={{ fontWeight: 'bold' }}>
                      ¥{stats.tastingValue.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      品尝报损
                    </Typography>
                  </Box>
                </Grid>
              )}
              {stats.closingValue > 0 && (
                <Grid item xs={6}>
                  <Box sx={{ p: 1, bgcolor: '#e3f2fd', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="body2" color="#2196f3" sx={{ fontWeight: 'bold' }}>
                      ¥{stats.closingValue.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      打烊报损
                    </Typography>
                  </Box>
                </Grid>
              )}
              {stats.otherValue > 0 && (
                <Grid item xs={6}>
                  <Box sx={{ p: 1, bgcolor: '#f3e5f5', borderRadius: 1, textAlign: 'center' }}>
                    <Typography variant="body2" color="#9c27b0" sx={{ fontWeight: 'bold' }}>
                      ¥{stats.otherValue.toFixed(2)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      其他报损
                    </Typography>
                  </Box>
                </Grid>
              )}
            </Grid>
            
            {/* 报损率显示 */}
            {stats.shipmentValue > 0 && stats.lossRate > 0 && (
              <Box sx={{ mt: 2, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                  <WarningIcon sx={{ mr: 1, color: '#ff9800', fontSize: 16 }} />
                  报损率: {(stats.lossRate * 100).toFixed(2)}% (报损金额/出货金额)
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
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                              {record.breadName}
                            </Typography>
                            <Chip 
                              label={getLossTypeLabel(record.type)} 
                              size="small"
                              sx={{ 
                                bgcolor: getLossTypeColor(record.type), 
                                color: 'white',
                                fontSize: '0.65rem',
                                height: '20px',
                                minWidth: 'auto'
                              }}
                            />
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 'bold' }}>
                              ¥{record.totalValue.toFixed(2)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                              {format(new Date(record.date), 'MM-dd HH:mm', { locale: zhCN })}
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondary={record.reason ? (
                        <Typography variant="caption" color="text.secondary" sx={{ 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          fontSize: '0.7rem',
                          mt: 0.5
                        }}>
                          原因: {record.reason}
                        </Typography>
                      ) : null}
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


      </Container>


    </Box>
  );
};

export default MobileProductionLossPage;