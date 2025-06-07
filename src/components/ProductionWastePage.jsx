import React, { useState, useEffect, useMemo, useContext } from 'react';
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
import { DataContext } from './DataContext.jsx';
import { calculateDoughCost, calculateFillingCost } from '../utils/calculator.js';

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ProductionWastePage = () => {
    const { breadTypes, doughRecipes, doughRecipesMap, fillingRecipes, fillingRecipesMap, ingredientsMap, loading: dataContextLoading } = useContext(DataContext);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [productEntries, setProductEntries] = useState([]);
    const [doughWasteEntries, setDoughWasteEntries] = useState([{ doughId: '', doughName: '', quantity: '', unit: 'g', reason: '' }]);
    const [fillingWasteEntries, setFillingWasteEntries] = useState([{ fillingId: '', fillingName: '', quantity: '', unit: 'g', reason: '' }]);
    const [generalRemarks, setGeneralRemarks] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    useEffect(() => {
        // Initialize product entries from breadTypes
        const initialProductEntries = breadTypes.map(bread => ({
            id: bread.id,
            name: bread.name,
            produced: '',
            wasted: ''
        }));
        setProductEntries(initialProductEntries);
    }, [breadTypes]);

    // Summary Calculations
    const summaryValues = useMemo(() => {
        let totalProductionValue = 0;
        let totalFinishedWasteValue = 0;
        let totalDoughWasteValue = 0;
        let totalFillingWasteValue = 0;

        productEntries.forEach(entry => {
            const breadType = breadTypes.find(b => b.id === entry.id);
            const unitPrice = parseFloat(breadType?.price) || 0;
            const produced = parseInt(entry.produced, 10) || 0;
            const wasted = parseInt(entry.wasted, 10) || 0;

            totalProductionValue += (produced) * unitPrice; // Gross production value
            totalFinishedWasteValue += wasted * unitPrice;
        });

        const totalDoughWasteQuantity = doughWasteEntries.reduce((sum, entry) => {
            const quantity = parseFloat(entry.quantity) || 0;
            if (entry.doughId && quantity > 0) {
                const recipe = doughRecipesMap.get(entry.doughId);
                if (recipe && recipe.yield > 0) {
                    const batchCostResult = calculateDoughCost(entry.doughId, doughRecipesMap, ingredientsMap);
                    const costPerGram = batchCostResult.cost / recipe.yield;
                    totalDoughWasteValue += costPerGram * quantity;
                }
            }
            return sum + quantity;
        }, 0);
        const doughWasteUnits = doughWasteEntries.length > 0 ? doughWasteEntries[0].unit : 'g';

        const totalFillingWasteQuantity = fillingWasteEntries.reduce((sum, entry) => {
            const quantity = parseFloat(entry.quantity) || 0;
            if (entry.fillingId && quantity > 0) {
                const recipe = fillingRecipesMap.get(entry.fillingId);
                if (recipe && recipe.yield > 0) {
                    const batchCostResult = calculateFillingCost(entry.fillingId, fillingRecipesMap, ingredientsMap);
                    const costPerGram = batchCostResult.cost / recipe.yield;
                    totalFillingWasteValue += costPerGram * quantity;
                }
            }
            return sum + quantity;
        }, 0);
        const fillingWasteUnits = fillingWasteEntries.length > 0 ? fillingWasteEntries[0].unit : 'g';

        return {
            totalProductionValue,
            totalFinishedWasteValue,
            totalDoughWasteQuantity,
            doughWasteUnits,
            totalFillingWasteQuantity,
            fillingWasteUnits,
            totalDoughWasteValue,
            totalFillingWasteValue,
        };
    }, [productEntries, doughWasteEntries, fillingWasteEntries, breadTypes, doughRecipesMap, fillingRecipesMap, ingredientsMap]);

    const handleProductInputChange = (index, field, value) => {
        const updatedEntries = [...productEntries];
        updatedEntries[index][field] = value;
        setProductEntries(updatedEntries);
    };

    const handleWasteEntryChange = (type, index, field, value) => {
        const entries = type === 'dough' ? [...doughWasteEntries] : [...fillingWasteEntries];
        entries[index][field] = value;
        if (field === (type === 'dough' ? 'doughId' : 'fillingId')) {
            const selectedItem = (type === 'dough' ? doughRecipes : fillingRecipes).find(item => item.name === value);
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
        setIsSubmitting(true);
        const reportData = {
            date: selectedDate,
            products: productEntries.map(entry => {
                const bread = breadTypes.find(b => b.id === entry.id);
                return {
                    productId: entry.id,
                    productName: entry.name,
                    unitPrice: bread?.price || 0,
                    quantityProduced: parseInt(entry.produced, 10) || 0,
                    finishedWasteQuantity: parseInt(entry.wasted, 10) || 0,
                    remarks: entry.remarks || ''
                };
            }).filter(p => p.quantityProduced > 0 || p.finishedWasteQuantity > 0 || (p.remarks && p.remarks.trim() !== '')),
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
            setIsSubmitting(false);
        }
    };

    if (dataContextLoading) {
        return <CircularProgress />;
    }

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
                        <Typography variant="body1" color="orange">总面团报废价值: <strong>¥{summaryValues.totalDoughWasteValue.toFixed(2)}</strong> ({summaryValues.totalDoughWasteQuantity.toFixed(2)} {summaryValues.doughWasteUnits})</Typography>
                    </Grid>
                     <Grid item xs={12} sm={6} md={4}>
                        <Typography variant="body1" color="orange">总馅料报废价值: <strong>¥{summaryValues.totalFillingWasteValue.toFixed(2)}</strong> ({summaryValues.totalFillingWasteQuantity.toFixed(2)} {summaryValues.fillingWasteUnits})</Typography>
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
                                {productEntries.map((entry, index) => {
                                    const breadType = breadTypes.find(b => b.id === entry.id);
                                    return (
                                        <TableRow key={entry.id} hover>
                                            <TableCell sx={{ pl: {xs: 1, sm: 2}}}>{entry.name}</TableCell>
                                            <TableCell align="right">¥{(breadType?.price || 0).toFixed(2)}</TableCell>
                                        <TableCell align="right">
                                                <TextField type="number" size="small" variant="outlined" value={entry.produced} onChange={e => handleProductInputChange(index, 'produced', e.target.value)} sx={{width: '90px'}} InputProps={{ inputProps: { min: 0, step: 1 }}} />
                                        </TableCell>
                                        <TableCell align="right">
                                                <TextField type="number" size="small" variant="outlined" value={entry.wasted} onChange={e => handleProductInputChange(index, 'wasted', e.target.value)} sx={{width: '90px'}} InputProps={{ inputProps: { min: 0, step: 1 }}} />
                                        </TableCell>
                                        <TableCell sx={{ pr: {xs: 1, sm: 2}}}>
                                            <TextField type="text" size="small" variant="outlined" value={entry.remarks} onChange={e => handleProductInputChange(index, 'remarks', e.target.value)} fullWidth />
                                        </TableCell>
                                    </TableRow>
                                    );
                                })}
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
                                            {doughRecipes.map(d => <MenuItem key={d.id} value={d.name}>{d.name}</MenuItem>)}
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
                                            {fillingRecipes.map(f => <MenuItem key={f.id} value={f.name}>{f.name}</MenuItem>)}
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
                    disabled={isSubmitting}
                    startIcon={isSubmitting ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                    size="large"
                >
                    {isSubmitting ? '正在保存...' : '保存日报表'}
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