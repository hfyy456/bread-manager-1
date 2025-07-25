import React, { useState, useRef, useEffect, useCallback, useContext, useMemo } from 'react';
import { Container, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Box, IconButton, Tooltip, CircularProgress, Chip, Snackbar, Alert as MuiAlert, TableFooter, useTheme, useMediaQuery, Card, CardContent, LinearProgress, Stack, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Replay as ReplayIcon, Clear as ClearIcon, FileUpload as FileUploadIcon, Download, InfoOutlined as InfoOutlinedIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { generateAggregatedRawMaterials, adjustCost, findIngredientById } from '../utils/calculator';
import { DataContext } from './DataContext.jsx';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ImportReportDialog = ({ open, onClose, report }) => {
    if (!report) return null;

    const { summary, results } = report;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Excel 导入报告</DialogTitle>
            <DialogContent dividers>
                <Typography variant="subtitle1" gutterBottom><b>导入概要</b></Typography>
                <Stack spacing={1}>
                    <Typography><CheckCircleIcon color="success" sx={{ verticalAlign: 'middle', mr: 1 }} />成功: {summary.success} 项</Typography>
                    <Typography><CancelIcon color="error" sx={{ verticalAlign: 'middle', mr: 1 }} />未找到的产品: {summary.notFound} 项</Typography>
                    <Typography><CancelIcon color="warning" sx={{ verticalAlign: 'middle', mr: 1 }} />无效的数量: {summary.invalid} 项</Typography>
                </Stack>
                <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}><b>详细信息</b></Typography>
                <List dense sx={{ maxHeight: '300px', overflow: 'auto', pr: 1 }}>
                    {results.map((item, index) => (
                        <ListItem key={index} divider>
                            <ListItemIcon sx={{minWidth: 32}}>
                                {item.status === 'success' ? 
                                    <Tooltip title="成功"><CheckCircleIcon color="success" /></Tooltip> : 
                                    <Tooltip title={item.message}><CancelIcon color={item.status === 'not_found' ? 'error' : 'warning'} /></Tooltip>
                                }
                            </ListItemIcon>
                            <ListItemText
                                primary={`产品: "${item.name}" - 表中数量: "${item.value || ''}"`}
                                secondary={item.status !== 'success' ? item.message : null}
                                primaryTypographyProps={{ style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }}
                            />
                        </ListItem>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>关闭</Button>
            </DialogActions>
        </Dialog>
    );
};

const BreadInputCard = ({ bread, quantity, onQuantityChange, onClear }) => (
  <Card sx={{ mb: 2, p: 1.5 }}>
    <CardContent>
      <Typography variant="h6" component="div" gutterBottom>{bread.name}</Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TextField
          type="number"
          label="生产数量"
          value={quantity}
          onChange={(e) => onQuantityChange(bread.id, e.target.value)}
          fullWidth
          size="small"
          inputProps={{ min: "0" }}
        />
        <IconButton onClick={() => onClear(bread.id)} size="small">
          <ClearIcon />
        </IconButton>
      </Box>
    </CardContent>
  </Card>
);

const MaterialResultCard = ({ material }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography variant="h6" component="div">{material.name}</Typography>
        <Chip label={`需求: ${material.quantity.toFixed(2)} ${material.unit}`} color="primary" />
      </Box>
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Typography color="text.secondary">当前库存: {material.currentStockInGrams.toFixed(2)} {material.unit}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography color="text.secondary">采购建议: {material.purchaseSuggestion.toFixed(2)} {material.purchaseUnit}</Typography>
        </Grid>
        <Grid item xs={12}>
          <LinearProgress 
            variant="determinate" 
            value={material.stockCoverage} 
            color={material.isDeficit ? 'error' : 'success'}
            sx={{ height: 8, borderRadius: 4, mt: 1 }}
          />
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const AggregatedMaterialsTable = ({ materials }) => {
  const totalCost = useMemo(() => {
    return materials.reduce((acc, material) => acc + material.cost, 0);
  }, [materials]);

  return (
    <TableContainer component={Paper} sx={{ mt: 4 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>产品名称</TableCell>
            <TableCell sx={{ fontWeight: 'bold' }}>计划生产数量</TableCell>
            <TableCell sx={{ width: '5%' }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {materials.map((material) => (
            <TableRow key={material.id}>
              <TableCell>{material.name}</TableCell>
              <TableCell>{material.quantity.toFixed(2)}</TableCell>
              <TableCell>
                {(material.quantity !== 0) && (
                  <Tooltip title="清除此项数量">
                    <IconButton onClick={() => {}} size="small">
                      <ClearIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

const RawMaterialCalculator = () => {
  const { breadTypes, doughRecipesMap, fillingRecipesMap, ingredientsMap, ingredients, loading } = useContext(DataContext);
  const [quantities, setQuantities] = useState({});
  const [aggregatedMaterials, setAggregatedMaterials] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const fileInputRef = useRef(null);

  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [importReport, setImportReport] = useState(null);

  const handleShowSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleQuantityChange = (breadId, quantity) => {
    const newQuantity = parseInt(quantity, 10);
    setQuantities(prevQuantities => ({
      ...prevQuantities,
      [breadId]: isNaN(newQuantity) || newQuantity < 0 ? '' : newQuantity
    }));
    setShowResults(false);
  };

  const handleClearSpecificQuantity = (breadId) => {
    setQuantities(prevQuantities => ({
      ...prevQuantities,
      [breadId]: ''
    }));
    setShowResults(false);
  };

  const handleResetQuantities = () => {
    setQuantities({});
    setAggregatedMaterials([]);
    setShowResults(false);
  };

  const handleImportExcelClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 1) {
          handleShowSnackbar('Excel 文件为空或格式不正确。', 'error');
          return;
        }
        
        const headerRow = jsonData[0];
        const productNameHeader = "产品名称";
        const quantityHeader = "数量";
        let productNameIndex = -1;
        let quantityIndex = -1;

        if (headerRow && Array.isArray(headerRow)){
            productNameIndex = headerRow.findIndex(header => String(header).trim() === productNameHeader);
            quantityIndex = headerRow.findIndex(header => String(header).trim() === quantityHeader);
        }

        if (productNameIndex === -1 || quantityIndex === -1) {
          handleShowSnackbar(`Excel表头必须包含 "${productNameHeader}" 和 "${quantityHeader}" 列。`, 'error');
          return;
        }

        const importedQuantities = { ...quantities };
        let importedCount = 0;
        let notFoundCount = 0;
        let invalidQuantityCount = 0;
        const reportResults = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const productName = row[productNameIndex] ? String(row[productNameIndex]).trim() : null;
          const quantityStr = row[quantityIndex] ? String(row[quantityIndex]).trim() : '';
          
          if (!productName) continue;

          const breadType = breadTypes.find(bt => bt.name.trim() === productName);

          if (breadType) {
            const quantityNum = parseInt(quantityStr, 10);
            if (!isNaN(quantityNum) && quantityNum >= 0) {
              importedQuantities[breadType.id] = (importedQuantities[breadType.id] || 0) + quantityNum;
              importedCount++;
              reportResults.push({ name: productName, value: quantityStr, status: 'success', message: `成功导入数量: ${quantityNum}` });
            } else {
              invalidQuantityCount++;
              reportResults.push({ name: productName, value: quantityStr, status: 'invalid_quantity', message: '数量值无效或非正整数。' });
            }
          } else {
            notFoundCount++;
            reportResults.push({ name: productName, value: quantityStr, status: 'not_found', message: '在数据库中未找到该产品名称。' });
          }
        }

        setQuantities(importedQuantities);
        setShowResults(false);

        const report = {
            summary: { success: importedCount, notFound: notFoundCount, invalid: invalidQuantityCount },
            results: reportResults,
        };
        setImportReport(report);
        setReportDialogOpen(true);

        if (importedCount > 0) {
          if (notFoundCount > 0 || invalidQuantityCount > 0) {
            handleShowSnackbar(`导入完成，但存在一些问题。请查看报告详情。`, 'warning');
          } else {
            handleShowSnackbar(`成功导入 ${importedCount} 项产品数量。`, 'success');
          }
        } else {
          handleShowSnackbar(`导入失败，未找到任何有效数据。请查看报告详情。`, 'error');
        }

      } catch (error) {
        console.error("Excel 文件导入失败:", error);
        handleShowSnackbar('Excel 文件处理失败，请检查文件格式或内容。详情请查看浏览器控制台。', 'error');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.onerror = (error) => {
        console.error("文件读取错误:", error);
        handleShowSnackbar('无法读取文件。详情请查看浏览器控制台。', 'error');
    };
    reader.readAsArrayBuffer(file);
  };

  const calculateTotalRawMaterials = useCallback((showLoader = true) => {
    if (loading) {
      handleShowSnackbar('核心数据仍在加载中，请稍候...', 'warning');
      return;
    }
    if (showLoader) setIsCalculating(true);

    const totalAggregated = {};

    for (const breadId in quantities) {
      const quantity = quantities[breadId];
      if (quantity > 0) {
        const bread = breadTypes.find(b => b.id === breadId);
        if (bread) {
          const breadMaterials = generateAggregatedRawMaterials(
            bread,
            breadTypes,
            doughRecipesMap,
            fillingRecipesMap,
            ingredients,
            quantity
          );
          
          breadMaterials.forEach(material => {
            const matCost = material.cost || 0;
            const matQty = material.quantity || 0;

            if (totalAggregated[material.id]) {
              totalAggregated[material.id].quantity += matQty;
              totalAggregated[material.id].cost += matCost;
            } else {
              totalAggregated[material.id] = { 
                ...material,
                quantity: matQty,
                cost: matCost
              };
            }
          });
        }
      }
    }

    const finalMaterials = Object.values(totalAggregated).map(material => {
      const ingredientDetails = ingredientsMap.get(material.name);
      
      if (!ingredientDetails) {
        return {
          ...material,
          currentStockInGrams: 0,
          purchaseSuggestion: material.quantity,
          purchaseUnit: 'N/A',
          unit: 'g',
          isDeficit: true,
          stockCoverage: 0
        };
      }
      
      const stockByPost = ingredientDetails.stockByPost || {};
      let totalStockByUnit = 0;
      if (typeof stockByPost === 'object' && stockByPost !== null) {
          totalStockByUnit = Object.values(stockByPost).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      }

      const norms = ingredientDetails.norms || 1;
      const currentStockInGrams = totalStockByUnit * norms;
      const requiredGrams = material.quantity;
      const deficitGrams = requiredGrams - currentStockInGrams;
      
      const purchaseSuggestion = deficitGrams > 0 ? Math.ceil(deficitGrams / norms) : 0;
      const stockCoverage = currentStockInGrams > 0 ? Math.min((currentStockInGrams / requiredGrams) * 100, 100) : 0;

      return {
        ...material,
        currentStockInGrams,
        purchaseSuggestion,
        purchaseUnit: ingredientDetails.unit,
        isDeficit: deficitGrams > 0,
        stockCoverage,
      };
    }).sort((a, b) => b.cost - a.cost);

    setAggregatedMaterials(finalMaterials);
    setShowResults(true);
    if (showLoader) {
      setTimeout(() => setIsCalculating(false), 500);
    }
  }, [quantities, breadTypes, doughRecipesMap, fillingRecipesMap, ingredients, ingredientsMap, loading, handleShowSnackbar]);

  useEffect(() => {
    if (showResults) {
      calculateTotalRawMaterials(false);
    }
  }, [breadTypes, ingredients, showResults, calculateTotalRawMaterials]);

  const handleExportTemplate = () => {
    const templateData = breadTypes.map(bt => ({
      '产品名称': bt.name,
      '数量': ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '生产计划模板');
    XLSX.writeFile(workbook, '产品生产计划模板.xlsx');
    handleShowSnackbar('导入模板已成功下载！', 'success');
  };

  const handleExportExcel = () => {
    if (aggregatedMaterials.length === 0) {
        handleShowSnackbar('没有计算结果可导出。请先计算。', 'warning');
        return;
    }
  
    let totalCostForExport = 0;
    const dataToExport = aggregatedMaterials.map(material => {
        const ingredientInfo = ingredientsMap.get(material.id.trim());
        const norms = ingredientInfo?.norms || ingredientInfo?.unitSize || 1;
        
        const purchaseNeededInGrams = material.purchaseSuggestion;
        const purchaseNeededInUnits = purchaseNeededInGrams > 0 ? Math.ceil(purchaseNeededInGrams / norms) : 0;
        
        const rawPrice = ingredientInfo?.price || '0';
        const price = parseFloat(String(rawPrice).replace(/[^\d.-]/g, '')) || 0;
        const estimatedOrderCost = purchaseNeededInUnits * price;
        totalCostForExport += estimatedOrderCost;

        const unit = typeof (ingredientInfo?.unit) === 'object' 
            ? Object.values(ingredientInfo.unit)[0] || '' 
            : ingredientInfo?.unit || '';

        return {
            '原料名称': material.name,
            '规格': ingredientInfo?.specs || '',
            '需求总量(g)': material.quantity,
            '当前库存(g)': material.currentStockInGrams,
            '需采购量(g)': purchaseNeededInGrams > 0 ? purchaseNeededInGrams : 0,
            '建议采购数量': purchaseNeededInUnits > 0 ? purchaseNeededInUnits : '无需采购',
            '建议采购单位': purchaseNeededInUnits > 0 ? unit : '',
            '预估订货成本(元)': estimatedOrderCost > 0 ? estimatedOrderCost : 0,
        }
    });

    dataToExport.push({}); // Add a spacer row
    dataToExport.push({
      '原料名称': '采购总计',
      '预估订货成本(元)': totalCostForExport
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);

    // Set column widths for better readability
    worksheet['!cols'] = [
        { wch: 25 }, // 原料名称
        { wch: 15 }, // 规格
        { wch: 12 }, // 需求总量(g)
        { wch: 12 }, // 当前库存(g)
        { wch: 12 }, // 需采购量(g)
        { wch: 12 }, // 建议采购数量
        { wch: 12 }, // 建议采购单位
        { wch: 15 }, // 预估订货成本(元)
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '原料需求汇总');
    
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `原料需求汇总_${today}.xlsx`);
    handleShowSnackbar('Excel 文件已成功导出！', 'success');
  };

  const { materialsForDisplay, totalCost } = useMemo(() => {
    let runningTotalCost = 0;

    const materials = aggregatedMaterials
      .sort((a, b) => b.quantity - a.quantity)
      .map(material => {
        const ingredientInfo = ingredientsMap.get(material.id.trim());

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
        const purchaseNeededInGrams = requiredQuantity - currentStockInGrams;
        const purchaseNeededInUnits = purchaseNeededInGrams > 0 ? Math.ceil(purchaseNeededInGrams / norms) : 0;
        const unit = typeof ingredientInfo.unit === 'object'
          ? Object.values(ingredientInfo.unit)[0] || ''
          : ingredientInfo.unit || '';
        
        const rawPrice = ingredientInfo?.price || '0';
        const price = parseFloat(String(rawPrice).replace(/[^\d.-]/g, '')) || 0;
        const estimatedOrderCost = purchaseNeededInUnits * price;
        
        runningTotalCost += estimatedOrderCost;

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
        };
      });

    return { materialsForDisplay: materials, totalCost: runningTotalCost };
  }, [aggregatedMaterials, ingredientsMap]);
  
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>正在加载原料数据...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="center" sx={{ mb: {xs: 2, md: 3} }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 0, fontWeight: 500 }}>
        面包生产原料计算器
      </Typography>
        <Tooltip title="查看操作指南">
          <IconButton component={Link} to="/operation-guide#raw-material-calculator" size="small" sx={{ ml: 1, color: 'primary.main' }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Typography variant="h6" gutterBottom component="h2">1. 输入生产数量</Typography>
        <Grid container spacing={2} alignItems="flex-start">
          {breadTypes.map((bread) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={bread.id}>
              <BreadInputCard bread={bread} quantity={quantities[bread.id] || ''} onQuantityChange={handleQuantityChange} onClear={handleClearSpecificQuantity} />
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => calculateTotalRawMaterials(true)} 
            disabled={isCalculating || loading || Object.values(quantities).every(q => !q || q === 0)}
            sx={{ minWidth: 180, height: '56px' }}
          >
            {isCalculating ? <CircularProgress size={24} color="inherit" /> : '计算总原料'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleResetQuantities}
            startIcon={<ReplayIcon />}
            sx={{ flexGrow: { xs: 1, sm: 'initial' } }}
          >
            全部重置
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleImportExcelClick}
            startIcon={<FileUploadIcon />}
            sx={{ flexGrow: { xs: 1, sm: 'initial' } }}
          >
            导入Excel计算
          </Button>
          <Button 
            variant="outlined" 
            onClick={handleExportTemplate}
            startIcon={<Download />}
            sx={{ flexGrow: { xs: 1, sm: 'initial' } }}
          >
            下载导入模板
          </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls" 
              style={{ display: 'none' }} 
            />
        </Box>
      </Paper>

      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">2. 原料需求汇总 (按基础单位计算)</Typography>
          <Button
            variant="contained"
              color="secondary" 
              onClick={handleExportExcel} 
              startIcon={<Download />}
              disabled={!aggregatedMaterials.length}
          >
              导出Excel
          </Button>
        </Box>
        <TableContainer>
          <Table stickyHeader>
            <TableHead>
                    <TableRow>
                <TableCell sx={{ fontWeight: 'bold', minWidth: 170 }}>原料名称</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>总需求量</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 150 }}>当前库存</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>单位</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', color: 'primary.main', minWidth: 150 }}>需采购量</TableCell>
                    </TableRow>
              </TableHead>
              <TableBody>
            {materialsForDisplay
              .map(material => {
                if (material.isMissing) {
                  return (
                    <TableRow key={material.id} sx={{ '&:last-child td, &:last-child th': { border: 0 }, backgroundColor: 'rgba(255, 229, 229, 0.6)' }} hover>
                      <TableCell component="th" scope="row">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>{material.name || '未知原料'}</Typography>
                      </TableCell>
                      <TableCell align="right">{(material.quantity || 0).toFixed(2)} g</TableCell>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="error">
                          原料基础信息未找到，无法计算
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                    <TableRow key={material.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell component="th" scope="row">
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>{material.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{material.ingredientInfo?.specs || ''}</Typography>
                      </TableCell>
                        <TableCell align="right">{material.requiredQuantity.toFixed(2)} g</TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {material.totalStockByUnit.toFixed(2)} {material.unit}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            ({material.currentStockInGrams.toFixed(1)} g)
                          </Typography>
                      </TableCell>
                        <TableCell align="right">{material.unit}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 'bold', color: material.purchaseNeededInGrams > 0 ? 'error.main' : 'success.main' }}>
                            {material.purchaseNeededInGrams > 0 ? (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                  {material.purchaseNeededInUnits} {material.unit}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  (共 {(material.purchaseNeededInUnits * material.norms).toFixed(1)} g)
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  约 ¥{material.estimatedOrderCost.toFixed(2)}
                                </Typography>
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
                <TableRow sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell colSpan={4} align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                    预估采购总计:
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', fontSize: '1.1rem', color: 'primary.main' }}>
                    ¥{totalCost.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
      </Paper>

      <ImportReportDialog 
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        report={importReport}
      />

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RawMaterialCalculator; 