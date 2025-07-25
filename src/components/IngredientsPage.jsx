import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Box, IconButton, Tooltip, Stack, CircularProgress, Chip, TableSortLabel, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Select, MenuItem, FormControl, InputLabel, Grid, useTheme, useMediaQuery, Card, CardContent, TextField, FormControlLabel, Checkbox, TableFooter } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon, HelpOutline as HelpOutlineIcon, CameraAlt as CameraAltIcon, KeyboardArrowDown as KeyboardArrowDownIcon, CompareArrows as CompareArrowsIcon, Download as DownloadIcon } from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { POSTNAME } from '../config/constants';
import { useSnackbar } from './SnackbarProvider.jsx';
import { useStore } from './StoreContext.jsx'; // 1. 引入 useStore

// Helper functions for sorting
function descendingComparator(a, b, orderBy) {
  let aValue = a[orderBy];
  let bValue = b[orderBy];

  if (orderBy === 'price' || orderBy === 'totalValue' || orderBy === 'currentStock' || orderBy === 'pricePerBaseUnit') {
    aValue = a[orderBy] || 0;
    bValue = b[orderBy] || 0;
  }
  
  if (bValue < aValue) return -1;
  if (bValue > aValue) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: 'name', numeric: false, disablePadding: false, label: '原料名称', sortable: true, width: '20%' },
  { id: 'post', numeric: false, disablePadding: false, label: '负责岗位', sortable: false, width: '15%' },
  { id: 'mainWarehouseStock', numeric: true, disablePadding: false, label: '大仓库存', sortable: true, align: 'right', width: '10%' },
  { id: 'unit', numeric: false, disablePadding: false, label: '采购单位', sortable: true, align: 'right', width: '8%' },
  { id: 'specs', numeric: false, disablePadding: false, label: '规格', sortable: false, align: 'right', width: '12%' },
  { id: 'price', numeric: true, disablePadding: false, label: '采购单价', sortable: true, align: 'right', 'width': '9%' },
  { id: 'pricePerBaseUnit', numeric: true, disablePadding: false, label: '单价/(克)', sortable: true, align: 'right', width: '10%' },
  { id: 'currentStock', numeric: true, disablePadding: false, label: '总库存', sortable: true, align: 'right', width: '8%' },
  { id: 'totalValue', numeric: true, disablePadding: false, label: '总价值', sortable: true, align: 'right', width: '8%' },
];

