import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  History as HistoryIcon,
  Store as StoreIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSnackbar } from '@components/SnackbarProvider.jsx';

// 类型定义
interface BreadType {
  id: string;
  name: string;
  description: string;
  price: number;
}

interface StoreStatus {
  isActive: boolean;
  activatedAt: string | null;
  deactivatedAt: string | null;
  operatedBy: string | null;
  notes: string | null;
  updatedAt: string | null;
}

interface StoreProduct {
  breadTypeId: string;
  name: string;
  description: string;
  price: number;
  storeStatus: StoreStatus;
}

interface Store {
  _id: string;
  name: string;
  address: string;
}

interface ProductOperation {
  breadTypeId: string;
  isActive: boolean;
  notes?: string;
}

/**
 * 产品管理页面组件
 * 提供产品上下架功能，支持单个和批量操作
 */
const ProductManagement: React.FC = () => {
  const { showSnackbar } = useSnackbar();
  
  // 状态管理
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('');
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null);
  const [operationNotes, setOperationNotes] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // 获取门店列表
  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores');
      const data = await response.json();
      if (data.success) {
        setStores(data.data);
        if (data.data.length > 0 && !selectedStoreId) {
          setSelectedStoreId(data.data[0]._id);
        }
      } else {
        showSnackbar('获取门店列表失败', 'error');
      }
    } catch (error) {
      console.error('获取门店列表失败:', error);
      showSnackbar('获取门店列表失败', 'error');
    }
  };
  
  // 获取门店产品列表
  const fetchStoreProducts = async (storeId: string, status?: string) => {
    if (!storeId) return;
    
    setLoading(true);
    try {
      const url = status ? `/api/store-products/store/${storeId}?status=${status}` : `/api/store-products/store/${storeId}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setProducts(data.data.products);
      } else {
        showSnackbar('获取产品列表失败', 'error');
      }
    } catch (error) {
      console.error('获取产品列表失败:', error);
      showSnackbar('获取产品列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // 更新单个产品状态
  const updateProductStatus = async (breadTypeId: string, isActive: boolean, notes: string = '') => {
    if (!selectedStoreId) return;
    
    try {
      const response = await fetch(`/api/store-products/store/${selectedStoreId}/product`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          breadTypeId,
          isActive,
          operatedBy: '系统管理员', // 这里应该从用户上下文获取
          notes
        })
      });
      
      const data = await response.json();
      if (data.success) {
        showSnackbar(`产品${isActive ? '上架' : '下架'}成功`, 'success');
        await fetchStoreProducts(selectedStoreId);
      } else {
        showSnackbar(data.message || '操作失败', 'error');
      }
    } catch (error) {
      console.error('更新产品状态失败:', error);
      showSnackbar('操作失败', 'error');
    }
  };
  
  // 批量更新产品状态
  const batchUpdateProducts = async (operations: ProductOperation[]) => {
    if (!selectedStoreId || operations.length === 0) return;
    
    try {
      const response = await fetch(`/api/store-products/store/${selectedStoreId}/batch`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operations,
          operatedBy: '系统管理员' // 这里应该从用户上下文获取
        })
      });
      
      const data = await response.json();
      if (data.success) {
        showSnackbar(`批量操作成功，共处理 ${operations.length} 个产品`, 'success');
        await fetchStoreProducts(selectedStoreId);
        setSelectedProducts(new Set());
      } else {
        showSnackbar(data.message || '批量操作失败', 'error');
      }
    } catch (error) {
      console.error('批量更新失败:', error);
      showSnackbar('批量操作失败', 'error');
    }
  };
  
  // 处理产品选择
  const handleProductSelect = (breadTypeId: string, selected: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (selected) {
      newSelected.add(breadTypeId);
    } else {
      newSelected.delete(breadTypeId);
    }
    setSelectedProducts(newSelected);
  };
  
  // 处理批量上架
  const handleBatchActivate = () => {
    const operations: ProductOperation[] = Array.from(selectedProducts).map(breadTypeId => ({
      breadTypeId,
      isActive: true,
      notes: '批量上架操作'
    }));
    batchUpdateProducts(operations);
  };
  
  // 处理批量下架
  const handleBatchDeactivate = () => {
    const operations: ProductOperation[] = Array.from(selectedProducts).map(breadTypeId => ({
      breadTypeId,
      isActive: false,
      notes: '批量下架操作'
    }));
    batchUpdateProducts(operations);
  };
  
  // 打开操作对话框
  const openOperationDialog = (product: StoreProduct) => {
    setSelectedProduct(product);
    setOperationNotes('');
    setDialogOpen(true);
  };
  
  // 确认操作
  const handleConfirmOperation = async () => {
    if (!selectedProduct) return;
    
    const newStatus = !selectedProduct.storeStatus.isActive;
    await updateProductStatus(selectedProduct.breadTypeId, newStatus, operationNotes);
    setDialogOpen(false);
    setSelectedProduct(null);
    setOperationNotes('');
  };
  
  // 过滤产品
  const getFilteredProducts = () => {
    switch (tabValue) {
      case 1: // 已上架
        return products.filter(p => p.storeStatus.isActive);
      case 2: // 已下架
        return products.filter(p => !p.storeStatus.isActive);
      default: // 全部
        return products;
    }
  };
  
  // 初始化数据
  useEffect(() => {
    fetchStores();
  }, []);
  
  useEffect(() => {
    if (selectedStoreId) {
      fetchStoreProducts(selectedStoreId);
    }
  }, [selectedStoreId]);
  
  const filteredProducts = getFilteredProducts();
  
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        产品上下架管理
      </Typography>
      
      {/* 门店选择和操作栏 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>选择门店</InputLabel>
                <Select
                  value={selectedStoreId}
                  onChange={(e) => setSelectedStoreId(e.target.value)}
                  label="选择门店"
                >
                  {stores.map((store) => (
                    <MenuItem key={store._id} value={store._id}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <StoreIcon fontSize="small" />
                        {store.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={batchMode}
                    onChange={(e) => {
                      setBatchMode(e.target.checked);
                      setSelectedProducts(new Set());
                    }}
                  />
                }
                label="批量操作模式"
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => selectedStoreId && fetchStoreProducts(selectedStoreId)}
                  disabled={loading}
                >
                  刷新
                </Button>
                
                {batchMode && selectedProducts.size > 0 && (
                  <>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleBatchActivate}
                      size="small"
                    >
                      批量上架 ({selectedProducts.size})
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      onClick={handleBatchDeactivate}
                      size="small"
                    >
                      批量下架 ({selectedProducts.size})
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      {/* 产品状态筛选 */}
      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(_, newValue) => setTabValue(newValue)}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label={`全部产品 (${products.length})`} />
          <Tab label={`已上架 (${products.filter(p => p.storeStatus.isActive).length})`} />
          <Tab label={`已下架 (${products.filter(p => !p.storeStatus.isActive).length})`} />
        </Tabs>
      </Card>
      
      {/* 产品列表 */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                {batchMode && (
                  <TableCell padding="checkbox">
                    选择
                  </TableCell>
                )}
                <TableCell>产品名称</TableCell>
                <TableCell>描述</TableCell>
                <TableCell>价格</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>最后操作时间</TableCell>
                <TableCell>操作人</TableCell>
                <TableCell>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow key={product.breadTypeId}>
                  {batchMode && (
                    <TableCell padding="checkbox">
                      <Switch
                        checked={selectedProducts.has(product.breadTypeId)}
                        onChange={(e) => handleProductSelect(product.breadTypeId, e.target.checked)}
                        size="small"
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <Typography variant="subtitle2">
                      {product.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {product.description || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    ¥{product.price.toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.storeStatus.isActive ? '已上架' : '已下架'}
                      color={product.storeStatus.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {product.storeStatus.updatedAt
                        ? new Date(product.storeStatus.updatedAt).toLocaleString()
                        : '-'
                      }
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {product.storeStatus.operatedBy || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title={product.storeStatus.isActive ? '下架产品' : '上架产品'}>
                        <IconButton
                          size="small"
                          onClick={() => openOperationDialog(product)}
                          color={product.storeStatus.isActive ? 'error' : 'success'}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="查看操作历史">
                        <IconButton
                          size="small"
                          onClick={() => {
                            // TODO: 实现历史记录查看
                            showSnackbar('历史记录功能开发中', 'info');
                          }}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {filteredProducts.length === 0 && !loading && (
        <Alert severity="info" sx={{ mt: 2 }}>
          暂无产品数据
        </Alert>
      )}
      
      {/* 操作确认对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedProduct?.storeStatus.isActive ? '下架产品' : '上架产品'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            确定要{selectedProduct?.storeStatus.isActive ? '下架' : '上架'}产品 "{selectedProduct?.name}" 吗？
          </Typography>
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="操作备注（可选）"
            value={operationNotes}
            onChange={(e) => setOperationNotes(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="请输入操作原因或备注信息..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button
            onClick={handleConfirmOperation}
            variant="contained"
            color={selectedProduct?.storeStatus.isActive ? 'error' : 'success'}
          >
            确认{selectedProduct?.storeStatus.isActive ? '下架' : '上架'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductManagement;