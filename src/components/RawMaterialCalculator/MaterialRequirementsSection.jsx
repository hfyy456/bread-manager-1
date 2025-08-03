import React, { useMemo, useContext } from 'react';
import {
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Box,
  Chip,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Collapse,
  IconButton
} from '@mui/material';
import {
  Download,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { DataContext } from '../DataContext.jsx';

const MaterialCard = ({ material, isMobile }) => {
  const isDeficit = material.purchaseNeededInGrams > 0;
  const stockPercentage = material.currentStockInGrams > 0 
    ? Math.min((material.currentStockInGrams / material.quantity) * 100, 100) 
    : 0;

  return (
    <Card sx={{ mb: 2, border: isDeficit ? '2px solid' : '1px solid', borderColor: isDeficit ? 'error.main' : 'success.main' }}>
      <CardContent sx={{ p: isMobile ? 1.5 : 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant={isMobile ? "body1" : "h6"} sx={{ fontWeight: 500 }}>
              {material.name}
            </Typography>
            {material.ingredientInfo?.specs && (
              <Typography variant="caption" color="text.secondary">
                {material.ingredientInfo.specs}
              </Typography>
            )}
          </Box>
          <Chip 
            icon={isDeficit ? <WarningIcon /> : <CheckCircleIcon />}
            label={isDeficit ? '需采购' : '库存充足'}
            color={isDeficit ? 'error' : 'success'}
            size="small"
          />
        </Box>

        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              需求量
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {material.quantity.toFixed(2)} g
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              当前库存
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {material.totalStockByUnit?.toFixed(2) || '0'} {material.unit}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({material.currentStockInGrams?.toFixed(1) || '0'} g)
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              库存覆盖率
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {stockPercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={Math.min(stockPercentage, 100)}
            color={isDeficit ? 'error' : 'success'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {isDeficit && (
          <Box sx={{ p: 1.5, bgcolor: 'error.50', borderRadius: 1, border: '1px solid', borderColor: 'error.200' }}>
            <Typography variant="body2" sx={{ fontWeight: 500, color: 'error.main', mb: 0.5 }}>
              建议采购
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
              {material.purchaseNeededInUnits} {material.unit}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (共 {(material.purchaseNeededInUnits * material.norms).toFixed(1)} g)
            </Typography>
            {material.estimatedOrderCost > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                预估成本: ¥{material.estimatedOrderCost.toFixed(2)}
              </Typography>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

const MaterialRequirementsSection = ({ 
  materials, 
  showResults, 
  materialMultiplier, 
  onExportExcel, 
  isMobile,
  hasCostAnalysis 
}) => {
  const { ingredientsMap } = useContext(DataContext);
  const [showMobileCards, setShowMobileCards] = React.useState(false);

  const { materialsForDisplay, totalCost, deficitCount, sufficientCount } = useMemo(() => {
    let runningTotalCost = 0;
    let deficit = 0;
    let sufficient = 0;

    const processedMaterials = materials
      .sort((a, b) => b.quantity - a.quantity)
      .map(material => {
        const ingredientInfo = ingredientsMap.get(material.id?.trim());

        if (!ingredientInfo) {
          return { ...material, isMissing: true };
        }

        const requiredQuantity = material.quantity || 0;
        const stockByPost = ingredientInfo.stockByPost;
        let totalStockByUnit = 0;
        
        if (typeof stockByPost === 'object' && stockByPost !== null) {
          totalStockByUnit = Object.values(stockByPost).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
        } else if (!isNaN(parseFloat(stockByPost))) {
          totalStockByUnit = parseFloat(stockByPost);
        }

        const norms = ingredientInfo.norms || ingredientInfo.unitSize || 1;
        const currentStockInGrams = totalStockByUnit * norms;
        const purchaseNeededInGrams = Math.max(0, requiredQuantity - currentStockInGrams);
        const purchaseNeededInUnits = purchaseNeededInGrams > 0 ? Math.ceil(purchaseNeededInGrams / norms) : 0;
        
        const unit = typeof ingredientInfo.unit === 'object'
          ? Object.values(ingredientInfo.unit)[0] || ''
          : ingredientInfo.unit || '';
        
        const rawPrice = ingredientInfo?.price || '0';
        const price = parseFloat(String(rawPrice).replace(/[^\d.-]/g, '')) || 0;
        const estimatedOrderCost = purchaseNeededInUnits * price;
        
        runningTotalCost += estimatedOrderCost;

        if (purchaseNeededInGrams > 0) {
          deficit++;
        } else {
          sufficient++;
        }

        return {
          ...material,
          ingredientInfo,
          requiredQuantity,
          totalStockByUnit,
          currentStockInGrams,
          purchaseNeededInGrams,
          purchaseNeededInUnits,
          unit,
          estimatedOrderCost,
          norms,
          isMissing: false,
          quantity: requiredQuantity
        };
      });

    return { 
      materialsForDisplay: processedMaterials, 
      totalCost: runningTotalCost,
      deficitCount: deficit,
      sufficientCount: sufficient
    };
  }, [materials, ingredientsMap]);

  const sectionNumber = hasCostAnalysis ? '3' : '2';

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" component="h2">
            {sectionNumber}. 原料需求汇总
          </Typography>
          {showResults && materialMultiplier !== 1.0 && (
            <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
              已应用 {materialMultiplier}x 安全系数
            </Typography>
          )}
          {showResults && (
            <Box sx={{ display: 'flex', gap: 2, mt: 1, flexWrap: 'wrap' }}>
              <Chip 
                icon={<WarningIcon />}
                label={`需采购: ${deficitCount}项`} 
                color="error" 
                size="small" 
              />
              <Chip 
                icon={<CheckCircleIcon />}
                label={`库存充足: ${sufficientCount}项`} 
                color="success" 
                size="small" 
              />
            </Box>
          )}
        </Box>
        
        <Button
          variant="contained"
          color="secondary" 
          onClick={onExportExcel} 
          startIcon={<Download />}
          disabled={!materialsForDisplay.length}
          size={isMobile ? "small" : "medium"}
        >
          导出Excel
        </Button>
      </Box>

      {/* 移动端卡片视图切换 */}
      {isMobile && materialsForDisplay.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => setShowMobileCards(!showMobileCards)}
            startIcon={showMobileCards ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            fullWidth
          >
            {showMobileCards ? '显示表格视图' : '显示卡片视图'}
          </Button>
        </Box>
      )}

      {/* 移动端卡片视图 */}
      {isMobile && (
        <Collapse in={showMobileCards}>
          <Box sx={{ mb: 3 }}>
            {materialsForDisplay.map(material => (
              <MaterialCard key={material.id} material={material} isMobile={isMobile} />
            ))}
          </Box>
        </Collapse>
      )}

      {/* 表格视图 */}
      <Collapse in={!isMobile || !showMobileCards}>
        <TableContainer sx={{ maxHeight: isMobile ? 400 : 600 }}>
          <Table stickyHeader size={isMobile ? "small" : "medium"}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: isMobile ? 120 : 170 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <InventoryIcon sx={{ mr: 1, fontSize: 20 }} />
                    原料名称
                  </Box>
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: isMobile ? 80 : 120 }}>
                  总需求量
                  {materialMultiplier !== 1.0 && (
                    <Typography variant="caption" display="block" color="primary.main">
                      (×{materialMultiplier})
                    </Typography>
                  )}
                </TableCell>
                {!isMobile && (
                  <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120 }}>
                    当前库存
                  </TableCell>
                )}
                <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: isMobile ? 60 : 80 }}>
                  单位
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: isMobile ? 100 : 150 }}>
                  需采购量
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materialsForDisplay.map(material => {
                if (material.isMissing) {
                  return (
                    <TableRow key={material.id} sx={{ backgroundColor: 'rgba(255, 229, 229, 0.6)' }} hover>
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {material.name || '未知原料'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">{(material.quantity || 0).toFixed(2)} g</TableCell>
                      {!isMobile && <TableCell align="right">-</TableCell>}
                      <TableCell align="right">-</TableCell>
                      <TableCell align="center">
                        <Typography variant="body2" color="error">
                          原料信息未找到
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }

                const isDeficit = material.purchaseNeededInGrams > 0;

                return (
                  <TableRow key={material.id} hover sx={{ 
                    '&:last-child td, &:last-child th': { border: 0 },
                    backgroundColor: isDeficit ? 'rgba(255, 235, 235, 0.3)' : 'rgba(235, 255, 235, 0.3)'
                  }}>
                    <TableCell component="th" scope="row">
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {material.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {material.ingredientInfo?.specs || ''}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {material.requiredQuantity.toFixed(2)} g
                      </Typography>
                    </TableCell>
                    {!isMobile && (
                      <TableCell align="right">
                        <Typography variant="body2">
                          {material.totalStockByUnit.toFixed(2)} {material.unit}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          ({material.currentStockInGrams.toFixed(1)} g)
                        </Typography>
                      </TableCell>
                    )}
                    <TableCell align="right">{material.unit}</TableCell>
                    <TableCell align="right" sx={{ 
                      fontWeight: 'bold', 
                      color: isDeficit ? 'error.main' : 'success.main' 
                    }}>
                      {isDeficit ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                            {material.purchaseNeededInUnits} {material.unit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (共 {(material.purchaseNeededInUnits * material.norms).toFixed(1)} g)
                          </Typography>
                          {material.estimatedOrderCost > 0 && (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: 'block' }}>
                              约 ¥{material.estimatedOrderCost.toFixed(2)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'normal' }}>
                            库存充足
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            (富余 {(-material.purchaseNeededInGrams).toFixed(1)} g)
                          </Typography>
                        </Box>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ backgroundColor: 'primary.50' }}>
                <TableCell colSpan={isMobile ? 3 : 4} align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                  预估采购总计:
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'primary.main' }}>
                  ¥{totalCost.toFixed(2)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Collapse>
    </Paper>
  );
};

export default MaterialRequirementsSection;