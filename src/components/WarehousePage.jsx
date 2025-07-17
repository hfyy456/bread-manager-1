import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, TextField, Button, Box, Alert, TableFooter,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
} from '@mui/material';
import { useStore } from './StoreContext';

const WarehousePage = () => {
    const { currentStore } = useStore();
    const [warehouseStock, setWarehouseStock] = useState([]);
    const [originalStock, setOriginalStock] = useState({}); // To store initial stock values for diff
    const [grandTotal, setGrandTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [editStock, setEditStock] = useState({});
    const [dirty, setDirty] = useState({});
    const [isDiffDialogOpen, setIsDiffDialogOpen] = useState(false);
    const [diffData, setDiffData] = useState([]);

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
            
            const initialEditStock = data.items.reduce((acc, item) => {
                acc[item.ingredient._id] = item.mainWarehouseStock.quantity || 0;
                return acc;
            }, {});
            setEditStock(initialEditStock);
            setOriginalStock(initialEditStock); // Save initial state for comparison
            setDirty({});

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [currentStore]);

    useEffect(() => {
        fetchWarehouseStock();
    }, [fetchWarehouseStock]);

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
        const changes = Object.keys(dirty)
            .filter(id => dirty[id])
            .map(id => {
                const item = warehouseStock.find(i => i.ingredient._id === id);
                return {
                    ingredientId: id,
                    name: item.ingredient.name,
                    oldStock: originalStock[id],
                    newStock: editStock[id]
                };
            });

        if (changes.length > 0) {
            setDiffData(changes);
            setIsDiffDialogOpen(true);
        } else {
            setSuccessMessage('没有检测到任何更改。');
            setTimeout(() => setSuccessMessage(''), 3000);
        }
    };

    const handleBulkUpdate = async () => {
        setIsDiffDialogOpen(false);
        const updates = diffData.map(d => ({
            ingredientId: d.ingredientId,
            newStock: d.newStock
        }));

        if (updates.length === 0) return;

        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch('/api/warehouse/stock/bulk', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '批量更新失败');
            }
            
            setSuccessMessage('批量更新成功！');
            fetchWarehouseStock();

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
            setTimeout(() => setSuccessMessage(''), 3000);
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
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            {/* The main table remains mostly the same */}
            <Paper>
                <TableContainer>
                    <Table stickyHeader>
                        {/* TableHead is unchanged */}
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 'bold' }}>原料名称</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>规格</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">单价(元)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">当前库存</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }}>单位</TableCell>
                                <TableCell sx={{ fontWeight: 'bold' }} align="right">金额(元)</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', width: '150px' }} align="center">修改库存</TableCell>
                            </TableRow>
                        </TableHead>
                        {/* TableBody is unchanged */}
                        <TableBody>
                            {loading && warehouseStock.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">加载中...</TableCell>
                                </TableRow>
                            ) : (
                                warehouseStock.map((item) => (
                                    <TableRow key={item.ingredient._id} hover selected={dirty[item.ingredient._id]}>
                                        <TableCell>{item.ingredient.name}</TableCell>
                                        <TableCell>{item.ingredient.specs}</TableCell>
                                        <TableCell align="right">{item.ingredient.price?.toFixed(2)}</TableCell>
                                        <TableCell align="right">{item.mainWarehouseStock.quantity}</TableCell>
                                        <TableCell>{item.ingredient.unit}</TableCell>
                                        <TableCell align="right">{item.totalPrice}</TableCell>
                                        <TableCell align="center">
                                            <TextField
                                                type="number"
                                                size="small"
                                                variant="outlined"
                                                value={editStock[item.ingredient._id] ?? 0}
                                                onChange={(e) => handleStockChange(item.ingredient._id, e.target.value)}
                                                sx={{ width: '100px' }}
                                                inputProps={{ min: 0 }}
                                                disabled={loading}
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                        {/* Footer is removed from here */}
                    </Table>
                </TableContainer>
            </Paper>

            {/* Diff Dialog */}
            <Dialog open={isDiffDialogOpen} onClose={() => setIsDiffDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>确认库存变更</DialogTitle>
                <DialogContent>
                    <DialogContentText sx={{ mb: 2 }}>
                        您将对以下库存进行修改，请确认：
                    </DialogContentText>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>原料名称</TableCell>
                                    <TableCell align="right">原库存</TableCell>
                                    <TableCell align="right">新库存</TableCell>
                                    <TableCell align="right">变化量</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {diffData.map((item) => {
                                    const change = Number(item.newStock) - Number(item.oldStock);
                                    const changeColor = change > 0 ? 'success.main' : 'error.main';
                                    return (
                                        <TableRow key={item.ingredientId}>
                                            <TableCell>{item.name}</TableCell>
                                            <TableCell align="right">{item.oldStock}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>{item.newStock}</TableCell>
                                            <TableCell align="right" sx={{ color: changeColor, fontWeight: 'bold' }}>
                                                {change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setIsDiffDialogOpen(false)}>取消</Button>
                    <Button onClick={handleBulkUpdate} variant="contained" color="primary" disabled={loading}>
                        {loading ? '更新中...' : '确认更新'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default WarehousePage; 