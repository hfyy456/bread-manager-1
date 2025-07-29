import React, { useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Grid,
  LinearProgress,
  Chip
} from '@mui/material';
import { 
  Inventory as InventoryIcon,
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const InventoryStats = ({ ingredients = [] }) => {
  const stats = useMemo(() => {
    let totalMainWarehouse = 0;
    let totalPostStock = 0;
    let totalValue = 0;
    let mainWarehouseValue = 0;
    let postStockValue = 0;
    let itemsWithMainStock = 0;
    let itemsWithPostStock = 0;
    let totalItems = ingredients.length;

    ingredients.forEach(ingredient => {
      const mainStock = ingredient.mainWarehouseStock?.quantity || 0;
      const postStock = ingredient.currentStock - mainStock;
      const price = ingredient.price || 0;
      
      totalMainWarehouse += mainStock;
      totalPostStock += postStock;
      
      // 分别计算主仓和岗位的价值
      const mainValue = mainStock * price;
      const postValue = postStock * price;
      
      mainWarehouseValue += mainValue;
      postStockValue += postValue;
      totalValue += mainValue + postValue;
      
      if (mainStock > 0) itemsWithMainStock++;
      if (postStock > 0) itemsWithPostStock++;
    });

    const totalStock = totalMainWarehouse + totalPostStock;
    const mainPercentage = totalStock > 0 ? (totalMainWarehouse / totalStock * 100) : 0;
    const postPercentage = totalStock > 0 ? (totalPostStock / totalStock * 100) : 0;

    return {
      totalMainWarehouse,
      totalPostStock,
      totalStock,
      totalValue,
      mainWarehouseValue,
      postStockValue,
      mainPercentage,
      postPercentage,
      itemsWithMainStock,
      itemsWithPostStock,
      totalItems
    };
  }, [ingredients]);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h6" component="h3">
            库存统计概览
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* 主仓库存统计 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <InventoryIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" color="primary.main">
                {stats.totalMainWarehouse.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                主仓总库存
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.itemsWithMainStock}/{stats.totalItems} 种原料有库存
              </Typography>
              <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                价值: ¥{stats.mainWarehouseValue.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          {/* 岗位库存统计 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.50', borderRadius: 1 }}>
              <StoreIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" color="secondary.main">
                {stats.totalPostStock.toFixed(1)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                岗位总库存
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {stats.itemsWithPostStock}/{stats.totalItems} 种原料有库存
              </Typography>
              <Typography variant="caption" color="secondary.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                价值: ¥{stats.postStockValue.toFixed(2)}
              </Typography>
            </Box>
          </Grid>

          {/* 总价值统计 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="h6" color="success.main">
                ¥{stats.totalValue.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                库存总价值
              </Typography>
              <Typography variant="caption" color="text.secondary">
                全部原料价值
              </Typography>
            </Box>
          </Grid>

          {/* 库存分布 */}
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                库存分布比例
              </Typography>
              
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="primary.main">
                    主仓 {stats.mainPercentage.toFixed(1)}%
                  </Typography>
                  <Typography variant="caption" color="secondary.main">
                    岗位 {stats.postPercentage.toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={stats.mainPercentage} 
                  sx={{ 
                    height: 8, 
                    borderRadius: 4,
                    bgcolor: 'secondary.light',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: 'primary.main',
                      borderRadius: 4
                    }
                  }} 
                />
              </Box>
              
              <Typography variant="caption" color="text.secondary">
                总计: {stats.totalStock.toFixed(1)} 单位
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* 快速统计标签 */}
        <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
          <Chip 
            icon={<InventoryIcon />}
            label={`主仓: ${stats.itemsWithMainStock}种 ¥${stats.mainWarehouseValue.toFixed(2)}`}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip 
            icon={<StoreIcon />}
            label={`岗位: ${stats.itemsWithPostStock}种 ¥${stats.postStockValue.toFixed(2)}`}
            size="small"
            color="secondary"
            variant="outlined"
          />
          <Chip 
            icon={<TrendingUpIcon />}
            label={`平均价值 ¥${stats.totalItems > 0 ? (stats.totalValue / stats.totalItems).toFixed(2) : '0.00'}`}
            size="small"
            color="success"
            variant="outlined"
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default InventoryStats;