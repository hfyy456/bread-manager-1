import React from 'react';
import {
  Paper,
  Typography,
  Grid,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableFooter,
  Box,
  Chip,
  useTheme
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  AttachMoney as AttachMoneyIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';

const MetricCard = ({ title, value, subtitle, color, icon: Icon, isMobile }) => {
  const theme = useTheme();
  
  return (
    <Card 
      sx={{ 
        p: isMobile ? 1.5 : 2, 
        textAlign: 'center',
        bgcolor: `${color}.50`,
        border: '1px solid',
        borderColor: `${color}.200`,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
        <Icon sx={{ color: `${color}.main`, mr: 1, fontSize: isMobile ? 20 : 24 }} />
        <Typography variant={isMobile ? "body2" : "subtitle2"} color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography 
        variant={isMobile ? "h6" : "h5"} 
        sx={{ color: `${color}.main`, fontWeight: 'bold', mb: 0.5 }}
      >
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Card>
  );
};

const CostAnalysisSection = ({ costAnalysis, isMobile }) => {
  const theme = useTheme();
  
  if (!costAnalysis) return null;

  const profitColor = costAnalysis.totalProfit >= 0 ? 'success' : 'error';
  const marginColor = costAnalysis.overallProfitMargin >= 0 ? 'success' : 'error';

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        2. 成本核算分析
      </Typography>
      
      {/* 总体成本概览 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="总生产成本"
            value={`¥${costAnalysis.totalProductionCost.toFixed(2)}`}
            color="primary"
            icon={AttachMoneyIcon}
            isMobile={isMobile}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="总销售价值"
            value={`¥${costAnalysis.totalProductionValue.toFixed(2)}`}
            color="info"
            icon={AssessmentIcon}
            isMobile={isMobile}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="总利润"
            value={`¥${costAnalysis.totalProfit.toFixed(2)}`}
            color={profitColor}
            icon={costAnalysis.totalProfit >= 0 ? TrendingUpIcon : TrendingDownIcon}
            isMobile={isMobile}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <MetricCard
            title="总利润率"
            value={`${costAnalysis.overallProfitMargin.toFixed(1)}%`}
            color={marginColor}
            icon={costAnalysis.overallProfitMargin >= 0 ? TrendingUpIcon : TrendingDownIcon}
            isMobile={isMobile}
          />
        </Grid>
      </Grid>

      {/* 产品成本明细表 */}
      <Typography variant="subtitle1" gutterBottom sx={{ mt: 3, fontWeight: 600 }}>
        产品成本明细
      </Typography>
      
      <TableContainer sx={{ maxHeight: isMobile ? 400 : 600 }}>
        <Table size={isMobile ? "small" : "medium"} stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', minWidth: isMobile ? 80 : 120 }}>产品名称</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: isMobile ? 50 : 80 }}>数量</TableCell>
              {!isMobile && (
                <>
                  <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80 }}>单位成本</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80 }}>单位售价</TableCell>
                </>
              )}
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: isMobile ? 70 : 90 }}>总成本</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: isMobile ? 70 : 90 }}>总价值</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: isMobile ? 60 : 80 }}>利润</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: isMobile ? 60 : 80 }}>利润率</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {costAnalysis.products.map((product) => (
              <TableRow key={product.breadId} hover>
                <TableCell component="th" scope="row">
                  <Typography variant={isMobile ? "body2" : "body1"} sx={{ fontWeight: 500 }}>
                    {product.breadName}
                  </Typography>
                  {isMobile && (
                    <Typography variant="caption" color="text.secondary" display="block">
                      ¥{product.unitCost.toFixed(2)}/个 → ¥{product.unitPrice.toFixed(2)}/个
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Chip label={product.quantity} size="small" variant="outlined" />
                </TableCell>
                {!isMobile && (
                  <>
                    <TableCell align="right">¥{product.unitCost.toFixed(2)}</TableCell>
                    <TableCell align="right">¥{product.unitPrice.toFixed(2)}</TableCell>
                  </>
                )}
                <TableCell align="right">¥{product.totalCost.toFixed(2)}</TableCell>
                <TableCell align="right">¥{product.totalValue.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ 
                  color: product.totalProfit >= 0 ? 'success.main' : 'error.main',
                  fontWeight: 'bold'
                }}>
                  ¥{product.totalProfit.toFixed(2)}
                </TableCell>
                <TableCell align="right" sx={{ 
                  color: product.profitMargin >= 0 ? 'success.main' : 'error.main',
                  fontWeight: 'bold'
                }}>
                  {product.profitMargin.toFixed(1)}%
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>合计</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                <Chip 
                  label={costAnalysis.products.reduce((sum, p) => sum + p.quantity, 0)} 
                  size="small" 
                  color="primary"
                />
              </TableCell>
              {!isMobile && (
                <>
                  <TableCell align="right">-</TableCell>
                  <TableCell align="right">-</TableCell>
                </>
              )}
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                ¥{costAnalysis.totalProductionCost.toFixed(2)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                ¥{costAnalysis.totalProductionValue.toFixed(2)}
              </TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 'bold',
                color: costAnalysis.totalProfit >= 0 ? 'success.main' : 'error.main'
              }}>
                ¥{costAnalysis.totalProfit.toFixed(2)}
              </TableCell>
              <TableCell align="right" sx={{ 
                fontWeight: 'bold',
                color: costAnalysis.overallProfitMargin >= 0 ? 'success.main' : 'error.main'
              }}>
                {costAnalysis.overallProfitMargin.toFixed(1)}%
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default CostAnalysisSection;