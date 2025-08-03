import React, { useState, useRef, useContext, useMemo, useCallback } from 'react';
import { Container, Typography, Box, useTheme, useMediaQuery, Snackbar, Alert as MuiAlert } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { DataContext } from '../DataContext.jsx';
import ProductionInputSection from './ProductionInputSection';
import CostAnalysisSection from './CostAnalysisSection';
import MaterialRequirementsSection from './MaterialRequirementsSection';
import ImportReportDialog from './ImportReportDialog';
import { useCalculatorLogic } from './hooks/useCalculatorLogic';
import { useExcelOperations } from './hooks/useExcelOperations';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const RawMaterialCalculator = () => {
  const { breadTypes, loading } = useContext(DataContext);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  // 核心状态管理
  const {
    quantities,
    setQuantities,
    aggregatedMaterials,
    costAnalysis,
    showResults,
    isCalculating,
    materialMultiplier,
    handleQuantityChange,
    handleClearSpecificQuantity,
    handleResetQuantities,
    calculateTotalRawMaterials,
    setMaterialMultiplier
  } = useCalculatorLogic();

  // Excel 操作相关
  const fileInputRef = useRef(null);
  const {
    importReport,
    reportDialogOpen,
    setReportDialogOpen,
    handleFileUpload,
    handleExportTemplate,
    handleExportExcel
  } = useExcelOperations(quantities, setQuantities, aggregatedMaterials, costAnalysis, materialMultiplier, breadTypes);

  // 通知状态
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });

  const showSnackbar = useCallback((message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const closeSnackbar = useCallback((event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbar(prev => ({ ...prev, open: false }));
  }, []);

  // 计算汇总数据
  const summaryData = useMemo(() => {
    const totalProducts = Object.values(quantities).reduce((sum, qty) => sum + (parseInt(qty) || 0), 0);
    const totalCost = aggregatedMaterials.reduce((sum, material) => {
      const ingredientInfo = material.ingredientInfo;
      if (!ingredientInfo) return sum;
      
      const purchaseNeeded = Math.max(0, material.quantity - (material.currentStockInGrams || 0));
      const purchaseUnits = Math.ceil(purchaseNeeded / (ingredientInfo.norms || 1));
      const price = parseFloat(String(ingredientInfo.price || '0').replace(/[^\d.-]/g, '')) || 0;
      
      return sum + (purchaseUnits * price);
    }, 0);

    return { totalProducts, totalCost };
  }, [quantities, aggregatedMaterials]);

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <Typography variant="h6">正在加载原料数据...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* 页面标题 */}
      <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: { xs: 2, md: 3 } }}>
        <Typography 
          variant={isMobile ? "h5" : "h4"} 
          component="h1" 
          sx={{ textAlign: 'center', fontWeight: 500, mr: 1 }}
        >
          生产计划成本核算器
        </Typography>
        <Link to="/operation-guide#raw-material-calculator" style={{ textDecoration: 'none' }}>
          <InfoOutlinedIcon color="primary" sx={{ fontSize: isMobile ? 20 : 24 }} />
        </Link>
      </Box>

      {/* 快速概览卡片 - 仅在有数据时显示 */}
      {showResults && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'primary.50', borderRadius: 2, border: '1px solid', borderColor: 'primary.200' }}>
          <Typography variant="h6" color="primary.main" gutterBottom>
            计算概览
          </Typography>
          <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
            <Typography variant="body2">
              <strong>产品总数:</strong> {summaryData.totalProducts} 个
            </Typography>
            <Typography variant="body2">
              <strong>预估采购成本:</strong> ¥{summaryData.totalCost.toFixed(2)}
            </Typography>
            {costAnalysis && (
              <Typography variant="body2">
                <strong>预计利润:</strong> 
                <span style={{ color: costAnalysis.totalProfit >= 0 ? theme.palette.success.main : theme.palette.error.main }}>
                  ¥{costAnalysis.totalProfit.toFixed(2)}
                </span>
              </Typography>
            )}
          </Box>
        </Box>
      )}

      {/* 生产数量输入区域 */}
      <ProductionInputSection
        quantities={quantities}
        onQuantityChange={handleQuantityChange}
        onClearSpecificQuantity={handleClearSpecificQuantity}
        onResetQuantities={handleResetQuantities}
        onCalculate={calculateTotalRawMaterials}
        onImportExcel={() => fileInputRef.current?.click()}
        onExportTemplate={() => handleExportTemplate(showSnackbar)}
        isCalculating={isCalculating}
        materialMultiplier={materialMultiplier}
        onMultiplierChange={setMaterialMultiplier}
        isMobile={isMobile}
      />

      {/* 隐藏的文件输入 */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={(e) => handleFileUpload(e, showSnackbar)}
        accept=".xlsx, .xls" 
        style={{ display: 'none' }} 
      />

      {/* 成本分析区域 */}
      {showResults && costAnalysis && (
        <CostAnalysisSection costAnalysis={costAnalysis} isMobile={isMobile} />
      )}

      {/* 原料需求汇总区域 */}
      <MaterialRequirementsSection
        materials={aggregatedMaterials}
        showResults={showResults}
        materialMultiplier={materialMultiplier}
        onExportExcel={() => handleExportExcel(showSnackbar)}
        isMobile={isMobile}
        hasCostAnalysis={!!costAnalysis}
      />

      {/* 导入报告对话框 */}
      <ImportReportDialog 
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        report={importReport}
      />

      {/* 通知栏 */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={closeSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RawMaterialCalculator;