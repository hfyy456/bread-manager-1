import React from 'react';
import { Card, CardContent, Typography, Grid, Container, Box, Button } from '@mui/material';
import { breadTypes } from '../data/breadTypes';
import { doughRecipes } from '../data/doughRecipes';
import { fillingRecipes } from '../data/fillingRecipes';
import { ingredients } from '../data/ingredients';
import { calculateBreadCost } from '../utils/calculator';
import { Link } from 'react-router-dom';

const BreadList = () => {
  return (
    <Container maxWidth="xl">
      <Typography variant="h4" component="h1" sx={{ mb: 6, mt: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
        面包列表
      </Typography>
      <Grid container spacing={4}>
        {breadTypes.map(bread => {
          const doughRecipe = doughRecipes.find(r => r.id === bread.doughId);
          
          // 构建馅料信息
          const fillingInfo = bread.fillings?.map(filling => {
            const recipe = fillingRecipes.find(r => r.id === filling.fillingId);
            return `${recipe?.name || '未知馅料'} (${filling.quantity}${filling.unit})`;
          }).join(', ') || '无';
          
          // 构建装饰信息
          const decorationInfo = bread.decorations?.map(decoration => {
            const ingredient = ingredients.find(ing => ing.name === decoration.ingredientId);
            return `${ingredient?.name || '未知配料'} (${decoration.quantity}${decoration.unit})`;
          }).join(', ') || '无';
          
          const cost = calculateBreadCost(bread);
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
                      成本: ¥{cost.toFixed(2)}
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
  