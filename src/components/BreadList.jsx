import React, { useContext, useState, useMemo } from 'react';
import { 
  Card, CardContent, Typography, Grid, Container, Box, Button, Tooltip, IconButton, 
  CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, 
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  ToggleButton, ToggleButtonGroup, Chip, TextField, InputAdornment, FormControl,
  InputLabel, Select, MenuItem
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { 
  InfoOutlined as InfoOutlinedIcon, Edit as EditIcon, Delete as DeleteIcon,
  ViewModule as ViewModuleIcon, ViewList as ViewListIcon, Search as SearchIcon,
  Clear as ClearIcon, Sort as SortIcon
} from '@mui/icons-material';
import { DataContext } from './DataContext.jsx';
import { getBreadCostBreakdown } from '../utils/calculator';
import { useSnackbar } from './SnackbarProvider.jsx';

const BreadList = () => {
  const { 
    breadTypes, 
    ingredients, 
    loading,
    doughRecipesMap,
    fillingRecipesMap,
    ingredientsMap,
    refreshData,
  } = useContext(DataContext);
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [breadToDelete, setBreadToDelete] = useState(null);
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name'); // 'name', 'profit', 'profitMargin', 'price', 'cost'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' or 'desc'

  // 计算面包数据的辅助函数
  const calculateBreadData = (bread) => {
    const doughRecipe = doughRecipesMap.get((bread.doughId || '').trim());
    
    // 构建馅料信息
    const fillingInfo = bread.fillings?.map(filling => {
      const recipe = fillingRecipesMap.get((filling.fillingId || '').trim());
      return `${recipe?.name || '未知馅料'} (${filling.quantity}${filling.unit})`;
    }).join(', ') || '无';
    
    // 构建装饰信息
    const decorationInfo = bread.decorations?.map(decoration => {
      const ingredient = ingredientsMap.get((decoration.ingredientId || '').trim());
      return `${ingredient?.name || '未知配料'} (${decoration.quantity}${decoration.unit})`;
    }).join(', ') || '无';
    
    const costBreakdown = getBreadCostBreakdown(bread, doughRecipesMap, fillingRecipesMap, ingredientsMap);
    const totalCost = costBreakdown.totalCost;
    const totalWeight = bread.doughWeight + (bread.fillings?.reduce((total, filling) => total + filling.quantity, 0) || 0);
    
    // 计算利润和利润率
    const profit = bread.price - totalCost;
    const profitMargin = totalCost > 0 ? (profit / bread.price) * 100 : 0;
    
    return {
      doughRecipe,
      fillingInfo,
      decorationInfo,
      totalCost,
      totalWeight,
      profit,
      profitMargin
    };
  };

  // 获取利润率颜色
  const getProfitMarginColor = (profitMargin) => {
    if (profitMargin >= 50) return 'success';
    if (profitMargin >= 30) return 'warning';
    return 'error';
  };

  // 搜索和排序逻辑
  const filteredAndSortedBreadTypes = useMemo(() => {
    // 首先进行搜索过滤
    let filtered = breadTypes.filter(bread => {
      if (!searchTerm.trim()) return true;
      
      const searchLower = searchTerm.toLowerCase();
      const breadData = calculateBreadData(bread);
      
      // 搜索面包名称
      if (bread.name.toLowerCase().includes(searchLower)) return true;
      
      // 搜索描述
      if (bread.description && bread.description.toLowerCase().includes(searchLower)) return true;
      
      // 搜索面团名称
      if (breadData.doughRecipe?.name.toLowerCase().includes(searchLower)) return true;
      
      // 搜索馅料信息
      if (breadData.fillingInfo.toLowerCase().includes(searchLower)) return true;
      
      // 搜索装饰信息
      if (breadData.decorationInfo.toLowerCase().includes(searchLower)) return true;
      
      return false;
    });

    // 然后进行排序
    filtered.sort((a, b) => {
      const aData = calculateBreadData(a);
      const bData = calculateBreadData(b);
      
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'profit':
          aValue = aData.profit;
          bValue = bData.profit;
          break;
        case 'profitMargin':
          aValue = aData.profitMargin;
          bValue = bData.profitMargin;
          break;
        case 'cost':
          aValue = aData.totalCost;
          bValue = bData.totalCost;
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }
      
      if (typeof aValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      } else {
        const comparison = aValue - bValue;
        return sortOrder === 'asc' ? comparison : -comparison;
      }
    });

    return filtered;
  }, [breadTypes, searchTerm, sortBy, sortOrder, doughRecipesMap, fillingRecipesMap, ingredientsMap]);

  // 清除搜索
  const handleClearSearch = () => {
    setSearchTerm('');
  };

  // 处理排序变化
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // 如果点击的是当前排序字段，则切换排序顺序
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // 如果点击的是新的排序字段，则设置为升序
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const handleOpenDeleteDialog = (bread) => {
    setBreadToDelete(bread);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setBreadToDelete(null);
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!breadToDelete) return;

    try {
      const response = await fetch(`/api/bread-types/${breadToDelete._id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || '删除失败');
      }
      showSnackbar('面包种类删除成功', 'success');
      await refreshData(); // Refresh data from context
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      handleCloseDeleteDialog();
    }
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" alignItems="center" sx={{ mb: 3, mt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, mr: 1 }}>
        面包列表
      </Typography>
        <Tooltip title="查看操作指南">
          <IconButton component={Link} to="/operation-guide#bread-products" size="small" sx={{ color: 'primary.main' }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>排序方式</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="排序方式"
            >
              <MenuItem value="name">名称</MenuItem>
              <MenuItem value="price">售价</MenuItem>
              <MenuItem value="cost">成本</MenuItem>
              <MenuItem value="profit">利润</MenuItem>
              <MenuItem value="profitMargin">利润率</MenuItem>
            </Select>
          </FormControl>
          
          <Button
            variant="outlined"
            size="small"
            startIcon={<SortIcon />}
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          >
            {sortOrder === 'asc' ? '升序' : '降序'}
          </Button>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(event, newViewMode) => {
              if (newViewMode !== null) {
                setViewMode(newViewMode);
              }
            }}
            size="small"
          >
            <ToggleButton value="card" aria-label="卡片视图">
              <ViewModuleIcon />
            </ToggleButton>
            <ToggleButton value="list" aria-label="列表视图">
              <ViewListIcon />
            </ToggleButton>
          </ToggleButtonGroup>
          
          <Button component={Link} to="/bread-type-editor" variant="contained">
              新建面包种类
          </Button>
        </Box>
      </Box>
      
      {/* 搜索框 */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="搜索面包名称、描述、面团、馅料或装饰..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  onClick={handleClearSearch}
                  edge="end"
                >
                  <ClearIcon />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'background.paper',
            }
          }}
        />
      </Box>

      {/* 搜索结果统计 */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {searchTerm ? (
          <Typography variant="body2" color="text.secondary">
            找到 {filteredAndSortedBreadTypes.length} 个结果，共 {breadTypes.length} 个面包
          </Typography>
        ) : (
          <Typography variant="body2" color="text.secondary">
            共 {breadTypes.length} 个面包
          </Typography>
        )}
        
        <Typography variant="body2" color="text.secondary">
          按 {{
            name: '名称',
            price: '售价', 
            cost: '成本',
            profit: '利润',
            profitMargin: '利润率'
          }[sortBy]} {sortOrder === 'asc' ? '升序' : '降序'} 排列
        </Typography>
      </Box>

      {filteredAndSortedBreadTypes.length === 0 ? (
        // 空状态显示
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          py: 8,
          textAlign: 'center'
        }}>
          <SearchIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? '未找到匹配的面包' : '暂无面包数据'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {searchTerm 
              ? `没有找到包含 "${searchTerm}" 的面包，请尝试其他关键词` 
              : '点击上方按钮创建第一个面包种类'
            }
          </Typography>
          {searchTerm ? (
            <Button variant="outlined" onClick={handleClearSearch}>
              清除搜索条件
            </Button>
          ) : (
            <Button 
              variant="contained" 
              component={Link} 
              to="/bread-type-editor"
            >
              新建面包种类
            </Button>
          )}
        </Box>
      ) : viewMode === 'card' ? (
        // 卡片视图
        <Grid container spacing={4}>
          {filteredAndSortedBreadTypes.map(bread => {
            const breadData = calculateBreadData(bread);
            
            return (
              <Grid item xs={12} md={6} lg={4} key={bread._id}>
                <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%', transition: 'transform 0.3s, box-shadow 0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h2" sx={{ fontWeight: 600 }}>
                      {bread.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 2, minHeight: '40px' }}>
                      {bread.description || '暂无描述'}
                    </Typography>
                    
                    <Box sx={{ mt: 2, flexGrow: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 500, borderTop: '1px solid #eee', pt: 2 }}>
                        基本信息
                      </Typography>
                      <Typography variant="body2" sx={{ mt: 1 }}>
                        面团: {breadData.doughRecipe?.name || '未知面团'} ({bread.doughWeight}g)
                      </Typography>
                      <Typography variant="body2">
                        馅料: {breadData.fillingInfo}
                      </Typography>
                      <Typography variant="body2">
                        装饰: {breadData.decorationInfo}
                      </Typography>
                      <Typography variant="body2">
                        总重量: <strong>{breadData.totalWeight.toFixed(0)}g</strong>
                      </Typography>
                      <Typography variant="body2">
                        成本: <strong>¥{breadData.totalCost.toFixed(2)}</strong>
                      </Typography>
                      <Typography variant="body2">
                        建议售价: <strong>¥{bread.price.toFixed(2)}</strong>
                      </Typography>
                      <Typography variant="body2">
                        利润: <strong style={{ color: breadData.profit >= 0 ? '#4caf50' : '#f44336' }}>
                          ¥{breadData.profit.toFixed(2)}
                        </strong>
                      </Typography>
                      <Box sx={{ mt: 1 }}>
                        <Chip 
                          label={`利润率: ${breadData.profitMargin.toFixed(1)}%`}
                          color={getProfitMarginColor(breadData.profitMargin)}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </CardContent>
                    
                  <Box sx={{ p: 2, borderTop: '1px solid #eee' }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        color="primary"
                        component={Link}
                        to={`/breads/${bread.id}`}
                        fullWidth
                      >
                        查看详情
                      </Button>
                      <Button
                        variant="outlined"
                        color="primary"
                        startIcon={<EditIcon />}
                        onClick={() => navigate(`/bread-type-editor/${bread._id}`)}
                        fullWidth
                      >
                        编辑
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleOpenDeleteDialog(bread)}
                        fullWidth
                      >
                        删除
                      </Button>
                    </Stack>
                  </Box>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      ) : (
        // 列表视图
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>名称</TableCell>
                <TableCell>面团</TableCell>
                <TableCell align="right">重量(g)</TableCell>
                <TableCell align="right">成本(¥)</TableCell>
                <TableCell align="right">售价(¥)</TableCell>
                <TableCell align="right">利润(¥)</TableCell>
                <TableCell align="center">利润率</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAndSortedBreadTypes.map(bread => {
                const breadData = calculateBreadData(bread);
                
                return (
                  <TableRow key={bread._id} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {bread.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {bread.description || '暂无描述'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {breadData.doughRecipe?.name || '未知面团'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {bread.doughWeight}g
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {breadData.totalWeight.toFixed(0)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {breadData.totalCost.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {bread.price.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600,
                          color: breadData.profit >= 0 ? 'success.main' : 'error.main'
                        }}
                      >
                        {breadData.profit.toFixed(2)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={`${breadData.profitMargin.toFixed(1)}%`}
                        color={getProfitMarginColor(breadData.profitMargin)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={1} justifyContent="center">
                        <Tooltip title="查看详情">
                          <IconButton
                            size="small"
                            component={Link}
                            to={`/breads/${bread.id}`}
                            color="primary"
                          >
                            <InfoOutlinedIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/bread-type-editor/${bread._id}`)}
                            color="primary"
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            onClick={() => handleOpenDeleteDialog(bread)}
                            color="error"
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"确认删除面包种类?"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            确定要删除面包种类 "{breadToDelete?.name}" 吗？此操作不可撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>取消</Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            确认删除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default BreadList;
  