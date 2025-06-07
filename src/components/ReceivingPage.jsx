import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Grid, Box, TextField, Button, IconButton,
    CircularProgress, Snackbar, Alert as MuiAlert, Autocomplete, Tooltip, Divider
} from '@mui/material';
import { AddCircleOutline, DeleteOutline, CloudUpload } from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';

const Alert = React.forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ReceivingPage = () => {
    const [allIngredients, setAllIngredients] = useState([]);
    const [loadingIngredients, setLoadingIngredients] = useState(true);
    const [supplier, setSupplier] = useState('');
    const [deliveryId, setDeliveryId] = useState('');
    const [receivingDate, setReceivingDate] = useState(new Date().toISOString().split('T')[0]);
    const [items, setItems] = useState([{ id: uuidv4(), ingredient: null, orderedQty: '', receivedQty: '' }]);
    const [selectedFile, setSelectedFile] = useState(null);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isParsing, setIsParsing] = useState(false); // For OCR parsing
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');

    // Fetch all ingredients for the dropdowns
    useEffect(() => {
        const fetchIngredients = async () => {
            try {
                setLoadingIngredients(true);
                const response = await fetch('/api/ingredients/list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setAllIngredients(result.data);
                } else {
                    throw new Error('无法加载原料列表');
                }
            } catch (error) {
                handleShowSnackbar(`加载原料失败: ${error.message}`, 'error');
            } finally {
                setLoadingIngredients(false);
            }
        };
        fetchIngredients();
    }, []);

    const handleShowSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const handleFileChange = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            handleShowSnackbar(`已选择文件: ${file.name}`, 'info');
        }
    };

    const handleParseImage = async () => {
        if (!selectedFile) {
            handleShowSnackbar('请先选择一个交货单图片。', 'warning');
            return;
        }
        
        setIsParsing(true);
        const formData = new FormData();
        formData.append('deliverySlip', selectedFile);

        try {
            const response = await fetch('/api/receiving/parse-delivery-slip', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || `服务器错误: ${response.statusText}`);
            }

            if (data.success) {
                const parsedItems = data.items.map(item => ({
                    id: uuidv4(),
                    ingredient: item.ingredient,
                    orderedQty: '',
                    receivedQty: item.receivedQty,
                }));
                
                if (parsedItems.length > 0) {
                    setItems(parsedItems);
                    handleShowSnackbar(`成功识别出 ${parsedItems.length} 项物料！`, 'success');
                } else {
                    handleShowSnackbar('识别完成，但未在图片中找到匹配的物料。', 'info');
                }
            } else {
                handleShowSnackbar(`识别失败: ${data.message}`, 'error');
            }
        } catch (error) {
            handleShowSnackbar(`识别失败: ${error.message}`, 'error');
            console.error(error);
        } finally {
            setIsParsing(false);
        }
    };

    const handleItemChange = (id, field, value) => {
        const newItems = items.map(item => {
            if (item.id === id) {
                return { ...item, [field]: value };
            }
            return item;
        });
        setItems(newItems);
    };

    const handleAddItem = () => {
        setItems([...items, { id: uuidv4(), ingredient: null, orderedQty: '', receivedQty: '' }]);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(item => item.id !== id));
    };

    const handleSubmit = async () => {
        if (!supplier.trim() || !deliveryId.trim()) {
            handleShowSnackbar('请填写供应商和交货单号。', 'warning');
            return;
        }

        const validItems = items.filter(item => 
            item.ingredient && 
            item.ingredient._id && 
            item.receivedQty !== '' && 
            !isNaN(parseFloat(item.receivedQty))
        );

        if (validItems.length === 0) {
            handleShowSnackbar('请至少添加一项有效的收货物料，并填写实收数量。', 'warning');
            return;
        }

        const dataToSubmit = {
            supplier,
            deliveryId,
            receivingDate,
            items: validItems,
        };

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/receiving/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSubmit),
            });
            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.message || '服务器返回错误');
            }

            handleShowSnackbar(result.message || '入库成功！', 'success');
            // Reset form
            setSupplier('');
            setDeliveryId('');
            setItems([{ id: uuidv4(), ingredient: null, orderedQty: '', receivedQty: '' }]);

        } catch (error) {
            handleShowSnackbar(`提交失败: ${error.message}`, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center' }}>
                收货入库
            </Typography>

            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="供应商"
                            value={supplier}
                            onChange={(e) => setSupplier(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="交货单号"
                            value={deliveryId}
                            onChange={(e) => setDeliveryId(e.target.value)}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            label="收货日期"
                            type="date"
                            value={receivingDate}
                            onChange={(e) => setReceivingDate(e.target.value)}
                            InputLabelProps={{ shrink: true }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                         <Button
                            component="label"
                            variant="outlined"
                            startIcon={<CloudUpload />}
                            sx={{ height: '56px', width: '100%' }}
                        >
                            上传交货单图片
                            <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </Button>
                    </Grid>
                    {selectedFile && (
                        <Grid item xs={12}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography>
                                    已选: {selectedFile.name}
                                </Typography>
                                <Button 
                                    onClick={handleParseImage} 
                                    variant="contained"
                                    disabled={isParsing}
                                >
                                    {isParsing ? <CircularProgress size={24} /> : '开始识别'}
                                </Button>
                            </Box>
                        </Grid>
                    )}
                </Grid>
            </Paper>

            <Divider sx={{ my: 3 }} />

            <Paper elevation={3} sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>收货明细</Typography>
                {items.map((item, index) => (
                    <Grid container spacing={2} key={item.id} sx={{ mb: 2, alignItems: 'center' }}>
                        <Grid item xs={12} sm={5}>
                            <Autocomplete
                                fullWidth
                                options={allIngredients}
                                getOptionLabel={(option) => option.name || ''}
                                value={item.ingredient}
                                onChange={(event, newValue) => {
                                    handleItemChange(item.id, 'ingredient', newValue);
                                }}
                                renderInput={(params) => (
                                    <TextField
                                        {...params}
                                        label={`物料 #${index + 1}`}
                                        variant="outlined"
                                        InputProps={{
                                            ...params.InputProps,
                                            endAdornment: (
                                                <React.Fragment>
                                                    {loadingIngredients ? <CircularProgress color="inherit" size={20} /> : null}
                                                    {params.InputProps.endAdornment}
                                                </React.Fragment>
                                            ),
                                        }}
                                    />
                                )}
                            />
                        </Grid>
                        <Grid item xs={6} sm={2.5}>
                            <TextField
                                fullWidth
                                label="订购量"
                                type="number"
                                value={item.orderedQty}
                                onChange={(e) => handleItemChange(item.id, 'orderedQty', e.target.value)}
                            />
                        </Grid>
                        <Grid item xs={6} sm={2.5}>
                            <TextField
                                fullWidth
                                label="实收量"
                                type="number"
                                value={item.receivedQty}
                                onChange={(e) => handleItemChange(item.id, 'receivedQty', e.target.value)}
                                sx={{ '& input': { fontWeight: 'bold' } }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={2} sx={{ textAlign: 'right' }}>
                            <Tooltip title="移除此项">
                                <IconButton onClick={() => handleRemoveItem(item.id)}>
                                    <DeleteOutline />
                                </IconButton>
                            </Tooltip>
                        </Grid>
                    </Grid>
                ))}
                <Button
                    startIcon={<AddCircleOutline />}
                    onClick={handleAddItem}
                    sx={{ mt: 1 }}
                >
                    添加物料
                </Button>
            </Paper>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
                <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? <CircularProgress size={24} /> : '确认入库'}
                </Button>
            </Box>

            <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleCloseSnackbar}>
                <Alert onClose={handleCloseSnackbar} severity={snackbarSeverity} sx={{ width: '100%' }}>
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default ReceivingPage; 