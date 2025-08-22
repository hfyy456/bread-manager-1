import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';
import {
  ArrowBack as ArrowBackIcon,
  Save as SaveIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';

/**
 * 支出类型
 */
type ExpenseType = '杂费' | '工资' | '易耗品' | '鸡蛋' | '水果净菜' | '大货' | '运费' | '水电' | '租金' | '市场推广';

/**
 * 移动端支出申报页面
 * 提供专门的支出申报功能
 */
const MobileExpenseRegisterPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [expenseType, setExpenseType] = useState<ExpenseType>('杂费');

  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // 支出申报相关状态
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // 飞书认证
  const { user, loading: userLoading, error: userError, isFeishuEnv, checkingEnv } = useFeishuAuth();

  /**
   * 支出类型配置
   */
  const expenseTypeConfig = {
    '杂费': { label: '杂费', color: '#ff9800', description: '日常杂项费用' },
    '工资': { label: '工资', color: '#4caf50', description: '员工工资支出' },
    '易耗品': { label: '易耗品', color: '#2196f3', description: '消耗性用品费用' },
    '鸡蛋': { label: '鸡蛋', color: '#ffeb3b', description: '鸡蛋采购费用' },
    '水果净菜': { label: '水果净菜', color: '#8bc34a', description: '水果净菜采购费用' },
    '大货': { label: '大货', color: '#ff5722', description: '大宗商品采购费用' },
    '运费': { label: '运费', color: '#607d8b', description: '运输配送费用' },
    '水电': { label: '水电', color: '#03a9f4', description: '水电费支出' },
    '租金': { label: '租金', color: '#9c27b0', description: '房租及场地费用' },
    '市场推广': { label: '市场推广', color: '#e91e63', description: '市场营销推广费用' },
  };

  /**
   * 获取URL参数
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStoreId = urlParams.get('store');
    const urlType = urlParams.get('type') as ExpenseType;
    const urlDate = urlParams.get('date');
    
    // 获取门店ID
    const lockedStoreId = sessionStorage.getItem('lockedStoreId');
    const defaultStoreId = localStorage.getItem('defaultStoreId');
    const currentStoreId = urlStoreId || lockedStoreId || defaultStoreId;
    
    setStoreId(currentStoreId);
    
    // 设置支出类型
    if (urlType && ['杂费', '工资', '易耗品', '鸡蛋', '水果净菜', '大货', '运费', '水电', '租金'].includes(urlType)) {
      setExpenseType(urlType);
    }
    
    // 设置选择的日期
    if (urlDate) {
      setSelectedDate(urlDate);
    } else {
      // 如果没有传入日期，使用当前日期
      const today = new Date().toISOString().split('T')[0];
      setSelectedDate(today);
    }
  }, []);

  /**
   * 验证表单数据
   */
  const validateForm = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('请输入有效的支出金额');
      return false;
    }
    
    if (!description.trim()) {
      setError('请输入支出描述');
      return false;
    }
    
    if (!storeId) {
      setError('门店信息缺失，请重新登录');
      return false;
    }
    
    return true;
  };

  /**
   * 提交支出申报
   */
  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const expenseData = {
        storeId,
        date: selectedDate,
        type: expenseType,
        amount: parseFloat(amount),
        description: description.trim(),
        notes: notes.trim(),
        operatedBy: user?.name || '未知用户',
      };

      const response = await fetch('/api/expense/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '提交支出申报失败');
      }

      if (result.success) {
        setSuccess('支出申报提交成功！');
        // 清空表单
        setAmount('');
        setDescription('');
        setNotes('');
        
        // 3秒后跳转回统计页面
        setTimeout(() => {
          window.history.back();
        }, 2000);
      } else {
        throw new Error(result.message || '提交支出申报失败');
      }
    } catch (err) {
      console.error('提交支出申报失败:', err);
      setError(err instanceof Error ? err.message : '提交支出申报失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 返回上一页
   */
  const handleBack = () => {
    window.history.back();
  };

  // 加载状态
  if (checkingEnv || userLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
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
          <AttachMoneyIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            支出申报
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

        {/* 支出申报表单 */}
        <Paper elevation={2} sx={{ p: 3, mb: 2 }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AttachMoneyIcon sx={{ mr: 1, color: '#1976d2' }} />
            支出申报信息
          </Typography>

          <Grid container spacing={3}>
            {/* 日期选择 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="申报日期"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
                required
              />
            </Grid>

            {/* 支出类型 */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>支出类型</InputLabel>
                <Select
                  value={expenseType}
                  label="支出类型"
                  onChange={(e) => setExpenseType(e.target.value as ExpenseType)}
                >
                  {Object.entries(expenseTypeConfig).map(([key, config]) => (
                    <MenuItem key={key} value={key}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip
                          size="small"
                          label={config.label}
                          sx={{ bgcolor: config.color, color: 'white' }}
                        />
                        <Typography variant="body2" color="text.secondary">
                          {config.description}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* 支出金额 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="支出金额"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                InputProps={{
                  startAdornment: <Typography sx={{ mr: 1, color: 'text.secondary' }}>¥</Typography>,
                }}
                inputProps={{
                  min: 0,
                  step: 0.01,
                }}
                required
                helperText="请输入支出金额（元）"
              />
            </Grid>

            {/* 支出描述 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="支出描述"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                multiline
                rows={2}
                required
                helperText="请简要描述支出用途"
              />
            </Grid>





            {/* 备注 */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="备注"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
          disabled={submitting || !amount || !description}
          startIcon={submitting ? <CircularProgress size={20} /> : <SaveIcon />}
          sx={{
            py: 1.5,
            bgcolor: '#1976d2',
            '&:hover': {
              bgcolor: '#1565c0',
            },
          }}
        >
          {submitting ? '提交中...' : '提交支出申报'}
        </Button>
      </Container>
    </Box>
  );
};

export default MobileExpenseRegisterPage;