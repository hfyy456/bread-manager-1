import React, { useState, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Divider
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CloudDownload as DownloadIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Visibility as PreviewIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

const WarehouseDataManager = ({
  open,
  onClose,
  warehouseStock = [],
  onImportComplete,
  currentStore
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [importData, setImportData] = useState([]);
  const [validationResults, setValidationResults] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef(null);

  const steps = ['选择文件', '数据预览', '验证数据', '导入确认'];

  // 重置状态
  const resetState = useCallback(() => {
    setActiveStep(0);
    setImportData([]);
    setValidationResults([]);
    setImporting(false);
    setImportProgress(0);
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        setImportData(jsonData);
        setActiveStep(1);
      } catch (error) {
        console.error('文件解析失败:', error);
        alert('文件格式不正确，请选择有效的Excel文件');
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  // 验证导入数据
  const validateImportData = useCallback(() => {
    const results = [];
    const requiredFields = ['物料名称', '库存数量'];
    
    importData.forEach((row, index) => {
      const rowNumber = index + 1;
      const issues = [];
      
      // 检查必需字段
      requiredFields.forEach(field => {
        if (!row[field] || row[field] === '') {
          issues.push(`缺少必需字段: ${field}`);
        }
      });
      
      // 检查数量格式
      if (row['库存数量'] && isNaN(parseFloat(row['库存数量']))) {
        issues.push('库存数量必须是数字');
      }
      
      // 检查数量范围
      if (row['库存数量'] && parseFloat(row['库存数量']) < 0) {
        issues.push('库存数量不能为负数');
      }
      
      // 检查物料是否存在
      const existingItem = warehouseStock.find(
        item => item.ingredient.name === row['物料名称']
      );
      
      if (!existingItem) {
        issues.push('物料不存在于系统中');
      }
      
      results.push({
        rowNumber,
        data: row,
        issues,
        status: issues.length === 0 ? 'valid' : 'error',
        existingItem
      });
    });
    
    setValidationResults(results);
    setActiveStep(2);
  }, [importData, warehouseStock]);

  // 执行导入
  const executeImport = useCallback(async () => {
    setImporting(true);
    setImportProgress(0);
    
    try {
      const validRows = validationResults.filter(result => result.status === 'valid');
      const updates = validRows.map(result => ({
        ingredientId: result.existingItem.ingredient._id,
        newStock: parseFloat(result.data['库存数量'])
      }));
      
      // 分批处理，避免一次性更新太多数据
      const batchSize = 50;
      const batches = [];
      
      for (let i = 0; i < updates.length; i += batchSize) {
        batches.push(updates.slice(i, i + batchSize));
      }
      
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        const response = await fetch('/api/warehouse/bulk-update-stock', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-current-store-id': currentStore._id,
          },
          body: JSON.stringify({ updates: batch }),
        });
        
        if (!response.ok) {
          throw new Error(`批次 ${i + 1} 导入失败`);
        }
        
        setImportProgress(((i + 1) / batches.length) * 100);
      }
      
      setActiveStep(3);
      onImportComplete?.();
      
    } catch (error) {
      console.error('导入失败:', error);
      alert('导入失败: ' + error.message);
    } finally {
      setImporting(false);
    }
  }, [validationResults, currentStore, onImportComplete]);

  // 导出模板
  const exportTemplate = useCallback(() => {
    const templateData = [
      {
        '物料名称': '示例物料',
        '库存数量': 100,
        '备注': '可选字段'
      }
    ];
    
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '库存导入模板');
    XLSX.writeFile(wb, '仓库库存导入模板.xlsx');
  }, []);

  // 导出当前数据
  const exportCurrentData = useCallback(() => {
    const exportData = warehouseStock.map(item => ({
      '物料名称': item.ingredient.name,
      '规格': item.ingredient.specs || '',
      '单价': item.ingredient.price || 0,
      '库存数量': item.mainWarehouseStock?.quantity || 0,
      '单位': item.ingredient.unit || '',
      '总价': item.totalPrice || 0
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '仓库库存数据');
    XLSX.writeFile(wb, `仓库库存_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [warehouseStock]);

  // 渲染步骤内容
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".xlsx,.xls"
              style={{ display: 'none' }}
            />
            
            <UploadIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              选择Excel文件
            </Typography>
            
            <Typography variant="body2" color="text.secondary" paragraph>
              支持 .xlsx 和 .xls 格式的文件
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 3 }}>
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={() => fileInputRef.current?.click()}
              >
                选择文件
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportTemplate}
              >
                下载模板
              </Button>
            </Box>
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              数据预览 ({importData.length} 行)
            </Typography>
            
            <TableContainer component={Paper} sx={{ maxHeight: 400, mt: 2 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    {Object.keys(importData[0] || {}).map(key => (
                      <TableCell key={key} sx={{ fontWeight: 'bold' }}>
                        {key}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {importData.slice(0, 10).map((row, index) => (
                    <TableRow key={index}>
                      {Object.values(row).map((value, cellIndex) => (
                        <TableCell key={cellIndex}>
                          {String(value)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {importData.length > 10 && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                仅显示前10行，共{importData.length}行数据
              </Typography>
            )}
          </Box>
        );
        
      case 2:
        const validCount = validationResults.filter(r => r.status === 'valid').length;
        const errorCount = validationResults.filter(r => r.status === 'error').length;
        
        return (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Chip
                label={`有效: ${validCount}`}
                color="success"
                icon={<CheckIcon />}
              />
              <Chip
                label={`错误: ${errorCount}`}
                color="error"
                icon={<ErrorIcon />}
              />
            </Box>
            
            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>行号</TableCell>
                    <TableCell>物料名称</TableCell>
                    <TableCell>库存数量</TableCell>
                    <TableCell>状态</TableCell>
                    <TableCell>问题</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {validationResults.map((result, index) => (
                    <TableRow key={index}>
                      <TableCell>{result.rowNumber}</TableCell>
                      <TableCell>{result.data['物料名称']}</TableCell>
                      <TableCell>{result.data['库存数量']}</TableCell>
                      <TableCell>
                        <Chip
                          label={result.status === 'valid' ? '有效' : '错误'}
                          color={result.status === 'valid' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {result.issues.length > 0 && (
                          <Typography variant="caption" color="error">
                            {result.issues.join(', ')}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        );
        
      case 3:
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              导入完成
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              成功导入 {validationResults.filter(r => r.status === 'valid').length} 条记录
            </Typography>
          </Box>
        );
        
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: 500 } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            数据管理
          </Typography>
          
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportCurrentData}
            size="small"
          >
            导出当前数据
          </Button>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
        
        {importing && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              导入进度: {Math.round(importProgress)}%
            </Typography>
            <LinearProgress variant="determinate" value={importProgress} />
          </Box>
        )}
        
        {renderStepContent()}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose}>
          取消
        </Button>
        
        {activeStep === 1 && (
          <Button
            variant="contained"
            onClick={validateImportData}
          >
            验证数据
          </Button>
        )}
        
        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={executeImport}
            disabled={importing || validationResults.filter(r => r.status === 'valid').length === 0}
          >
            {importing ? '导入中...' : '开始导入'}
          </Button>
        )}
        
        {activeStep === 3 && (
          <Button
            variant="contained"
            onClick={() => {
              resetState();
              onClose();
            }}
          >
            完成
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default React.memo(WarehouseDataManager);