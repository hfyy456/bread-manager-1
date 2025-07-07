import React, { useState, useRef, useContext } from 'react';
import { Container, Typography, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, TextField, Snackbar, Alert as MuiAlert, IconButton, Autocomplete } from '@mui/material';
import { FileUpload as FileUploadIcon, Send as SendIcon, DeleteOutline, AddCircleOutline } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
import { DataContext } from './DataContext';

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ReceiveStock = () => {
  const { ingredients, ingredientsMap, updateIngredientStock } = useContext(DataContext);
  const [pendingStock, setPendingStock] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('info');

  const handleShowSnackbar = (message, severity = 'info') => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const requiredHeaders = ['原料名称', '建议采购数量', '建议采购单位'];
        const headers = Object.keys(jsonData[0] || {});
        if (!requiredHeaders.every(h => headers.includes(h))) {
          handleShowSnackbar(`Excel文件必须包含以下列: ${requiredHeaders.join(', ')}`, 'error');
          return;
        }

        const parsedStock = jsonData.map((row, index) => ({
          id: index,
          name: row['原料名称'],
          quantity: row['建议采购数量'],
          unit: row['建议采购单位'],
          location: '10', // Default to location '10' (Stock Receiving)
          status: ingredientsMap.has(row['原料名称']) ? 'valid' : 'invalid'
        })).filter(item => item.quantity !== '无需采购' && item.quantity > 0)
        .filter(item => item.status === 'valid');

        setPendingStock(parsedStock);
        if (parsedStock.length === 0) {
            handleShowSnackbar('未在文件中找到有效的待入库原料。', 'info');
        }
      } catch (error) {
        console.error("文件处理失败:", error);
        handleShowSnackbar('文件处理失败，请检查格式。', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
    if(fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleQuantityChange = (id, newQuantity) => {
    const quantity = parseFloat(newQuantity);
    setPendingStock(prev => 
      prev.map(item => 
        item.id === id ? { ...item, quantity: isNaN(quantity) ? '' : quantity } : item
      )
    );
  };

  const handleAddItem = () => {
    setPendingStock(prev => [...prev, { id: uuidv4(), name: '', quantity: 0, unit: '', location: '10', status: 'new', isNew: true }]);
  };

  const handleNewItemSelect = (id, selectedIngredient) => {
    if (!selectedIngredient) {
      handleDeleteItem(id);
      return;
    }
    setPendingStock(prev => prev.map(item => 
      item.id === id 
      ? { ...item, name: selectedIngredient.name, unit: selectedIngredient.unit, status: 'valid', isNew: false } 
      : item
    ));
  };

  const handleDeleteItem = (id) => {
    setPendingStock(prev => prev.filter(item => item.id !== id));
  };

  const handleConfirmReceive = async () => {
    setIsProcessing(true);
    const updates = pendingStock
      .filter(item => item.status === 'valid')
      .map(item => ({
        ingredientName: item.name,
        location: item.location,
        quantity: item.quantity,
        unit: item.unit
      }));

    if (updates.length === 0) {
      handleShowSnackbar('没有可确认入库的有效原料。', 'warning');
      setIsProcessing(false);
      return;
    }

    const result = await updateIngredientStock(updates);

    if (result.success) {
      handleShowSnackbar('库存更新成功！', 'success');
      setPendingStock([]);
    } else {
      handleShowSnackbar(`库存更新失败: ${result.message}`, 'error');
    }
    setIsProcessing(false);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        收货入库
      </Typography>

      <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>1. 导入采购单</Typography>
        <Button
          variant="contained"
          startIcon={<FileUploadIcon />}
          onClick={() => fileInputRef.current.click()}
        >
          导入Excel
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          accept=".xlsx, .xls"
          style={{ display: 'none' }}
        />
      </Paper>

      {pendingStock.length > 0 && (
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>2. 确认入库信息</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: '200px' }}>原料名称</TableCell>
                  <TableCell align="right">采购数量</TableCell>
                  <TableCell align="right">单位</TableCell>
                  <TableCell align="right">入库库位</TableCell>
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pendingStock.map((item) => (
                  <TableRow key={item.id} sx={{ 
                    backgroundColor: item.status === 'invalid' ? 'rgba(255, 229, 229, 0.6)' : 'inherit',
                    '&:last-child td, &:last-child th': { border: 0 } 
                  }}>
                    <TableCell component="th" scope="row">
                      {item.isNew ? (
                        <Autocomplete
                          fullWidth
                          options={ingredients}
                          getOptionLabel={(option) => option.name || ''}
                          isOptionEqualToValue={(option, value) => option.id === value.id}
                          onChange={(event, newValue) => {
                            handleNewItemSelect(item.id, newValue);
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="搜索原料"
                              size="small"
                              variant="standard"
                            />
                          )}
                        />
                      ) : (
                        <>
                          {item.name} {item.status === 'invalid' && <Typography variant="caption" color="error">(未找到)</Typography>}
                        </>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <TextField
                        size="small"
                        variant="outlined"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                        sx={{ width: '100px' }}
                        disabled={item.status === 'invalid' || item.isNew}
                      />
                    </TableCell>
                    <TableCell align="right">{item.unit}</TableCell>
                    <TableCell align="right">{item.location}</TableCell>
                    <TableCell align="center">
                      <IconButton aria-label="delete" onClick={() => handleDeleteItem(item.id)} size="small">
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddCircleOutline />}
              onClick={handleAddItem}
            >
              手动添加原料
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SendIcon />}
              onClick={handleConfirmReceive}
              disabled={isProcessing || pendingStock.every(item => item.status === 'invalid')}
            >
              {isProcessing ? '处理中...' : '确认入-库'}
            </Button>
          </Box>
        </Paper>
      )}

      <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ReceiveStock; 