import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  Checkbox,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  SelectAll as SelectAllIcon,
  Clear as ClearIcon,
  Edit as EditIcon,
  FileDownload as ExportIcon,
  FileUpload as ImportIcon,
  Calculate as CalculateIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const WarehouseBulkActions = ({
  warehouseStock = [],
  filteredStock = [],
  selectedItems = [],
  onSelectionChange,
  onBulkUpdate,
  editStock = {},
  loading = false,
  currentStore = null
}) => {
  const [bulkEditDialog, setBulkEditDialog] = useState(false);
  const [bulkOperation, setBulkOperation] = useState('set'); // 'set', 'add', 'subtract', 'multiply'
  const [bulkValue, setBulkValue] = useState('');
  const [exportDialog, setExportDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);

  // 计算选中项目的统计信息
  const selectionStats = useMemo(() => {
    const selectedData = filteredStock.filter(item => 
      selectedItems.includes(item.ingredient._id)
    );

    const totalValue = selectedData.reduce((sum, item) => 
      sum + parseFloat(item.totalPrice || 0), 0
    );

    const totalStock = selectedData.reduce((sum, item) => 
      sum + (item.mainWarehouseStock?.quantity || 0), 0
    );

    return {
      count: selectedData.length,
      totalValue: totalValue.toFixed(2),
      totalStock: totalStock.toFixed(2),
      items: selectedData
    };
  }, [filteredStock, selectedItems]);

  // 全选/取消全选
  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === filteredStock.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(filteredStock.map(item => item.ingredient._id));
    }
  }, [selectedItems.length, filteredStock, onSelectionChange]);

  // 清除选择
  const handleClearSelection = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  // 批量编辑
  const handleBulkEdit = useCallback(async () => {
    if (selectedItems.length === 0 || !bulkValue.trim()) {
      return;
    }

    const value = parseFloat(bulkValue);
    if (isNaN(value)) {
      return;
    }

    const updates = selectedItems.map(ingredientId => {
      const currentStock = editStock[ingredientId] || 0;
      let newStock;

      switch (bulkOperation) {
        case 'set':
          newStock = value;
          break;
        case 'add':
          newStock = currentStock + value;
          break;
        case 'subtract':
          newStock = Math.max(0, currentStock - value);
          break;
        case 'multiply':
          newStock = currentStock * value;
          break;
        default:
          newStock = currentStock;
      }

      return {
        ingredientId,
        newStock: Math.max(0, newStock) // 确保不为负数
      };
    });

    await onBulkUpdate(updates);
    setBulkEditDialog(false);
    setBulkValue('');
    handleClearSelection();
  }, [selectedItems, bulkValue, bulkOperation, editStock, onBulkUpdate, handleClearSelection]);

  // 导出数据
  const handleExport = useCallback(() => {
    const dataToExport = selectionStats.items.length > 0 
      ? selectionStats.items 
      : filteredStock;

    const csvContent = [
      ['物料名称', '规格', '单价', '库存数量', '单位', '总价'],
      ...dataToExport.map(item => [
        item.ingredient.name,
        item.ingredient.specs || '',
        item.ingredient.price || 0,
        item.mainWarehouseStock?.quantity || 0,
        item.ingredient.unit || '',
        item.totalPrice || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    
    // 生成包含门店名称的文件名
    const storeName = currentStore?.name ? 
      currentStore.name.replace(/[<>:"/\\|?*]/g, '_') : 
      '未知门店';
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${storeName}_仓库库存_${timestamp}.csv`;
    
    link.download = filename;
    link.click();
    
    setExportDialog(false);
  }, [selectionStats.items, filteredStock, currentStore]);

  // 计算库存价值
  const calculateTotalValue = useCallback(() => {
    const items = selectedItems.length > 0 ? selectionStats.items : filteredStock;
    const total = items.reduce((sum, item) => sum + parseFloat(item.totalPrice || 0), 0);
    
    alert(`选中物料总价值: ¥${total.toFixed(2)}`);
  }, [selectedItems.length, selectionStats.items, filteredStock]);

  if (filteredStock.length === 0) {
    return null;
  }

  return (
    <>
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          {/* 选择控制 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Checkbox
              checked={selectedItems.length === filteredStock.length && filteredStock.length > 0}
              indeterminate={selectedItems.length > 0 && selectedItems.length < filteredStock.length}
              onChange={handleSelectAll}
              disabled={loading}
            />
            <Typography variant="body2">
              {selectedItems.length > 0 
                ? `已选择 ${selectedItems.length} 项`
                : '全选'
              }
            </Typography>
          </Box>

          {/* 选择统计 */}
          {selectedItems.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={`${selectionStats.count} 种物料`}
                size="small"
                color="primary"
                variant="outlined"
              />
              <Chip
                label={`总价值 ¥${selectionStats.totalValue}`}
                size="small"
                color="success"
                variant="outlined"
              />
              <Chip
                label={`总库存 ${selectionStats.totalStock}`}
                size="small"
                color="info"
                variant="outlined"
              />
            </Box>
          )}

          <Box sx={{ flex: 1 }} />

          {/* 操作按钮 */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {selectedItems.length > 0 && (
              <>
                <Tooltip title="批量编辑库存">
                  <IconButton
                    onClick={() => setBulkEditDialog(true)}
                    disabled={loading}
                    color="primary"
                    size="small"
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                
                <Tooltip title="清除选择">
                  <IconButton
                    onClick={handleClearSelection}
                    disabled={loading}
                    size="small"
                  >
                    <ClearIcon />
                  </IconButton>
                </Tooltip>
              </>
            )}

            <Tooltip title="计算总价值">
              <IconButton
                onClick={calculateTotalValue}
                disabled={loading}
                color="info"
                size="small"
              >
                <CalculateIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="导出数据">
              <IconButton
                onClick={() => setExportDialog(true)}
                disabled={loading}
                color="success"
                size="small"
              >
                <ExportIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* 批量编辑对话框 */}
      <Dialog
        open={bulkEditDialog}
        onClose={() => setBulkEditDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          批量编辑库存
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            将对选中的 {selectedItems.length} 种物料执行批量操作
          </Alert>

          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <FormControl sx={{ minWidth: 120 }}>
              <InputLabel>操作类型</InputLabel>
              <Select
                value={bulkOperation}
                onChange={(e) => setBulkOperation(e.target.value)}
                label="操作类型"
              >
                <MenuItem value="set">设置为</MenuItem>
                <MenuItem value="add">增加</MenuItem>
                <MenuItem value="subtract">减少</MenuItem>
                <MenuItem value="multiply">乘以</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="数值"
              type="number"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              sx={{ flex: 1 }}
            />
          </Box>

          {bulkOperation === 'subtract' && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningIcon />
                减少操作不会使库存变为负数，最小值为0
              </Box>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkEditDialog(false)}>
            取消
          </Button>
          <Button
            onClick={handleBulkEdit}
            variant="contained"
            disabled={!bulkValue.trim() || isNaN(parseFloat(bulkValue))}
          >
            确认操作
          </Button>
        </DialogActions>
      </Dialog>

      {/* 导出确认对话框 */}
      <Dialog
        open={exportDialog}
        onClose={() => setExportDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          导出库存数据
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {selectedItems.length > 0 
              ? `将导出选中的 ${selectedItems.length} 种物料的库存数据`
              : `将导出当前显示的 ${filteredStock.length} 种物料的库存数据`
            }
          </Typography>
          <Typography variant="body2" color="text.secondary">
            数据将以CSV格式导出，包含物料名称、规格、单价、库存数量等信息。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialog(false)}>
            取消
          </Button>
          <Button
            onClick={handleExport}
            variant="contained"
            startIcon={<ExportIcon />}
          >
            导出CSV
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default React.memo(WarehouseBulkActions);