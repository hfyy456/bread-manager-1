import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
  Box,
  Paper,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TextField,
  Typography,
  Skeleton,
  Checkbox,
  Chip
} from '@mui/material';

// 表格行组件
const WarehouseTableRow = memo(({ index, style, data }) => {
  const { 
    items, 
    editStock, 
    handleStockChange, 
    dirty, 
    selectedItems = [], 
    onSelectionChange 
  } = data;
  const item = items[index];

  if (!item) {
    return (
      <div style={style}>
        <Box sx={{ display: 'flex', p: 1, gap: 2 }}>
          <Skeleton variant="rectangular" width="5%" height={40} />
          <Skeleton variant="text" width="20%" height={40} />
          <Skeleton variant="text" width="15%" height={40} />
          <Skeleton variant="text" width="15%" height={40} />
          <Skeleton variant="rectangular" width="15%" height={40} />
          <Skeleton variant="text" width="15%" height={40} />
        </Box>
      </div>
    );
  }

  const isSelected = selectedItems.includes(item.ingredient._id);
  const isLowStock = (item.mainWarehouseStock?.quantity || 0) < 10; // 低库存警告

  const handleRowSelect = (e) => {
    e.stopPropagation();
    const newSelection = isSelected
      ? selectedItems.filter(id => id !== item.ingredient._id)
      : [...selectedItems, item.ingredient._id];
    onSelectionChange?.(newSelection);
  };

  return (
    <div style={style}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: isSelected 
            ? 'primary.50' 
            : dirty[item.ingredient._id] 
              ? 'action.selected' 
              : 'transparent',
          '&:hover': {
            bgcolor: isSelected ? 'primary.100' : 'action.hover'
          },
          cursor: 'pointer'
        }}
        onClick={handleRowSelect}
      >
        {/* 选择框 */}
        <Box sx={{ width: '5%', pr: 1 }}>
          <Checkbox
            checked={isSelected}
            onChange={handleRowSelect}
            size="small"
            onClick={(e) => e.stopPropagation()}
          />
        </Box>

        {/* 物料名称 */}
        <Box sx={{ width: '20%', pr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {item.ingredient.name}
            </Typography>
            {isLowStock && (
              <Chip
                label="低库存"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ fontSize: '0.6rem', height: 16 }}
              />
            )}
          </Box>
        </Box>
        
        {/* 规格 */}
        <Box sx={{ width: '15%', pr: 1 }}>
          <Typography variant="body2" color="text.secondary">
            {item.ingredient.specs || '-'}
          </Typography>
        </Box>
        
        {/* 单价 */}
        <Box sx={{ width: '15%', pr: 1 }}>
          <Typography variant="body2">
            ¥{item.ingredient.price || 0}
          </Typography>
        </Box>
        
        {/* 库存数量输入框 */}
        <Box sx={{ width: '15%', pr: 1 }}>
          <TextField
            type="number"
            variant="outlined"
            size="small"
            value={editStock[item.ingredient._id] ?? ''}
            onChange={(e) => {
              e.stopPropagation();
              handleStockChange(item.ingredient._id, e.target.value);
            }}
            onClick={(e) => e.stopPropagation()}
            sx={{ 
              width: '100%',
              '& .MuiInputBase-input': {
                textAlign: 'center',
                fontSize: '0.875rem'
              }
            }}
            InputProps={{
              inputProps: { 
                min: 0,
                step: 0.01
              }
            }}
          />
        </Box>
        
        {/* 总价 */}
        <Box sx={{ width: '15%', textAlign: 'right' }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 500,
              color: parseFloat(item.totalPrice) > 1000 ? 'success.main' : 'inherit'
            }}
          >
            ¥{item.totalPrice}
          </Typography>
        </Box>
      </Box>
    </div>
  );
});

WarehouseTableRow.displayName = 'WarehouseTableRow';

