import React, { useContext, useMemo } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  IconButton,
  Chip,
  Stack,
  CircularProgress,
  Card,
  CardContent,
  Collapse,
  Divider
} from '@mui/material';
import {
  Replay as ReplayIcon,
  Clear as ClearIcon,
  FileUpload as FileUploadIcon,
  Download,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import { DataContext } from '../DataContext.jsx';

const ProductCard = ({ bread, quantity, onQuantityChange, onClear, isMobile }) => (
  <Card sx={{ mb: 1.5, border: quantity > 0 ? '2px solid' : '1px solid', borderColor: quantity > 0 ? 'primary.main' : 'grey.300' }}>
    <CardContent sx={{ p: isMobile ? 1.5 : 2, '&:last-child': { pb: isMobile ? 1.5 : 2 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant={isMobile ? "body1" : "h6"} sx={{ fontWeight: 500, flex: 1 }}>
          {bread.name}
        </Typography>
        {quantity > 0 && (
          <Chip 
            label={`${quantity}个`} 
            color="primary" 
            size="small" 
            sx={{ ml: 1 }}
          />
        )}
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          type="number"
          label="生产数量"
          value={quantity || ''}
          onChange={(e) => onQuantityChange(bread.id, e.target.value)}
          fullWidth
          size="small"
          inputProps={{ min: "0", step: "1" }}
          sx={{ flex: 1 }}
        />
        {quantity > 0 && (
          <IconButton 
            onClick={() => onClear(bread.id)} 
            size="small"
            color="error"
            sx={{ flexShrink: 0 }}
          >
            <ClearIcon />
          </IconButton>
        )}
      </Box>
      
      {bread.price && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          单价: ¥{bread.price} | 预计收入: ¥{((quantity || 0) * bread.price).toFixed(2)}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const ProductionInputSection = ({
  quantities,
  onQuantityChange,
  onClearSpecificQuantity,
  onResetQuantities,
  onCalculate,
  onImportExcel,
  onExportTemplate,
  isCalculating,
  materialMultiplier,
  onMultiplierChange,
  isMobile
}) => {
  const { breadTypes, loading } = useContext(DataContext);
  const [showAllProducts, setShowAllProducts] = React.useState(false);

  // 分离有数量和无数量的产品
  const { productsWithQuantity, productsWithoutQuantity, totalProducts } = useMemo(() => {
    const withQty = [];
    const withoutQty = [];
    let total = 0;

    breadTypes.forEach(bread => {
      const qty = parseInt(quantities[bread.id]) || 0;
      if (qty > 0) {
        withQty.push({ ...bread, quantity: qty });
        total += qty;
      } else {
        withoutQty.push({ ...bread, quantity: 0 });
      }
    });

    return {
      productsWithQuantity: withQty.sort((a, b) => b.quantity - a.quantity),
      productsWithoutQuantity: withoutQty.sort((a, b) => a.name.localeCompare(b.name)),
      totalProducts: total
    };
  }, [breadTypes, quantities]);

  const hasValidQuantities = totalProducts > 0;
  const multiplierOptions = [
    { value: 1.0, label: '1.00 (精确)', color: 'default' },
    { value: 1.05, label: '1.05 (推荐)', color: 'primary' },
    { value: 1.10, label: '1.10 (保守)', color: 'default' },
    { value: 1.15, label: '1.15 (高余量)', color: 'default' }
  ];

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      <Typography variant="h6" gutterBottom component="h2">
        1. 输入生产数量
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        输入各产品的计划生产数量，系统将自动计算所需原料和成本分析
      </Typography>

      {/* 快速操作按钮 */}
      <Box sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        <Button 
          variant="outlined" 
          onClick={onResetQuantities}
          startIcon={<ReplayIcon />}
          size={isMobile ? "small" : "medium"}
        >
          全部重置
        </Button>
        <Button 
          variant="outlined" 
          onClick={onImportExcel}
          startIcon={<FileUploadIcon />}
          size={isMobile ? "small" : "medium"}
        >
          导入Excel
        </Button>
        <Button 
          variant="outlined" 
          onClick={() => onExportTemplate()}
          startIcon={<Download />}
          size={isMobile ? "small" : "medium"}
        >
          下载模板
        </Button>
      </Box>

      {/* 已选择的产品 */}
      {productsWithQuantity.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}>
            已选择产品 ({productsWithQuantity.length}个，共{totalProducts}件)
          </Typography>
          <Grid container spacing={isMobile ? 1 : 2}>
            {productsWithQuantity.map(bread => (
              <Grid item xs={12} sm={6} md={4} key={bread.id}>
                <ProductCard
                  bread={bread}
                  quantity={bread.quantity}
                  onQuantityChange={onQuantityChange}
                  onClear={onClearSpecificQuantity}
                  isMobile={isMobile}
                />
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* 其他产品 */}
      {productsWithoutQuantity.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              cursor: 'pointer',
              mb: 2,
              p: 1,
              borderRadius: 1,
              '&:hover': { bgcolor: 'grey.50' }
            }}
            onClick={() => setShowAllProducts(!showAllProducts)}
          >
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
              其他产品 ({productsWithoutQuantity.length}个)
            </Typography>
            {showAllProducts ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Box>
          
          <Collapse in={showAllProducts}>
            <Grid container spacing={isMobile ? 1 : 2}>
              {productsWithoutQuantity.map(bread => (
                <Grid item xs={12} sm={6} md={4} key={bread.id}>
                  <ProductCard
                    bread={bread}
                    quantity={bread.quantity}
                    onQuantityChange={onQuantityChange}
                    onClear={onClearSpecificQuantity}
                    isMobile={isMobile}
                  />
                </Grid>
              ))}
            </Grid>
          </Collapse>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* 原料需求系数设置 */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
          原料需求系数 (当前: {materialMultiplier}x)
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          考虑到生产损耗和安全库存，建议在理论用量基础上增加一定比例
        </Typography>
        
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {multiplierOptions.map(option => (
            <Chip 
              key={option.value}
              label={option.label}
              variant={materialMultiplier === option.value ? "filled" : "outlined"}
              onClick={() => onMultiplierChange(option.value)}
              size={isMobile ? "small" : "medium"}
              color={option.color}
              sx={{ mb: 1 }}
            />
          ))}
        </Stack>
      </Box>

      {/* 计算按钮 */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => onCalculate(true)} 
          disabled={isCalculating || loading || !hasValidQuantities}
          size="large"
          sx={{ 
            minWidth: 200, 
            height: 56,
            fontSize: isMobile ? '0.9rem' : '1rem'
          }}
        >
          {isCalculating ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            `计算成本与原料 ${hasValidQuantities ? `(${totalProducts}件)` : ''}`
          )}
        </Button>
      </Box>

      {!hasValidQuantities && (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ textAlign: 'center', mt: 2, fontStyle: 'italic' }}
        >
          请至少输入一个产品的生产数量
        </Typography>
      )}
    </Paper>
  );
};

export default ProductionInputSection;