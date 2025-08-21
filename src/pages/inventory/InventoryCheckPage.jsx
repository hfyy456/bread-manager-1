import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Grid,
  TextField,
  CircularProgress,
  Snackbar,
  Alert as MuiAlert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Card,
  CardContent,
  useTheme,
  useMediaQuery,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import DownloadIcon from '@mui/icons-material/Download';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

const POSTNAME = {
  1: "搅拌",
  2: "丹麦",
  3: "整形",
  4: "烤炉",
  5: "冷加工",
  6: "收银打包",
  7: '水吧',
  8: "馅料",
  9: "小库房"
};

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const InventoryCheckPage = () => {
  const [allIngredients, setAllIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [errorIngredients, setErrorIngredients] = useState(null);
  
  const [selectedPost, setSelectedPost] = useState('');
  const [postIngredients, setPostIngredients] = useState([]);
  const [stockInputs, setStockInputs] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [missingCount, setMissingCount] = useState(0);

  const [downloading, setDownloading] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    setErrorIngredients(null);
    try {
      const response = await fetch('/api/ingredients/list', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-current-store-id': localStorage.getItem('currentStoreId')
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setAllIngredients(result.data);
      } else {
        setErrorIngredients(result.message || 'Failed to load ingredients data.');
      }
    } catch (err) {
      setErrorIngredients(`Error fetching ingredients: ${err.message}`);
    } finally {
      setLoadingIngredients(false);
    }
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  useEffect(() => {
    if (selectedPost && allIngredients.length > 0) {
      const filtered = allIngredients.filter(ing => 
        Array.isArray(ing.post) && ing.post.map(String).includes(String(selectedPost))
      );
      setPostIngredients(filtered);
      const initialInputs = {};
      filtered.forEach(ing => {
        let currentQuantity = '';
        if (ing.stockByPost) {
            const stockMap = new Map(Object.entries(ing.stockByPost));
            if (stockMap.has(selectedPost) && stockMap.get(selectedPost) && typeof stockMap.get(selectedPost).quantity === 'number') {
                currentQuantity = stockMap.get(selectedPost).quantity.toString();
            }
        }
        initialInputs[ing._id] = currentQuantity;
      });
      setStockInputs(initialInputs);
    } else {
      setPostIngredients([]);
      setStockInputs({});
    }
  }, [selectedPost, allIngredients]);

  const handleShowSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handlePostChange = (event) => {
    setSelectedPost(event.target.value);
  };

  const handleStockInputChange = useCallback((ingredientId, value) => {
    setStockInputs(prev => ({
      ...prev,
      [ingredientId]: value,
    }));
  }, []);

  // 使用useMemo计算总库存，避免重复计算
  const totalStock = useMemo(() => {
    if (!selectedPost || postIngredients.length === 0) return 0;
    return postIngredients.reduce((total, ing) => {
      const qty = stockInputs[ing._id];
      return total + (qty ? parseFloat(qty) : 0);
    }, 0);
  }, [selectedPost, postIngredients, stockInputs]);

  const handleSubmitStock = async () => {
    if (!selectedPost) {
      handleShowSnackbar('请先选择一个岗位。', 'warning');
      return;
    }
    if (postIngredients.length === 0) {
      handleShowSnackbar('当前岗位没有需要盘点的物料。', 'info');
      return;
    }
    // 统计未填写项
    const missing = postIngredients.filter(ing => stockInputs[ing._id] === '' || stockInputs[ing._id] === undefined);
    const stockDataToSubmit = postIngredients
      .map(ing => ({
        ingredientId: ing._id,
        ingredientName: ing.name,
        quantity: parseFloat(stockInputs[ing._id]),
        unit: ing.unit || ing.baseUnit || ing.min || 'g',
        baseUnit: ing.baseUnit || ing.min,
        norms: ing.norms
      }))
      .filter(item => !isNaN(item.quantity) && item.quantity >= 0);
    if (stockDataToSubmit.length === 0) {
      handleShowSnackbar('没有有效的库存数量被输入。', 'warning');
      return;
    }
    if (missing.length > 0) {
      setMissingCount(missing.length);
      setPendingSubmitData(stockDataToSubmit);
      setConfirmDialogOpen(true);
      return;
    }
    await submitStockData(stockDataToSubmit);
  };

  // 真正提交数据的函数
  const submitStockData = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selectedPost, stocks: data }),
      });
      const resultText = await response.text();
      let resultJson;
      try {
        resultJson = JSON.parse(resultText);
      } catch (parseError) {
        console.error("Failed to parse API response as JSON:", resultText);
        throw new Error(`服务器响应格式错误: ${resultText.substring(0,100)}`);
      }
      if (!response.ok) {
        throw new Error(resultJson.message || `HTTP error! status: ${response.status}`);
      }
      if (resultJson.success) {
        handleShowSnackbar(resultJson.message || '库存盘点数据提交成功！', 'success');
        fetchIngredients();
      } else {
        if (resultJson.errors && resultJson.errors.length > 0) {
            const errorMessages = resultJson.errors.join('; ');
            handleShowSnackbar(`${resultJson.message || '部分提交失败。'} 详情: ${errorMessages}`, 'warning');
        } else {
            throw new Error(resultJson.message || '库存提交失败，但未返回具体错误信息。');
        }
      }
    } catch (error) {
      console.error("Error submitting stock:", error);
      handleShowSnackbar(`提交失败: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // 导出Excel功能
  const handleExportExcel = async () => {
    setDownloading(true);
    try {
      const response = await fetch('/api/inventory/export-realtime', {
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error('导出失败');
      }
      const blob = await response.blob();
      // 获取文件名
      let filename = 'inventory_snapshot.xlsx';
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = decodeURIComponent(disposition.split('filename=')[1].replace(/['"]/g, ''));
      }
      // 创建下载链接
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      handleShowSnackbar('导出成功', 'success');
    } catch (err) {
      handleShowSnackbar('导出失败: ' + err.message, 'error');
    } finally {
      setDownloading(false);
    }
  };
  
  const commonCellSx = { py: 1, fontSize: '0.875rem' };
  const commonHeaderCellSx = { ...commonCellSx, fontWeight: 'bold', backgroundColor: theme.palette.grey[200], color: theme.palette.text.primary };

  if (loadingIngredients) {
    return (
      <Container maxWidth="md" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>正在加载物料数据...</Typography>
      </Container>
    );
  }

  if (errorIngredients) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', backgroundColor: 'error.light', borderRadius: '12px' }}>
          <Typography variant="h5" color="error.contrastText">物料数据加载失败</Typography>
          <Typography color="error.contrastText" sx={{ mt: 1 }}>{errorIngredients}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{mt: 2, color: 'white', backgroundColor: 'error.dark' }}>刷新页面</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 }, pb: { xs: '100px', md: 3 } }}>
      <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography variant="h4" component="h1" sx={{ textAlign: 'center', mb: 0 }}>
          库存盘点
        </Typography>
        <Tooltip title="查看操作指南">
          <IconButton component={Link} to="/operation-guide#inventory-check" size="small" sx={{ ml: 1, color: 'primary.main' }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 2, sm: 2.5 }, mb: {xs: 2, md: 3}, borderRadius: '12px' }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel id="post-select-label">选择岗位</InputLabel>
            <Select
                labelId="post-select-label"
                id="post-select"
              value={selectedPost}
                label="选择岗位"
              onChange={handlePostChange}
                sx={{ minHeight: { xs: '56px', sm: '40px' } }}
            >
              {Object.entries(POSTNAME).map(([id, name]) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Paper elevation={3} sx={{ p: { xs: 2, sm: 2.5 }, mb: {xs: 2, md: 3}, borderRadius: '12px' }}>
        <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
          {selectedPost ? `${POSTNAME[selectedPost]} - 物料列表` : '请先选择岗位'}
        </Typography>
        
        {selectedPost && postIngredients.length > 0 && (
          isMobile ? (
            <Grid container spacing={2}>
              {postIngredients.map(ing => {
                const currentValue = stockInputs[ing._id] || '';
                const hasValue = currentValue !== '';
                return (
                <Grid item xs={12} key={ing._id}>
                    <Card 
                      variant="outlined" 
                      sx={{ 
                        borderRadius: '12px',
                        border: hasValue ? '2px solid' : '1px solid',
                        borderColor: hasValue ? 'success.main' : 'divider',
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      <CardContent sx={{ p: 2 }}>
                        <Typography variant="h6" component="div" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main', mb: 2 }}>
                          {ing.name}
                        </Typography>
                        <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12}>
                          <TextField
                              fullWidth
                              label="当前库存"
                              variant="outlined"
                              value={currentValue}
                            onChange={(e) => handleStockInputChange(ing._id, e.target.value)}
                              type="number"
                              inputProps={{ 
                                min: 0, 
                                step: 0.1,
                                inputMode: 'decimal',
                                style: { fontSize: '1.2rem', textAlign: 'center' }
                              }}
                            InputProps={{
                                endAdornment: <InputAdornment position="end" sx={{ fontSize: '1.1rem' }}>{ing.unit || ing.baseUnit || ing.min || 'g'}</InputAdornment>,
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                  minHeight: '56px',
                                  '& fieldset': {
                                    borderColor: hasValue ? 'success.main' : 'grey.300',
                                  },
                                  '&:hover fieldset': {
                                    borderColor: hasValue ? 'success.dark' : 'primary.main',
                                  },
                                  '&.Mui-focused fieldset': {
                                    borderColor: 'primary.main',
                                  },
                                },
                              }}
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  const current = parseFloat(currentValue) || 0;
                                  handleStockInputChange(ing._id, Math.max(0, current - 0.1).toFixed(1));
                                }}
                                sx={{ minWidth: '40px', minHeight: '40px' }}
                              >
                                <RemoveIcon />
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => handleStockInputChange(ing._id, '0')}
                                sx={{ minWidth: '40px', minHeight: '40px' }}
                              >
                                0
                              </Button>
                              <Button
                                variant="outlined"
                                size="small"
                                onClick={() => {
                                  const current = parseFloat(currentValue) || 0;
                                  handleStockInputChange(ing._id, (current + 0.1).toFixed(1));
                                }}
                                sx={{ minWidth: '40px', minHeight: '40px' }}
                              >
                                <AddIcon />
                              </Button>
                            </Box>
                        </Grid>
                      </Grid>
                      </CardContent>
                    </Card>
                </Grid>
                );
              })}
            </Grid>
              ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: '8px' }}>
              <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                    <TableCell sx={commonHeaderCellSx}>物料名称</TableCell>
                    <TableCell sx={{...commonHeaderCellSx, minWidth: '180px'}} align="center">当前库存</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                  {postIngredients.map(ing => (
                    <TableRow key={ing._id} hover>
                      <TableCell sx={{...commonCellSx, fontWeight: 500}}>{ing.name}</TableCell>
                      <TableCell sx={commonCellSx} align="right">
                            <TextField
                              fullWidth
                              variant="standard"
                              value={stockInputs[ing._id] || ''}
                              onChange={(e) => handleStockInputChange(ing._id, e.target.value)}
                              type="number"
                          inputProps={{ min: 0 }}
                              InputProps={{
                                endAdornment: <InputAdornment position="end">{ing.unit || ing.baseUnit || ing.min || 'g'}</InputAdornment>,
                                sx: { fontSize: '1rem' }
                              }}
                              sx={{
                                '& .MuiInput-underline:before': { borderBottomColor: 'grey.400' },
                                '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: 'primary.light' },
                              }}
                            />
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* 总库存行 */}
                  {postIngredients.length > 0 && (
                    <TableRow sx={{ backgroundColor: theme.palette.grey[200] }}>
                      <TableCell sx={{...commonCellSx, fontWeight: 'bold'}}>总库存</TableCell>
                      <TableCell sx={{...commonCellSx, fontWeight: 'bold'}} align="right">
                        {totalStock}
                      </TableCell>
                    </TableRow>
                  )}
                    </TableBody>
                  </Table>
                </TableContainer>
          )
        )}

        {selectedPost && postIngredients.length === 0 && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
            该岗位下没有需要盘点的物料。
          </Typography>
        )}

        {!selectedPost && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', py: 3 }}>
            请在上方选择一个岗位以查看物料列表和进行盘点。
          </Typography>
        )}

        {/* 桌面端提交按钮 */}
        {!isMobile && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
            size="large"
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                onClick={handleSubmitStock}
            disabled={isSubmitting || !selectedPost || postIngredients.length === 0}
            sx={{ borderRadius: '8px', px: 3, py: 1.25 }}
              >
            {isSubmitting ? '提交中...' : '提交盘点数据'}
              </Button>
            </Box>
        )}
        </Paper>

      {/* 移动端底部固定提交按钮 */}
      {isMobile && (
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            p: 2,
            backgroundColor: 'background.paper',
            borderTop: '1px solid',
            borderColor: 'divider',
            zIndex: 1000,
          }}
        >
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            onClick={handleSubmitStock}
            disabled={isSubmitting || !selectedPost || postIngredients.length === 0}
            sx={{ 
              borderRadius: '12px', 
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              minHeight: '56px'
            }}
          >
            {isSubmitting ? '提交中...' : `提交盘点数据 (${Object.values(stockInputs).filter(v => v !== '').length}/${postIngredients.length})`}
          </Button>
        </Box>
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      {/* 确认未填写项的模态框 */}
      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>确认提交</DialogTitle>
        <DialogContent>
          <DialogContentText>
            共有 {missingCount} 项物料未填写库存数量，是否继续提交？<br/>
            （未填写的物料将不会被提交）
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">取消</Button>
          <Button onClick={() => { setConfirmDialogOpen(false); submitStockData(pendingSubmitData); }} color="primary" autoFocus>确认提交</Button>
        </DialogActions>
      </Dialog>

      <Box display="flex" justifyContent="space-between" alignItems="center" mt={2}>
        <Typography variant="h5">库存总览</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<DownloadIcon />}
          onClick={handleExportExcel}
          disabled={downloading}
        >
          {downloading ? '导出中...' : '导出Excel'}
        </Button>
      </Box>
    </Container>
  );
};

export default InventoryCheckPage; 