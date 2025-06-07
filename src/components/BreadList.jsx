import React, { useContext } from 'react';
import { Card, CardContent, Typography, Grid, Container, Box, Button, Tooltip, IconButton, CircularProgress } from '@mui/material';
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { DataContext } from './DataContext.jsx';
import { getBreadCostBreakdown } from '../utils/calculator';

const BreadList = () => {
  const { 
    breadTypes, 
    ingredients, 
    loading,
    doughRecipesMap,
    fillingRecipesMap,
    ingredientsMap 
  } = useContext(DataContext);

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
            <Grid item xs={12} md={6} lg={4} key={bread.id}>
              <Card sx={{ transition: 'transform 0.3s, box-shadow 0.3s', '&:hover': { transform: 'translateY(-5px)' } }}>
                <CardContent>
                  <Typography gutterBottom variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    {bread.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontFamily: 'Inter, sans-serif' }}>
                    {bread.description}
                  </Typography>
                  
                  <Box sx={{ mt: 3 }}>
                    <Typography variant="subtitle1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                      基本信息
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 1, fontFamily: 'Inter, sans-serif' }}>
                      面团: {doughRecipe?.name || '未知面团'} ({bread.doughWeight}g)
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                      馅料: {fillingInfo}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                      装饰: {decorationInfo}
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                      总重量: {totalWeight}g
                    </Typography>
                    <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                      成本: ¥{totalCost.toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ mt: 3 }}>
                    <Button
                      variant="contained"
                      color="primary"
                      component={Link}
                      to={`/breads/${bread.id}`}
                      fullWidth
                      sx={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      查看详情
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default BreadList;
  