const IngredientCard = ({ ingredient, posts, onRowToggle, isExpanded }) => {
  const { name, post, unit, specs, price, pricePerBaseUnit, currentStock, totalValue, stockByPost, mainWarehouseStock } = ingredient;
  const cardSx = { mb: 2, boxShadow: 3, '&:hover': { boxShadow: 6 } };

  return (
    <Card sx={cardSx}>
      <CardContent onClick={() => onRowToggle(ingredient._id)} sx={{ cursor: 'pointer' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>{name}</Typography>
          <Chip label={`总库存: ${currentStock.toFixed(2)} ${unit}`} color={currentStock > 0 ? 'success' : 'error'} size="small" />
        </Box>
        <Grid container spacing={1} sx={{ fontSize: '0.875rem' }}>
          <Grid item xs={6}><Typography variant="body2" color="text.secondary">大仓库存: {mainWarehouseStock?.quantity.toFixed(2) || '0.00'} {unit}</Typography></Grid>
          <Grid item xs={6}><Typography variant="body2" color="text.secondary">总价值: ¥{totalValue.toFixed(2)}</Typography></Grid>
          <Grid item xs={6}><Typography variant="body2" color="text.secondary">采购单价: ¥{price.toFixed(2)} / {unit}</Typography></Grid>
          <Grid item xs={6}><Typography variant="body2" color="text.secondary">规格: {specs}</Typography></Grid>
        </Grid>
        <Box sx={{display: 'flex', justifyContent: 'center', pt: 1, color: 'text.secondary'}}>
          <KeyboardArrowDownIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </Box>
      </CardContent>
      {isExpanded && stockByPost && (
        <CardContent sx={{ pt: 0, borderTop: '1px solid #f0f0f0' }}>
          <Typography sx={{ mb: 1, fontWeight: 500 }}>各岗位库存:</Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {posts.map(p => {
              const stockInfo = stockByPost[p.id];
              return (
                <Chip
                  key={p.id}
                  label={`${p.name}: ${stockInfo ? stockInfo.quantity.toFixed(2) : '0.00'} ${unit}`}
                  variant="outlined"
                  size="small"
                />
              );
            })}
          </Box>
        </CardContent>
      )}
    </Card>
  );
};

const IngredientsPage = () => {
  const [allIngredients, setAllIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { showSnackbar } = useSnackbar();

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [stocks, setStocks] = useState({});

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [isSnapshotting, setIsSnapshotting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Snapshot creation dialog state
  const [snapshotNotes, setSnapshotNotes] = useState('');
  const [clearDataOnCreate, setClearDataOnCreate] = useState(false);

  // Comparison Dialog State
  const [comparisonDialogOpen, setComparisonDialogOpen] = useState(false);
  const [snapshotA, setSnapshotA] = useState('');
  const [snapshotB, setSnapshotB] = useState('');
  const [comparisonResult, setComparisonResult] = useState(null);
  const [loadingComparison, setLoadingComparison] = useState(false);

  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState('current');
  const [snapshotData, setSnapshotData] = useState(null);
  const [expandedRowId, setExpandedRowId] = useState(null);

  const isSnapshotView = selectedSnapshotId !== 'current';

  const [downloading, setDownloading] = useState(false);

  const { currentStore } = useStore(); // 2. 获取当前门店信息

  const handleRowToggle = (id) => {
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const fetchIngredientsAndSetStocks = useCallback(async () => {
    if (!currentStore) return; // 如果还没有当前门店信息，则不执行获取

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ingredients/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-store-id': currentStore._id, // 关键：在请求头中发送当前门店ID
        },
        body: JSON.stringify({}), // Empty body for POST
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setAllIngredients(result.data);
        
        // Calculate and set stocks from stockByPost
        const newStocks = {};
        result.data.forEach(ingredient => {
            let totalStockedFromPosts = 0;
            if (ingredient.stockByPost) {
                let postStocks = ingredient.stockByPost;
                if (postStocks instanceof Map) {
                    for (const [_postId, stockEntry] of postStocks) {
                        if (stockEntry && typeof stockEntry.quantity === 'number') {
                            totalStockedFromPosts += stockEntry.quantity;
                        }
                    }
                } else if (typeof postStocks === 'object' && postStocks !== null) {
                    for (const postId in postStocks) {
                        if (postStocks.hasOwnProperty(postId) && postStocks[postId] && typeof postStocks[postId].quantity === 'number') {
                            totalStockedFromPosts += postStocks[postId].quantity;
                        }
                    }
                }
            }
            newStocks[ingredient.name] = totalStockedFromPosts;
        });
        setStocks(newStocks);
        console.log("Aggregated stocks initialized from stockByPost:", newStocks);

      } else {
        console.error("Failed to fetch ingredients or data format is incorrect:", result.message || 'Unknown API error');
        setError(result.message || 'Failed to load ingredients or data format is incorrect.');
        setAllIngredients([]);
        setStocks({});
      }
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      setError(`Error fetching ingredients: ${err.message}`);
      setAllIngredients([]);
      setStocks({});
    } finally {
      setLoading(false);
    }
  }, [currentStore]); // 关键：useCallback 依赖于 currentStore

  const fetchSnapshots = useCallback(async () => {
    if (!currentStore) return; // 同样检查 currentStore

    try {
      const response = await fetch('/api/inventory/snapshots', {
        headers: {
          'x-current-store-id': currentStore._id, // 也为快照列表请求添加门店ID
        },
      });
      const result = await response.json();
      if(result.success) {
        setSnapshots(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch snapshots list", err);
    }
  }, [currentStore]); // 关键：useCallback 依赖于 currentStore

  const fetchSnapshotDetails = useCallback(async (id) => {
    if (id === 'current') {
      fetchIngredientsAndSetStocks();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/inventory/snapshots/${id}`, {
        headers: {
          'x-current-store-id': currentStore._id, // 为快照详情请求添加门店ID
        },
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || '获取快照详情失败');
      setSnapshotData(result.data);
      setAllIngredients([]); // Clear current ingredients
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchIngredientsAndSetStocks, currentStore]); // 依赖项现在也包括 currentStore

  useEffect(() => {
    // 只有在当前门店加载完毕后才获取数据
    if (currentStore) {
      fetchSnapshots();
      fetchIngredientsAndSetStocks();
    }
  }, [fetchSnapshots, fetchIngredientsAndSetStocks, currentStore]); // 3. 将 currentStore 加入依赖项

  const handleSnapshotChange = (event) => {
    const id = event.target.value;
    setSelectedSnapshotId(id);
    fetchSnapshotDetails(id);
  };

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const handleOpenDialog = () => {
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleOpenRestoreDialog = () => {
    if (selectedSnapshotId === 'current') {
      showSnackbar('请先选择一个要还原的历史快照', 'warning');
      return;
    }
    setRestoreDialogOpen(true);
  };

  const handleCloseRestoreDialog = () => {
    setRestoreDialogOpen(false);
  };

  const getConsumptionColor = (value) => {
    if (value > 0) return theme.palette.error.main; // 消耗，红色
    if (value < 0) return theme.palette.success.main; // 盈余，绿色
    return theme.palette.text.primary;
  };

  const handleCompare = async () => {
    if (!snapshotA || !snapshotB) {
      showSnackbar('请选择两个历史快照进行对比', 'warning');
      return;
    }
    setLoadingComparison(true);
    setComparisonResult(null);
    try {
      const response = await fetch(`/api/ingredients/compare?from=${snapshotA}&to=${snapshotB}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success) {
        setComparisonResult(result.data);
        showSnackbar('快照对比成功', 'success');
      } else {
        throw new Error(result.message || '对比失败');
      }
    } catch (err) {
      showSnackbar(`对比快照时出错: ${err.message}`, 'error');
    } finally {
      setLoadingComparison(false);
    }
  };

  const handleConfirmSnapshot = async () => {
    setIsSnapshotting(true);
    try {
      const response = await fetch('/api/inventory/snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: snapshotNotes, clearData: clearDataOnCreate }),
      });
      const result = await response.json();
      if (result.success) {
        showSnackbar('库存清理操作已成功完成！', 'success');
        fetchSnapshots(); // Refresh snapshot list
        // 重新获取当前库存数据以刷新页面显示
        if (clearDataOnCreate) {
          fetchIngredientsAndSetStocks(); // 如果清理了库存，需要重新获取数据
        }
        handleCloseDialog();
        setSnapshotNotes('');
        setClearDataOnCreate(false);
      } else {
        throw new Error(result.message || '清理库存失败');
      }
    } catch (err) {
      showSnackbar(`清理库存时出错: ${err.message}`, 'error');
    } finally {
      setIsSnapshotting(false);
    }
  };

  const handleConfirmRestore = async () => {
    handleCloseRestoreDialog();
    setIsRestoring(true);
    try {
      const response = await fetch(`/api/inventory/restore/${selectedSnapshotId}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || '操作失败');
      showSnackbar(data.message, 'success');
      fetchIngredientsAndSetStocks(); // Refresh data to show restored state
      setSelectedSnapshotId('current'); // Switch back to current view
    } catch (err) {
      showSnackbar(err.message, 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Common styles for table cells
  const commonCellSx = { py: 0.75, fontSize: '0.875rem' };
  const commonHeaderCellSx = { py: 0.5, fontSize: '0.875rem', fontWeight: 'bold', backgroundColor: 'grey.100' };

  // Calculate grand total inventory value -- THIS SECTION IS BEING REMOVED
  // let grandTotalInventoryValue = 0; // This line is removed
  const processedIngredients = useMemo(() => {
    const sourceData = isSnapshotView && snapshotData ? snapshotData.ingredients : allIngredients;
    
    return sourceData.map(ing => {
      const mainStock = ing.mainWarehouseStock?.quantity || 0;
      let postStock = 0;
      if (ing.stockByPost) {
        postStock = Object.values(ing.stockByPost).reduce((sum, post) => sum + (post?.quantity || 0), 0);
      }
      
      const currentStock = mainStock + postStock;
      const price = ing.price || 0;
      const totalValue = currentStock * price;

      const pricePerBaseUnit = (ing.baseUnit && ing.norms && ing.price) 
          ? (ing.price / (ing.norms / (ing.baseUnit === 'kg' ? 1000 : 1))) 
          : 0;

      return {
        ...ing,
        currentStock,
        totalValue,
        pricePerBaseUnit,
      };
    });
  }, [allIngredients, snapshotData, isSnapshotView]);
  
  // grandTotalInventoryValue = useMemo(() => { // This useMemo hook for grandTotalInventoryValue is removed
  //   return ingredientsWithCalculatedValues.reduce((sum, ingredient) => sum + ingredient.totalValue, 0);
  // }, [ingredientsWithCalculatedValues]);

  const { grandTotalInventoryValue, visibleRows } = useMemo(() => {
    let grandTotal = 0;
    processedIngredients.forEach(ing => {
      grandTotal += ing.totalValue || 0;
    });

    const sortedRows = stableSort(processedIngredients, getComparator(order, orderBy));
    
    return { grandTotalInventoryValue: grandTotal, visibleRows: sortedRows };
  }, [processedIngredients, order, orderBy]);

  const sortedIngredients = useMemo(() => {
    const dataToSort = isSnapshotView && snapshotData ? snapshotData.ingredients : allIngredients;
    return stableSort(dataToSort, getComparator(order, orderBy));
  }, [order, orderBy, allIngredients, snapshotData, isSnapshotView]);

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
      let filename = 'realtime_inventory.xlsx';
      const disposition = response.headers.get('Content-Disposition');
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = decodeURIComponent(disposition.split('filename=')[1].replace(/['\"]/g, ''));
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
      showSnackbar('导出成功', 'success');
    } catch (err) {
      showSnackbar('导出失败: ' + err.message, 'error');
    } finally {
      setDownloading(false);
    }
  };

  if (loading && allIngredients.length === 0 && !snapshotData) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>正在加载原料数据...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', backgroundColor: 'error.light' }}>
          <Typography variant="h5" color="error.contrastText">原料数据加载失败</Typography>
          <Typography color="error.contrastText" sx={{ mt: 1 }}>{error}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{mt: 2}}>刷新页面</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">原料管理</Typography>
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

      <Typography variant="h4" sx={{ my: 3, textAlign: 'center' }}>
        原料库存总览
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3, gap: 2 }}>
         <Button
            variant="contained"
            color="primary"
            onClick={() => setComparisonDialogOpen(true)}
            startIcon={<CompareArrowsIcon />}
            sx={{ py: 1.5, px: 3 }}
          >
            对比快照/计算消耗
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleOpenDialog} 
            startIcon={<CameraAltIcon />}
            sx={{ py: 1.5, px: 3 }}
          >
            清理岗位库存
          </Button>
      </Box>

      <Paper elevation={2} sx={{ p: { xs: 1, sm: 2 }, m: { xs: 0, sm: 1 }, boxShadow: 3 }}>
        <Grid container spacing={2} justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Grid item xs={12} md>
                <Typography variant="h4" component="h1" gutterBottom sx={{ m: 0 }}>
                    库存总览
                </Typography>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth size="small">
                    <InputLabel>查看数据</InputLabel>
                    <Select
                        value={selectedSnapshotId}
                        label="查看数据"
                        onChange={handleSnapshotChange}
                    >
                        <MenuItem value="current"><em>当前实时库存</em></MenuItem>
                        {snapshots.map(snap => (
                            <MenuItem key={snap._id} value={snap._id}>
                                {`${snap.year}年 第${snap.weekOfYear}周 (创建于 ${format(new Date(snap.createdAt), 'yyyy-MM-dd')})`}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md="auto">
                <Button
                    fullWidth
                    variant="outlined"
                    color="warning"
                    onClick={handleOpenRestoreDialog}
                    disabled={isRestoring || !isSnapshotView}
                >
                    {isRestoring ? '正在还原...' : '从此快照还原库存'}
                </Button>
            </Grid>
        </Grid>
        
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2, color: 'text.secondary', fontSize: '0.9rem' }}>
            <InfoOutlinedIcon fontSize="small" />
            <Typography variant="body2">
                {isSnapshotView 
                    ? `您正在查看 ${format(new Date(snapshotData?.createdAt), 'yyyy年MM月dd日')} 创建的历史快照。`
                    : '此页面汇总所有岗位盘点的实时库存数据。总库存为各岗位库存之和。'}
            </Typography>
        </Stack>

        <Typography variant="h6" align="right" sx={{ mb: 2, fontWeight: 'bold' }}>
            库存总价值: ¥{grandTotalInventoryValue.toFixed(2)}
        </Typography>

        {isDesktop ? (
          <TableContainer component={Paper} sx={{ boxShadow: 3 }}>
            <Table stickyHeader aria-label="ingredients table">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox" />
                  {headCells.map((headCell) => (
                    <TableCell
                      key={headCell.id}
                      align={headCell.align || (headCell.numeric ? 'right' : 'left')}
                      padding={headCell.disablePadding ? 'none' : 'normal'}
                      sortDirection={orderBy === headCell.id ? order : false}
                      sx={{ ...commonHeaderCellSx, width: headCell.width }}
                    >
                      {headCell.sortable ? (
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : 'asc'}
                          onClick={(event) => handleRequestSort(event, headCell.id)}
                        >
                          {headCell.label}
                          {orderBy === headCell.id ? (
                            <Box component="span" sx={visuallyHidden}>
                              {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                            </Box>
                          ) : null}
                        </TableSortLabel>
                      ) : (
                        headCell.label
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleRows.map((ingredient) => {
                  const { _id, name, unit, specs, price, currentStock, totalValue, stockByPost, pricePerBaseUnit, mainWarehouseStock } = ingredient;
                  const isExpanded = expandedRowId === _id;
                  
                  return (
                    <React.Fragment key={_id}>
                      <TableRow 
                        hover 
                        onClick={() => handleRowToggle(_id)} 
                        sx={{ 
                          cursor: 'pointer', 
                          '& > *': { borderBottom: isExpanded ? 'none' : 'unset' },
                          backgroundColor: isExpanded ? 'action.hover' : 'transparent'
                        }}
                      >
                        <TableCell padding="checkbox">
                          <IconButton size="small">
                            <KeyboardArrowDownIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                          </IconButton>
                        </TableCell>
                        <TableCell sx={commonCellSx}>{name}</TableCell>
                        <TableCell sx={commonCellSx}>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                            {Object.entries(POSTNAME).map(([pId, pName]) => {
                              const stockInfo = stockByPost && stockByPost[pId];
                              if (stockInfo && stockInfo.quantity > 0) {
                                return <Chip key={pId} label={`${pName}: ${stockInfo.quantity.toFixed(2)}`} size="small" variant="outlined" />;
                              }
                              return null;
                            })}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={commonCellSx}>{mainWarehouseStock?.quantity.toFixed(2) || '0.00'}</TableCell>
                        <TableCell align="right" sx={commonCellSx}>{unit}</TableCell>
                        <TableCell align="right" sx={commonCellSx}>{specs}</TableCell>
                        <TableCell align="right" sx={commonCellSx}>¥{price.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={commonCellSx}>¥{pricePerBaseUnit.toFixed(4)}</TableCell>
                        <TableCell align="right" sx={commonCellSx}>
                          <Chip label={currentStock.toFixed(2)} color={currentStock > 0 ? 'success' : 'error'} />
                        </TableCell>
                        <TableCell align="right" sx={commonCellSx}>¥{totalValue.toFixed(2)}</TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow sx={{ backgroundColor: isExpanded ? 'action.hover' : 'transparent' }}>
                          <TableCell colSpan={headCells.length + 1} sx={{ p: 0, borderBottom: '1px solid rgba(224, 224, 224, 1)' }}>
                              <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                                <Typography variant="subtitle2" gutterBottom>各岗位库存详情</Typography>
                                <Grid container spacing={1}>
                                  {Object.entries(POSTNAME).map(([pId, pName]) => {
                                    const stockInfo = stockByPost && stockByPost[pId];
                                    return (
                                      <Grid item xs={12} sm={6} md={4} lg={3} key={pId}>
                                        <Chip
                                          label={`${pName}: ${stockInfo ? stockInfo.quantity.toFixed(2) : '0.00'} ${unit}`}
                                          variant="outlined"
                                          sx={{ width: '100%', justifyContent: 'flex-start', pl: 1 }}
                                        />
                                      </Grid>
                                    );
                                  })}
                                </Grid>
                              </Box>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Box>
            {visibleRows.map((ingredient) => (
              <IngredientCard 
                key={ingredient._id} 
                ingredient={ingredient} 
                posts={Object.entries(POSTNAME).map(([id, name]) => ({ id, name }))}
                onRowToggle={handleRowToggle}
                isExpanded={expandedRowId === ingredient._id}
              />
            ))}
          </Box>
        )}

        {visibleRows.length === 0 && !loading && (
            <Typography sx={{textAlign: 'center', mt: 3, color: 'text.secondary'}}>
                {isSnapshotView ? '快照数据为空。' : '未找到原料数据。请确保API服务正常或数据库中有数据。'}
            </Typography>
        )}
      </Paper>

      {/* <Paper elevation={2} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>库存快照操作</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>查看快照</InputLabel>
              <Select
                value={selectedSnapshotId}
                label="查看快照"
                onChange={handleSnapshotChange}
              >
                <MenuItem value="current"><em>当前实时库存</em></MenuItem>
                {snapshots.map(s => (
                  <MenuItem key={s._id} value={s._id}>{format(new Date(s.createdAt), 'yyyy-MM-dd HH:mm:ss')} - {s.notes || '无备注'}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={8}>
            <Stack direction="row" spacing={1} justifyContent="flex-start" sx={{ flexWrap: 'wrap', gap: 1 }}>
              <Button
                variant="contained"
                color="secondary"
                onClick={() => setComparisonDialogOpen(true)}
                startIcon={<CompareArrowsIcon />}
              >
                对比快照/计算消耗
              </Button>
              <Button variant="contained" onClick={handleOpenDialog} startIcon={<CameraAltIcon />}>
                清理岗位库存
              </Button>
              <Tooltip title="将当前库存数据还原至所选快照的状态">
                <span>
                  <Button variant="outlined" color="warning" onClick={handleOpenRestoreDialog} disabled={selectedSnapshotId === 'current'}>
                    还原到此快照
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper> */}

      {loadingComparison && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
      )}


      <Dialog
        open={dialogOpen}
        onClose={handleCloseDialog}
      >
        <DialogTitle>确认操作</DialogTitle>
        <DialogContent>
          <DialogContentText>
            此操作将以当前各岗位填写的库存数量为准，生成一份全店的库存快照，作为后续计算和还原的基准。快照生成后，今日库存将被清零以便开始新的盘点。
          </DialogContentText>
          <FormControlLabel
            control={
              <Checkbox
                checked={clearDataOnCreate}
                onChange={e => setClearDataOnCreate(e.target.checked)}
              />
            }
            label="生成快照后清空当前库存（用于新一轮盘点）"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>取消</Button>
          <Button onClick={handleConfirmSnapshot} color="primary" autoFocus>
            确认生成
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={restoreDialogOpen}
        onClose={handleCloseRestoreDialog}
      >
        <DialogTitle>确认还原库存</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您确定要从此快照还原库存吗？此操作将覆盖当前的全部库存数据，且无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRestoreDialog}>取消</Button>
          <Button onClick={handleConfirmRestore} color="warning" autoFocus>
            确认还原
          </Button>
        </DialogActions>
      </Dialog>

      {/* Comparison Dialog */}
      <Dialog open={comparisonDialogOpen} onClose={() => setComparisonDialogOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>对比快照与消耗分析</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1, mb: 2 }}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>起始节点</InputLabel>
                <Select value={snapshotA} label="起始节点" onChange={(e) => setSnapshotA(e.target.value)}>
                  <MenuItem value="current"><em>当前实时库存</em></MenuItem>
                  {snapshots.map(s => (
                    <MenuItem key={s._id} value={s._id}>{format(new Date(s.createdAt), 'yyyy-MM-dd HH:mm:ss')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>结束节点</InputLabel>
                <Select value={snapshotB} label="结束节点" onChange={(e) => setSnapshotB(e.target.value)}>
                  <MenuItem value="current"><em>当前实时库存</em></MenuItem>
                  {snapshots.map(s => (
                    <MenuItem key={s._id} value={s._id}>{format(new Date(s.createdAt), 'yyyy-MM-dd HH:mm:ss')}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <Button
              variant="contained"
              onClick={handleCompare}
              disabled={loadingComparison || !snapshotA || !snapshotB}
              startIcon={loadingComparison ? <CircularProgress size={20} /> : <CompareArrowsIcon />}
            >
              计算消耗
            </Button>
          </Box>

          {loadingComparison && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}

          {comparisonResult && (
            <Paper elevation={2} sx={{ p: 2 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>对比结果</Typography>
              <TableContainer>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>原料名称</TableCell>
                      <TableCell align="right">起始库存</TableCell>
                      <TableCell align="right">结束库存</TableCell>
                      <TableCell align="right">消耗量</TableCell>
                      <TableCell>单位</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {comparisonResult.items.map((item) => (
                      <TableRow key={item.ingredientId}>
                        <TableCell>{item.ingredientName}</TableCell>
                        <TableCell align="right">{item.quantityA.toFixed(2)}</TableCell>
                        <TableCell align="right">{item.quantityB.toFixed(2)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: getConsumptionColor(item.consumption) }}>
                          {item.consumption.toFixed(2)}
                        </TableCell>
                        <TableCell>{item.unit}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow sx={{ '& td, & th': { fontWeight: 'bold', fontSize: '1rem', borderTop: '2px solid rgba(224, 224, 224, 1)' } }}>
                      <TableCell component="th">总计金额</TableCell>
                      <TableCell align="right">¥{comparisonResult.totals.valueA.toFixed(2)}</TableCell>
                      <TableCell align="right">¥{comparisonResult.totals.valueB.toFixed(2)}</TableCell>
                      <TableCell align="right" sx={{ color: getConsumptionColor(comparisonResult.totals.valueConsumption) }}>
                        ¥{comparisonResult.totals.valueConsumption.toFixed(2)}
                      </TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            </Paper>
          )}

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setComparisonDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IngredientsPage; 