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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Card,
  CardContent,
  Fab,
  Divider,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  Save as SaveIcon,
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
type LossType = 'production' | 'tasting' | 'closing' | 'other';

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
  
  // 产品相关状态
  const [products, setProducts] = useState<Product[]>([]);
  const [showProductSelector, setShowProductSelector] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // 报损项目相关状态
  const [lossItems, setLossItems] = useState<LossItem[]>([]);
  const [globalReason, setGlobalReason] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  /**
   * 报损类型配置
   */
  const lossTypeConfig = {
    production: { label: '生产报损', color: '#ff9800' },
    tasting: { label: '品尝报损', color: '#4caf50' },
    closing: { label: '打烊报损', color: '#2196f3' },
    other: { label: '其他报损', color: '#9c27b0' },
  };

  /**
   * 获取URL参数
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlStoreId = urlParams.get('store');
    const urlType = urlParams.get('type') as LossType;
    
    // 获取门店ID
    const lockedStoreId = sessionStorage.getItem('lockedStoreId');
    const defaultStoreId = localStorage.getItem('defaultStoreId');
    const currentStoreId = urlStoreId || lockedStoreId || defaultStoreId;
    
    setStoreId(currentStoreId);
    
    // 设置报损类型
    if (urlType && ['production', 'tasting', 'closing', 'other'].includes(urlType)) {
      setLossType(urlType);
    }
  }, []);

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
        setProducts(result.data || []);
      } else {
        throw new Error(result.message || '获取产品列表失败');
      }
    } catch (err) {
      console.error('获取产品列表失败:', err);
      setError(err instanceof Error ? err.message : '获取产品列表失败');
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  /**
   * 初始化数据
   */
  useEffect(() => {
    if (storeId) {
      fetchProducts();
    }
  }, [storeId, fetchProducts]);

  /**
   * 过滤产品列表
   */
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * 添加报损项目
   */
  const handleAddLossItem = (product: Product) => {
    const existingItem = lossItems.find(item => item.productId === product._id);
    
    if (existingItem) {
      // 如果已存在，增加数量
      setLossItems(prev => prev.map(item =>
        item.productId === product._id
          ? {
              ...item,
              quantity: item.quantity + 1,
              totalValue: (item.quantity + 1) * item.unitPrice,
            }
          : item
      ));
    } else {
      // 添加新项目
      const newItem: LossItem = {
        productId: product._id,
        productName: product.name,
        quantity: 1,
        unit: product.unit || '个',
        unitPrice: product.price || 0,
        totalValue: product.price || 0,
        reason: globalReason || '',
      };
      setLossItems(prev => [...prev, newItem]);
    }
    
    setShowProductSelector(false);
    setSearchTerm('');
  };

  /**
   * 更新报损项目数量
   */
  const handleUpdateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveLossItem(productId);
      return;
    }
    
    setLossItems(prev => prev.map(item =>
      item.productId === productId
        ? {
            ...item,
            quantity,
            totalValue: quantity * item.unitPrice,
          }
        : item
    ));
  };

  /**
   * 更新报损原因
   */
  const handleUpdateReason = (productId: string, reason: string) => {
    setLossItems(prev => prev.map(item =>
      item.productId === productId
        ? { ...item, reason }
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
    if (lossItems.length === 0) {
      setError('请至少添加一个报损项目');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const submitData = {
        type: lossType,
        date: new Date().toISOString(),
        items: lossItems.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalValue: item.totalValue,
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
        setSuccess('报损记录提交成功！');
        setLossItems([]);
        setGlobalReason('');
        
        // 3秒后返回上一页
        setTimeout(() => {
          window.history.back();
        }, 3000);
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

        {/* 全局报损原因 */}
        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="报损原因（可选）"
            value={globalReason}
            onChange={(e) => setGlobalReason(e.target.value)}
            placeholder="输入报损原因，将应用到所有项目"
            multiline
            rows={2}
          />
        </Paper>

        {/* 报损项目列表 */}
        {lossItems.length > 0 && (
          <Paper elevation={2} sx={{ mb: 2 }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
              <Typography variant="h6">
                报损项目列表 ({lossItems.length})
              </Typography>
            </Box>
            <List>
              {lossItems.map((item, index) => (
                <React.Fragment key={item.productId}>
                  <ListItem>
                    <ListItemText
                      primary={item.productName}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            单价: ¥{item.unitPrice.toFixed(2)}/{item.unit}
                          </Typography>
                          <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Button
                              size="small"
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                            >
                              -
                            </Button>
                            <Typography variant="body2" sx={{ minWidth: '40px', textAlign: 'center' }}>
                              {item.quantity}
                            </Typography>
                            <Button
                              size="small"
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                            >
                              +
                            </Button>
                            <Typography variant="body2" sx={{ ml: 2 }}>
                              小计: ¥{item.totalValue.toFixed(2)}
                            </Typography>
                          </Box>
                          <TextField
                            size="small"
                            placeholder="报损原因"
                            value={item.reason}
                            onChange={(e) => handleUpdateReason(item.productId, e.target.value)}
                            sx={{ mt: 1, width: '100%' }}
                          />
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
        )}

        {/* 空状态 */}
        {lossItems.length === 0 && (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mb: 2 }}>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              暂无报损项目
            </Typography>
            <Typography variant="body2" color="text.secondary">
              点击右下角的 + 按钮添加报损项目
            </Typography>
          </Paper>
        )}
      </Container>

      {/* 添加产品按钮 */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          bgcolor: lossTypeConfig[lossType].color,
          '&:hover': {
            bgcolor: lossTypeConfig[lossType].color,
            opacity: 0.8,
          },
        }}
        onClick={() => setShowProductSelector(true)}
      >
        <AddIcon />
      </Fab>

      {/* 产品选择对话框 */}
      <Dialog
        open={showProductSelector}
        onClose={() => setShowProductSelector(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: { height: '80vh' }
        }}
      >
        <DialogTitle>
          选择产品
        </DialogTitle>
        <DialogContent>
          {/* 搜索框 */}
          <TextField
            fullWidth
            placeholder="搜索产品名称"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* 产品列表 */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <List>
              {filteredProducts.map((product) => (
                <ListItem
                  key={product._id}
                  button
                  onClick={() => handleAddLossItem(product)}
                >
                  <ListItemText
                    primary={product.name}
                    secondary={`¥${product.price?.toFixed(2) || '0.00'}/${product.unit || '个'}`}
                  />
                  {product.category && (
                    <Chip
                      label={product.category}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </ListItem>
              ))}
              {filteredProducts.length === 0 && (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    {searchTerm ? '未找到匹配的产品' : '暂无产品数据'}
                  </Typography>
                </Box>
              )}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProductSelector(false)}>
            取消
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MobileLossRegisterPage;