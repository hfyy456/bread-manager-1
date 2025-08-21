import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Typography, Paper, Box, Table, TableHead, TableRow, TableCell, TableBody,
    CircularProgress, Snackbar, Alert as MuiAlert, IconButton, Tooltip, TableContainer, Link as MuiLink,
    Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon, Close as CloseIcon } from '@mui/icons-material';

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

// Helper to format date string
const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
};

// Helper to calculate summary values for a single report
const calculateReportSummaries = (report) => {
    let totalProductionValue = 0;
    let totalFinishedWasteValue = 0;

    report.products.forEach(product => {
        const unitPrice = parseFloat(product.unitPrice) || 0;
        const produced = parseInt(product.quantityProduced, 10) || 0;
        const finishedWaste = parseInt(product.finishedWasteQuantity, 10) || 0;
        
        totalProductionValue += (produced - finishedWaste) * unitPrice;
        totalFinishedWasteValue += finishedWaste * unitPrice;
    });

    const totalDoughWasteQuantity = report.doughWastes.reduce((sum, entry) => {
        return sum + (parseFloat(entry.quantity) || 0);
    }, 0);
    const doughWasteUnits = report.doughWastes.length > 0 ? report.doughWastes[0].unit : 'g';

    const totalFillingWasteQuantity = report.fillingWastes.reduce((sum, entry) => {
        return sum + (parseFloat(entry.quantity) || 0);
    }, 0);
    const fillingWasteUnits = report.fillingWastes.length > 0 ? report.fillingWastes[0].unit : 'g';

    return {
        totalProductionValue,
        totalFinishedWasteValue,
        totalDoughWasteQuantity,
        doughWasteUnits,
        totalFillingWasteQuantity,
        fillingWasteUnits,
    };
};

