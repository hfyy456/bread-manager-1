import React, { useCallback, useState, useEffect, useMemo, useContext } from 'react';
import { 
  Card, CardContent, Typography, Grid, Container, Box, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, InputAdornment, Button, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, FormControl, InputLabel, Select, MenuItem, CircularProgress, Chip, OutlinedInput,
  TableSortLabel,
  Tooltip
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { DataContext } from '@components/DataContext';
import { POSTNAME } from '@/config/constants';

// const categories = ['基础材料', '发酵剂', '调味料', '油脂', '液体', '辅料', '馅料材料']; // Not used currently

// Helper function for stable sorting
function descendingComparator(a, b, orderBy) {
  let bValue = b[orderBy];
  let aValue = a[orderBy];

  // Handle numeric strings for price and norms specifically if they are not already numbers
  if (orderBy === 'price' || orderBy === 'norms') {
    bValue = parseFloat(bValue);
    aValue = parseFloat(aValue);
  }
  // Handle dates for updatedAt
  if (orderBy === 'updatedAt' || orderBy === 'createdAt') {
    bValue = new Date(bValue);
    aValue = new Date(aValue);
  }

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

// This method is created for cross-browser compatibility, if you don't
// need to support IE11, you can use Array.prototype.sort() directly
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
  // { id: '_id', numeric: false, disablePadding: false, label: 'ID' }, // Not typically sorted
  { id: 'name', numeric: false, disablePadding: false, label: '名称' },
  { id: 'unit', numeric: false, disablePadding: false, label: '采购单位' },
  { id: 'price', numeric: true, disablePadding: false, label: '单价(元)' },
  { id: 'baseUnit', numeric: false, disablePadding: false, label: '基础单位' },
  { id: 'norms', numeric: true, disablePadding: false, label: '换算规格' },
  { id: 'updatedAt', numeric: false, disablePadding: false, label: '最后更新' }, 
  // Specs is often complex text, less ideal for sorting by default
  // { id: 'specs', numeric: false, disablePadding: false, label: '规格' }, 
];

const IngredientList = () => {
  const [ingredientsData, setIngredientsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiFeedback, setApiFeedback] = useState({ open: false, message: '', severity: 'info' });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [sortOrder, setSortOrder] = useState('desc');
  const [sortOrderBy, setSortOrderBy] = useState('updatedAt');

  const handleSortRequest = (property) => {
    const isAsc = sortOrderBy === property && sortOrder === 'asc';
    setSortOrder(isAsc ? 'desc' : 'asc');
    setSortOrderBy(property);
  };
  
  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    setError(null);
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
        const errorResult = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(errorResult.message || `HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        setIngredientsData(result.data);
      } else {
        console.error("Failed to fetch ingredients or data format is incorrect:", result.message || 'Unknown API error');
        setError(result.message || 'Failed to load ingredients or data format is incorrect.');
        setIngredientsData([]);
      }
    } catch (err) {
      console.error("Error fetching ingredients:", err);
      setError(`Error fetching ingredients: ${err.message}`);
      setIngredientsData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);
  
  const sortedAndFilteredIngredients = useMemo(() => {
    if (!ingredientsData) return [];
    let filtered = ingredientsData.filter(ingredient => 
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    return stableSort(filtered, getComparator(sortOrder, sortOrderBy));
  }, [ingredientsData, searchTerm, sortOrder, sortOrderBy]);

  const handleAdd = () => {
    setSelectedIngredient({ 
      name: '', 
      unit: '克', 
      price: '', // Allow empty string for better UX with type number
      specs: '', 
      min: '克', // Use 'min' instead of 'baseUnit'
      norms: 1, 
      post: [] // Initialize post as empty array
    }); 
    setIsEditing(false);
    setDialogOpen(true);
  };

  const handleEdit = (ingredient) => {
    setSelectedIngredient({ 
      ...ingredient, 
      post: ingredient.post || [] // Ensure post is an array
    });
    setIsEditing(true);
    setDialogOpen(true);
  };

  const handleDelete = async (ingredientId) => {
    if (window.confirm('确定要删除这个配料吗？')) {
      try {
        const response = await fetch('/api/ingredients/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: ingredientId }),
        });
        const result = await response.json();
        if (!response.ok || !result.message) { // Assuming success implies a message
             throw new Error(result.message || `API error ${response.status}`);
        }
        setApiFeedback({ open: true, message: result.message || '原料删除成功!', severity: 'success' });
        fetchIngredients(); // Refresh list
      } catch (err) {
        console.error('Error deleting ingredient:', err);
        setApiFeedback({ open: true, message: `删除失败: ${err.message}`, severity: 'error' });
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedIngredient || !selectedIngredient.name || selectedIngredient.price === undefined || selectedIngredient.price === '' || !selectedIngredient.unit || !selectedIngredient.min || selectedIngredient.norms === undefined || selectedIngredient.norms === '') {
      setApiFeedback({ open: true, message: '名称, 单位, 价格, 基础单位, 换算规格 是必填项。', severity: 'warning' });
      return;
    }
    if (parseFloat(selectedIngredient.price) < 0) {
        setApiFeedback({ open: true, message: '价格不能为负数。', severity: 'warning' });
        return;
    }
    if (parseFloat(selectedIngredient.norms) <= 0) {
        setApiFeedback({ open: true, message: '换算规格必须大于0。', severity: 'warning' });
        return;
    }

    const endpoint = isEditing ? '/api/ingredients/update' : '/api/ingredients/create';
    const method = 'POST'; // Both are POST
    
    // Ensure the payload has 'min' instead of 'baseUnit'
    const { baseUnit, ...restOfIngredient } = selectedIngredient;
    const body = isEditing 
        ? { ...restOfIngredient, id: selectedIngredient._id } 
        : restOfIngredient;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `API error ${response.status}`);
    }
    
      setApiFeedback({ open: true, message: isEditing ? '原料更新成功!' : '原料添加成功!', severity: 'success' });
    setDialogOpen(false);
      fetchIngredients(); // Refresh list
    } catch (err) {
      console.error(`Error ${isEditing ? 'updating' : 'adding'} ingredient:`, err);
      setApiFeedback({ open: true, message: `${isEditing ? '更新' : '添加'}失败: ${err.message}`, severity: 'error' });
    }
  };

  const handleCloseSnackbar = () => {
    setApiFeedback({ ...apiFeedback, open: false });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>正在加载物料数据...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <Paper elevation={3} sx={{ p: 3, backgroundColor: 'error.light', borderRadius: '8px' }}>
          <Typography variant="h6" color="error.contrastText">物料数据加载失败</Typography>
          <Typography color="error.contrastText" sx={{ mt: 1 }}>{error}</Typography>
          <Button variant="contained" onClick={fetchIngredients} sx={{ mt: 2, color:'white', backgroundColor: 'error.dark' }}>重试</Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5, flexWrap: 'wrap' }}>
        <Box display="flex" alignItems="center" sx={{ mb: { xs: 1.5, sm: 0 } }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: '500', mr: 1 }}>
          物料管理
        </Typography>
          <Tooltip title="查看操作指南">
            <IconButton component={Link} to="/operation-guide#ingredient-management" size="small" sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
      </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexWrap: 'wrap' }}>
        <TextField
          label="搜索物料"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ fontFamily: 'Inter, sans-serif' }}
        />
          <Button 
            variant="contained" 
            color="primary" 
            startIcon={<AddIcon />}
            onClick={handleAdd}
            sx={{ fontFamily: 'Inter, sans-serif' }}
          >
            添加物料
          </Button>
        </Box>
      </Box>
      
      {ingredientsData.length === 0 && !loading && (
        <Typography sx={{textAlign: 'center', my: 5, color: 'text.secondary'}}>
            没有找到物料数据。您可以尝试添加新的物料。
        </Typography>
      )}

      {ingredientsData.length > 0 && (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>ID</TableCell>
              {headCells.map((headCell) => (
                <TableCell
                  key={headCell.id}
                  align={headCell.numeric ? 'right' : 'left'}
                  padding={headCell.disablePadding ? 'none' : 'normal'}
                  sortDirection={sortOrderBy === headCell.id ? sortOrder : false}
                  sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  <TableSortLabel
                    active={sortOrderBy === headCell.id}
                    direction={sortOrderBy === headCell.id ? sortOrder : 'asc'}
                    onClick={() => handleSortRequest(headCell.id)}
                  >
                    {headCell.label}
                    {sortOrderBy === headCell.id ? (
                      <Box component="span" sx={visuallyHidden}>
                        {sortOrder === 'desc' ? 'sorted descending' : 'sorted ascending'}
                      </Box>
                    ) : null}
                  </TableSortLabel>
                </TableCell>
              ))}
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>规格</TableCell>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>适用岗位</TableCell>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedAndFilteredIngredients.map((ingredient) => (
                <TableRow key={ingredient._id} hover>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px' }}>{ingredient._id}</TableCell>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.name}</TableCell>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.unit}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>{typeof ingredient.price === 'number' ? ingredient.price.toFixed(2) : ingredient.price}</TableCell>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.min}</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.norms}</TableCell>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap' }}>{formatDate(ingredient.updatedAt)}</TableCell>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '150px' }}>{ingredient.specs || '-'}</TableCell>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                    {(ingredient.post && ingredient.post.length > 0) ? 
                        ingredient.post.map(pId => POSTNAME[pId] || `ID:${pId}`).join(', ') 
                        : '未指定'}
                </TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <IconButton onClick={() => handleEdit(ingredient)} size="small" color="secondary">
                    <EditIcon />
                  </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(ingredient._id)} size="small">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      )}
      
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          {isEditing ? '编辑物料' : '添加物料'}
        </DialogTitle>
        <DialogContent>
          {selectedIngredient && (
            <Box sx={{ width: { xs: '100%', sm: 400 }, display: 'flex', flexDirection: 'column', gap: 2, pt:1 }}>
              {isEditing && selectedIngredient._id && (
              <TextField
                  label="ID"
                variant="outlined"
                  value={selectedIngredient._id}
                disabled 
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              )}
              <TextField
                label="名称"
                variant="outlined"
                value={selectedIngredient.name || ''}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, name: e.target.value })}
                required
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="采购单位 (如: 克, 千克, 袋, 瓶)"
                variant="outlined"
                value={selectedIngredient.unit || ''}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, unit: e.target.value })}
                required
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="单价 (元, 对应该采购单位)"
                variant="outlined"
                type="number"
                value={selectedIngredient.price === undefined ? '' : selectedIngredient.price}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, price: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                required
                InputProps={{ inputProps: { min: 0, step: '0.01' } }}
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="采购规格 (描述性, 如: 500g/袋, 1L/瓶)"
                variant="outlined"
                value={selectedIngredient.specs || ''}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, specs: e.target.value })}
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="基础单位 (最小计算单位, 如: 克, 个, 毫升)"
                variant="outlined"
                value={selectedIngredient.min || ''}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, min: e.target.value })}
                required
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="换算规格 (1采购单位 = X基础单位)"
                variant="outlined"
                type="number"
                value={selectedIngredient.norms === undefined ? '' : selectedIngredient.norms}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, norms: e.target.value === '' ? '' : parseFloat(e.target.value) || 0 })}
                required
                InputProps={{ inputProps: { min: 0.000001, step: 'any' } }}
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FormControl fullWidth sx={{ fontFamily: 'Inter, sans-serif' }}>
                <InputLabel id="assigned-posts-label">负责岗位</InputLabel>
                <Select
                  labelId="assigned-posts-label"
                  multiple
                  value={selectedIngredient.post || []}
                  onChange={(e) => setSelectedIngredient({ ...selectedIngredient, post: e.target.value })}
                  input={<OutlinedInput label="负责岗位" />}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => (
                        <Chip key={value} label={POSTNAME[value] || `ID: ${value}`} size="small" />
                      ))}
                    </Box>
                  )}
                >
                  {Object.entries(POSTNAME).map(([id, name]) => (
                    <MenuItem key={id} value={parseInt(id, 10)}> {/* Ensure value is number */}
                      {name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontFamily: 'Inter, sans-serif' }}>
            取消
          </Button>
          <Button onClick={handleSubmit} color="primary" sx={{ fontFamily: 'Inter, sans-serif' }}>
            {isEditing ? '保存更新' : '确认添加'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Snackbar for API feedback */}
      <Dialog open={apiFeedback.open} onClose={handleCloseSnackbar}>
        <DialogTitle>{apiFeedback.severity === 'success' ? '成功' : apiFeedback.severity === 'warning' ? '提示' : '错误'}</DialogTitle>
        <DialogContent>
          <Typography>{apiFeedback.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSnackbar}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IngredientList;
  