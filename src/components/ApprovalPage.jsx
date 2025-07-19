import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Container, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Box, Alert, Chip,
    Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, CircularProgress,
    FormControl, InputLabel, Select, MenuItem, TextField, Grid,
} from '@mui/material';
import { useSnackbar } from './SnackbarProvider';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';

const STATUS_MAP = {
    pending: '待处理',
    approved: '已批准',
    rejected: '已拒绝',
    completed: '已完成',
};

const STATUS_COLOR_MAP = {
    pending: 'warning',
    approved: 'info',
    rejected: 'error',
    completed: 'success',
};

const ApprovalPage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { showSnackbar } = useSnackbar();
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [actionType, setActionType] = useState(''); // 'approve' or 'reject'
    const [bulkApproving, setBulkApproving] = useState(false);
    
    const today = new Date().toISOString().split('T')[0];
    // Filter states
    const [statusFilter, setStatusFilter] = useState('all');
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);


    const fetchRequests = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const query = new URLSearchParams();
            if (statusFilter && statusFilter !== 'all') {
                query.append('status', statusFilter);
            }
            if (startDate) {
                query.append('startDate', startDate);
            }
            if (endDate) {
                query.append('endDate', endDate);
            }
            
            const response = await fetch(`/api/transfer-requests/all?${query.toString()}`);
            if (!response.ok) {
                throw new Error('获取审批列表失败');
            }
            const data = await response.json();
            setRequests(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, startDate, endDate]);

    const totalAmount = useMemo(() => {
        return requests.reduce((acc, req) => {
            const requestTotal = req.items.reduce((reqAcc, item) => {
                const price = item.ingredientId?.price || 0;
                return reqAcc + (item.quantity * price);
            }, 0);
            return acc + requestTotal;
        }, 0);
    }, [requests]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const handleOpenConfirmDialog = (request, action) => {
        setSelectedRequest(request);
        setActionType(action);
        setConfirmDialogOpen(true);
    };

    const handleCloseConfirmDialog = () => {
        setConfirmDialogOpen(false);
        setSelectedRequest(null);
        setActionType('');
    };

    const handleConfirmAction = async () => {
        if (!selectedRequest || !actionType) return;
        
        const newStatus = actionType === 'approve' ? 'approved' : 'rejected';

        try {
            const response = await fetch(`/api/transfer-requests/${selectedRequest._id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `操作失败`);
            }
            
            showSnackbar(`申请 #${selectedRequest._id.slice(-6)} 已${newStatus === 'approved' ? '批准' : '拒绝'}`, 'success');
            fetchRequests(); // Refresh the list
        } catch (err) {
            showSnackbar(err.message, 'error');
        } finally {
            handleCloseConfirmDialog();
        }
    };
    
    const handleBulkApprove = async () => {
        const pendingRequests = requests.filter(r => r.status === 'pending');
        if (pendingRequests.length === 0) {
            showSnackbar('当前筛选条件下没有待处理的申请。', 'info');
            return;
        }

        const requestIds = pendingRequests.map(r => r._id);
        
        setBulkApproving(true);
        try {
            const response = await fetch('/api/transfer-requests/bulk-approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestIds }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || '一键批准失败');
            }
            showSnackbar(data.message, 'success');
            fetchRequests(); // Refresh data
        } catch (err) {
            showSnackbar(err.message, 'error');
        } finally {
            setBulkApproving(false);
        }
    };
    
    const pendingRequestCount = useMemo(() => requests.filter(r => r.status === 'pending').length, [requests]);

    return (
        <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                调拨申请审批
            </Typography>

            <Paper sx={{ p: 2, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={4} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>状态</InputLabel>
                            <Select
                                value={statusFilter}
                                label="状态"
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <MenuItem value="all">全部</MenuItem>
                                <MenuItem value="pending">待处理</MenuItem>
                                <MenuItem value="approved">已批准</MenuItem>
                                <MenuItem value="completed">已完成</MenuItem>
                                <MenuItem value="rejected">已拒绝</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                        <TextField
                            label="开始日期"
                            type="date"
                            fullWidth
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4} md={3}>
                        <TextField
                            label="结束日期"
                            type="date"
                            fullWidth
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Typography variant="h6" component="div" sx={{ textAlign: { md: 'right' } }}>
                            总金额: <Typography component="span" sx={{ color: 'primary.main', fontWeight: 'bold' }}>¥{totalAmount.toFixed(2)}</Typography>
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Button
                            variant="contained"
                            startIcon={<PlaylistAddCheckIcon />}
                            onClick={handleBulkApprove}
                            disabled={pendingRequestCount === 0 || bulkApproving || loading}
                            fullWidth
                        >
                            {bulkApproving ? '处理中...' : `一键批准 (${pendingRequestCount})`}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {loading && <CircularProgress />}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && requests.length > 0 ? (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>申请门店</TableCell>
                                <TableCell>申领人</TableCell>
                                <TableCell>申请时间</TableCell>
                                <TableCell>物料详情</TableCell>
                                <TableCell>状态</TableCell>
                                <TableCell>操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {requests.map((req) => (
                                <TableRow key={req._id}>
                                    <TableCell>{req.storeId?.name || '未知门店'}</TableCell>
                                    <TableCell>{req.requestedBy}</TableCell>
                                    <TableCell>{new Date(req.createdAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <ul>
                                            {req.items.map(item => (
                                                <li key={item.ingredientId}>{`${item.name}: ${item.quantity} ${item.unit}`}</li>
                                            ))}
                                        </ul>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={STATUS_MAP[req.status] || req.status} color={STATUS_COLOR_MAP[req.status] || 'default'} />
                                    </TableCell>
                                    <TableCell>
                                        {req.status === 'pending' && (
                                            <Box sx={{ display: 'flex', gap: 1 }}>
                                                <Button variant="contained" color="success" size="small" onClick={() => handleOpenConfirmDialog(req, 'approve')}>批准</Button>
                                                <Button variant="outlined" color="error" size="small" onClick={() => handleOpenConfirmDialog(req, 'reject')}>拒绝</Button>
                                            </Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            ) : (
                 !loading && <Paper sx={{p:3, textAlign:'center'}}>没有找到符合条件的申请。</Paper>
            )}

            <Dialog
                open={confirmDialogOpen}
                onClose={handleCloseConfirmDialog}
            >
                <DialogTitle>确认操作</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        您确定要{actionType === 'approve' ? '批准' : '拒绝'}来自门店 “{selectedRequest?.storeId?.name}” 的申请吗?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmDialog}>取消</Button>
                    <Button onClick={handleConfirmAction} color="primary" autoFocus>
                        确认
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default ApprovalPage; 