const DailyReportPreviewPage = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [selectedReport, setSelectedReport] = useState(null);

    useEffect(() => {
        const fetchReports = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/daily-reports');
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || '获取日报列表失败');
                }
                // Sort reports by date, newest first
                const sortedReports = result.data.sort((a, b) => new Date(b.date) - new Date(a.date));
                setReports(sortedReports);
            } catch (error) {
                setSnackbar({ open: true, message: `错误: ${error.message}`, severity: 'error' });
            } finally {
                setLoading(false);
            }
        };
        fetchReports();
    }, []);

    const processedReports = useMemo(() => {
        return reports.map(report => ({
            ...report,
            summaries: calculateReportSummaries(report)
        }));
    }, [reports]);

    const handleRowClick = (report) => {
        if (selectedReport && selectedReport._id === report._id) {
            setSelectedReport(null);
        } else {
            setSelectedReport(report);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" sx={{ py: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 200px)' }}>
                <CircularProgress />
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" sx={{ py: 3 }}>
            <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 500, mr: 1 }}>
                    日报预览
                </Typography>
                <Tooltip title="查看操作指南">
                    <IconButton component={RouterLink} to="/operation-guide#daily-report-preview" size="small" sx={{ color: 'primary.main' }}>
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <TableContainer component={Paper} elevation={2}>
                <Table stickyHeader size="small">
                    <TableHead sx={{ backgroundColor: 'grey.100' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 100 }}>日期</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120 }}>出品价值 (¥)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120 }}>成品报废价值 (¥)</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120 }}>面团报废</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 120 }}>馅料报废</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 150 }}>总体备注</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {processedReports.length === 0 && !loading ? (
                            <TableRow>
                                <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                                    <Typography variant="subtitle1">暂无日报数据。</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            processedReports.map((report) => (
                                <TableRow 
                                    key={report._id || report.date} 
                                    hover 
                                    onClick={() => handleRowClick(report)}
                                    selected={selectedReport && selectedReport._id === report._id}
                                    sx={{
                                        cursor: 'pointer',
                                        backgroundColor: selectedReport && selectedReport._id === report._id ? (theme) => theme.palette.action.selected : 'inherit' 
                                    }}
                                >
                                    <TableCell>{formatDate(report.date)}</TableCell>
                                    <TableCell align="right">{report.summaries.totalProductionValue.toFixed(2)}</TableCell>
                                    <TableCell align="right" sx={{ color: report.summaries.totalFinishedWasteValue > 0 ? 'error.main' : 'inherit' }}>
                                        {report.summaries.totalFinishedWasteValue.toFixed(2)}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: report.summaries.totalDoughWasteQuantity > 0 ? 'orange' : 'inherit' }}>
                                        {report.summaries.totalDoughWasteQuantity.toFixed(2)} {report.summaries.doughWasteUnits}
                                    </TableCell>
                                    <TableCell align="right" sx={{ color: report.summaries.totalFillingWasteQuantity > 0 ? 'orange' : 'inherit' }}>
                                        {report.summaries.totalFillingWasteQuantity.toFixed(2)} {report.summaries.fillingWasteUnits}
                                    </TableCell>
                                    <TableCell sx={{ 
                                        maxWidth: 200, 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap' 
                                    }}>
                                        <Tooltip title={report.generalRemarks || ''} placement="bottom-start">
                                             <span>{report.generalRemarks || '-'}</span>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {selectedReport && (
                <Dialog 
                    open={Boolean(selectedReport)} 
                    onClose={() => setSelectedReport(null)} 
                    maxWidth="md" 
                    fullWidth
                    aria-labelledby="report-details-dialog-title"
                >
                    <DialogTitle id="report-details-dialog-title">
                        日报详情: {selectedReport.date && formatDate(selectedReport.date)}
                        <IconButton
                            aria-label="close"
                            onClick={() => setSelectedReport(null)}
                            sx={{
                                position: 'absolute',
                                right: 8,
                                top: 8,
                                color: (theme) => theme.palette.grey[500],
                            }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'bold'}}>产品出品与报废</Typography>
                        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2, maxHeight: 300, overflowY: 'auto' }}>
                            <Table size="small" stickyHeader>
                                <TableHead sx={{ backgroundColor: 'grey.50'}}>
                                    <TableRow>
                                        <TableCell sx={{fontWeight: 'bold'}}>产品名称</TableCell>
                                        <TableCell align="right" sx={{fontWeight: 'bold'}}>单价</TableCell>
                                        <TableCell align="right" sx={{fontWeight: 'bold'}}>出品</TableCell>
                                        <TableCell align="right" sx={{fontWeight: 'bold'}}>成品报废</TableCell>
                                        <TableCell sx={{fontWeight: 'bold'}}>备注</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {selectedReport.products.map((product, index) => (
                                        <TableRow key={product.productId + '-' + index}>
                                            <TableCell>{product.productName}</TableCell>
                                            <TableCell align="right">¥{parseFloat(product.unitPrice || 0).toFixed(2)}</TableCell>
                                            <TableCell align="right">{product.quantityProduced || 0}</TableCell>
                                            <TableCell align="right">{product.finishedWasteQuantity || 0}</TableCell>
                                            <TableCell sx={{maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                                                <Tooltip title={product.remarks || ''} placement="top">
                                                    <span>{product.remarks || '-'}</span>
                                                </Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {selectedReport.products.length === 0 && (
                                        <TableRow><TableCell colSpan={5} align="center">无产品记录</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>

                        {selectedReport.doughWastes && selectedReport.doughWastes.length > 0 && (
                            <Box mb={2}>
                                <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'bold'}}>面团报废</Typography>
                                {selectedReport.doughWastes.map((waste, index) => (
                                    <Paper key={`dough-${index}`} variant="outlined" sx={{ p: 1.5, mb: 1, fontSize: '0.875rem' }}>
                                        <Typography variant="body2"><strong>名称:</strong> {waste.doughName || 'N/A'}</Typography>
                                        <Typography variant="body2"><strong>数量:</strong> {parseFloat(waste.quantity || 0).toFixed(2)} {waste.unit || 'g'}</Typography>
                                        <Typography variant="body2"><strong>原因:</strong> {waste.reason || '-'}</Typography>
                                    </Paper>
                                ))}
                            </Box>
                        )}

                        {selectedReport.fillingWastes && selectedReport.fillingWastes.length > 0 && (
                            <Box mb={2}>
                                <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'bold'}}>馅料报废</Typography>
                                {selectedReport.fillingWastes.map((waste, index) => (
                                    <Paper key={`filling-${index}`} variant="outlined" sx={{ p: 1.5, mb: 1, fontSize: '0.875rem' }}>
                                        <Typography variant="body2"><strong>名称:</strong> {waste.fillingName || 'N/A'}</Typography>
                                        <Typography variant="body2"><strong>数量:</strong> {parseFloat(waste.quantity || 0).toFixed(2)} {waste.unit || 'g'}</Typography>
                                        <Typography variant="body2"><strong>原因:</strong> {waste.reason || '-'}</Typography>
                                    </Paper>
                                ))}
                            </Box>
                        )}
                        
                        <Box mt={selectedReport.doughWastes?.length === 0 && selectedReport.fillingWastes?.length === 0 ? 0 : 2}>
                            <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'bold'}}>总体备注</Typography>
                            <Paper variant="outlined" sx={{p: 1.5}}>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                {selectedReport.generalRemarks || '无总体备注'}
                            </Typography>
                            </Paper>
                        </Box>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setSelectedReport(null)} color="primary">
                            关闭
                        </Button>
                    </DialogActions>
                </Dialog>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({...snackbar, open: false})} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default DailyReportPreviewPage; 