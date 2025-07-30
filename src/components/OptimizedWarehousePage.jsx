import React, { useState, useCallback, useMemo } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  Divider,
  Button,
  TextField,
  Table,
  TableContainer,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Fade,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Undo as UndoIcon,
  FilterList as FilterIcon,
  CloudUpload as ImportIcon,
  Assessment as ReportIcon
} from '@mui/icons-material';
import { useStore } from './StoreContext';
import { useSnackbar } from './SnackbarProvider';
import { useOptimizedWarehouse } from '../hooks/useOptimizedWarehouse';
import { useOfflineWarehouse } from '../hooks/useOfflineWarehouse';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import VirtualizedWarehouseTable from './VirtualizedWarehouseTable';
import WarehouseSearchFilter from './WarehouseSearchFilter';
import WarehouseBulkActions from './WarehouseBulkActions';
import WarehouseDataManager from './WarehouseDataManager';
import OfflineIndicator from './OfflineIndicator';
import PerformanceMonitor from './PerformanceMonitor';
import { ShortcutHelpTrigger } from './ShortcutHelp';
import { LoaderWithText, ProgressLoader } from './LoadingStates';
import ErrorBoundary from './ErrorBoundary';

// 库管管理组件
const WarehouseManagerSection = ({ 
  managers = [], 
  onAddManager, 
  onRemoveManager, 
  loading = false 
}) => {
  const [newManagerName, setNewManagerName] = useState('');

  const handleAdd = useCallback(() => {
    if (newManagerName.trim()) {
      onAddManager(newManagerName.trim());
      setNewManagerName('');
    }
  }, [newManagerName, onAddManager]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleAdd();
    }
  }, [handleAdd]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          库管配置
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          配置可以在移动端批准申请的库管人员
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2, minHeight: 32 }}>
          {managers.length > 0 ? (
            managers.map((manager) => (
              <Fade key={manager} in timeout={300}>
                <Chip
                  label={manager}
                  onDelete={() => onRemoveManager(manager)}
                  deleteIcon={<DeleteIcon />}
                  color="primary"
                  variant="outlined"
                  disabled={loading}
                />
              </Fade>
            ))
          ) : (
            <Typography variant="body2" color="text.secondary">
              暂无库管配置
            </Typography>
          )}
        </Box>
      </CardContent>
      <CardActions>
        <TextField
          size="small"
          placeholder="输入库管姓名"
          value={newManagerName}
          onChange={(e) => setNewManagerName(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          sx={{ mr: 1, minWidth: 200 }}
        />
        <Button
          variant="contained"
          startIcon={loading ? <CircularProgress size={16} /> : <AddIcon />}
          onClick={handleAdd}
          disabled={loading || !newManagerName.trim()}
          size="small"
        >
          {loading ? '添加中...' : '添加库管'}
        </Button>
      </CardActions>
    </Card>
  );
};

