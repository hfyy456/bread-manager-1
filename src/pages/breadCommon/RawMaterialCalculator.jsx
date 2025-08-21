import React, { useState, useRef, useEffect, useCallback, useContext, useMemo } from 'react';
import { Container, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Box, IconButton, Tooltip, CircularProgress, Chip, Snackbar, Alert as MuiAlert, TableFooter, useTheme, useMediaQuery, Card, CardContent, LinearProgress, Stack, Dialog, DialogTitle, DialogContent, DialogActions, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import { Replay as ReplayIcon, Clear as ClearIcon, FileUpload as FileUploadIcon, Download, InfoOutlined as InfoOutlinedIcon, CheckCircle as CheckCircleIcon, Cancel as CancelIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { generateAggregatedRawMaterials, adjustCost, findIngredientById, getBreadCostBreakdown } from '@utils/calculator';
import { DataContext } from '@components/DataContext.jsx';

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

const CostAnalysisCard = ({ costAnalysis }) => {
  if (!costAnalysis) return null;

  return (
    <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
      <Typography variant="h6" component="h2" gutterBottom>
        2. 成本核算分析
      </Typography>
      
      {/* 总体成本概览 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50' }}>
            <Typography variant="h6" color="primary.main">
              ¥{costAnalysis.totalProductionCost.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              总生产成本
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50' }}>
            <Typography variant="h6" color="success.main">
              ¥{costAnalysis.totalProductionValue.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              总销售价值
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: costAnalysis.totalProfit >= 0 ? 'success.50' : 'error.50' }}>
            <Typography variant="h6" color={costAnalysis.totalProfit >= 0 ? 'success.main' : 'error.main'}>
              ¥{costAnalysis.totalProfit.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              总利润
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ textAlign: 'center', p: 2, bgcolor: costAnalysis.overallProfitMargin >= 0 ? 'success.50' : 'error.50' }}>
            <Typography variant="h6" color={costAnalysis.overallProfitMargin >= 0 ? 'success.main' : 'error.main'}>
              {costAnalysis.overallProfitMargin.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              总利润率
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* 产品成本明细表 */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>产品名称</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>数量</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>单位成本</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>单位售价</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>总成本</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>总价值</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>利润</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>利润率</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {costAnalysis.products.map((product) => (
              <TableRow key={product.breadId} hover>
                <TableCell component="th" scope="row">
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {product.breadName}
                  </Typography>
                </TableCell>
                <TableCell align="right">{product.quantity}</TableCell>
                <TableCell align="right">¥{product.unitCost.toFixed(2)}</TableCell>
                <TableCell align="right">¥{product.unitPrice.toFixed(2)}</TableCell>
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
                {costAnalysis.products.reduce((sum, p) => sum + p.quantity, 0)}
              </TableCell>
              <TableCell align="right">-</TableCell>
              <TableCell align="right">-</TableCell>
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
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [materialMultiplier, setMaterialMultiplier] = useState(1.05); // 原料需求系数，默认1.05倍
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
    setCostAnalysis(null);
    setShowResults(false);
  };

  const handleClearSpecificQuantity = (breadId) => {
    setQuantities(prevQuantities => ({
      ...prevQuantities,
      [breadId]: ''
    }));
    setCostAnalysis(null);
    setShowResults(false);
  };

  const handleResetQuantities = () => {
    setQuantities({});
    setAggregatedMaterials([]);
    setCostAnalysis(null);
    setMaterialMultiplier(1.05); // 重置为默认推荐值
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
    const productCostAnalysis = [];
    let totalProductionCost = 0;
    let totalProductionValue = 0;

    for (const breadId in quantities) {
      const quantity = quantities[breadId];
      if (quantity > 0) {
        const bread = breadTypes.find(b => b.id === breadId);
        if (bread) {
          // 计算单个产品的成本分解
          const breadCostBreakdown = getBreadCostBreakdown(bread, doughRecipesMap, fillingRecipesMap, ingredientsMap);
          const unitCost = breadCostBreakdown ? breadCostBreakdown.totalCost : 0;
          const totalCostForThisBread = unitCost * quantity;
          const totalValueForThisBread = (bread.price || 0) * quantity;
          
          totalProductionCost += totalCostForThisBread;
          totalProductionValue += totalValueForThisBread;

          productCostAnalysis.push({
            breadId: bread.id,
            breadName: bread.name,
            quantity: quantity,
            unitCost: unitCost,
            unitPrice: bread.price || 0,
            totalCost: totalCostForThisBread,
            totalValue: totalValueForThisBread,
            unitProfit: (bread.price || 0) - unitCost,
            totalProfit: totalValueForThisBread - totalCostForThisBread,
            profitMargin: totalValueForThisBread > 0 ? ((totalValueForThisBread - totalCostForThisBread) / totalValueForThisBread * 100) : 0,
            costBreakdown: breadCostBreakdown
          });

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
            const matQty = (material.quantity || 0) * materialMultiplier; // 应用原料需求系数

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

    // 设置成本分析数据
    setCostAnalysis({
      products: productCostAnalysis,
      totalProductionCost: totalProductionCost,
      totalProductionValue: totalProductionValue,
      totalProfit: totalProductionValue - totalProductionCost,
      overallProfitMargin: totalProductionValue > 0 ? ((totalProductionValue - totalProductionCost) / totalProductionValue * 100) : 0
    });

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
  }, [quantities, breadTypes, doughRecipesMap, fillingRecipesMap, ingredients, ingredientsMap, loading, handleShowSnackbar, materialMultiplier]);

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
  
    const workbook = XLSX.utils.book_new();
    
    // 1. 成本分析工作表
    if (costAnalysis) {
      const costAnalysisData = [
        { '项目': '总生产成本', '金额(元)': costAnalysis.totalProductionCost.toFixed(2) },
        { '项目': '总销售价值', '金额(元)': costAnalysis.totalProductionValue.toFixed(2) },
        { '项目': '总利润', '金额(元)': costAnalysis.totalProfit.toFixed(2) },
        { '项目': '总利润率', '金额(元)': costAnalysis.overallProfitMargin.toFixed(1) + '%' },
        {},
        { '产品名称': '产品名称', '数量': '数量', '单位成本(元)': '单位成本(元)', '单位售价(元)': '单位售价(元)', '总成本(元)': '总成本(元)', '总价值(元)': '总价值(元)', '利润(元)': '利润(元)', '利润率(%)': '利润率(%)' },
        ...costAnalysis.products.map(product => ({
          '产品名称': product.breadName,
          '数量': product.quantity,
          '单位成本(元)': product.unitCost.toFixed(2),
          '单位售价(元)': product.unitPrice.toFixed(2),
          '总成本(元)': product.totalCost.toFixed(2),
          '总价值(元)': product.totalValue.toFixed(2),
          '利润(元)': product.totalProfit.toFixed(2),
          '利润率(%)': product.profitMargin.toFixed(1)
        }))
      ];
      
      const costWorksheet = XLSX.utils.json_to_sheet(costAnalysisData);
      costWorksheet['!cols'] = [
        { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, costWorksheet, '成本分析');
    }

    // 2. 原料需求工作表
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
    
    if (materialMultiplier !== 1.0) {
      dataToExport.push({});
      dataToExport.push({
        '原料名称': '说明',
        '规格': `原料需求已应用 ${materialMultiplier}x 安全系数`
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '原料需求汇总');
    
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `生产计划成本分析_${today}.xlsx`);
    handleShowSnackbar('Excel 文件已成功导出！包含成本分析和原料需求两个工作表。', 'success');
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
        生产计划成本核算器
      </Typography>
        <Tooltip title="查看操作指南">
          <IconButton component={Link} to="/operation-guide#raw-material-calculator" size="small" sx={{ ml: 1, color: 'primary.main' }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>

      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Typography variant="h6" gutterBottom component="h2">1. 输入生产数量</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          输入各产品的生产数量，系统将自动计算原料成本、生产成本和利润分析。可调节原料需求系数以预留生产余量。
        </Typography>
        <Grid container spacing={2} alignItems="flex-start">
          {breadTypes.map((bread) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={bread.id}>
              <BreadInputCard bread={bread} quantity={quantities[bread.id] || ''} onQuantityChange={handleQuantityChange} onClear={handleClearSpecificQuantity} />
            </Grid>
          ))}
        </Grid>
        
        {/* 原料需求系数调节 */}
        <Box sx={{ mt: 3, mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            原料需求系数调节
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            设置原料需求的安全系数，建议1.05-1.10倍以预留生产余量
          </Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="原料需求系数"
                type="number"
                value={materialMultiplier}
                onChange={(e) => {
                  const value = parseFloat(e.target.value);
                  if (!isNaN(value) && value >= 0.5 && value <= 2.0) {
                    setMaterialMultiplier(value);
                    setCostAnalysis(null);
                    setShowResults(false);
                  }
                }}
                inputProps={{ 
                  min: "0.5", 
                  max: "2.0", 
                  step: "0.01" 
                }}
                size="small"
                fullWidth
                helperText="范围: 0.5 - 2.0"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={8}>
              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip 
                  label="1.00 (标准)" 
                  variant={materialMultiplier === 1.00 ? "filled" : "outlined"}
                  onClick={() => {
                    setMaterialMultiplier(1.00);
                    setCostAnalysis(null);
                    setShowResults(false);
                  }}
                  size="small"
                />
                <Chip 
                  label="1.05 (推荐)" 
                  variant={materialMultiplier === 1.05 ? "filled" : "outlined"}
                  onClick={() => {
                    setMaterialMultiplier(1.05);
                    setCostAnalysis(null);
                    setShowResults(false);
                  }}
                  size="small"
                  color="primary"
                />
                <Chip 
                  label="1.10 (保守)" 
                  variant={materialMultiplier === 1.10 ? "filled" : "outlined"}
                  onClick={() => {
                    setMaterialMultiplier(1.10);
                    setCostAnalysis(null);
                    setShowResults(false);
                  }}
                  size="small"
                />
                <Chip 
                  label="1.15 (高余量)" 
                  variant={materialMultiplier === 1.15 ? "filled" : "outlined"}
                  onClick={() => {
                    setMaterialMultiplier(1.15);
                    setCostAnalysis(null);
                    setShowResults(false);
                  }}
                  size="small"
                />
              </Stack>
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => calculateTotalRawMaterials(true)} 
            disabled={isCalculating || loading || Object.values(quantities).every(q => !q || q === 0)}
            sx={{ minWidth: 180, height: '56px' }}
          >
            {isCalculating ? <CircularProgress size={24} color="inherit" /> : '计算成本与原料'}
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

      {/* 成本核算分析 */}
      {showResults && costAnalysis && (
        <CostAnalysisCard costAnalysis={costAnalysis} />
      )}

      <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" component="h2">{showResults && costAnalysis ? '3' : '2'}. 原料需求汇总 (按基础单位计算)</Typography>
            {showResults && materialMultiplier !== 1.0 && (
              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                已应用 {materialMultiplier}x 安全系数
              </Typography>
            )}
          </Box>
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
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  总需求量
                  {materialMultiplier !== 1.0 && (
                    <Typography variant="caption" display="block" color="primary.main">
                      (×{materialMultiplier})
                    </Typography>
                  )}
                </TableCell>
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