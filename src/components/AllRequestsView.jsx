import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    List,
    ListItem,
    ListItemText,
    Card,
    CardContent,
    Chip,
    Grid,
    TextField
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { startOfDay, endOfDay, format } from 'date-fns';
import HistoryIcon from '@mui/icons-material/History';


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

const AllRequestsView = ({ storeId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [startDate, setStartDate] = useState(startOfDay(new Date()));
    const [endDate, setEndDate] = useState(endOfDay(new Date()));

    const fetchAllRequests = useCallback(async () => {
        if (!storeId) return;

        setLoading(true);
        setError('');
        try {
            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');

            // Corrected URL to match the existing backend route
            const response = await fetch(`/api/transfer-requests?startDate=${formattedStartDate}&endDate=${formattedEndDate}`);
            
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || '获取申请记录失败');
            }
            const data = await response.json();
            setRequests(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [storeId, startDate, endDate]);

    useEffect(() => {
        fetchAllRequests();
    }, [fetchAllRequests]);

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box>
                <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', my: 2 }}>
                    所有申请单据
                </Typography>
                <Paper sx={{ p: 2, mb: 2 }}>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs={6}>
                            <DatePicker
                                label="开始日期"
                                value={startDate}
                                onChange={(newValue) => setStartDate(startOfDay(newValue))}
                                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <DatePicker
                                label="结束日期"
                                value={endDate}
                                onChange={(newValue) => setEndDate(endOfDay(newValue))}
                                renderInput={(params) => <TextField {...params} fullWidth size="small" />}
                            />
                        </Grid>
                    </Grid>
                </Paper>

                {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
                {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

                {!loading && !error && (
                    requests.length === 0 ? (
                        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', mt: 4 }}>
                            <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                            <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>该日期范围内没有申请记录</Typography>
                        </Paper>
                    ) : (
                        requests.map(req => (
                            <Card 
                                key={req._id} 
                                sx={{ 
                                    mb: 2, 
                                    boxShadow: 2, 
                                    borderRadius: 2, 
                                    borderLeft: '4px solid',
                                    borderColor: `${getStatusChipColor(req.status)}.main`
                                }} 
                                variant="outlined"
                            >
                                <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                                        <Box>
                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                               申请人: {req.requestedBy || '未知'}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                                {new Date(req.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </Typography>
                                        </Box>
                                        <Chip label={STATUS_MAP[req.status] || req.status} color={getStatusChipColor(req.status)} size="small" sx={{ mt: 0.5 }}/>
                                    </Box>
                                    
                                    <List dense sx={{ mt: 1, p: 0 }}>
                                        {req.items.map((item, index) => (
                                            <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                                                <ListItemText 
                                                    primary={item.name}
                                                    secondary={`x ${item.quantity} ${item.unit || ''}`}
                                                    primaryTypographyProps={{ variant: 'body1' }}
                                                    secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                                                />
                                            </ListItem>
                                        ))}
                                    </List>
                                    {req.notes && <Typography variant="body2" sx={{ mt: 1.5, fontStyle: 'italic', color: 'text.secondary', p: 1.5, backgroundColor: 'grey.100', borderRadius: 1 }}>备注: {req.notes}</Typography>}
                                </CardContent>
                            </Card>
                        ))
                    )
                )}
            </Box>
        </LocalizationProvider>
    );
};

export default AllRequestsView; 