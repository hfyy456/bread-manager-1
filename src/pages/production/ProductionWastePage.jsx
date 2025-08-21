import React, { useState, useEffect, useMemo, useContext, useRef } from 'react';
import {
    Container, Typography, Paper, Grid, TextField, Button, Box, Table, TableHead, TableRow, TableCell, TableBody,
    CircularProgress, Snackbar, Alert as MuiAlert, IconButton,
    Accordion, AccordionSummary, AccordionDetails,
    Tooltip,
    TableContainer,
    useMediaQuery,
    Autocomplete,
    Fab,
    Tabs,
    Tab,
    AppBar
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SaveIcon from '@mui/icons-material/Save';
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { DataContext } from '@components/DataContext.jsx';
import { calculateDoughCost, calculateFillingCost } from '@utils/calculator.js';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const WASTE_TYPE = {
    DOUGH: 'dough',
    FILLING: 'filling',
};

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const ProductionWastePage = () => {
    const { breadTypes, doughRecipes, doughRecipesMap, fillingRecipes, fillingRecipesMap, ingredientsMap, loading: dataContextLoading } = useContext(DataContext);
    const isMobile = useMediaQuery(theme => theme.breakpoints.down('sm'));
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [productEntries, setProductEntries] = useState([]);
    const [doughWasteEntries, setDoughWasteEntries] = useState([{ doughId: '', doughName: '', quantity: '', unit: 'g', reason: '' }]);
    const [fillingWasteEntries, setFillingWasteEntries] = useState([{ fillingId: '', fillingName: '', quantity: '', unit: 'g', reason: '' }]);
    const [generalRemarks, setGeneralRemarks] = useState('');
    const [tabValue, setTabValue] = useState(0);

    const producedInputRefs = useRef([]);
    const wastedInputRefs = useRef([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    useEffect(() => {
        // Initialize product entries from breadTypes
        const initialProductEntries = breadTypes.map(bread => ({
            id: bread.id,
            name: bread.name,
            produced: '',
            wasted: ''
        }));
        setProductEntries(initialProductEntries);
        producedInputRefs.current = Array(breadTypes.length).fill(0).map((_, i) => producedInputRefs.current[i] || React.createRef());
        wastedInputRefs.current = Array(breadTypes.length).fill(0).map((_, i) => wastedInputRefs.current[i] || React.createRef());
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
        const entries = type === WASTE_TYPE.DOUGH ? [...doughWasteEntries] : [...fillingWasteEntries];
        entries[index][field] = value;

        const idField = type === WASTE_TYPE.DOUGH ? 'doughId' : 'fillingId';
        const nameField = type === WASTE_TYPE.DOUGH ? 'doughName' : 'fillingName';
        const recipeList = type === WASTE_TYPE.DOUGH ? doughRecipes : fillingRecipes;

        if (field === idField) {
            const selectedItem = recipeList.find(item => item.id === value);
            entries[index][nameField] = selectedItem ? selectedItem.name : '';
        }

        if (type === WASTE_TYPE.DOUGH) setDoughWasteEntries(entries);
        else setFillingWasteEntries(entries);
    };

    const addWasteEntry = (type) => {
        if (type === WASTE_TYPE.DOUGH) {
            setDoughWasteEntries([...doughWasteEntries, { doughId: '', doughName: '', quantity: '', unit: 'g', reason: '' }]);
        } else {
            setFillingWasteEntries([...fillingWasteEntries, { fillingId: '', fillingName: '', quantity: '', unit: 'g', reason: '' }]);
        }
    };

    const removeWasteEntry = (type, index) => {
        const entries = type === WASTE_TYPE.DOUGH ? [...doughWasteEntries] : [...fillingWasteEntries];
        if (entries.length > 1) {
            entries.splice(index, 1);
            if (type === WASTE_TYPE.DOUGH) setDoughWasteEntries(entries);
            else setFillingWasteEntries(entries);
        }
    };
    
    const handleSubmit = async () => {
        setIsSubmitting(true);
        const reportData = {
            date: selectedDate.format('YYYY-MM-DD'),
            products: productEntries.map(entry => {
                const bread = breadTypes.find(b => b.id === entry.id);
                return {
                    productId: entry.id,
                    productName: entry.name,
                    unitPrice: bread?.price || 0,
                    quantityProduced: parseInt(entry.produced, 10) || 0,
                    finishedWasteQuantity: parseInt(entry.wasted, 10) || 0
                };
            }).filter(p => p.quantityProduced > 0 || p.finishedWasteQuantity > 0),
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
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Container maxWidth="xl" sx={{ py: 3, pb: isMobile ? '80px' : 3 }}>
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
                <DatePicker
                    label="报告日期"
                    value={selectedDate}
                    onChange={(newValue) => setSelectedDate(newValue)}
                    renderInput={(params) => <TextField {...params} fullWidth sx={{ maxWidth: { xs: '100%', sm: '300px' } }} />}
                />
            </Paper>

            {/* Summary Section */}
            <Paper 
                elevation={2} 
                sx={{ 
                    p: { xs: 1.5, sm: 2, md: 3 }, 
                    mb: 3
                }}
            >
                <Typography variant="h6" gutterBottom>汇总信息</Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body1">总出品价值: <strong>¥{summaryValues.totalProductionValue.toFixed(2)}</strong></Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body1" color="error">总成品报废价值: <strong>¥{summaryValues.totalFinishedWasteValue.toFixed(2)}</strong></Typography>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body1" color="orange">总面团报废价值: <strong>¥{summaryValues.totalDoughWasteValue.toFixed(2)}</strong> ({summaryValues.totalDoughWasteQuantity.toFixed(2)} {summaryValues.doughWasteUnits})</Typography>
                    </Grid>
                     <Grid item xs={12} sm={6} md={3}>
                        <Typography variant="body1" color="orange">总馅料报废价值: <strong>¥{summaryValues.totalFillingWasteValue.toFixed(2)}</strong> ({summaryValues.totalFillingWasteQuantity.toFixed(2)} {summaryValues.fillingWasteUnits})</Typography>
                    </Grid>
                </Grid>
            </Paper>

            {isMobile ? (
                 <>
                    <AppBar position="static" color="default" sx={{ mb: 2 }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            indicatorColor="primary"
                            textColor="primary"
                            variant="fullWidth"
                            aria-label="data entry tabs"
                        >
                            <Tab label="出品" />
                            <Tab label="成品报废" />
                            <Tab label="面团报废" />
                            <Tab label="馅料报废" />
                        </Tabs>
                    </AppBar>
                    <TabPanel value={tabValue} index={0}>
                        {/* Mobile Product Entry */}
                        <Box>
                            {productEntries.map((entry, index) => {
                                const breadType = breadTypes.find(b => b.id === entry.id);
                                const handleKeyDown = (e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const nextRef = producedInputRefs.current[index + 1];
                                        if (nextRef && nextRef.current) {
                                            nextRef.current.focus();
                                        }
                                    }
                                };
                                return (
                                    <Paper key={entry.id} sx={{ p: 2, mb: 2, '&:last-child': { mb: 0 } }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{entry.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ¥{(breadType?.price || 0).toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <TextField label="出品数量" type="number" size="small" variant="outlined" value={entry.produced} onChange={e => handleProductInputChange(index, 'produced', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0, step: 1, inputMode: 'numeric' } }} inputRef={producedInputRefs.current[index]} onKeyDown={handleKeyDown} />
                                    </Paper>
                                );
                            })}
                        </Box>
                    </TabPanel>
                    <TabPanel value={tabValue} index={1}>
                        {/* Mobile Wasted Entry */}
                        <Box>
                            {productEntries.map((entry, index) => {
                                const breadType = breadTypes.find(b => b.id === entry.id);
                                const handleKeyDown = (e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const nextRef = wastedInputRefs.current[index + 1];
                                        if (nextRef && nextRef.current) {
                                            nextRef.current.focus();
                                        }
                                    }
                                };
                                return (
                                    <Paper key={entry.id} sx={{ p: 2, mb: 2, '&:last-child': { mb: 0 } }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5 }}>
                                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>{entry.name}</Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ¥{(breadType?.price || 0).toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <TextField label="成品报废" type="number" size="small" variant="outlined" value={entry.wasted} onChange={e => handleProductInputChange(index, 'wasted', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0, step: 1, inputMode: 'numeric' } }} inputRef={wastedInputRefs.current[index]} onKeyDown={handleKeyDown}/>
                                    </Paper>
                                );
                            })}
                        </Box>
                    </TabPanel>
                    <TabPanel value={tabValue} index={2}>
                        {/* Dough Waste Entry */}
                         <Paper elevation={0} sx={{ p: {xs: 1, sm: 2} }}>
                            {doughWasteEntries.map((entry, index) => (
                                <Grid container spacing={2} key={index} alignItems="flex-start" sx={{ mb: index === doughWasteEntries.length -1 ? 0 : 2.5}}>
                                    <Grid item xs={12}><Autocomplete options={doughRecipes} getOptionLabel={(option) => option.name || ''} value={doughRecipes.find(d => d.id === entry.doughId) || null} onChange={(event, newValue) => { handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'doughId', newValue ? newValue.id : ''); }} renderInput={(params) => <TextField {...params} label="面团" size="small" />} /></Grid>
                                    <Grid item xs={8}><TextField label="数量" type="number" size="small" value={entry.quantity} onChange={e => handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'quantity', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0, inputMode: 'numeric' }}} /></Grid>
                                    <Grid item xs={4}><TextField label="单位" size="small" value={entry.unit} onChange={e => handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'unit', e.target.value)} fullWidth /></Grid>
                                    <Grid item xs={12}><TextField label="原因" size="small" value={entry.reason} onChange={e => handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'reason', e.target.value)} fullWidth /></Grid>
                                    <Grid item xs={12} container justifyContent="flex-end" alignItems="center">
                                        <IconButton onClick={() => removeWasteEntry(WASTE_TYPE.DOUGH, index)} disabled={doughWasteEntries.length === 1} size="small"><RemoveCircleOutlineIcon /></IconButton>
                                        {index === doughWasteEntries.length -1 && <IconButton onClick={() => addWasteEntry(WASTE_TYPE.DOUGH)} size="small"><AddCircleOutlineIcon /></IconButton>}
                                    </Grid>
                                </Grid>
                            ))}
                        </Paper>
                    </TabPanel>
                    <TabPanel value={tabValue} index={3}>
                        {/* Filling Waste Entry */}
                        <Paper elevation={0} sx={{ p: {xs: 1, sm: 2} }}>
                            {fillingWasteEntries.map((entry, index) => (
                                <Grid container spacing={2} key={index} alignItems="flex-start" sx={{ mb: index === fillingWasteEntries.length -1 ? 0 : 2.5}}>
                                    <Grid item xs={12}><Autocomplete options={fillingRecipes} getOptionLabel={(option) => option.name || ''} value={fillingRecipes.find(f => f.id === entry.fillingId) || null} onChange={(event, newValue) => { handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'fillingId', newValue ? newValue.id : ''); }} renderInput={(params) => <TextField {...params} label="馅料" size="small" />} /></Grid>
                                    <Grid item xs={8}><TextField label="数量" type="number" size="small" value={entry.quantity} onChange={e => handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'quantity', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0, inputMode: 'numeric' }}} /></Grid>
                                    <Grid item xs={4}><TextField label="单位" size="small" value={entry.unit} onChange={e => handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'unit', e.target.value)} fullWidth /></Grid>
                                    <Grid item xs={12}><TextField label="原因" size="small" value={entry.reason} onChange={e => handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'reason', e.target.value)} fullWidth /></Grid>
                                    <Grid item xs={12} container justifyContent="flex-end" alignItems="center">
                                        <IconButton onClick={() => removeWasteEntry(WASTE_TYPE.FILLING, index)} disabled={fillingWasteEntries.length === 1} size="small"><RemoveCircleOutlineIcon /></IconButton>
                                        {index === fillingWasteEntries.length -1 && <IconButton onClick={() => addWasteEntry(WASTE_TYPE.FILLING)} size="small"><AddCircleOutlineIcon /></IconButton>}
                                    </Grid>
                                </Grid>
                            ))}
                        </Paper>
                    </TabPanel>
                 </>
            ) : (
                <>
                    {/* Desktop View with Accordions */}
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
                                            <Autocomplete options={doughRecipes} getOptionLabel={(option) => option.name || ''} value={doughRecipes.find(d => d.id === entry.doughId) || null} onChange={(event, newValue) => { handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'doughId', newValue ? newValue.id : ''); }} renderInput={(params) => <TextField {...params} label="面团" size="small" />} />
                                        </Grid>
                                        <Grid item xs={6} sm={3} md={2}><TextField label="数量" type="number" size="small" value={entry.quantity} onChange={e => handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'quantity', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0 }}} /></Grid>
                                        <Grid item xs={6} sm={3} md={1.5}><TextField label="单位" size="small" value={entry.unit} onChange={e => handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'unit', e.target.value)} fullWidth /></Grid>
                                        <Grid item xs={12} sm={9} md={3.5}><TextField label="原因" size="small" value={entry.reason} onChange={e => handleWasteEntryChange(WASTE_TYPE.DOUGH, index, 'reason', e.target.value)} fullWidth /></Grid>
                                        <Grid item xs={12} sm={3} md={1.5} container justifyContent={{xs: 'flex-end', sm: 'center'}} alignItems="center">
                                            <IconButton onClick={() => removeWasteEntry(WASTE_TYPE.DOUGH, index)} disabled={doughWasteEntries.length === 1} size="small"><RemoveCircleOutlineIcon /></IconButton>
                                            {index === doughWasteEntries.length -1 && <IconButton onClick={() => addWasteEntry(WASTE_TYPE.DOUGH)} size="small"><AddCircleOutlineIcon /></IconButton>}
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
                                            <Autocomplete options={fillingRecipes} getOptionLabel={(option) => option.name || ''} value={fillingRecipes.find(f => f.id === entry.fillingId) || null} onChange={(event, newValue) => { handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'fillingId', newValue ? newValue.id : ''); }} renderInput={(params) => <TextField {...params} label="馅料" size="small" />} />
                                        </Grid>
                                        <Grid item xs={6} sm={3} md={2}><TextField label="数量" type="number" size="small" value={entry.quantity} onChange={e => handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'quantity', e.target.value)} fullWidth InputProps={{ inputProps: { min: 0 }}} /></Grid>
                                        <Grid item xs={6} sm={3} md={1.5}><TextField label="单位" size="small" value={entry.unit} onChange={e => handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'unit', e.target.value)} fullWidth /></Grid>
                                        <Grid item xs={12} sm={9} md={3.5}><TextField label="原因" size="small" value={entry.reason} onChange={e => handleWasteEntryChange(WASTE_TYPE.FILLING, index, 'reason', e.target.value)} fullWidth /></Grid>
                                        <Grid item xs={12} sm={3} md={1.5} container justifyContent={{xs: 'flex-end', sm: 'center'}} alignItems="center">
                                            <IconButton onClick={() => removeWasteEntry(WASTE_TYPE.FILLING, index)} disabled={fillingWasteEntries.length === 1} size="small"><RemoveCircleOutlineIcon /></IconButton>
                                            {index === fillingWasteEntries.length -1 && <IconButton onClick={() => addWasteEntry(WASTE_TYPE.FILLING)} size="small"><AddCircleOutlineIcon /></IconButton>}
                                        </Grid>
                                    </Grid>
                                ))}
                            </Paper>
                        </AccordionDetails>
                    </Accordion>
                </>
            )}

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

            {isMobile && (
                 <Fab
                    color="primary"
                    aria-label="save"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    sx={{
                        position: 'fixed',
                        bottom: 32,
                        right: 32,
                    }}
                 >
                    {isSubmitting ? <CircularProgress size={24} color="inherit" /> : <SaveIcon />}
                 </Fab>
            )}

            <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={() => setSnackbar({...snackbar, open: false})} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
                <Alert onClose={() => setSnackbar({...snackbar, open: false})} severity={snackbar.severity} sx={{ width: '100%' }}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
        </LocalizationProvider>
    );
};

export default ProductionWastePage;