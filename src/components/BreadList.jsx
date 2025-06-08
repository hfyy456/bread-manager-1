import React, { useContext, useState } from 'react';
import { Card, CardContent, Typography, Grid, Container, Box, Button, Tooltip, IconButton, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Stack } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
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
      <Box display="flex" alignItems="center" sx={{ mb: 6, mt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, mr: 1 }}>
        面包列表
      </Typography>
        <Tooltip title="查看操作指南">
          <IconButton component={Link} to="/operation-guide#bread-products" size="small" sx={{ color: 'primary.main' }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
        <Button component={Link} to="/bread-type-editor" variant="contained" sx={{ ml: 'auto' }}>
            新建面包种类
        </Button>
      </Box>
      <Grid container spacing={4}>
        {breadTypes.map(bread => {
          const doughRecipe = doughRecipesMap.get((bread.doughId || '').trim());
          
          // 构建馅料信息
          const fillingInfo = bread.fillings?.map(filling => {
            console.log(filling,"filling");
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
          
          // 修复：添加对fillings的空值检查
          const totalWeight = bread.doughWeight + 
                             (bread.fillings?.reduce((total, filling) => total + filling.quantity, 0) || 0);
          
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
                      面团: {doughRecipe?.name || '未知面团'} ({bread.doughWeight}g)
                    </Typography>
                    <Typography variant="body2">
                      馅料: {fillingInfo}
                    </Typography>
                    <Typography variant="body2">
                      装饰: {decorationInfo}
                    </Typography>
                    <Typography variant="body2">
                      总重量: <strong>{totalWeight.toFixed(0)}g</strong>
                    </Typography>
                    <Typography variant="body2">
                      成本: <strong>¥{totalCost.toFixed(2)}</strong>
                    </Typography>
                    <Typography variant="body2">
                      建议售价: <strong>¥{bread.price.toFixed(2)}</strong>
                    </Typography>
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
  