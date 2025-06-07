import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Container, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Box, IconButton, Tooltip, CircularProgress, Chip, Snackbar, Alert as MuiAlert } from '@mui/material';
import { Replay as ReplayIcon, Clear as ClearIcon, FileUpload as FileUploadIcon, Download, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { breadTypes } from '../data/breadTypes';
import { Link } from 'react-router-dom';
// import { ingredients as allIngredients } from '../data/ingredients'; // Removed static import
import { generateAggregatedRawMaterials, adjustCost, findIngredientById } from '../utils/calculator';

const LOCAL_STORAGE_STOCKS_KEY = 'rawMaterialStocks_byPurchaseUnit';

const getStocksFromLocalStorage = () => {
  try {
    const storedStocks = localStorage.getItem(LOCAL_STORAGE_STOCKS_KEY);
    return storedStocks ? JSON.parse(storedStocks) : {};
  } catch (error) {
    console.error("Error reading stocks from localStorage:", error);
    return {};
  }
};

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const RawMaterialCalculator = () => {
  const [quantities, setQuantities] = useState({});
  const [aggregatedMaterials, setAggregatedMaterials] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const fileInputRef = useRef(null);
  const [materialStocks, setMaterialStocks] = useState({}); 

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info'); 

  const [allIngredientsData, setAllIngredientsData] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [errorIngredients, setErrorIngredients] = useState(null);

  useEffect(() => {
    const fetchIngredients = async () => {
      setLoadingIngredients(true);
      setErrorIngredients(null);
      try {
        const response = await fetch('/api/ingredients/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}), // Empty body for POST as per previous setup
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setAllIngredientsData(result.data);
        } else {
          console.error("Failed to fetch ingredients or data format is incorrect:", result.message || 'Unknown error');
          setErrorIngredients(result.message || 'Failed to load ingredients or data format is incorrect.');
          setAllIngredientsData([]); 
        }
      } catch (error) {
        console.error("Error fetching ingredients:", error);
        setErrorIngredients(`Error fetching ingredients: ${error.message}`);
        setAllIngredientsData([]); 
      } finally {
        setLoadingIngredients(false);
      }
    };

    fetchIngredients();
  }, []); 

  useEffect(() => {
    setMaterialStocks(getStocksFromLocalStorage());
  }, []); 

  const refreshStocks = () => {
    setMaterialStocks(getStocksFromLocalStorage());
    if (showResults && Object.keys(quantities).some(k => quantities[k] > 0) ) {
      calculateTotalRawMaterials(false); 
    }
  };

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
    refreshStocks(); 
  };

  const handleImportExcelClick = () => {
    fileInputRef.current.click();
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    refreshStocks(); 

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
        const notFoundItems = []; 
        const invalidQuantityItems = []; 

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const productName = row[productNameIndex] ? String(row[productNameIndex]).trim() : null;
          const quantityStr = row[quantityIndex] ? String(row[quantityIndex]).trim() : null;
          
          if (!productName) continue;

          const breadType = breadTypes.find(bt => bt.name.trim() === productName);

          if (breadType) {
            const quantityNum = parseInt(quantityStr, 10);
            if (!isNaN(quantityNum) && quantityNum >= 0) {
              importedQuantities[breadType.id] = quantityNum;
              importedCount++;
            } else {
              invalidQuantityCount++;
              invalidQuantityItems.push({ name: productName, value: quantityStr });
            }
          } else {
            notFoundCount++;
            notFoundItems.push({ name: productName, value: quantityStr });
          }
        }

        setQuantities(importedQuantities);
        setShowResults(false);

        let message = '';
        let severity = 'info';

        if (importedCount > 0) {
          message = `成功导入 ${importedCount} 项产品数量。`;
          severity = 'success';
          if (notFoundCount > 0 || invalidQuantityCount > 0) {
            severity = 'warning';
            message += ` 但有 ${notFoundCount} 个产品未找到，${invalidQuantityCount} 个数量无效。`;
          }
        } else {
          if (notFoundCount > 0 || invalidQuantityCount > 0) {
            message = `导入失败：${notFoundCount} 个产品未找到，${invalidQuantityCount} 个数量无效。`;
            severity = 'error';
          } else {
            message = '未从Excel中导入任何有效的产品数量。请检查文件内容和表头。'
            severity = 'info';
          }
        }
        
        message += ' 详情请查看浏览器控制台。';
        handleShowSnackbar(message, severity);

        if (notFoundItems.length > 0) {
          console.warn('--- Excel导入：未找到以下产品 ---');
          notFoundItems.forEach(item => console.warn(`产品: "${item.name}", 原始数量: "${item.value}"`));
        }
        if (invalidQuantityItems.length > 0) {
          console.warn('--- Excel导入：以下产品的数量无效 ---');
          invalidQuantityItems.forEach(item => console.warn(`产品: "${item.name}", 无效数量: "${item.value}"`));
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
    if (loadingIngredients) {
      handleShowSnackbar('原料数据仍在加载中，请稍候...', 'warning');
      return;
    }
    if (errorIngredients) {
      handleShowSnackbar(`无法计算，原料数据加载失败: ${errorIngredients}`, 'error');
      return;
    }
    if (allIngredientsData.length === 0 && !loadingIngredients) { // Check also !loadingIngredients to avoid premature error
        handleShowSnackbar('原料数据为空，无法计算。请确保API数据可用或稍后再试。', 'error');
        return;
    }

    if (showLoader) {
      setIsCalculating(true);
    }
    setAggregatedMaterials([]);

    setTimeout(() => {
      try {
        console.log("Starting raw material calculation with quantities:", quantities, "and ingredients:", allIngredientsData);
        const aggregated = {};

        breadTypes.forEach((breadType) => {
          const quantity = parseInt(quantities[breadType.id], 10) || 0;
          if (quantity > 0) {
            console.log(`Calculating for ${breadType.name}, quantity: ${quantity}`);
            // Ensure allIngredientsData is passed here
            const materialsForBreadType = generateAggregatedRawMaterials(breadType, allIngredientsData);
            console.log(`Materials for ${breadType.name} (raw from calculator):`, materialsForBreadType);

            materialsForBreadType.forEach((material) => {
              // Ensure allIngredientsData is passed here
              const ingData = findIngredientById(material.id, allIngredientsData);
              if (!ingData) {
                console.warn(`Ingredient data not found for ${material.id} (name from aggregation: ${material.name}) while aggregating for ${breadType.name}. Skipping.`);
                return; 
              }

              const totalQuantityNeeded = material.quantity * quantity;
              const stockInPurchaseUnit_Raw = materialStocks[material.id] || materialStocks[ingData.name] || 0;

              if (aggregated[material.id]) {
                aggregated[material.id].rawQuantity += totalQuantityNeeded;
            } else {
                aggregated[material.id] = {
                id: material.id,
                  name: ingData.name, 
                  rawQuantity: totalQuantityNeeded,
                  baseUnit: ingData.baseUnit || ingData.min, 
                  purchaseUnit: ingData.unit, 
                  norms: ingData.norms, 
                  specs: ingData.specs, 
                  price: ingData.price, 
                  currentStockInPurchaseUnit: parseFloat(stockInPurchaseUnit_Raw) || 0,
              };
            }
          });
        }
      });
      
        const finalAggregatedArray = Object.values(aggregated).map(material => {
          const purchaseUnitQuantity = material.norms > 0 ? material.rawQuantity / material.norms : 0;
          const deficit = Math.max(0, purchaseUnitQuantity - material.currentStockInPurchaseUnit);
          const costPerPurchaseUnit = material.price || 0;
          const totalCostForDeficit = adjustCost(deficit * costPerPurchaseUnit);
        
        return {
          ...material,
            purchaseUnitQuantity: adjustCost(purchaseUnitQuantity), 
            deficit: adjustCost(deficit), 
            totalCostForDeficit: totalCostForDeficit,
        };
        }).sort((a, b) => a.name.localeCompare(b.name));

        console.log("Final aggregated materials:", finalAggregatedArray);
        setAggregatedMaterials(finalAggregatedArray);
      setShowResults(true);
      } catch (e) {
        console.error("Error during raw material calculation:", e);
        handleShowSnackbar(`计算出错: ${e.message}`, 'error');
        setShowResults(false);
      } finally {
        if (showLoader) {
          setIsCalculating(false);
        }
      }
    }, 50); 
  }, [quantities, allIngredientsData, materialStocks, loadingIngredients, errorIngredients]); // Added dependencies

  const handleExportExcel = () => {
    if (loadingIngredients) {
      handleShowSnackbar('原料数据仍在加载中，无法导出。', 'warning');
      return;
    }
     if (errorIngredients) {
      handleShowSnackbar(`无法导出，原料数据加载失败: ${errorIngredients}`, 'error');
      return;
    }
    if (allIngredientsData.length === 0 && aggregatedMaterials.length === 0 && !loadingIngredients) {
        handleShowSnackbar('没有原料数据或计算结果可导出。请确保API连接正常。', 'warning');
        return;
    }
    if (aggregatedMaterials.length === 0) {
        handleShowSnackbar('没有计算结果可导出。请先计算。', 'warning');
        return;
    }

    console.log("Exporting data:", aggregatedMaterials);
  
    const dataToExport = aggregatedMaterials.map(material => {
      // Ensure allIngredientsData is passed here
      const ingData = findIngredientById(material.id, allIngredientsData); 
      return {
        '原料ID': material.id,
        '原料名称': material.name,
        '规格': ingData?.specs || material.specs || 'N/A',
        '总需求量(基础单位)': material.rawQuantity.toFixed(3),
        '基础单位': material.baseUnit,
        '当前库存(采购单位)': material.currentStockInPurchaseUnit.toFixed(2),
        '总需求量(采购单位)': material.purchaseUnitQuantity.toFixed(2),
        '采购单位': material.purchaseUnit,
        '缺口(采购单位)': material.deficit.toFixed(2),
        '采购单价': material.price ? material.price.toFixed(2) : 'N/A',
        '缺口成本': material.totalCostForDeficit.toFixed(2),
      };
    });

    const totalDeficitCostSum = aggregatedMaterials.reduce((sum, item) => sum + item.totalCostForDeficit, 0);
    dataToExport.push({}); 
    dataToExport.push({
        '原料ID': '总计',
        '缺口成本': adjustCost(totalDeficitCostSum).toFixed(2)
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const colWidths = [
        { wch: 25 }, 
        { wch: 30 }, 
        { wch: 20 }, 
        { wch: 20 }, 
        { wch: 10 }, 
        { wch: 20 }, 
        { wch: 20 }, 
        { wch: 10 }, 
        { wch: 15 }, 
        { wch: 10 }, 
        { wch: 10 }, 
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '原料需求表');
    
    const today = new Date();
    const dateStr = `${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, '0')}${today.getDate().toString().padStart(2, '0')}`;
    const timeStr = `${today.getHours().toString().padStart(2, '0')}${today.getMinutes().toString().padStart(2, '0')}`;
    const fileName = `面包原料需求_${dateStr}_${timeStr}.xlsx`;

    XLSX.writeFile(workbook, fileName);
    handleShowSnackbar('数据已成功导出到Excel文件！', 'success');
  };
  
  if (loadingIngredients && !errorIngredients) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
          <Typography variant="h6" sx={{ ml: 2 }}>正在加载原料数据...</Typography>
        </Box>
      </Container>
    );
  }

  if (errorIngredients) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', backgroundColor: 'error.light' }}>
          <Typography variant="h5" color="error.contrastText">原料数据加载失败</Typography>
          <Typography color="error.contrastText" sx={{ mt: 1 }}>{errorIngredients}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{mt: 2}}>刷新页面</Button>
        </Paper>
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
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField
                  label={bread.name}
                  type="number"
                  value={quantities[bread.id] || ''}
                  onChange={(e) => handleQuantityChange(bread.id, e.target.value)}
                  variant="outlined"
                  fullWidth
                  InputProps={{
                    inputProps: { min: 0 }
                  }}
                  sx={{ flexGrow: 1 }}
                />
                {(quantities[bread.id] || '') !== '' && (
                  <Tooltip title="清除此项数量">
                    <IconButton onClick={() => handleClearSpecificQuantity(bread.id)} size="small">
                      <ClearIcon />
                    </IconButton>
                </Tooltip>
                )}
              </Box>
            </Grid>
          ))}
        </Grid>
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => calculateTotalRawMaterials(true)} 
            disabled={isCalculating || loadingIngredients || !!errorIngredients || Object.values(quantities).every(q => !q || q === '0' || q === 0)}
            sx={{ flexGrow: { xs: 1, sm: 'initial' } }}
          >
            {isCalculating ? <CircularProgress size={24} color="inherit" sx={{mr:1}} /> : null}
            {isCalculating ? '正在计算...' : '计算总原料'}
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
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".xlsx, .xls" 
              style={{ display: 'none' }} 
            />
        </Box>
                    </Paper>

      {showResults && aggregatedMaterials.length > 0 && (
        <Paper elevation={3} sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" component="h2">2. 原料需求汇总 (按基础单位计算)</Typography>
            <Button
              variant="contained"
                color="secondary" 
                onClick={handleExportExcel} 
                startIcon={<Download />}
                disabled={aggregatedMaterials.length === 0 || loadingIngredients || !!errorIngredients}
            >
                导出Excel
            </Button>
              </Box>
          <TableContainer>
            <Table stickyHeader sx={{ minWidth: 800 }} aria-label="aggregated raw materials table">
              <TableHead>
                      <TableRow>
                  <TableCell sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>原料名称 (ID)</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>规格</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>总需求 ({aggregatedMaterials[0]?.baseUnit || '基础单位'})</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>当前库存 ({aggregatedMaterials[0]?.purchaseUnit || '采购单位'})</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>需求 ({aggregatedMaterials[0]?.purchaseUnit || '采购单位'})</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>缺口 ({aggregatedMaterials[0]?.purchaseUnit || '采购单位'})</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>采购单价</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', backgroundColor: 'grey.200' }}>缺口成本</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {aggregatedMaterials.map((material) => (
                  <TableRow hover key={material.id}>
                    <TableCell component="th" scope="row">
                      {material.name}
                      <Typography variant="caption" display="block" color="textSecondary">({material.id})</Typography>
                          </TableCell>
                    <TableCell align="right">{material.specs || 'N/A'}</TableCell>
                    <TableCell align="right">{material.rawQuantity.toFixed(3)} {material.baseUnit}</TableCell>
                    <TableCell align="right">{material.currentStockInPurchaseUnit.toFixed(2)} {material.purchaseUnit}</TableCell>
                    <TableCell align="right">{material.purchaseUnitQuantity.toFixed(2)} {material.purchaseUnit}</TableCell>
                    <TableCell align="right" sx={{ color: material.deficit > 0 ? 'error.main' : 'inherit', fontWeight: material.deficit > 0 ? 'bold' : 'normal' }}>
                      {material.deficit.toFixed(2)} {material.purchaseUnit}
                          </TableCell>
                     <TableCell align="right">{material.price ? `¥${material.price.toFixed(2)}` : 'N/A'}</TableCell>
                    <TableCell align="right" sx={{ color: material.totalCostForDeficit > 0 ? 'error.main' : 'inherit', fontWeight: material.totalCostForDeficit > 0 ? 'bold' : 'normal' }}>
                      {material.totalCostForDeficit > 0 ? `¥${material.totalCostForDeficit.toFixed(2)}` : '¥0.00'}
                          </TableCell>
                        </TableRow>
                      ))}
                <TableRow sx={{ '& td': { borderTop: '2px solid black', fontWeight: 'bold' } }}>
                    <TableCell colSpan={7} align="right" sx={{fontSize: '1.1rem'}}>总缺口成本:</TableCell>
                    <TableCell align="right" sx={{fontSize: '1.1rem', color: aggregatedMaterials.reduce((sum, item) => sum + item.totalCostForDeficit, 0) > 0 ? 'error.main' : 'inherit' }}>
                        ¥{adjustCost(aggregatedMaterials.reduce((sum, item) => sum + item.totalCostForDeficit, 0)).toFixed(2)}
                    </TableCell>
                </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
            </Paper>
          )}
      {showResults && aggregatedMaterials.length === 0 && !isCalculating && (
         <Paper elevation={3} sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="subtitle1">没有计算出原料需求。请确保已输入生产数量并点击计算按钮。</Typography>
            </Paper>
          )}

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default RawMaterialCalculator; 