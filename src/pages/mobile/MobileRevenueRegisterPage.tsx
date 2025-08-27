import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Paper,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Grid,
  Divider,
  InputAdornment,
  Card,
  CardContent,
  Chip,
  Stack,
  Fade,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';
import { formatUTCToLocal, localDateToUTC, formatDate, DATE_FORMATS } from '../../utils/dateUtils';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  People as PeopleIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  AccountBalance as BankIcon,
  QrCode as QrCodeIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';

/**
 * 营业数据日期范围配置
 */
const REVENUE_DATE_CONFIG = {
  // 最多可选择多少天前的日期
  MAX_DAYS_BACK: 90,
  // 是否允许选择未来日期
  ALLOW_FUTURE_DATES: true
};

/**
 * 获取营业数据可选日期范围
 */
const getRevenueDateRange = () => {
  const today = new Date();
  const minDate = new Date(Date.now() - REVENUE_DATE_CONFIG.MAX_DAYS_BACK * 24 * 60 * 60 * 1000);
  const maxDate = REVENUE_DATE_CONFIG.ALLOW_FUTURE_DATES ? 
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : today;
  
  // 使用本地时间格式化日期
  const formatLocalDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  return {
    min: formatLocalDate(minDate),
    max: formatLocalDate(maxDate),
    minDate,
    maxDate
  };
};

/**
 * 验证日期是否在允许范围内
 */
const validateDateRange = (dateString: string): { isValid: boolean; error?: string } => {
  if (!dateString) {
    return { isValid: false, error: '请选择日期' };
  }
  
  const selectedDate = new Date(dateString);
  const { minDate, maxDate } = getRevenueDateRange();
  
  if (selectedDate > maxDate) {
    return { isValid: false, error: REVENUE_DATE_CONFIG.ALLOW_FUTURE_DATES ? '不能选择超过30天后的日期' : '不能选择未来日期' };
  }
  
  if (selectedDate < minDate) {
    return { isValid: false, error: `只能选择最近${REVENUE_DATE_CONFIG.MAX_DAYS_BACK}天内的日期` };
  }
  
  return { isValid: true };
};

/**
 * 营业数据类型
 */
interface RevenueData {
  date: string;
  actualRevenue: number; // 实收
  totalRevenue: number; // 营业额
  avgOrderValue: number; // 客单价
  orderCount: number; // 客单数
  meituanRevenue: number; // 美团团购
  douyinRevenue: number; // 抖音团购
  cashRevenue: number; // 现金
  cardRevenue: number; // 银行卡
  wechatRevenue: number; // 微信支付
  alipayRevenue: number; // 支付宝
}

/**
 * 移动端营业数据登记页面
 * 提供每日营业数据录入功能
 */
const MobileRevenueRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // 营业数据状态
  const [revenueData, setRevenueData] = useState<RevenueData>({
    date: (() => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })(),
    actualRevenue: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    orderCount: 0,
    meituanRevenue: 0,
    douyinRevenue: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    wechatRevenue: 0,
    alipayRevenue: 0,
  });
  
  // 飞书认证
  const { user, loading: userLoading, error: userError, isFeishuEnv, checkingEnv } = useFeishuAuth();

  /**
   * 获取URL参数和初始化
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStoreId = urlParams.get('store');
    const urlDate = urlParams.get('date');
    
    // 获取门店ID
    const lockedStoreId = sessionStorage.getItem('lockedStoreId');
    const defaultStoreId = localStorage.getItem('defaultStoreId');
    const currentStoreId = urlStoreId || lockedStoreId || defaultStoreId;
    
    setStoreId(currentStoreId);
    
    // 设置选择的日期
    if (urlDate) {
      setRevenueData(prev => ({ ...prev, date: urlDate }));
    }
  }, []);

  /**
   * 获取当天已有的营业数据
   */
  const fetchExistingRevenueData = async (storeId: string, date: string): Promise<void> => {
    if (!storeId || !date) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/revenue/store/${storeId}/date/${date}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          // 将获取到的数据填充到表单中
          const existingData = result.data;
          const meituanRevenue = existingData.meituanRevenue || 0;
          const douyinRevenue = existingData.douyinRevenue || 0;
          const cashRevenue = existingData.cashRevenue || 0;
          const cardRevenue = existingData.cardRevenue || 0;
          const wechatRevenue = existingData.wechatRevenue || 0;
          const alipayRevenue = existingData.alipayRevenue || 0;
          
          // 自动计算实收金额
          const calculatedActualRevenue = meituanRevenue + douyinRevenue + cashRevenue + cardRevenue + wechatRevenue + alipayRevenue;
          
          setRevenueData({
            date: formatUTCToLocal(existingData.date, DATE_FORMATS.DATE), // 使用UTC到本地时间转换
            actualRevenue: calculatedActualRevenue,
            totalRevenue: existingData.totalRevenue || 0,
            avgOrderValue: existingData.avgOrderValue || 0,
            orderCount: existingData.orderCount || 0,
            meituanRevenue,
            douyinRevenue,
            cashRevenue,
            cardRevenue,
            wechatRevenue,
            alipayRevenue,
    
          });
          
          // 显示提示信息
          setSuccess('已加载当天已有的营业数据，可以进行修改后重新提交');
        }
      } else if (response.status === 404) {
        // 当天没有数据，这是正常情况
        console.log('当天暂无营业数据');
      } else {
        console.error('获取营业数据失败:', response.statusText);
      }
    } catch (err) {
      console.error('获取营业数据失败:', err);
      // 不显示错误，因为没有数据是正常情况
    } finally {
      setLoading(false);
    }
  };

  /**
   * 当门店ID和日期都确定后，获取当天已有的营业数据
   */
  useEffect(() => {
    if (storeId && revenueData.date) {
      fetchExistingRevenueData(storeId, revenueData.date);
    }
  }, [storeId, revenueData.date]);

  /**
   * 表单验证
   */
  const validateForm = (): boolean => {
    // 验证日期范围
    const dateValidation = validateDateRange(revenueData.date);
    if (!dateValidation.isValid) {
      setError(dateValidation.error || '日期验证失败');
      return false;
    }
    
    if (revenueData.actualRevenue < 0 || revenueData.totalRevenue < 0) {
      setError('金额不能为负数');
      return false;
    }
    
    if (revenueData.orderCount < 0) {
      setError('客单数不能为负数');
      return false;
    }
    
    // 验证各项收入之和是否合理
    const totalCalculated = revenueData.meituanRevenue + revenueData.douyinRevenue + revenueData.cashRevenue + revenueData.cardRevenue;
    if (totalCalculated > revenueData.totalRevenue * 1.1) { // 允许10%的误差
      setError('各项收入之和不应超过总营业额');
      return false;
    }
    
    return true;
  };

  /**
   * 提交营业数据
   */
  const handleSubmit = async (): Promise<void> => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        ...revenueData,
        date: localDateToUTC(revenueData.date).toISOString(), // 将本地日期转换为UTC时间
        storeId,
        submittedBy: user?.name || '未知用户',
        submittedAt: new Date().toISOString(),
      };

      const response = await fetch('/api/revenue/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '提交失败');
      }

      const result = await response.json();
      
      // 根据是否为更新操作显示不同的成功消息
      if (result.data && result.data.isUpdate) {
        setSuccess('营业数据更新成功！');
        // 更新操作不清空表单，保持当前数据
      } else {
        setSuccess('营业数据提交成功！');
        // 新增操作清空表单
        setRevenueData({
          date: (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })(),
          actualRevenue: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          orderCount: 0,
          meituanRevenue: 0,
          douyinRevenue: 0,
          cashRevenue: 0,
          cardRevenue: 0,
          wechatRevenue: 0,
          alipayRevenue: 0,
        });
      }
      
      // 3秒后跳转回首页
      setTimeout(() => {
        navigate('/mobileHome');
      }, 3000);
      
    } catch (err) {
      console.error('提交营业数据失败:', err);
      setError(err instanceof Error ? err.message : '提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 返回上一页
   */
  const handleBack = (): void => {
    navigate(-1);
  };

  /**
   * 更新表单数据
   */
  const updateRevenueData = (field: keyof RevenueData, value: string | number): void => {
    setRevenueData(prev => {
      const newData = { ...prev, [field]: value };
      
      // 如果更新的是日期字段，进行实时验证
      if (field === 'date') {
        const dateValidation = validateDateRange(value as string);
        if (!dateValidation.isValid) {
          setError(dateValidation.error || '日期验证失败');
        } else {
          // 清除之前的日期相关错误
          if (error && (error.includes('日期') || error.includes('未来') || error.includes('天内'))) {
            setError('');
          }
        }
      }
      
      // 自动计算客单价
      if (field === 'totalRevenue' || field === 'orderCount') {
        if (newData.orderCount > 0) {
          newData.avgOrderValue = parseFloat((newData.totalRevenue / newData.orderCount).toFixed(2));
        } else {
          newData.avgOrderValue = 0;
        }
      }
      
      // 自动计算实收金额（所有收入明细相加）
      if (['meituanRevenue', 'douyinRevenue', 'cashRevenue', 'cardRevenue', 'wechatRevenue', 'alipayRevenue'].includes(field)) {
        newData.actualRevenue = newData.meituanRevenue + newData.douyinRevenue + newData.cashRevenue + newData.cardRevenue + newData.wechatRevenue + newData.alipayRevenue;
      }
      
      return newData;
    });
    
    // 当日期改变时，清空成功消息并重新获取该日期的数据
    if (field === 'date' && storeId) {
      setSuccess('');
      // 延迟一下再获取数据，确保状态已更新
      setTimeout(() => {
        fetchExistingRevenueData(storeId, value as string);
      }, 100);
    }
  };

  // 加载状态
  if (userLoading || checkingEnv) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // 用户认证错误
  if (userError) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{userError}</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      flexGrow: 1, 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      minHeight: '100vh' 
    }}>
      {/* 顶部导航栏 */}
      <AppBar 
        position="static" 
        elevation={0}
        sx={{ 
          background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
      >
        <Toolbar sx={{ py: 1 }}>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            sx={{ 
              mr: 2,
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <TrendingUpIcon sx={{ mr: 1, fontSize: 28 }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontWeight: 600,
              letterSpacing: '0.5px'
            }}
          >
            营业数据登记
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 3, px: 2 }}>
        {/* 错误提示 */}
        <Fade in={!!error}>
          <Box>
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(244, 67, 54, 0.15)'
                }} 
                onClose={() => setError('')}
              >
                {error}
              </Alert>
            )}
          </Box>
        </Fade>

        {/* 成功提示 */}
        <Fade in={!!success}>
          <Box>
            {success && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 2,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(76, 175, 80, 0.15)'
                }} 
                onClose={() => setSuccess('')}
              >
                {success}
              </Alert>
            )}
          </Box>
        </Fade>

        {/* 营业数据登记表单 */}
        <Card 
            elevation={8}
            sx={{ 
              borderRadius: 3,
              background: 'linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
              mb: 2,
              overflow: 'visible'
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 4 }}>
                <Box 
                  sx={{ 
                    p: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white'
                  }}
                >
                  <TrendingUpIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography 
                  variant="h5" 
                  sx={{ 
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  营业数据信息
                </Typography>
              </Stack>

              <Grid container spacing={3}>
                {/* 基本信息 - 需要填写 */}
                <Grid item xs={12}>
                  <Card 
                    sx={{ 
                      background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
                      border: '1px solid #2196f3',
                      borderRadius: 2,
                      mb: 2
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <MoneyIcon sx={{ color: '#1976d2', fontSize: 20 }} />
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#1976d2'
                          }}
                        >
                          需要填写的信息
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 日期选择 */}
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="营业日期"
                    type="date"
                    value={revenueData.date}
                    onChange={(e) => updateRevenueData('date', e.target.value)}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <CalendarIcon sx={{ color: '#1976d2' }} />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      // 使用配置化的日期范围
                      ...(() => {
                        const { min, max } = getRevenueDateRange();
                        return { min, max };
                      })()
                    }}
                    required
                    helperText={`可选择最近${REVENUE_DATE_CONFIG.MAX_DAYS_BACK}天内的日期`}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#1976d2',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1976d2',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 营业额 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="营业额"
                    type="number"
                    value={revenueData.totalRevenue}
                    onChange={(e) => updateRevenueData('totalRevenue', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <ReceiptIcon sx={{ color: '#4caf50', fontSize: 20 }} />
                            <Typography sx={{ color: '#4caf50', fontWeight: 600 }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    required
                    helperText="总营业额"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#4caf50',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#4caf50',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 客单数 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="客单数"
                    type="number"
                    value={revenueData.orderCount}
                    onChange={(e) => updateRevenueData('orderCount', parseInt(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <PeopleIcon sx={{ color: '#ff9800', fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 1,
                    }}
                    required
                    helperText="总订单数量"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#ff9800',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ff9800',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 收入明细分组 */}
                <Grid item xs={12}>
                  <Card 
                    sx={{ 
                      background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)',
                      border: '1px solid #ff9800',
                      borderRadius: 2,
                      mb: 2,
                      mt: 2
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PaymentIcon sx={{ color: '#f57c00', fontSize: 20 }} />
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#f57c00'
                          }}
                        >
                          收入明细
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 美团团购 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="美团团购"
                    type="number"
                    value={revenueData.meituanRevenue}
                    onChange={(e) => updateRevenueData('meituanRevenue', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <ReceiptIcon sx={{ color: '#ffb300', fontSize: 18 }} />
                            <Typography sx={{ color: '#ffb300', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    helperText="美团平台收入"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#ffb300',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#ffb300',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 抖音团购 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="抖音团购"
                    type="number"
                    value={revenueData.douyinRevenue}
                    onChange={(e) => updateRevenueData('douyinRevenue', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <ReceiptIcon sx={{ color: '#e91e63', fontSize: 18 }} />
                            <Typography sx={{ color: '#e91e63', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    helperText="抖音平台收入"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#e91e63',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#e91e63',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 现金 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="现金"
                    type="number"
                    value={revenueData.cashRevenue}
                    onChange={(e) => updateRevenueData('cashRevenue', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <MoneyIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                            <Typography sx={{ color: '#4caf50', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    helperText="现金收入"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#4caf50',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#4caf50',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 银行卡 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="银行卡"
                    type="number"
                    value={revenueData.cardRevenue}
                    onChange={(e) => updateRevenueData('cardRevenue', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <BankIcon sx={{ color: '#2196f3', fontSize: 18 }} />
                            <Typography sx={{ color: '#2196f3', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    helperText="银行卡收入"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#2196f3',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#2196f3',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 微信支付 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="微信支付"
                    type="number"
                    value={revenueData.wechatRevenue}
                    onChange={(e) => updateRevenueData('wechatRevenue', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <QrCodeIcon sx={{ color: '#4caf50', fontSize: 18 }} />
                            <Typography sx={{ color: '#4caf50', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    helperText="微信支付收入"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#4caf50',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#4caf50',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 支付宝 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="支付宝"
                    type="number"
                    value={revenueData.alipayRevenue}
                    onChange={(e) => updateRevenueData('alipayRevenue', parseFloat(e.target.value) || 0)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <QrCodeIcon sx={{ color: '#1976d2', fontSize: 18 }} />
                            <Typography sx={{ color: '#1976d2', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                    }}
                    inputProps={{
                      min: 0,
                      step: 0.01,
                    }}
                    helperText="支付宝收入"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#1976d2',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1976d2',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 自动计算分组 */}
                <Grid item xs={12}>
                  <Card 
                    sx={{ 
                      background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
                      border: '1px solid #4caf50',
                      borderRadius: 2,
                      mb: 2,
                      mt: 2
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <CalculateIcon sx={{ color: '#2e7d32', fontSize: 20 }} />
                        <Typography 
                          variant="subtitle1" 
                          sx={{ 
                            fontWeight: 600,
                            color: '#2e7d32'
                          }}
                        >
                          自动计算
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                {/* 实收 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="实收"
                    type="number"
                    value={revenueData.actualRevenue}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <CalculateIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                            <Typography sx={{ color: '#2e7d32', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                    helperText="收入明细总和"
                    sx={{
                      '& .MuiInputBase-input': {
                        bgcolor: '#e8f5e8',
                        color: '#2e7d32',
                        fontWeight: 'bold',
                      },
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: '#4caf50',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 客单价 */}
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="客单价"
                    type="number"
                    value={revenueData.avgOrderValue}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Stack direction="row" alignItems="center" spacing={0.5}>
                            <CalculateIcon sx={{ color: '#2e7d32', fontSize: 18 }} />
                            <Typography sx={{ color: '#2e7d32', fontSize: '0.875rem' }}>¥</Typography>
                          </Stack>
                        </InputAdornment>
                      ),
                      readOnly: true,
                    }}
                    helperText="营业额 ÷ 客单数"
                    sx={{
                      '& .MuiInputBase-input': {
                        bgcolor: '#e8f5e8',
                        color: '#2e7d32',
                        fontWeight: 'bold',
                      },
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '& fieldset': {
                          borderColor: '#4caf50',
                          borderWidth: 2,
                        }
                      }
                    }}
                  />
                </Grid>

                {/* 提交人信息 */}
                <Grid item xs={12}>
                  <Card 
                    sx={{ 
                      background: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
                      border: '1px solid #9c27b0',
                      borderRadius: 2,
                      mt: 2
                    }}
                  >
                    <CardContent sx={{ py: 2 }}>
                      <Stack spacing={1}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#6a1b9a',
                            fontWeight: 500
                          }}
                        >
                          📝 提交人：{user?.name || '未知用户'}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#6a1b9a',
                            fontWeight: 500
                          }}
                        >
                          🕒 提交时间：{new Date().toLocaleString('zh-CN')}
                        </Typography>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

        {/* 提交按钮 */}
        <Button
            fullWidth
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={submitting || !revenueData.date}
            startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
            sx={{
              py: 2,
              mt: 3,
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
            {submitting ? '提交中...' : '💾 提交营业数据'}
          </Button>
      </Container>
    </Box>
  );
};

export default MobileRevenueRegisterPage;