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
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { Add as AddIcon, Remove as RemoveIcon } from '@mui/icons-material';

const POSTNAME = {
  1: "搅拌", 2: "丹麦", 3: "整形", 4: "烤炉", 5: "冷加工", 6: "收银打包", 7: '水吧', 8: "馅料", 9: "小库房"
};

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const MobileInventoryCheck = () => {
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

  const fetchIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    setErrorIngredients(null);
    try {
      const response = await fetch('/api/ingredients/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
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
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  const handlePostChange = (event) => {
    setSelectedPost(event.target.value);
  };

  const handleStockInputChange = useCallback((ingredientId, value) => {
    const sanitizedValue = value.replace(/[^0-9.]/g, '');
    setStockInputs(prev => ({ ...prev, [ingredientId]: sanitizedValue }));
  }, []);

  const handleIncrement = (ingredientId) => {
    const currentValue = parseFloat(stockInputs[ingredientId] || 0);
    handleStockInputChange(ingredientId, (currentValue + 1).toString());
  };

  const handleDecrement = (ingredientId) => {
    const currentValue = parseFloat(stockInputs[ingredientId] || 0);
    handleStockInputChange(ingredientId, Math.max(0, currentValue - 1).toString());
  };

  const handleSubmitStock = async () => {
    if (!selectedPost) {
      handleShowSnackbar('请先选择一个岗位。', 'warning');
      return;
    }
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

    if (stockDataToSubmit.length === 0 && postIngredients.length > 0) {
      handleShowSnackbar('没有有效的库存数量被输入。', 'warning');
      return;
    }

    if (missing.length > 0) {
      setMissingCount(missing.length);
      setPendingSubmitData(stockDataToSubmit);
      setConfirmDialogOpen(true);
      return;
    }

    if (stockDataToSubmit.length > 0) {
        await submitStockData(stockDataToSubmit);
    } else if (postIngredients.length === 0) {
        handleShowSnackbar('当前岗位没有需要盘点的物料。', 'info');
    }
  };

  const submitStockData = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selectedPost, stocks: data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'HTTP error!');
      
      if (result.success) {
        handleShowSnackbar(result.message || '库存盘点数据提交成功！', 'success');
        fetchIngredients(); // 重新获取数据以更新理论库存
      } else {
        throw new Error(result.message || '库存提交失败');
      }
    } catch (error) {
      handleShowSnackbar(`提交失败: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleConfirmSubmit = () => {
    if (pendingSubmitData) {
      submitStockData(pendingSubmitData);
    }
    setConfirmDialogOpen(false);
  };

  const renderIngredientCard = (ing) => {
    const theoreticalStock = ing.stockByPost?.[selectedPost]?.quantity?.toFixed(2) || '0.00';
    return (
      <Card key={ing._id} sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" component="div">{ing.name}</Typography>
          <Typography sx={{ mb: 1.5 }} color="text.secondary">
            规格: {ing.specs || 'N/A'} | 单位: {ing.unit || ing.baseUnit || ing.min || 'g'}
          </Typography>
          <Box display="flex" alignItems="center">
            <TextField
              fullWidth
              label="实际库存"
              variant="outlined"
              type="number"
              value={stockInputs[ing._id] || ''}
              onChange={(e) => handleStockInputChange(ing._id, e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton onClick={() => handleDecrement(ing._id)} size="small">
                      <RemoveIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => handleIncrement(ing._id)} size="small">
                      <AddIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Container sx={{ pb: 8, pt: 2 }}>
      
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="post-select-label">选择岗位</InputLabel>
        <Select
          labelId="post-select-label"
          value={selectedPost}
          label="选择岗位"
          onChange={handlePostChange}
        >
          <MenuItem value=""><em>请选择...</em></MenuItem>
          {Object.entries(POSTNAME).map(([id, name]) => (
            <MenuItem key={id} value={id}>{name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {loadingIngredients && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
      {errorIngredients && <Typography color="error" align="center">{errorIngredients}</Typography>}
      
      {!selectedPost && <Typography align="center" color="text.secondary">请先选择一个岗位开始盘点。</Typography>}

      {selectedPost && !loadingIngredients && postIngredients.length > 0 && (
        <List>
          {postIngredients.map(renderIngredientCard)}
        </List>
      )}

      {selectedPost && !loadingIngredients && postIngredients.length === 0 && (
        <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>当前岗位下没有需要盘点的物料。</Typography>
      )}

      <Paper 
        elevation={3} 
        sx={{ position: 'fixed', bottom: 56, left: 0, right: 0, p: 2, zIndex: 1000 }}
      >
        <Button
          fullWidth
          variant="contained"
          color="primary"
          size="large"
          onClick={handleSubmitStock}
          disabled={isSubmitting || !selectedPost || postIngredients.length === 0}
          startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        >
          {isSubmitting ? '正在提交...' : '提交盘点'}
        </Button>
      </Paper>

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog open={confirmDialogOpen} onClose={() => setConfirmDialogOpen(false)}>
        <DialogTitle>确认提交</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您有 {missingCount} 项物料未填写库存，确定要提交吗？未填写的项目将不会被保存。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>取消</Button>
          <Button onClick={handleConfirmSubmit} color="primary" autoFocus>
            确认提交
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MobileInventoryCheck; 