import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Alert, CircularProgress, Chip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle
} from '@mui/material';

const STATUS_MAP = {
    pending: '待处理',
    approved: '已批准',
    rejected: '已拒绝',
    completed: '已完成',
};

const getStatusChipColor = (status) => {
    switch (status) {
        case 'completed': return 'success';
        case 'approved': return 'info';
        case 'rejected': return 'error';
        case 'pending':
        default: return 'warning';
    }
};

const TransferRequestList = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'

    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            // This endpoint needs to be created to fetch ALL requests for admin
            const response = await fetch('/api/transfer-requests/all'); 
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || '获取所有调拨申请失败');
            }
            const data = await response.json();
            setRequests(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleOpenConfirmDialog = (request, type) => {
        setSelectedRequest(request);
        setActionType(type);
        setConfirmDialogOpen(true);
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialogOpen(false);
        setSelectedRequest(null);
        setActionType('');
    };

    const handleUpdateRequest = async () => {
        if (!selectedRequest || !actionType) return;
        
        const status = actionType === 'approve' ? 'approved' : 'rejected';

        try {
            const response = await fetch(`/api/transfer-requests/${selectedRequest._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || '更新状态失败');
            }
            
            fetchRequests(); // Re-fetch to show updated status
            handleCloseConfirmDialog();

        } catch (err) {
            setError(err.message);
            // Keep dialog open to show error if needed, or close and show alert
        }
    };

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Paper sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>所有门店调拨申请</Typography>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>申请门店</TableCell>
                            <TableCell>申请时间</TableCell>
                            <TableCell>申请内容</TableCell>
                            <TableCell>状态</TableCell>
                            <TableCell align="center">操作</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {requests.map((req) => (
                            <TableRow key={req._id}>
                                <TableCell>{req.storeId?.name || '未知门店'}</TableCell>
                                <TableCell>{new Date(req.createdAt).toLocaleString()}</TableCell>
                                <TableCell>
                                    <ul>
                                        {req.items.map(item => (
                                            <li key={item._id}>{`${item.name} x ${item.quantity} ${item.unit}`}</li>
                                        ))}
                                    </ul>
                                </TableCell>
                                <TableCell>
                                    <Chip label={STATUS_MAP[req.status] || req.status} color={getStatusChipColor(req.status)} size="small" />
                                </TableCell>
                                <TableCell align="center">
                                    {req.status === 'pending' && (
                                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                                            <Button variant="contained" size="small" color="success" onClick={() => handleOpenConfirmDialog(req, 'approve')}>批准</Button>
                                            <Button variant="outlined" size="small" color="error" onClick={() => handleOpenConfirmDialog(req, 'reject')}>拒绝</Button>
                                        </Box>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={confirmDialogOpen} onClose={handleCloseConfirmDialog}>
                <DialogTitle>确认操作</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        您确定要 {actionType === 'approve' ? '批准' : '拒绝'} 这个申请吗？
                        {actionType === 'approve' && "批准后将直接从主仓库扣减库存。"}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog}>取消</Button>
                    <Button onClick={handleUpdateRequest} color="primary" variant="contained">确认</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default TransferRequestList; 