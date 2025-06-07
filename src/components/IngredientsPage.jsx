import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Container, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Box, Snackbar, Alert as MuiAlert, IconButton, Tooltip, Stack, CircularProgress, Chip, TableSortLabel } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon, HelpOutline as HelpOutlineIcon } from '@mui/icons-material';
import { visuallyHidden } from '@mui/utils';
import { Link } from 'react-router-dom';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

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

// Helper functions for sorting
function descendingComparator(a, b, orderBy) {
  let aValue = a[orderBy];
  let bValue = b[orderBy];

  // Handle nested properties for price and stock value
  if (orderBy === 'price') {
    aValue = a.price || 0;
    bValue = b.price || 0;
  }
  // For 'currentStock' and 'totalValue', we need to access calculated values.
  // These will be added to the ingredient objects before sorting.

  if (bValue < aValue) {
    return -1;
  }
  if (bValue > aValue) {
    return 1;
  }
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
    if (order !== 0) {
      return order;
    }
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: 'name', numeric: false, disablePadding: false, label: '原料名称', sortable: true, width: '20%' },
  { id: 'post', numeric: false, disablePadding: false, label: '负责岗位', sortable: false, width: '18%' },
  { id: 'unit', numeric: false, disablePadding: false, label: '采购单位', sortable: true, align: 'right', width: '8%' },
  { id: 'specs', numeric: false, disablePadding: false, label: '规格', sortable: false, align: 'right', width: '15%' },
  { id: 'price', numeric: true, disablePadding: false, label: '采购单价', sortable: true, align: 'right', width: '10%' },
  { id: 'pricePerBaseUnit', numeric: true, disablePadding: false, label: '单价/基本单位', sortable: true, align: 'right', width: '12%' },
  { id: 'currentStock', numeric: true, disablePadding: false, label: '总库存', sortable: true, align: 'right', width: '8%' },
  { id: 'totalValue', numeric: true, disablePadding: false, label: '总价值', sortable: true, align: 'right', width: '9%' },
];

