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
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

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
  notes?: string; // 备注
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
    date: new Date().toISOString().split('T')[0],
    actualRevenue: 0,
    totalRevenue: 0,
    avgOrderValue: 0,
    orderCount: 0,
    meituanRevenue: 0,
    douyinRevenue: 0,
    cashRevenue: 0,
    cardRevenue: 0,
    notes: '',
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
   * 表单验证
   */
  const validateForm = (): boolean => {
    if (!revenueData.date) {
      setError('请选择日期');
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
      setSuccess('营业数据提交成功！');
      
      // 清空表单
      setRevenueData({
        date: new Date().toISOString().split('T')[0],
        actualRevenue: 0,
        totalRevenue: 0,
        avgOrderValue: 0,
        orderCount: 0,
        meituanRevenue: 0,
        douyinRevenue: 0,
        cashRevenue: 0,
        cardRevenue: 0,
        notes: '',
      });
      
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
    setRevenueData(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // 自动计算客单价
    if (field === 'totalRevenue' || field === 'orderCount') {
      const newData = { ...revenueData, [field]: value };
      if (newData.orderCount > 0) {
        const avgOrderValue = Number((newData.totalRevenue / newData.orderCount).toFixed(2));
        setRevenueData(prev => ({ ...prev, [field]: value, avgOrderValue }));
      }
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
    <Box sx={{ flexGrow: 1, bgcolor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部导航栏 */}
      <AppBar position="static" sx={{ bgcolor: '#1976d2' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <TrendingUpIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            营业数据登记
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="sm" sx={{ py: 2 }}>
        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* 成功提示 */}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
            {success}
          </Alert>
        )}

        {/* 营业数据登记表单 */}
        <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <TrendingUpIcon sx={{ mr: 1, color: '#1976d2' }} />
            营业数据信息
          </Typography>

          <Grid container spacing={3}>
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
                required
              />
            </Grid>

            {/* 实收 */}
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="实收"
                type="number"
                value={revenueData.actualRevenue}
                onChange={(e) => updateRevenueData('actualRevenue', parseFloat(e.target.value) || 0)}
                InputProps={{
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                required
                helperText="实际收到的金额"
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
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                required
                helperText="总营业额"
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
                inputProps={{
                  min: 0,
                  step: 1,
                }}
                required
                helperText="总订单数量"
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
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                  readOnly: true,
                }}
                helperText="自动计算"
                sx={{
                  '& .MuiInputBase-input': {
                    bgcolor: '#f5f5f5',
                  },
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  收入明细
                </Typography>
              </Divider>
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
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                helperText="美团平台收入"
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
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                helperText="抖音平台收入"
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
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                helperText="现金收入"
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
                  startAdornment: <InputAdornment position="start">¥</InputAdornment>,
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                helperText="银行卡收入"
              />
            </Grid>

            {/* 备注 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="备注"
                value={revenueData.notes}
                onChange={(e) => updateRevenueData('notes', e.target.value)}
                multiline
                rows={3}
                helperText="可选，补充说明信息"
              />
            </Grid>

            {/* 提交人信息 */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="text.secondary">
                提交人：{user?.name || '未知用户'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                提交时间：{new Date().toLocaleString('zh-CN')}
              </Typography>
            </Grid>
          </Grid>
        </Paper>

        {/* 提交按钮 */}
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={submitting || !revenueData.date}
          startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{
            py: 1.5,
            bgcolor: '#1976d2',
            '&:hover': {
              bgcolor: '#1565c0',
            },
          }}
        >
          {submitting ? '提交中...' : '提交营业数据'}
        </Button>
      </Container>
    </Box>
  );
};

export default MobileRevenueRegisterPage;