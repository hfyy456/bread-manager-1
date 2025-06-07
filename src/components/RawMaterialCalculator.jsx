import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { Container, Typography, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Grid, Box, IconButton, Tooltip, CircularProgress, Chip, Snackbar, Alert as MuiAlert } from '@mui/material';
import { Replay as ReplayIcon, Clear as ClearIcon, FileUpload as FileUploadIcon, Download, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';
import { generateAggregatedRawMaterials, adjustCost, findIngredientById } from '../utils/calculator';
import { DataContext } from './DataContext.jsx';

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
  const { breadTypes, doughRecipesMap, fillingRecipesMap, ingredientsMap, ingredients, loading } = useContext(DataContext);
  const [quantities, setQuantities] = useState({});
  const [aggregatedMaterials, setAggregatedMaterials] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const fileInputRef = useRef(null);
  const [materialStocks, setMaterialStocks] = useState({}); 

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info'); 

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
            if (totalAggregated[material.id]) {
              totalAggregated[material.id].quantity += material.quantity;
            } else {
              totalAggregated[material.id] = { ...material };
            }
          });
        }
      }
    }

    setAggregatedMaterials(Object.values(totalAggregated));
      setShowResults(true);
        if (showLoader) {
      setTimeout(() => setIsCalculating(false), 300); 
        }
  }, [quantities, breadTypes, doughRecipesMap, fillingRecipesMap, ingredients, loading]);

  const handleExportExcel = () => {
    if (aggregatedMaterials.length === 0) {
        handleShowSnackbar('没有计算结果可导出。请先计算。', 'warning');
        return;
    }
  
    const dataToExport = aggregatedMaterials.map(material => {
        const ingredientInfo = ingredientsMap.get(material.id.trim());
      return {
        '原料ID': material.id,
        '原料名称': material.name,
            '总需求量': material.quantity.toFixed(2),
            '单位': material.unit,
            '规格': ingredientInfo?.specs || 'N/A',
            '采购单位': ingredientInfo?.unit || 'N/A',
            '单价': ingredientInfo?.price ? `¥${(ingredientInfo.price).toFixed(2)}` : 'N/A',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    const columnWidths = [
        { wch: 25 }, // 原料ID
        { wch: 20 }, // 原料名称
        { wch: 12 }, // 总需求量
        { wch: 8 },  // 单位
        { wch: 20 }, // 规格
        { wch: 10 }, // 采购单位
        { wch: 12 }, // 单价
    ];
    worksheet['!cols'] = columnWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '原料需求汇总');
    
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `原料需求汇总_${today}.xlsx`);
    handleShowSnackbar('Excel 文件已成功导出！', 'success');
  };
  
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
                {aggregatedMaterials
                  .sort((a,b) => b.quantity - a.quantity)
                  .map(material => {
                    const stockData = materialStocks[material.id] || { stock: 0 };
                    const requiredQuantity = material.quantity || 0;
                    const currentStock = stockData.stock;
                    const purchaseNeeded = requiredQuantity - currentStock;
                    const ingredientInfo = ingredientsMap.get(material.id.trim());

                    return (
                        <TableRow key={material.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                    <TableCell component="th" scope="row">
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>{material.name}</Typography>
                                <Typography variant="caption" color="text.secondary">{ingredientInfo?.specs}</Typography>
                          </TableCell>
                            <TableCell align="right">{requiredQuantity.toFixed(2)} {material.unit}</TableCell>
                            <TableCell align="right">
                              <TextField 
                                type="number" 
                                size="small" 
                                variant="outlined"
                                value={currentStock}
                                onChange={(e) => handleStockChange(material.id, e.target.value)}
                                sx={{width: '100px'}}
                                InputProps={{
                                    endAdornment: <Typography variant="caption" sx={{ ml: 0.5 }}>{ingredientInfo?.unit}</Typography>,
                                }}
                              />
                          </TableCell>
                            <TableCell align="right">{ingredientInfo?.unit}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', color: purchaseNeeded > 0 ? 'error.main' : 'success.main' }}>
                                {purchaseNeeded > 0 ? purchaseNeeded.toFixed(2) : '库存充足'}
                          </TableCell>
                        </TableRow>
                    );
                })}
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