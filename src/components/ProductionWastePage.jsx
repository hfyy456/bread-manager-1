import React, { useState, useEffect, useMemo } from 'react';
import {
    Container, Typography, Paper, Grid, TextField, Button, Box, Table, TableHead, TableRow, TableCell, TableBody,
    Select, MenuItem, InputLabel, FormControl, CircularProgress, Snackbar, Alert as MuiAlert, IconButton,
    Accordion, AccordionSummary, AccordionDetails,
    Tooltip,
    TableContainer
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

// Static data imports - replace with API calls in the future
import { breadTypes } from '../data/breadTypes';
import { doughRecipes } from '../data/doughRecipes';
import { fillingRecipes } from '../data/fillingRecipes';

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ProductionWastePage = () => {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [productEntries, setProductEntries] = useState([]);
    const [doughWasteEntries, setDoughWasteEntries] = useState([{ doughId: '', doughName: '', quantity: '', unit: 'g', reason: '' }]);
    const [fillingWasteEntries, setFillingWasteEntries] = useState([{ fillingId: '', fillingName: '', quantity: '', unit: 'g', reason: '' }]);
    const [generalRemarks, setGeneralRemarks] = useState('');

    const [loading, setLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        // Initialize product entries from breadTypes
        const initialProductEntries = breadTypes.map(bread => ({
            productId: bread.id,
            productName: bread.name,
            unitPrice: bread.price || 0, // Assuming bread object has price
            quantityProduced: '',
            finishedWasteQuantity: '',
            remarks: ''
        }));
        setProductEntries(initialProductEntries);
    }, []);

    // Summary Calculations
    const summaryValues = useMemo(() => {
        let totalProductionValue = 0;
        let totalFinishedWasteValue = 0;

        productEntries.forEach(entry => {
            const unitPrice = parseFloat(entry.unitPrice) || 0;
            const produced = parseInt(entry.quantityProduced, 10) || 0;
            const finishedWaste = parseInt(entry.finishedWasteQuantity, 10) || 0;

            totalProductionValue += (produced - finishedWaste) * unitPrice; // Net production value
            totalFinishedWasteValue += finishedWaste * unitPrice;
        });

        const totalDoughWasteQuantity = doughWasteEntries.reduce((sum, entry) => {
            return sum + (parseFloat(entry.quantity) || 0);
        }, 0);
        const doughWasteUnits = doughWasteEntries.length > 0 ? doughWasteEntries[0].unit : 'g'; // Assuming consistent units for summary display

        const totalFillingWasteQuantity = fillingWasteEntries.reduce((sum, entry) => {
            return sum + (parseFloat(entry.quantity) || 0);
        }, 0);
        const fillingWasteUnits = fillingWasteEntries.length > 0 ? fillingWasteEntries[0].unit : 'g'; // Assuming consistent units

        return {
            totalProductionValue,
            totalFinishedWasteValue,
            totalDoughWasteQuantity,
            doughWasteUnits,
            totalFillingWasteQuantity,
            fillingWasteUnits,
        };
    }, [productEntries, doughWasteEntries, fillingWasteEntries]);

    const handleProductInputChange = (index, field, value) => {
        const updatedEntries = [...productEntries];
        updatedEntries[index][field] = value;
        setProductEntries(updatedEntries);
    };

    const handleWasteEntryChange = (type, index, field, value) => {
        const entries = type === 'dough' ? [...doughWasteEntries] : [...fillingWasteEntries];
        entries[index][field] = value;
        if (field === (type === 'dough' ? 'doughId' : 'fillingId')) {
            const selectedItem = (type === 'dough' ? doughRecipes : fillingRecipes).find(item => item.id === value);
            entries[index][type === 'dough' ? 'doughName' : 'fillingName'] = selectedItem ? selectedItem.name : '';
        }
        if (type === 'dough') setDoughWasteEntries(entries);
        else setFillingWasteEntries(entries);
    };

    const addWasteEntry = (type) => {
        if (type === 'dough') {
            setDoughWasteEntries([...doughWasteEntries, { doughId: '', doughName: '', quantity: '', unit: 'g', reason: '' }]);
        } else {
            setFillingWasteEntries([...fillingWasteEntries, { fillingId: '', fillingName: '', quantity: '', unit: 'g', reason: '' }]);
        }
    };

    const removeWasteEntry = (type, index) => {
        const entries = type === 'dough' ? [...doughWasteEntries] : [...fillingWasteEntries];
        if (entries.length > 1) {
            entries.splice(index, 1);
            if (type === 'dough') setDoughWasteEntries(entries);
            else setFillingWasteEntries(entries);
        }
    };
    
    const handleSubmit = async () => {
        setLoading(true);
        const reportData = {
            date: selectedDate,
            products: productEntries.map(p => ({
                ...p,
                unitPrice: parseFloat(p.unitPrice) || 0,
                quantityProduced: parseInt(p.quantityProduced, 10) || 0,
                finishedWasteQuantity: parseInt(p.finishedWasteQuantity, 10) || 0,
            })).filter(p => p.quantityProduced > 0 || p.finishedWasteQuantity > 0 || p.remarks.trim() !== ''),
            doughWastes: doughWasteEntries.filter(d => d.doughId && d.quantity).map(d => ({...d, quantity: parseFloat(d.quantity) || 0})),
            fillingWastes: fillingWasteEntries.filter(f => f.fillingId && f.quantity).map(f => ({...f, quantity: parseFloat(f.quantity) || 0})),
            generalRemarks
        };

        try {
            const response = await fetch('/api/daily-reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reportData)
            });
            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || '保存失败');
            }
            setSnackbar({ open: true, message: result.message || '日报表保存成功!', severity: 'success' });
            // Optionally, clear form or redirect
        } catch (error) {
            setSnackbar({ open: true, message: `错误: ${error.message}`, severity: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 500, mr: 1 }}>
                    生产与报废登记
                </Typography>
                <Tooltip title="查看操作指南">
                    <IconButton component={Link} to="/operation-guide#production-waste" size="small" sx={{ color: 'primary.main' }}> 
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: 3 }}>
                <Typography variant="h6" gutterBottom>常规信息</Typography>
                <TextField
                    label="报告日期"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={{ mb: 2, maxWidth: { xs: '100%', sm: '300px' } }}
                />
            </Paper>

            {/* Summary Section Moved Here */}
            <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mb: 3 }}>
                <Typography variant="h6" gutterBottom>汇总信息</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body1">总出品价值: <strong>¥{summaryValues.totalProductionValue.toFixed(2)}</strong></Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body1" color="error">总成品报废价值: <strong>¥{summaryValues.totalFinishedWasteValue.toFixed(2)}</strong></Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body1" color="orange">总面团报废数量: <strong>{summaryValues.totalDoughWasteQuantity.toFixed(2)} {summaryValues.doughWasteUnits}</strong> (价值待计)</Typography>
                    </Grid>
                     <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body1" color="orange">总馅料报废数量: <strong>{summaryValues.totalFillingWasteQuantity.toFixed(2)} {summaryValues.fillingWasteUnits}</strong> (价值待计)</Typography>
                    </Grid>
                </Grid>
            </Paper>

            <Accordion defaultExpanded sx={{ mt: 0 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">产品出品与报废</Typography></AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 0.5, sm: 1, md: 2} }}>
                    <TableContainer component={Paper} elevation={2} sx={{ mb: 3 }}>
                        <Table size="small">
                            <TableHead sx={{ backgroundColor: 'grey.100' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold', minWidth: { xs: 120, sm: 180 }, pl: {xs: 1, sm: 2} }}>产品名称</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 60 }}>单价</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80 }}>出品数量</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', minWidth: 80 }}>成品报废</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold', minWidth: { xs: 150, sm: 200 }, pr: {xs: 1, sm: 2} }}>备注</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {productEntries.map((entry, index) => (
                                    <TableRow key={entry.productId} hover>
                                        <TableCell sx={{ pl: {xs: 1, sm: 2}}}>{entry.productName}</TableCell>
                                        <TableCell align="right">¥{entry.unitPrice.toFixed(2)}</TableCell>
                                        <TableCell align="right">
                                            <TextField type="number" size="small" variant="outlined" value={entry.quantityProduced} onChange={e => handleProductInputChange(index, 'quantityProduced', e.target.value)} sx={{width: '90px'}} InputProps={{ inputProps: { min: 0, step: 1 }}} />
                                        </TableCell>
                                        <TableCell align="right">
                                            <TextField type="number" size="small" variant="outlined" value={entry.finishedWasteQuantity} onChange={e => handleProductInputChange(index, 'finishedWasteQuantity', e.target.value)} sx={{width: '90px'}} InputProps={{ inputProps: { min: 0, step: 1 }}} />
                                        </TableCell>
                                        <TableCell sx={{ pr: {xs: 1, sm: 2}}}>
                                            <TextField type="text" size="small" variant="outlined" value={entry.remarks} onChange={e => handleProductInputChange(index, 'remarks', e.target.value)} fullWidth />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </AccordionDetails>
            </Accordion>

            <Accordion sx={{ mt: 2}}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">面团报废登记</Typography></AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 0.5, sm: 1, md: 2} }}>
                    <Paper elevation={0} sx={{ p: {xs: 1, sm: 2}, mb: 3 }}>
                        {doughWasteEntries.map((entry, index) => (
                            <Grid container spacing={2} key={index} alignItems="flex-start" sx={{ mb: index === doughWasteEntries.length -1 ? 0 : 2.5}}>
                                <Grid item xs={12} sm={6} md={3.5}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>面团</InputLabel>
                                        <Select label="面团" value={entry.doughId} onChange={e => handleWasteEntryChange('dough', index, 'doughId', e.target.value)}>
                                            {doughRecipes.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6} sm={3} md={2}><TextField label="数量" type="number" size="small" value={entry.quantity} onChange={e => handleWasteEntryChange('dough', index, 'quantity', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0 }}} /></Grid>
                                <Grid item xs={6} sm={3} md={1.5}><TextField label="单位" size="small" value={entry.unit} onChange={e => handleWasteEntryChange('dough', index, 'unit', e.target.value)} fullWidth /></Grid>
                                <Grid item xs={12} sm={9} md={3.5}><TextField label="原因" size="small" value={entry.reason} onChange={e => handleWasteEntryChange('dough', index, 'reason', e.target.value)} fullWidth /></Grid>
                                <Grid item xs={12} sm={3} md={1.5} container justifyContent={{xs: 'flex-end', sm: 'center'}} alignItems="center">
                                    <IconButton onClick={() => removeWasteEntry('dough', index)} disabled={doughWasteEntries.length === 1} size="small"><RemoveCircleOutlineIcon /></IconButton>
                                    {index === doughWasteEntries.length -1 && <IconButton onClick={() => addWasteEntry('dough')} size="small"><AddCircleOutlineIcon /></IconButton>}
                                </Grid>
                            </Grid>
                        ))}
                    </Paper>
                </AccordionDetails>
            </Accordion>
            
            <Accordion sx={{ mt: 2}}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="h6">馅料报废登记</Typography></AccordionSummary>
                <AccordionDetails sx={{ p: { xs: 0.5, sm: 1, md: 2} }}>
                    <Paper elevation={0} sx={{ p: {xs: 1, sm: 2}, mb: 3 }}>
                        {fillingWasteEntries.map((entry, index) => (
                            <Grid container spacing={2} key={index} alignItems="flex-start" sx={{ mb: index === fillingWasteEntries.length -1 ? 0 : 2.5}}>
                                <Grid item xs={12} sm={6} md={3.5}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel>馅料</InputLabel>
                                        <Select label="馅料" value={entry.fillingId} onChange={e => handleWasteEntryChange('filling', index, 'fillingId', e.target.value)}>
                                            {fillingRecipes.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={6} sm={3} md={2}><TextField label="数量" type="number" size="small" value={entry.quantity} onChange={e => handleWasteEntryChange('filling', index, 'quantity', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0 }}} /></Grid>
                                <Grid item xs={6} sm={3} md={1.5}><TextField label="单位" size="small" value={entry.unit} onChange={e => handleWasteEntryChange('filling', index, 'unit', e.target.value)} fullWidth /></Grid>
                                <Grid item xs={12} sm={9} md={3.5}><TextField label="原因" size="small" value={entry.reason} onChange={e => handleWasteEntryChange('filling', index, 'reason', e.target.value)} fullWidth /></Grid>
                                <Grid item xs={12} sm={3} md={1.5} container justifyContent={{xs: 'flex-end', sm: 'center'}} alignItems="center">
                                    <IconButton onClick={() => removeWasteEntry('filling', index)} disabled={fillingWasteEntries.length === 1} size="small"><RemoveCircleOutlineIcon /></IconButton>
                                    {index === fillingWasteEntries.length -1 && <IconButton onClick={() => addWasteEntry('filling')} size="small"><AddCircleOutlineIcon /></IconButton>}
                                </Grid>
                            </Grid>
                        ))}
                    </Paper>
                </AccordionDetails>
            </Accordion>

            <Paper elevation={2} sx={{ p: { xs: 1.5, sm: 2, md: 3 }, mt:3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>总体备注</Typography>
                <TextField
                    label="备注"
                    multiline
                    rows={3}
                    value={generalRemarks}
                    onChange={(e) => setGeneralRemarks(e.target.value)}
                    fullWidth
                />
            </Paper>

            <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleSubmit} 
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    size="large"
                >
                    {loading ? '正在保存...' : '保存日报表'}
                </Button>
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({...snackbar, open: false})} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ProductionWastePage; 