import React, { useState, useContext, useEffect, useCallback } from 'react';
import { DataContext } from './DataContext';
import { Container, Typography, TextField, Button, Select, MenuItem, FormControl, InputLabel, Grid, Paper, Box, IconButton, Divider, CircularProgress, Autocomplete } from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import RecipeCreateDialog from './RecipeCreateDialog';
import { useParams, useNavigate } from 'react-router-dom';
import { useSnackbar } from './SnackbarProvider.jsx';

const BreadTypeEditor = () => {
    const { doughRecipes, fillingRecipes, ingredients, loading: contextLoading, error: contextError, refreshData } = useContext(DataContext);
    const { id: breadTypeId } = useParams();
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    const [breadType, setBreadType] = useState({
        id: '',
        name: '',
        description: '',
        price: '',
        doughId: '',
        doughWeight: '',
        fillings: [],
        decorations: []
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const isEditing = Boolean(breadTypeId);

    useEffect(() => {
        const fetchBreadType = async () => {
            if (isEditing) {
                setLoading(true);
                setError(null);
                try {
                    const response = await fetch(`/api/bread-types/${breadTypeId}`);
                    if (!response.ok) {
                        throw new Error('获取面包数据失败');
                    }
                    const { success, data } = await response.json();
                    if (success) {
                        setBreadType({
                            ...data,
                            // Ensure lists are arrays even if they are null/undefined from backend
                            fillings: data.fillings || [],
                            decorations: data.decorations || [],
                        });
                    } else {
                        throw new Error('获取面包数据失败');
                    }
                } catch (err) {
                    setError(err.message);
                    showSnackbar(`加载错误: ${err.message}`, 'error');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchBreadType();
    }, [breadTypeId, isEditing, showSnackbar]);


    const [dialogState, setDialogState] = useState({ open: false, type: null, rowIndex: null });

    const handleOpenDialog = (type, rowIndex = null) => {
        setDialogState({ open: true, type, rowIndex });
    };

    const handleCloseDialog = () => {
        setDialogState({ open: false, type: null, rowIndex: null });
    };

    const handleCreateSuccess = useCallback(async (newRecipe) => {
        const { type, rowIndex } = dialogState;
        
        await refreshData();
        
        if (type === 'dough') {
            setBreadType(prev => ({ ...prev, doughId: newRecipe.name }));
        } else if (type === 'filling' && rowIndex !== null) {
            const newList = [...breadType.fillings];
            newList[rowIndex].fillingId = newRecipe.name;
            setBreadType(prev => ({ ...prev, fillings: newList }));
        }
       
        handleCloseDialog();
        showSnackbar(`${type === 'dough' ? '面团' : '馅料'}配方 "${newRecipe.name}" 创建成功!`, 'success');
    }, [dialogState, refreshData, showSnackbar]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setBreadType(prev => ({ ...prev, [name]: value }));
    };

    const handleListChange = (index, field, value, listName) => {
        const newList = [...breadType[listName]];
        if (!newList[index]) {
            newList[index] = listName === 'fillings' ? { fillingId: '', quantity: '', unit: 'g'} : { ingredientId: '', quantity: '', unit: 'g' };
        }
        newList[index][field] = value;
        setBreadType(prev => ({ ...prev, [listName]: newList }));
    };

    const handleAddListItem = (listName) => {
        const newItem = listName === 'fillings'
            ? { fillingId: '', quantity: '', unit: 'g' }
            : { ingredientId: '', quantity: '', unit: 'g' };
        setBreadType(prev => ({ ...prev, [listName]: [...prev[listName], newItem] }));
    };

    const handleRemoveListItem = (index, listName) => {
        const newList = breadType[listName].filter((_, i) => i !== index);
        setBreadType(prev => ({ ...prev, [listName]: newList }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...breadType,
            price: Number(breadType.price) || 0,
            doughWeight: Number(breadType.doughWeight) || 0,
            fillings: breadType.fillings.map(f => ({
                fillingId: f.fillingId,
                quantity: Number(f.quantity) || 0,
                unit: f.unit || 'g'
            })),
            decorations: breadType.decorations.map(d => ({
                ingredientId: d.ingredientId,
                quantity: Number(d.quantity) || 0,
                unit: d.unit || 'g'
            }))
        };
        
        try {
            const url = isEditing ? `/api/bread-types/${breadTypeId}` : '/api/bread-types';
            const method = isEditing ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || (isEditing ? '更新失败' : '创建失败'));
            }
            
            showSnackbar(result.message, 'success');
            await refreshData();
            navigate('/breads');

        } catch (err) {
            setError(err.message);
            showSnackbar(`保存失败: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (contextLoading || loading) return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>{contextLoading ? '正在加载依赖数据...' : '正在加载面包数据...'}</Typography>
        </Box>
    );
    if (contextError || error) return <Typography color="error">加载数据失败: {contextError || error}</Typography>;

    return (
        <Container maxWidth="md">
            <Paper component="form" onSubmit={handleSubmit} sx={{ p: { xs: 2, sm: 3 }, mt: 3, mb: 3 }}>
                <Typography variant="h4" gutterBottom>{isEditing ? '编辑面包种类' : '创建新的面包种类'}</Typography>
                
                <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="name" label="面包名称" value={breadType.name} onChange={handleChange} required disabled={loading} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="id" label="面包ID (例如 'B001')" value={breadType.id} onChange={handleChange} required disabled={loading}/>
                    </Grid>
                    <Grid item xs={12}>
                        <TextField fullWidth name="description" label="描述" value={breadType.description} onChange={handleChange} disabled={loading}/>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <TextField fullWidth name="price" label="建议售价" type="number" value={breadType.price} onChange={handleChange} required disabled={loading}/>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" gutterBottom>面团</Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={8}>
                        <Autocomplete
                            fullWidth
                            options={[{ name: '[+] 创建新面团配方...', id: 'add_new_dough' }, ...doughRecipes]}
                            getOptionLabel={(option) => option.name}
                            value={doughRecipes.find(d => d.name === breadType.doughId) || null}
                            onChange={(event, newValue) => {
                                if (newValue && newValue.id === 'add_new_dough') {
                                    handleOpenDialog('dough');
                                } else {
                                    setBreadType(prev => ({ ...prev, doughId: newValue ? newValue.name : '' }));
                                }
                            }}
                            isOptionEqualToValue={(option, value) => option.name === value.name}
                            renderInput={(params) => <TextField {...params} label="面团配方" required />}
                            renderOption={(props, option) => (
                                <Box component="li" {...props} sx={{ color: option.id === 'add_new_dough' ? 'primary.main' : 'inherit' }}>
                                    {option.name}
                                </Box>
                            )}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <TextField fullWidth name="doughWeight" label="面团重量 (g)" type="number" value={breadType.doughWeight} onChange={handleChange} required disabled={loading}/>
                    </Grid>
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" gutterBottom>馅料</Typography>
                {breadType.fillings.map((filling, index) => (
                    <Grid container spacing={1} key={index} alignItems="center" sx={{ mb: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                fullWidth
                                options={[{ name: '[+] 创建新馅料配方...', id: 'add_new_filling' }, ...fillingRecipes]}
                                getOptionLabel={(option) => option.name}
                                value={fillingRecipes.find(f => f.name === filling.fillingId) || null}
                                onChange={(event, newValue) => {
                                    if (newValue && newValue.id === 'add_new_filling') {
                                        handleOpenDialog('filling', index);
                                    } else {
                                        handleListChange(index, 'fillingId', newValue ? newValue.name : '', 'fillings');
                                    }
                                }}
                                isOptionEqualToValue={(option, value) => option.name === value.name}
                                renderInput={(params) => <TextField {...params} label="馅料配方" required />}
                                renderOption={(props, option) => (
                                    <Box component="li" {...props} sx={{ color: option.id === 'add_new_filling' ? 'primary.main' : 'inherit' }}>
                                        {option.name}
                                    </Box>
                                )}
                            />
                        </Grid>
                        <Grid item xs={8} sm={4}>
                            <TextField fullWidth required label="用量 (g)" type="number" value={filling.quantity} onChange={(e) => handleListChange(index, 'quantity', e.target.value, 'fillings')} disabled={loading}/>
                        </Grid>
                        <Grid item xs={4} sm={2}>
                            <IconButton onClick={() => handleRemoveListItem(index, 'fillings')} disabled={loading}>
                                <RemoveCircleOutlineIcon />
                            </IconButton>
                        </Grid>
                    </Grid>
                ))}
                <Button startIcon={<AddCircleOutlineIcon />} onClick={() => handleAddListItem('fillings')} disabled={loading}>添加馅料</Button>
                
                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" gutterBottom>装饰</Typography>
                {breadType.decorations.map((decoration, index) => (
                    <Grid container spacing={1} key={index} alignItems="center" sx={{ mb: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Autocomplete
                                fullWidth
                                options={ingredients}
                                getOptionLabel={(option) => option.name}
                                value={ingredients.find(i => i.name === decoration.ingredientId) || null}
                                onChange={(event, newValue) => {
                                    handleListChange(index, 'ingredientId', newValue ? newValue.name : '', 'decorations');
                                }}
                                isOptionEqualToValue={(option, value) => option.name === value.name}
                                renderInput={(params) => <TextField {...params} label="装饰原料*" required />}
                            />
                        </Grid>
                        <Grid item xs={8} sm={4}>
                            <TextField fullWidth required label="用量 (g)" type="number" value={decoration.quantity} onChange={(e) => handleListChange(index, 'quantity', e.target.value, 'decorations')} disabled={loading}/>
                        </Grid>
                        <Grid item xs={4} sm={2}>
                            <IconButton onClick={() => handleRemoveListItem(index, 'decorations')} disabled={loading}>
                                <RemoveCircleOutlineIcon />
                            </IconButton>
                        </Grid>
                    </Grid>
                ))}
                <Button startIcon={<AddCircleOutlineIcon />} onClick={() => handleAddListItem('decorations')} disabled={loading}>添加装饰</Button>

                <Box mt={4} display="flex" justifyContent="flex-end">
                    <Button type="submit" variant="contained" color="primary" size="large" disabled={loading}>
                        {loading ? '正在保存...' : (isEditing ? '更新面包种类' : '创建面包种类')}
                    </Button>
                </Box>
            </Paper>

            <RecipeCreateDialog
                open={dialogState.open}
                onClose={handleCloseDialog}
                recipeType={dialogState.type}
                onSuccess={handleCreateSuccess}
                doughRecipes={doughRecipes}
                fillingRecipes={fillingRecipes}
            />
        </Container>
    );
};

export default BreadTypeEditor; 