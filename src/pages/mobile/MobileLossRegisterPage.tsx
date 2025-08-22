import React, { useState, useEffect, useCallback } from 'react';
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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Divider,
} from '@mui/material';
import QuantityInput from '../../components/QuantityInput';
import { useFeishuAuth } from '../../hooks/useFeishuAuth';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

/**
 * 报损项目接口
 */
interface LossItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalValue: number;
  reason: string;
}

/**
 * 产品类型接口
 */
interface Product {
  _id: string;
  name: string;
  price: number;
  unit: string;
  category?: string;
}

/**
 * 报损类型
 */
type LossType = 'production' | 'tasting' | 'closing' | 'other' | 'shipment';

/**
 * 移动端报损登记页面
 * 提供专门的报损登记功能
 */
const MobileLossRegisterPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [storeId, setStoreId] = useState<string | null>(null);
  const [lossType, setLossType] = useState<LossType>('production');
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // 产品相关状态
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showProductSelector, setShowProductSelector] = useState<boolean>(false);
  const [globalReason, setGlobalReason] = useState<string>('');
  
  // 报损项目相关状态
  const [lossItems, setLossItems] = useState<LossItem[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  
  // 飞书认证
  const { user, loading: userLoading, error: userError, isFeishuEnv, checkingEnv } = useFeishuAuth();

  /**
   * 报损类型配置
   */
  const lossTypeConfig = {
    production: { label: '生产报损', color: '#ff9800' },
    tasting: { label: '品尝报损', color: '#4caf50' },
    closing: { label: '打烊报损', color: '#2196f3' },
    other: { label: '其他报损', color: '#9c27b0' },
    shipment: { label: '出货记录', color: '#795548' },
  };

  /**
   * 获取URL参数
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStoreId = urlParams.get('store');
    const urlType = urlParams.get('type') as LossType;
    const urlDate = urlParams.get('date');
    
    // 获取门店ID
    const lockedStoreId = sessionStorage.getItem('lockedStoreId');
    const defaultStoreId = localStorage.getItem('defaultStoreId');
    const currentStoreId = urlStoreId || lockedStoreId || defaultStoreId;
    
    setStoreId(currentStoreId);
    
    // 设置报损类型
    if (urlType && ['production', 'tasting', 'closing', 'other', 'shipment'].includes(urlType)) {
      setLossType(urlType);
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
   * 获取现有报损记录
   */
  const fetchExistingRecord = useCallback(async () => {
    if (!storeId || !selectedDate || !lossType) return null;

    try {
      const response = await fetch(`/api/production-loss/by-date?storeId=${storeId}&date=${selectedDate}&type=${lossType}`);
      
      if (!response.ok) {
        throw new Error('获取现有报损记录失败');
      }

      const result = await response.json();
      if (result.success && result.data) {
        return result.data;
      }
      return null;
    } catch (err) {
      console.error('获取现有报损记录失败:', err);
      return null;
    }
  }, [storeId, selectedDate, lossType]);

  /**
   * 获取门店产品列表
   */
  const fetchProducts = useCallback(async () => {
    if (!storeId) return;

    try {
      setLoading(true);
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
        const productList = result.data || [];
        setProducts(productList);
        
        // 初始化所有产品的报损项目，默认数量为0
        const initialLossItems: LossItem[] = productList.map((product: Product) => ({
          productId: product._id,
          productName: product.name,
          quantity: 0,
          unit: product.unit || '个',
          unitPrice: product.price || 0,
          totalValue: 0,
          reason: '',
        }));
        
        // 尝试获取现有报损记录
        const existingRecord = await fetchExistingRecord();
        if (existingRecord && existingRecord.items && existingRecord.items.length > 0) {
          // 将现有记录数据填充到对应产品中
          const updatedLossItems = initialLossItems.map(item => {
            const existingItem = existingRecord.items.find((existing: any) => existing.productId === item.productId);
            if (existingItem) {
              return {
                ...item,
                quantity: existingItem.quantity || 0,
                totalValue: (existingItem.quantity || 0) * item.unitPrice,
                reason: existingItem.reason || '',
              };
            }
            return item;
          });
          setLossItems(updatedLossItems);
        } else {
          setLossItems(initialLossItems);
        }
      } else {
        throw new Error(result.message || '获取产品列表失败');
      }
    } catch (err) {
      console.error('获取产品列表失败:', err);
      setError(err instanceof Error ? err.message : '获取产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [storeId, fetchExistingRecord]);

  /**
   * 初始化数据
   */
  useEffect(() => {
    if (storeId && selectedDate && lossType) {
      fetchProducts();
    }
  }, [storeId, selectedDate, lossType, fetchProducts, fetchExistingRecord]);



  /**
   * 添加报损项目（增加数量）
   */
  const handleAddLossItem = (product: Product) => {
    // 所有产品都已经存在，只需要增加数量
    setLossItems(prev => prev.map(item =>
      item.productId === product._id
        ? {
            ...item,
            quantity: item.quantity + 1,
            totalValue: (item.quantity + 1) * item.unitPrice,
            reason: item.reason || globalReason || '',
          }
        : item
    ));
    
    setShowProductSelector(false);
    setSearchTerm('');
  };

  /**
   * 更新报损项目数量
   */
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    // 确保数量不小于0
    const validQuantity = Math.max(0, quantity);
    
    setLossItems(prev => prev.map(item =>
      item.productId === productId
        ? {
            ...item,
            quantity: validQuantity,
            totalValue: validQuantity * item.unitPrice,
          }
        : item
    ));
  };



  /**
   * 移除报损项目
   */
  const handleRemoveLossItem = (productId: string) => {
    setLossItems(prev => prev.filter(item => item.productId !== productId));
  };

  /**
   * 提交报损记录
   */
  const handleSubmitLoss = async () => {
    // 过滤出数量大于0的报损项目
    const validLossItems = lossItems.filter(item => item.quantity > 0);
    
    if (validLossItems.length === 0) {
      setError('请至少添加一个报损项目（数量大于0）');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        type: lossType,
        date: new Date().toISOString(),
        items: validLossItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalValue: item.totalValue,
          reason: '无',
        })),
        totalQuantity: validLossItems.reduce((sum, item) => sum + item.quantity, 0),
        totalValue: validLossItems.reduce((sum, item) => sum + item.totalValue, 0),
        operatedBy: user?.name || '未知用户',
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
        setSuccess('报损记录提交成功！');
        
        // 立即跳转到生产报损页面，不显示空数据
        setTimeout(() => {
          const params = new URLSearchParams();
          if (storeId) params.set('store', storeId);
          window.location.href = `/mobileHome/production-loss?${params.toString()}`;
        }, 1500);
      } else {
        throw new Error(result.message || '提交报损记录失败');
      }
    } catch (err) {
      console.error('提交报损记录失败:', err);
      setError(err instanceof Error ? err.message : '提交报损记录失败');
    } finally {
      setSubmitting(false);
    }
  };

  /**
   * 返回上一页
   */
  const handleGoBack = () => {
    window.history.back();
  };

  /**
   * 计算总计
   */
  const totalQuantity = lossItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalValue = lossItems.reduce((sum, item) => sum + item.totalValue, 0);

  // 飞书环境检测
  if (checkingEnv) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box textAlign="center">
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>检测飞书环境中...</Typography>
        </Box>
      </Container>
    );
  }

  // 非飞书环境提示
  if (!isFeishuEnv) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            请在飞书客户端中打开
          </Typography>
          <Typography variant="body2">
            此页面需要飞书应用环境支持，请复制链接并在飞书中访问。
          </Typography>
        </Alert>
      </Container>
    );
  }

  // 用户认证加载中
  if (userLoading) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Box textAlign="center">
          <CircularProgress sx={{ mb: 2 }} />
          <Typography>获取用户信息中...</Typography>
        </Box>
      </Container>
    );
  }

  // 用户认证错误
  if (userError) {
    return (
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Alert severity="error">
          {userError}
        </Alert>
      </Container>
    );
  }

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
    <Box sx={{ pb: 10 }}>
      {/* 顶部导航栏 */}
      <AppBar position="sticky" sx={{ bgcolor: lossTypeConfig[lossType].color }}>
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
            {lossTypeConfig[lossType].label}
          </Typography>
          <Button
            color="inherit"
            startIcon={<SaveIcon />}
            onClick={handleSubmitLoss}
            disabled={submitting || lossItems.length === 0}
          >
            提交
          </Button>
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
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {/* 报损类型选择 */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <FormControl fullWidth size="small">
            <InputLabel>报损类型</InputLabel>
            <Select
              value={lossType}
              label="报损类型"
              onChange={(e) => setLossType(e.target.value as LossType)}
            >
              {Object.entries(lossTypeConfig).map(([key, config]) => (
                <MenuItem key={key} value={key}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>



        {/* 报损项目列表 */}
        <Paper elevation={2} sx={{ mb: 2 }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6">
              报损项目列表 ({lossItems.filter(item => item.quantity > 0).length}/{lossItems.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              所有产品默认显示，未填写数量视为0
            </Typography>
          </Box>
          <List>
            {lossItems.map((item, index) => (
              <React.Fragment key={item.productId}>
                <ListItem sx={{ 
                  backgroundColor: item.quantity > 0 ? 'rgba(25, 118, 210, 0.04)' : 'transparent',
                  borderLeft: item.quantity > 0 ? '3px solid #1976d2' : 'none'
                }}>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {item.productName}
                        </Typography>
                        {item.quantity > 0 && (
                          <Chip 
                            label={`${item.quantity}${item.unit}`} 
                            size="small" 
                            color="primary" 
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                          <Typography variant="body2" color="text.secondary">
                            单价: ¥{item.unitPrice.toFixed(2)}/{item.unit}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <QuantityInput
                              value={item.quantity}
                              onChange={(value) => handleUpdateQuantity(item.productId, value)}
                              min={0}
                              max={999}
                              size="small"
                            />
                            <Typography variant="body2" sx={{ ml: 2 }}>
                              小计: ¥{item.totalValue.toFixed(2)}
                            </Typography>
                          </Box>

                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => handleRemoveLossItem(item.productId)}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < lossItems.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
            
            {/* 总计 */}
            <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="subtitle2">
                    总数量: {totalQuantity}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle2" sx={{ textAlign: 'right' }}>
                    总价值: ¥{totalValue.toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Paper>

        {/* 操作提示 */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <Typography variant="subtitle2" color="primary" sx={{ mb: 1 }}>
            操作提示
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • 所有门店产品已默认显示，直接修改数量即可
            <br />
            • 数量为0的项目不会被提交
            <br />
            • 报损原因统一设置为"无"
          </Typography>
        </Paper>
      </Container>


    </Box>
  );
};

export default MobileLossRegisterPage;