const IngredientsPage = () => {
  const [allIngredients, setAllIngredients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [stocks, setStocks] = useState({});
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('name');

  const fetchIngredientsAndSetStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ingredients/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
  }, []);

  useEffect(() => {
    fetchIngredientsAndSetStocks();
  }, [fetchIngredientsAndSetStocks]);

  const handleRequestSort = (event, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

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

  // Common styles for table cells
  const commonCellSx = { py: 0.75, fontSize: '0.875rem' };
  const commonHeaderCellSx = { py: 0.5, fontSize: '0.875rem', fontWeight: 'bold', backgroundColor: 'grey.100' };

  // Calculate grand total inventory value -- THIS SECTION IS BEING REMOVED
  // let grandTotalInventoryValue = 0; // This line is removed
  const ingredientsWithCalculatedValues = useMemo(() => {
    if (allIngredients.length > 0) {
        return allIngredients.map(ingredient => {
            const currentStock = ingredient.currentStock !== undefined ? ingredient.currentStock : 0;
            const price = ingredient.price || 0;
            const norms = ingredient.norms || 0;
            const totalValue = currentStock * price;
            const pricePerBaseUnit = (norms > 0 && price > 0) ? (price / norms) : 0;
            
            // grandTotalInventoryValue += totalValue; // Ensure this kind of line is not present
            return {
                ...ingredient,
                currentStock: currentStock,
                totalValue: totalValue,
                pricePerBaseUnit: pricePerBaseUnit,
            };
        });
    }
    return [];
  }, [allIngredients]);
  
  // grandTotalInventoryValue = useMemo(() => { // This useMemo hook for grandTotalInventoryValue is removed
  //   return ingredientsWithCalculatedValues.reduce((sum, ingredient) => sum + ingredient.totalValue, 0);
  // }, [ingredientsWithCalculatedValues]);

  const sortedIngredients = useMemo(() => {
    function customDescendingComparator(a, b, orderBy) {
        let aValue = a[orderBy];
        let bValue = b[orderBy];

        if (orderBy === 'price') {
            aValue = a.price || 0;
            bValue = b.price || 0;
        } else if (orderBy === 'pricePerBaseUnit') {
            aValue = a.pricePerBaseUnit || 0;
            bValue = b.pricePerBaseUnit || 0;
        } else if (orderBy === 'currentStock') {
            aValue = a.currentStock !== undefined ? a.currentStock : -Infinity;
            bValue = b.currentStock !== undefined ? b.currentStock : -Infinity;
        } else if (orderBy === 'totalValue') {
            aValue = a.totalValue !== undefined ? a.totalValue : -Infinity;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            const strA = aValue || '';
            const strB = bValue || '';
            return strB.localeCompare(strA, 'zh-Hans-CN');
        }

        if (bValue < aValue) {
            return -1;
        }
        if (bValue > aValue) {
            return 1;
        }
        return 0;
    }

    function customGetComparator(order, orderBy) {
        return order === 'desc'
            ? (a, b) => customDescendingComparator(a, b, orderBy)
            : (a, b) => -customDescendingComparator(a, b, orderBy);
    }
    return stableSort(ingredientsWithCalculatedValues, customGetComparator(order, orderBy));
  }, [ingredientsWithCalculatedValues, order, orderBy]);

  if (loading) {
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
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" gutterBottom component="div">
          原料基础信息维护
          <Tooltip title="查看原料页面操作指南">
            <IconButton component={Link} to="/operation-guide#ingredients-page" size="small" sx={{ ml: 1 }}>
              <HelpOutlineIcon />
            </IconButton>
          </Tooltip>
        </Typography>
        {/* The following Typography component displaying grandTotalInventoryValue is removed
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          总库存价值: ¥{grandTotalInventoryValue.toFixed(2)}
        </Typography>
        */}
      </Stack>
      
      <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: 3}}>
        <Typography variant="body1">
          此处显示各原料在所有岗位上的库存总和。要更新特定岗位的库存，请前往"库存盘点"页面。
        </Typography>
      </Paper>

      <TableContainer component={Paper} elevation={2}>
        <Table sx={{ minWidth: 850 }} aria-label="ingredients stock table">
          <TableHead>
            <TableRow>
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
            {sortedIngredients.map((ingredient) => {
              const assignedPostsDisplay = Array.isArray(ingredient.post) && ingredient.post.length > 0
                ? ingredient.post.map(postId => POSTNAME[postId] || `ID: ${postId}`).join(', ')
                : '-';
              
              return (
                <TableRow hover key={ingredient._id || ingredient.name}> {/* Use _id if available, fallback to name */}
                  <TableCell component="th" scope="row" sx={commonCellSx}>
                    {ingredient.name}
                    {ingredient.thumb && (
                        <Tooltip title={<img src={ingredient.thumb} alt={ingredient.name} style={{ maxWidth: '150px', maxHeight: '150px' }} />}>
                            <IconButton size="small" sx={{ ml: 0.5, p:0.2 }}><InfoOutlinedIcon fontSize="inherit" /></IconButton>
                        </Tooltip>
                    )}
                  </TableCell>
                  <TableCell sx={commonCellSx}>
                    { Array.isArray(ingredient.post) && ingredient.post.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {ingredient.post.map(postId => (
                          <Chip key={postId} label={POSTNAME[postId] || `ID: ${postId}`} size="small" />
                        ))}
                      </Box>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell align="right" sx={commonCellSx}>{ingredient.unit}</TableCell>
                  <TableCell align="right" sx={commonCellSx}>{ingredient.specs} ({ingredient.norms} {ingredient.baseUnit || ingredient.min}/{ingredient.unit})</TableCell>
                  <TableCell align="right" sx={commonCellSx}>{(ingredient.price || 0).toFixed(2)}</TableCell>
                  <TableCell align="right" sx={commonCellSx}>
                    {typeof ingredient.pricePerBaseUnit === 'number' 
                      ? `¥${ingredient.pricePerBaseUnit.toFixed(3)} / ${ingredient.baseUnit || '基准单位'}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell align="right" sx={commonCellSx}>
                    {ingredient.currentStock !== undefined ? ingredient.currentStock : 'N/A'}
                  </TableCell>
                  <TableCell align="right" sx={commonCellSx}>
                    {ingredient.totalValue !== undefined ? ingredient.totalValue.toFixed(2) : 'N/A'}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      {sortedIngredients.length === 0 && !loading && (
        <Typography sx={{textAlign: 'center', mt: 3, color: 'text.secondary'}}>未找到原料数据。请确保API服务正常或数据库中有数据。</Typography>
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default IngredientsPage; 