// 变更确认对话框
const ChangeConfirmDialog = ({ 
  open, 
  onClose, 
  onConfirm, 
  diffData = [], 
  loading = false 
}) => (
  <Dialog
    open={open}
    onClose={onClose}
    fullWidth
    maxWidth="md"
    PaperProps={{
      sx: { maxHeight: '80vh' }
    }}
  >
    <DialogTitle>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SaveIcon color="primary" />
        确认库存变更
      </Box>
    </DialogTitle>
    <DialogContent>
      {diffData.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>物料名称</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>原库存</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>新库存</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>变化量</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {diffData.map((d) => (
                <TableRow key={d.id} hover>
                  <TableCell component="th" scope="row">
                    {d.name}
                  </TableCell>
                  <TableCell align="right">
                    {d.original.toFixed(2)} {d.unit}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                    {d.current.toFixed(2)} {d.unit}
                  </TableCell>
                  <TableCell 
                    align="right" 
                    sx={{ 
                      color: d.diff > 0 ? 'success.main' : 'error.main', 
                      fontWeight: 'bold' 
                    }}
                  >
                    {d.diff > 0 ? `+${d.diff.toFixed(2)}` : d.diff.toFixed(2)} {d.unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="info">
          没有检测到库存变更
        </Alert>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={loading}>
        取消
      </Button>
      <Button 
        onClick={onConfirm} 
        variant="contained" 
        color="primary" 
        disabled={loading || diffData.length === 0}
        startIcon={loading ? <CircularProgress size={16} /> : <SaveIcon />}
      >
        {loading ? '更新中...' : '确认更新'}
      </Button>
    </DialogActions>
  </Dialog>
);

// 主组件
const OptimizedWarehousePage = () => {
  const { currentStore } = useStore();
  const { showSnackbar } = useSnackbar();
  
  // 使用优化的warehouse hook
  const {
    warehouseStock,
    loading,
    error,
    grandTotal,
    lastUpdated,
    editStock,
    hasChanges,
    getDiffData,
    handleStockChange,
    bulkUpdateStock,
    resetEditState,
    refresh
  } = useOptimizedWarehouse();

  // 本地状态
  const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false);
  const [warehouseManagers, setWarehouseManagers] = useState([]);
  const [managersLoading, setManagersLoading] = useState(false);
  const [bulkUpdateLoading, setBulkUpdateLoading] = useState(false);
  const [filteredStock, setFilteredStock] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dataManagerOpen, setDataManagerOpen] = useState(false);
  
  // 离线支持
  const {
    isOnline,
    addPendingChange,
    getOfflineStats
  } = useOfflineWarehouse();

  // 获取库管列表
  const fetchWarehouseManagers = useCallback(async () => {
    if (!currentStore) return;
    
    try {
      const response = await fetch(`/api/stores/${currentStore._id}`);
      if (response.ok) {
        const result = await response.json();
        setWarehouseManagers(result.data?.warehouseManagers || []);
      }
    } catch (error) {
      console.error('获取库管列表失败:', error);
    }
  }, [currentStore]);

  // 添加库管
  const handleAddManager = useCallback(async (managerName) => {
    if (warehouseManagers.includes(managerName)) {
      showSnackbar('该库管已存在', 'warning');
      return;
    }

    setManagersLoading(true);
    try {
      const updatedManagers = [...warehouseManagers, managerName];
      const response = await fetch(`/api/stores/${currentStore._id}/warehouse-managers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseManagers: updatedManagers }),
      });

      if (response.ok) {
        setWarehouseManagers(updatedManagers);
        showSnackbar('库管添加成功', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '添加库管失败');
      }
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setManagersLoading(false);
    }
  }, [warehouseManagers, currentStore, showSnackbar]);

  // 删除库管
  const handleRemoveManager = useCallback(async (managerName) => {
    setManagersLoading(true);
    try {
      const updatedManagers = warehouseManagers.filter(name => name !== managerName);
      const response = await fetch(`/api/stores/${currentStore._id}/warehouse-managers`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ warehouseManagers: updatedManagers }),
      });

      if (response.ok) {
        setWarehouseManagers(updatedManagers);
        showSnackbar('库管删除成功', 'success');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || '删除库管失败');
      }
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setManagersLoading(false);
    }
  }, [warehouseManagers, currentStore, showSnackbar]);

  // 打开变更确认对话框
  const handleOpenDiffDialog = useCallback(() => {
    if (!hasChanges) {
      showSnackbar('没有检测到任何更改', 'info');
      return;
    }
    setIsDiffDialogOpen(true);
  }, [hasChanges, showSnackbar]);

  // 确认批量更新（支持离线）
  const handleConfirmUpdate = useCallback(async () => {
    setBulkUpdateLoading(true);
    setIsDiffDialogOpen(false);
    
    try {
      const updates = getDiffData.map(item => ({
        ingredientId: item.id,
        newStock: item.current
      }));
      
      if (isOnline) {
        const result = await bulkUpdateStock(updates);
        if (result.success) {
          showSnackbar(result.message, 'success');
        } else {
          showSnackbar(result.message, 'error');
        }
      } else {
        // 离线模式
        addPendingChange({
          type: 'bulkUpdate',
          updates
        });
        showSnackbar('已保存到离线队列，将在网络恢复时同步', 'info');
      }
    } catch (error) {
      showSnackbar('更新失败: ' + error.message, 'error');
    } finally {
      setBulkUpdateLoading(false);
    }
  }, [getDiffData, bulkUpdateStock, showSnackbar, isOnline, addPendingChange]);

  // 处理过滤结果
  const handleFilterChange = useCallback((filtered) => {
    setFilteredStock(filtered);
    // 清除不在过滤结果中的选择项
    setSelectedItems(prev => 
      prev.filter(id => filtered.some(item => item.ingredient._id === id))
    );
  }, []);

  // 处理批量更新（支持离线）
  const handleBulkUpdate = useCallback(async (updates) => {
    setBulkUpdateLoading(true);
    try {
      if (isOnline) {
        // 在线模式：直接更新
        const result = await bulkUpdateStock(updates);
        if (result.success) {
          showSnackbar(result.message, 'success');
          setSelectedItems([]); // 清除选择
        } else {
          showSnackbar(result.message, 'error');
        }
      } else {
        // 离线模式：添加到待同步队列
        addPendingChange({
          type: 'bulkUpdate',
          updates
        });
        showSnackbar('已保存到离线队列，将在网络恢复时同步', 'info');
        setSelectedItems([]);
      }
    } catch (error) {
      showSnackbar('批量更新失败: ' + error.message, 'error');
    } finally {
      setBulkUpdateLoading(false);
    }
  }, [bulkUpdateStock, showSnackbar, isOnline, addPendingChange]);

  // 初始化数据
  React.useEffect(() => {
    if (currentStore) {
      fetchWarehouseManagers();
    }
  }, [currentStore, fetchWarehouseManagers]);

  // 初始化过滤结果
  React.useEffect(() => {
    setFilteredStock(warehouseStock);
  }, [warehouseStock]);

  // 快捷键支持
  useKeyboardShortcuts({
    onSave: hasChanges ? handleOpenDiffDialog : undefined,
    onRefresh: refresh,
    onReset: hasChanges ? resetEditState : undefined,
    onSelectAll: () => setSelectedItems(filteredStock.map(item => item.ingredient._id)),
    onClearSelection: () => setSelectedItems([]),
    onToggleFilters: () => setShowFilters(!showFilters),
    onExport: () => setDataManagerOpen(true),
    enabled: !loading
  });

  // 计算统计信息
  const stats = useMemo(() => ({
    totalItems: warehouseStock.length,
    filteredItems: filteredStock.length,
    selectedItems: selectedItems.length,
    changedItems: Object.keys(editStock).filter(id => 
      editStock[id] !== undefined && 
      editStock[id] !== (warehouseStock.find(item => item.ingredient._id === id)?.mainWarehouseStock?.quantity || 0)
    ).length,
    lastUpdatedText: lastUpdated ? new Date(lastUpdated).toLocaleString() : '未知',
    isFiltered: filteredStock.length !== warehouseStock.length
  }), [warehouseStock, filteredStock, selectedItems, editStock, lastUpdated]);

  if (!currentStore) {
    return (
      <Container>
        <Alert severity="warning">
          请先选择一个门店
        </Alert>
      </Container>
    );
  }

  return (
    <ErrorBoundary>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        {/* 页面标题和操作栏 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 3,
          flexWrap: 'wrap',
          gap: 2 
        }}>
          <Box>
            <Typography variant="h4" gutterBottom component="div" sx={{ mb: 0 }}>
              主仓库库存管理
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {currentStore.name} • {stats.totalItems} 种物料
              {stats.isFiltered && ` • 显示 ${stats.filteredItems} 项`}
              {stats.selectedItems > 0 && ` • 已选择 ${stats.selectedItems} 项`}
              {stats.changedItems > 0 && ` • ${stats.changedItems} 项待保存`}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" component="div">
              合计总金额: 
              <Typography 
                component="span" 
                variant="h5" 
                sx={{ fontWeight: 'bold', color: 'primary.main', ml: 1 }}
              >
                ¥{grandTotal}
              </Typography>
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={() => setShowFilters(!showFilters)}
                disabled={loading}
                size="small"
                color={showFilters ? 'primary' : 'inherit'}
              >
                {showFilters ? '隐藏过滤器' : '显示过滤器'}
              </Button>

              <Button
                variant="outlined"
                startIcon={<ImportIcon />}
                onClick={() => setDataManagerOpen(true)}
                disabled={loading}
                size="small"
              >
                数据管理
              </Button>

              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={refresh}
                disabled={loading}
                size="small"
              >
                刷新
              </Button>
              
              {hasChanges && (
                <Button
                  variant="outlined"
                  startIcon={<UndoIcon />}
                  onClick={resetEditState}
                  disabled={loading}
                  size="small"
                >
                  重置
                </Button>
              )}
              
              <Button
                variant="contained"
                color="primary"
                startIcon={bulkUpdateLoading ? <CircularProgress size={16} /> : <SaveIcon />}
                disabled={!hasChanges || loading || bulkUpdateLoading}
                onClick={handleOpenDiffDialog}
              >
                {bulkUpdateLoading ? '保存中...' : '保存所有更改'}
              </Button>
            </Box>
          </Box>
        </Box>

        {/* 错误提示 */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* 库管配置区域 */}
        <WarehouseManagerSection
          managers={warehouseManagers}
          onAddManager={handleAddManager}
          onRemoveManager={handleRemoveManager}
          loading={managersLoading}
        />

        <Divider sx={{ mb: 3 }} />

        {/* 搜索和过滤器 */}
        <Fade in={showFilters} timeout={300}>
          <Box sx={{ mb: showFilters ? 2 : 0 }}>
            {showFilters && (
              <WarehouseSearchFilter
                warehouseStock={warehouseStock}
                onFilterChange={handleFilterChange}
                loading={loading}
              />
            )}
          </Box>
        </Fade>

        {/* 批量操作工具栏 */}
        <WarehouseBulkActions
          warehouseStock={warehouseStock}
          filteredStock={filteredStock}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          onBulkUpdate={handleBulkUpdate}
          editStock={editStock}
          loading={loading || bulkUpdateLoading}
        />

        {/* 统计信息 */}
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
          <Box sx={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                物料总数
              </Typography>
              <Typography variant="h6">
                {stats.totalItems}
              </Typography>
            </Box>
            {stats.isFiltered && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  过滤结果
                </Typography>
                <Typography variant="h6" color="info.main">
                  {stats.filteredItems}
                </Typography>
              </Box>
            )}
            {stats.selectedItems > 0 && (
              <Box>
                <Typography variant="body2" color="text.secondary">
                  已选择
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {stats.selectedItems}
                </Typography>
              </Box>
            )}
            <Box>
              <Typography variant="body2" color="text.secondary">
                待保存更改
              </Typography>
              <Typography variant="h6" color={stats.changedItems > 0 ? 'warning.main' : 'text.primary'}>
                {stats.changedItems}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                最后更新
              </Typography>
              <Typography variant="body2">
                {stats.lastUpdatedText}
              </Typography>
            </Box>
          </Box>
        </Paper>

        {/* 虚拟化表格 */}
        <VirtualizedWarehouseTable
          warehouseStock={filteredStock}
          editStock={editStock}
          handleStockChange={handleStockChange}
          dirty={getDiffData.reduce((acc, item) => ({ ...acc, [item.id]: true }), {})}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          loading={loading}
          height={Math.min(600, Math.max(400, filteredStock.length * 60 + 100))}
        />

        {/* 变更确认对话框 */}
        <ChangeConfirmDialog
          open={isDiffDialogOpen}
          onClose={() => setIsDiffDialogOpen(false)}
          onConfirm={handleConfirmUpdate}
          diffData={getDiffData}
          loading={bulkUpdateLoading}
        />

        {/* 数据管理对话框 */}
        <WarehouseDataManager
          open={dataManagerOpen}
          onClose={() => setDataManagerOpen(false)}
          warehouseStock={warehouseStock}
          onImportComplete={refresh}
          currentStore={currentStore}
        />

        {/* 离线状态指示器 */}
        <OfflineIndicator
          position="top-right"
          autoHide={false}
        />

        {/* 性能监控 */}
        {process.env.NODE_ENV === 'development' && (
          <PerformanceMonitor
            show={true}
            position="bottom-right"
            autoHide={true}
          />
        )}

        {/* 快捷键帮助 */}
        <ShortcutHelpTrigger />
      </Container>
    </ErrorBoundary>
  );
};

export default OptimizedWarehousePage;