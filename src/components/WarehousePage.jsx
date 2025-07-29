import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Button, Box, Alert,
    Dialog, DialogActions, DialogContent, DialogTitle,
    Card, CardContent, CardActions, Chip, IconButton, Divider
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useStore } from './StoreContext';
import { useSnackbar } from './SnackbarProvider';

// A safer parsing function to prevent NaN issues.
const safeParseFloat = (val) => {
  if (val === null || val === undefined || val === '') {
    return 0;
  }
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

const WarehousePage = () => {
    const { currentStore } = useStore();
    const [warehouseStock, setWarehouseStock] = useState([]);
    const [originalStock, setOriginalStock] = useState({});
    const [grandTotal, setGrandTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editStock, setEditStock] = useState({});
    const [dirty, setDirty] = useState({});
    const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false);
    const [diffData, setDiffData] = useState([]);
    const [warehouseManagers, setWarehouseManagers] = useState([]);
    const [newManagerName, setNewManagerName] = useState('');
    const [managersLoading, setManagersLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    const fetchWarehouseStock = useCallback(async () => {
        if (!currentStore) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/warehouse/stock');
            if (!response.ok) {
                throw new Error('获取主仓库库存失败');
            }
            const data = await response.json();
            setWarehouseStock(data.items);
            setGrandTotal(data.grandTotal);
            
            const initialStockState = data.items.reduce((acc, item) => {
                acc[item.ingredient._id] = item.mainWarehouseStock?.quantity ?? 0;
                return acc;
            }, {});
            setEditStock(initialStockState);
            setOriginalStock(initialStockState);
            setDirty({});

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentStore]);

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

    useEffect(() => {
        fetchWarehouseStock();
        fetchWarehouseManagers();
    }, [fetchWarehouseStock, fetchWarehouseManagers]);

    const handleStockChange = (ingredientId, value) => {
        setEditStock(prev => ({
            ...prev,
            [ingredientId]: value
        }));
        setDirty(prev => ({
            ...prev,
            [ingredientId]: true
        }));
    };
    
    const handleOpenDiffDialog = () => {
        if (Object.keys(dirty).length === 0) {
            showSnackbar('没有检测到任何更改。', 'info');
            return;
        }
        
        const currentDiff = warehouseStock
            .map(item => {
                const originalVal = safeParseFloat(originalStock[item.ingredient._id]);
                const currentVal = safeParseFloat(editStock[item.ingredient._id]);
                const diff = currentVal - originalVal;

                if (diff === 0) return null;

                return {
                    id: item.ingredient._id,
                    name: item.ingredient.name,
                    original: originalVal,
                    current: currentVal,
                    diff: diff,
                    unit: item.ingredient.unit,
                };
            })
            .filter(Boolean); // Remove null entries

        if (currentDiff.length === 0) {
            showSnackbar('库存数量没有发生变化。', 'info');
            return;
        }

        setDiffData(currentDiff);
        setIsDiffDialogOpen(true);
    };
    
    const handleConfirmUpdate = async () => {
        setIsDiffDialogOpen(false);
        setLoading(true);
        const updates = diffData.map(item => ({
            ingredientId: item.id,
            newStock: item.current
        }));
        
        try {
            const response = await fetch('/api/warehouse/bulk-update-stock', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '批量更新失败');
            }
            
            showSnackbar('批量更新成功！', 'success');
            fetchWarehouseStock();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddManager = async () => {
        if (!newManagerName.trim()) {
            showSnackbar('请输入库管姓名', 'warning');
            return;
        }

        if (warehouseManagers.includes(newManagerName.trim())) {
            showSnackbar('该库管已存在', 'warning');
            return;
        }

        setManagersLoading(true);
        try {
            const updatedManagers = [...warehouseManagers, newManagerName.trim()];
            const response = await fetch(`/api/stores/${currentStore._id}/warehouse-managers`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ warehouseManagers: updatedManagers }),
            });

            if (response.ok) {
                setWarehouseManagers(updatedManagers);
                setNewManagerName('');
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
    };

    const handleRemoveManager = async (managerName) => {
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
    };

    if (!currentStore) {
        return <Container><Typography>请先选择一个门店。</Typography></Container>;
    }

    const hasChanges = Object.keys(dirty).length > 0;

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h4" gutterBottom component="div" sx={{ mb: 0 }}>
                    主仓库库存管理 ({currentStore.name})
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Typography variant="h5" component="div">
                        合计总金额: <Typography component="span" variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>¥ {grandTotal}</Typography>
                    </Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!hasChanges || loading}
                        onClick={handleOpenDiffDialog}
                    >
                        保存所有更改
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            {/* 库管配置区域 */}
            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        库管配置
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        配置可以在移动端批准申请的库管人员
                    </Typography>
                    
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {warehouseManagers.map((manager) => (
                            <Chip
                                key={manager}
                                label={manager}
                                onDelete={() => handleRemoveManager(manager)}
                                deleteIcon={<DeleteIcon />}
                                color="primary"
                                variant="outlined"
                                disabled={managersLoading}
                            />
                        ))}
                        {warehouseManagers.length === 0 && (
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
                        onKeyPress={(e) => e.key === 'Enter' && handleAddManager()}
                        disabled={managersLoading}
                        sx={{ mr: 1 }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={handleAddManager}
                        disabled={managersLoading || !newManagerName.trim()}
                        size="small"
                    >
                        添加库管
                    </Button>
                </CardActions>
            </Card>

            <Divider sx={{ mb: 3 }} />

            <TableContainer component={Paper}>
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{width: '20%', fontWeight: 'bold'}}>物料名称</TableCell>
                            <TableCell sx={{width: '15%', fontWeight: 'bold'}}>规格</TableCell>
                            <TableCell sx={{width: '15%', fontWeight: 'bold'}}>单价(元)</TableCell>
                            <TableCell sx={{width: '15%', fontWeight: 'bold'}}>库存数量</TableCell>
                            <TableCell align="right" sx={{width: '15%', fontWeight: 'bold'}}>总价(元)</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {warehouseStock.map((item) => (
                            <TableRow key={item.ingredient._id} hover selected={dirty[item.ingredient._id]}>
                                <TableCell component="th" scope="row">
                                    {item.ingredient.name}
                                </TableCell>
                                <TableCell>{item.ingredient.specs}</TableCell>
                                <TableCell>{item.ingredient.price}</TableCell>
                                <TableCell>
                                    <TextField
                                        type="number"
                                        variant="outlined"
                                        size="small"
                                        value={editStock[item.ingredient._id] ?? ''}
                                        onChange={(e) => handleStockChange(item.ingredient._id, e.target.value)}
                                        sx={{ width: '120px', textAlign: 'center' }}
                                        InputProps={{
                                            inputProps: { 
                                                min: 0,
                                                style: { textAlign: 'center' }
                                            }
                                        }}
                                    />
                                </TableCell>
                                <TableCell align="right">¥{item.totalPrice}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog
                open={isDiffDialogOpen}
                onClose={() => setIsDiffDialogOpen(false)}
                fullWidth
                maxWidth="md"
            >
                <DialogTitle>确认库存变更</DialogTitle>
                <DialogContent>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>物料名称</TableCell>
                                    <TableCell align="right">原库存</TableCell>
                                    <TableCell align="right">新库存</TableCell>
                                    <TableCell align="right">变化量</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {diffData.map((d) => (
                                    <TableRow key={d.id}>
                                        <TableCell component="th" scope="row">{d.name}</TableCell>
                                        <TableCell align="right">{d.original} {d.unit}</TableCell>
                                        <TableCell align="right" sx={{ fontWeight: 'bold' }}>{d.current} {d.unit}</TableCell>
                                        <TableCell align="right" sx={{ color: d.diff > 0 ? 'green' : 'red', fontWeight: 'bold' }}>
                                            {d.diff > 0 ? `+${d.diff.toFixed(2)}` : d.diff.toFixed(2)} {d.unit}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDiffDialogOpen(false)}>取消</Button>
                    <Button onClick={handleConfirmUpdate} variant="contained" color="primary" disabled={loading}>
                        {loading ? '更新中...' : '确认更新'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default WarehousePage; 