// 表格头部组件
const TableHeader = memo(({ 
  selectedItems = [], 
  totalItems = 0, 
  onSelectAll 
}) => {
  const isAllSelected = selectedItems.length === totalItems && totalItems > 0;
  const isIndeterminate = selectedItems.length > 0 && selectedItems.length < totalItems;

  return (
    <TableContainer component={Paper} sx={{ mb: 1 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '5%', fontWeight: 'bold', bgcolor: 'grey.50' }}>
              <Checkbox
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onChange={onSelectAll}
                size="small"
              />
            </TableCell>
            <TableCell sx={{ width: '20%', fontWeight: 'bold', bgcolor: 'grey.50' }}>
              物料名称
            </TableCell>
            <TableCell sx={{ width: '15%', fontWeight: 'bold', bgcolor: 'grey.50' }}>
              规格
            </TableCell>
            <TableCell sx={{ width: '15%', fontWeight: 'bold', bgcolor: 'grey.50' }}>
              单价(元)
            </TableCell>
            <TableCell sx={{ width: '15%', fontWeight: 'bold', bgcolor: 'grey.50' }}>
              库存数量
            </TableCell>
            <TableCell sx={{ width: '15%', fontWeight: 'bold', bgcolor: 'grey.50', textAlign: 'right' }}>
              总价(元)
            </TableCell>
          </TableRow>
        </TableHead>
      </Table>
    </TableContainer>
  );
});

TableHeader.displayName = 'TableHeader';

// 主虚拟化表格组件
const VirtualizedWarehouseTable = ({
  warehouseStock = [],
  editStock = {},
  handleStockChange,
  dirty = {},
  selectedItems = [],
  onSelectionChange,
  loading = false,
  height = 600
}) => {
  // 全选/取消全选处理
  const handleSelectAll = useCallback(() => {
    if (selectedItems.length === warehouseStock.length) {
      onSelectionChange?.([]);
    } else {
      onSelectionChange?.(warehouseStock.map(item => item.ingredient._id));
    }
  }, [selectedItems.length, warehouseStock, onSelectionChange]);

  // 准备传递给虚拟列表的数据
  const itemData = useMemo(() => ({
    items: warehouseStock,
    editStock,
    handleStockChange,
    dirty,
    selectedItems,
    onSelectionChange
  }), [warehouseStock, editStock, handleStockChange, dirty, selectedItems, onSelectionChange]);

  // 行高度计算
  const getItemSize = useCallback(() => 60, []); // 固定行高60px

  if (loading) {
    return (
      <Box>
        <TableHeader 
          selectedItems={selectedItems}
          totalItems={warehouseStock.length}
          onSelectAll={handleSelectAll}
        />
        <Paper sx={{ p: 2 }}>
          {Array.from({ length: 8 }).map((_, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Skeleton variant="rectangular" width="5%" height={40} />
              <Skeleton variant="text" width="20%" height={40} />
              <Skeleton variant="text" width="15%" height={40} />
              <Skeleton variant="text" width="15%" height={40} />
              <Skeleton variant="rectangular" width="15%" height={40} />
              <Skeleton variant="text" width="15%" height={40} />
            </Box>
          ))}
        </Paper>
      </Box>
    );
  }

  if (warehouseStock.length === 0) {
    return (
      <Box>
        <TableHeader 
          selectedItems={selectedItems}
          totalItems={warehouseStock.length}
          onSelectAll={handleSelectAll}
        />
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary">
            暂无库存数据
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            请先添加原料或检查门店配置
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box>
      <TableHeader 
        selectedItems={selectedItems}
        totalItems={warehouseStock.length}
        onSelectAll={handleSelectAll}
      />
      <Paper sx={{ overflow: 'hidden' }}>
        <List
          height={height}
          itemCount={warehouseStock.length}
          itemSize={getItemSize}
          itemData={itemData}
          overscanCount={5} // 预渲染5行以提高滚动性能
        >
          {WarehouseTableRow}
        </List>
      </Paper>
    </Box>
  );
};

export default memo(VirtualizedWarehouseTable);