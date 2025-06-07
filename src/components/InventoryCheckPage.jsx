import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

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

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const fetchIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    setErrorIngredients(null);
    try {
      const response = await fetch('/api/ingredients/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  const handleStockInputChange = (ingredientId, value) => {
    setStockInputs(prev => ({
      ...prev,
      [ingredientId]: value,
    }));
  };

  const handleSubmitStock = async () => {
    if (!selectedPost) {
      handleShowSnackbar('请先选择一个岗位。', 'warning');
      return;
    }
    if (postIngredients.length === 0) {
      handleShowSnackbar('当前岗位没有需要盘点的物料。', 'info');
      return;
    }

    const stockDataToSubmit = postIngredients
      .map(ing => ({
        ingredientId: ing._id,
        ingredientName: ing.name,
        quantity: parseFloat(stockInputs[ing._id]),
        unit: ing.unit,
        baseUnit: ing.baseUnit || ing.min,
        norms: ing.norms
      }))
      .filter(item => !isNaN(item.quantity) && item.quantity >= 0);

    if (stockDataToSubmit.length === 0) {
      handleShowSnackbar('没有有效的库存数量被输入。', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId: selectedPost, stocks: stockDataToSubmit }),
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
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 3 } }}>
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

      <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, mb: {xs: 2, md: 3}, borderRadius: '12px' }}>
        <Typography variant="h6" component="h2" sx={{ mb: 1.5, fontWeight: 500, fontSize: isMobile ? '1.1rem': undefined }}>
          选择操作岗位
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl fullWidth variant="outlined" size={isMobile ? 'small' : 'medium'}>
            <InputLabel id="select-post-label">岗位</InputLabel>
            <Select
              labelId="select-post-label"
              value={selectedPost}
              label="岗位"
              onChange={handlePostChange}
            >
              <MenuItem value="">
                <em>-- 请选择 --</em>
              </MenuItem>
              {Object.entries(POSTNAME).map(([id, name]) => (
                <MenuItem key={id} value={id}>{name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        {selectedPost && (
          <Typography variant={isMobile ? 'body2' : 'subtitle1'} sx={{ mt: 1.5, textAlign: 'center', color: 'text.secondary' }}>
            当前盘点岗位: <Box component="span" sx={{ fontWeight: 'bold', color: 'primary.main' }}>{POSTNAME[selectedPost]}</Box>
          </Typography>
        )}
      </Paper>

      {selectedPost && !loadingIngredients && (
        <Paper elevation={3} sx={{ p: { xs: 1.5, sm: 2.5 }, borderRadius: '12px' }}>
          {postIngredients.length === 0 ? (
            <Box sx={{textAlign: 'center', my: {xs: 2, md: 4}, color: 'text.secondary', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1}}>
              <img src="/src/logo.svg" alt="Empty state" style={{ width: '60px', opacity: 0.4, marginBottom: '8px' }} /> 
              <Typography variant="h6" component="p" sx={{fontSize: isMobile ? '1rem' : undefined}}>当前岗位无待盘点物料</Typography>
              <Typography variant="body2" component="p" sx={{fontSize: isMobile ? '0.8rem' : undefined}}>请确认岗位选择是否正确，或联系管理员配置物料列表。</Typography>
            </Box>
          ) : (
            <Box>
              {isMobile ? (
                <Box>
                  {postIngredients.map((ing) => (
                    <Card key={ing._id} sx={{ mb: 1.5, borderRadius: '8px' }} elevation={1}>
                      <CardContent sx={{ py: 1, px: 1.5 }}>
                        <Typography variant="body1" component="div" sx={{ fontWeight: 'medium', fontSize: '0.9rem', mb: 0.25 }}>
                          {ing.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem', mb: 0.75 }}>
                          规格: {ing.specs || '-'} ({ing.norms} {ing.baseUnit || ing.min}/{ing.unit})
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5, gap: 0.5 }}>
                          <TextField
                            label="当前数量"
                            type="number"
                            variant="filled"
                            size="small"
                            value={stockInputs[ing._id] || ''}
                            onChange={(e) => handleStockInputChange(ing._id, e.target.value)}
                            onFocus={(event) => event.target.select()} 
                            inputProps={{ 
                              min: 0, 
                              step: "any",
                              sx: { fontSize: '0.9rem', py: '8px' }
                            }}
                            InputLabelProps={{ sx: { fontSize: '0.85rem' } }}
                            InputProps={{
                              endAdornment: <InputAdornment position="end"><Typography variant="caption" sx={{fontSize: '0.75rem'}}>{ing.unit}</Typography></InputAdornment>,
                              sx: { fontSize: '0.9rem'}
                            }}
                            sx={{
                              mr: 0,
                              flexGrow: 1, 
                              minWidth: '90px',
                              '& .MuiFilledInput-root': {
                                  backgroundColor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.06)',
                                  borderRadius: '4px',
                               },
                              '& .MuiFilledInput-input': {
                                  paddingTop: '12px',
                                  paddingBottom: '4px'
                              }
                            }}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  ))}
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={1} sx={{ borderRadius: '8px', overflow: 'hidden' }}>
                  <Table sx={{ minWidth: 650 }} aria-label="inventory check table" size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{...commonHeaderCellSx, width: '35%', py: 1 }}>原料名称</TableCell>
                        <TableCell sx={{...commonHeaderCellSx, width: '35%', py: 1 }}>规格</TableCell>
                        <TableCell align="right" sx={{...commonHeaderCellSx, width: '30%', py: 1 }}>盘点数量</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {postIngredients.map((ing, index) => (
                        <TableRow 
                          hover 
                          key={ing._id}
                          sx={{ 
                            '&:nth-of-type(odd)': { backgroundColor: theme.palette.action.hover },
                            '&:last-child td, &:last-child th': { border: 0 },
                            '& td, & th': { py: 0.75 }
                          }}
                        >
                          <TableCell sx={{...commonCellSx, fontSize: '0.8rem'}} component="th" scope="row">
                            {ing.name}
                          </TableCell>
                          <TableCell sx={{...commonCellSx, fontSize: '0.8rem'}}>
                            {ing.specs || '-'} ({ing.norms} {ing.baseUnit || ing.min}/{ing.unit})
                          </TableCell>
                          <TableCell align="right" sx={{...commonCellSx, pr: {xs: 1, md: 2}, fontSize: '0.8rem'}}>
                            <TextField
                              type="number"
                              variant="outlined"
                              size="small"
                              placeholder="输入数量"
                              value={stockInputs[ing._id] || ''}
                              onChange={(e) => handleStockInputChange(ing._id, e.target.value)}
                              onFocus={(event) => event.target.select()} 
                              inputProps={{ min: 0, step: "any", sx: {fontSize: '0.85rem'} }}
                              InputProps={{
                                endAdornment: <InputAdornment position="end"><Typography variant="caption">{ing.unit}</Typography></InputAdornment>,
                                sx: {fontSize: '0.85rem'}
                              }}
                              sx={{ width: {xs: '120px', sm: '150px'} }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              <Button
                variant="contained"
                color="primary"
                startIcon={<SaveIcon />}
                onClick={handleSubmitStock}
                disabled={isSubmitting || postIngredients.length === 0}
                fullWidth={isMobile}
                sx={{ 
                  mt: {xs: 2, md: 3}, 
                  py: isMobile ? 1.25 : 1.25,
                  fontSize: isMobile ? '0.9rem' : '0.9rem',
                  borderRadius: isMobile ? '8px' : '8px',
                  boxShadow: theme.shadows[2],
                  '&:hover': {
                      boxShadow: theme.shadows[4],
                      transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease-in-out',
                }}
              >
                {isSubmitting ? <CircularProgress size={20} color="inherit" sx={{mr:1}} /> : null}
                {isSubmitting ? '正在提交...' : '提交盘点数据'}
              </Button>
            </Box>
          )}
        </Paper>
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={4000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default InventoryCheckPage; 