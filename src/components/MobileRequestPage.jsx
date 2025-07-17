import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Box, Paper, BottomNavigation, BottomNavigationAction,
    Typography, List, ListItem, ListItemText, CircularProgress, Alert,
    Button, TextField, Chip, Grid, Card, CardContent, CardActions,
} from '@mui/material';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import { Badge } from '@mui/material';
import { POSTNAME } from '../config/constants';

const ShopView = ({ onAddToCart, storeId }) => {
    const [allIngredients, setAllIngredients] = useState([]);
    const [filteredIngredients, setFilteredIngredients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quantities, setQuantities] = useState({});
    const [activeFilter, setActiveFilter] = useState('all');

    const fetchStock = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/warehouse/stock', {
                headers: { 'x-current-store-id': storeId },
            });
            if (!response.ok) throw new Error('获取物料列表失败');
            const data = await response.json();
            const itemsWithStock = data.items?.filter(item => item.mainWarehouseStock && item.mainWarehouseStock.quantity > 0) || [];
            setAllIngredients(itemsWithStock);
            setFilteredIngredients(itemsWithStock);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        fetchStock();
    }, [fetchStock]);

    useEffect(() => {
        if (activeFilter === 'all') {
            setFilteredIngredients(allIngredients);
        } else {
            const filtered = allIngredients.filter(item => 
                item.ingredient.post?.includes(Number(activeFilter))
            );
            setFilteredIngredients(filtered);
        }
    }, [activeFilter, allIngredients]);
    
    const handleQuantityChange = (id, value) => {
        setQuantities(prev => ({ ...prev, [id]: value }));
    };

    const handleAddToCartClick = (item) => {
        const quantity = quantities[item.ingredient._id];
        const positionInfo = item.ingredient.post?.map(pId => POSTNAME[pId]).join(', ') || '未指定';

        if (!quantity || quantity <= 0) {
            alert('请输入有效的申请数量');
            return;
        }
        if (quantity > item.mainWarehouseStock.quantity) {
            alert('申请数量超过库存');
            return;
        }

        onAddToCart({
            ingredientId: item.ingredient._id,
            name: item.ingredient.name,
            quantity: Number(quantity),
            unit: item.ingredient.unit,
            position: positionInfo, 
        });
        
        setQuantities(prev => ({ ...prev, [item.ingredient._id]: '' }));
    };

    return (
        <Box>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', my: 2 }}>
                申领中心
            </Typography>
            <Paper sx={{ p: 1, mb: 2, position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                <Typography variant="caption" display="block" sx={{mb: 1}}>按岗位筛选:</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" variant={activeFilter === 'all' ? 'contained' : 'outlined'} onClick={() => setActiveFilter('all')}>全部</Button>
                    {Object.entries(POSTNAME).map(([id, name]) => (
                        <Button key={id} size="small" variant={activeFilter === id ? 'contained' : 'outlined'} onClick={() => setActiveFilter(id)}>{name}</Button>
                    ))}
                </Box>
            </Paper>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && (
                 <Grid container spacing={2}>
                    {filteredIngredients.map(item => {
                        const id = item.ingredient._id;
                        const postInfo = item.ingredient.post?.map(pId => POSTNAME[pId]).join(', ') || '未分配';

                        return (
                            <Grid item xs={6} key={id}>
                                <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3, borderRadius: 2 }}>
                                    <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                                        <Typography gutterBottom variant="h6" component="h2" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                            {item.ingredient.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            库存: {item.mainWarehouseStock.quantity} {item.ingredient.unit}
                                        </Typography>
                                        <Chip label={postInfo} size="small" sx={{ mt: 1 }} />
                                    </CardContent>
                                    <CardActions sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', p: 1.5, pt: 0 }}>
                                        <TextField
                                            type="number"
                                            size="small"
                                            variant="outlined"
                                            placeholder="数量"
                                            value={quantities[id] || ''}
                                            onChange={(e) => handleQuantityChange(id, e.target.value)}
                                            inputProps={{ min: 1, max: item.mainWarehouseStock.quantity, style: { textAlign: 'center' } }}
                                            sx={{ mb: 1 }}
                                        />
                                        <Button 
                                            variant="contained" 
                                            size="medium"
                                            onClick={() => handleAddToCartClick(item)}
                                        >
                                            加入购物车
                                        </Button>
                                    </CardActions>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}
        </Box>
    );
};

const CartView = ({ cartItems, onUpdateCart, storeId }) => {
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const handleQuantityChange = (index, newQuantity) => {
        const updatedCart = [...cartItems];
        updatedCart[index].quantity = Number(newQuantity);
        onUpdateCart(updatedCart.filter(item => item.quantity > 0));
    };

    const handleRemoveItem = (index) => {
        const updatedCart = [...cartItems];
        updatedCart.splice(index, 1);
        onUpdateCart(updatedCart);
    };

    const handleSubmit = async () => {
        if (cartItems.length === 0) {
            setError('购物车是空的！');
            return;
        }

        setSubmitting(true);
        setError('');
        setSuccessMessage('');

        try {
            const itemsToSubmit = cartItems.map(item => ({
                ingredient: item.ingredientId,
                quantity: item.quantity,
                position: item.position,
            }));

            const response = await fetch('/api/transfer-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-current-store-id': storeId,
                },
                body: JSON.stringify({ items: itemsToSubmit }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || '提交申请失败');
            }
            
            setSuccessMessage('您的调拨申请已成功提交！');
            onUpdateCart([]);

        } catch (err) {
            setError(err.message);
        } finally {
            setSubmitting(false);
            setTimeout(() => {
                setSuccessMessage('');
                setError('');
            }, 5000);
        }
    };

    return (
        <Box>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', my: 2 }}>
                我的购物车
            </Typography>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}
            
            {cartItems.length === 0 && !successMessage ? (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', mt: 4 }}>
                     <ShoppingCartIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                     <Typography variant="h6" color="text.secondary" sx={{mt: 1}}>购物车是空的</Typography>
                </Paper>
            ) : (
                <List>
                    {cartItems.map((item, index) => (
                        <ListItem 
                            key={`${item.ingredientId}-${index}`} 
                            divider
                            secondaryAction={
                                 <Button edge="end" color="error" size="small" onClick={() => handleRemoveItem(index)}>删除</Button>
                            }
                        >
                            <ListItemText 
                                primary={<Typography variant="body1" sx={{ fontWeight: 500 }}>{item.name}</Typography>}
                                secondary={`岗位: ${item.position}`} 
                            />
                            <TextField
                                type="number"
                                size="small"
                                variant="outlined"
                                value={item.quantity}
                                onChange={(e) => handleQuantityChange(index, e.target.value)}
                                sx={{ width: '80px', mx: 2 }}
                                inputProps={{ min: 1 }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}

            {cartItems.length > 0 && (
                 <Paper elevation={3} sx={{ p: 2, mt: 2, position: 'sticky', bottom: 60, zIndex: 1, backgroundColor: 'rgba(255, 255, 255, 0.95)' }}>
                     <Typography variant="h6" sx={{ mb: 2 }}>
                        总计: {cartItems.reduce((acc, item) => acc + item.quantity, 0)} 件
                     </Typography>
                     <Button 
                        fullWidth 
                        variant="contained" 
                        color="primary" 
                        size="large"
                        onClick={handleSubmit}
                        disabled={submitting}
                    >
                        {submitting ? <CircularProgress size={24} color="inherit" /> : '提交申请'}
                    </Button>
                </Paper>
            )}
        </Box>
    );
};

const HistoryView = ({ storeId }) => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchHistory = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/transfer-requests', {
                headers: { 'x-current-store-id': storeId },
            });
            if (!response.ok) throw new Error('获取申请记录失败');
            const data = await response.json();
            setRequests(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const getStatusChipColor = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'approved': return 'info';
            case 'rejected': return 'error';
            case 'pending':
            default: return 'warning';
        }
    };
    
    return (
        <Box>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', my: 2 }}>
                我的申请记录
            </Typography>
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && (
                requests.length === 0 ? (
                     <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', mt: 4 }}>
                         <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                         <Typography variant="h6" color="text.secondary" sx={{mt: 1}}>暂无历史申请记录</Typography>
                    </Paper>
                ) : (
                    requests.map(req => (
                        <Card key={req._id} sx={{ mb: 2, boxShadow: 3, borderRadius: 2 }} variant="outlined">
                             <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                       #{req._id.slice(-6)}
                                    </Typography>
                                    <Chip label={req.status} color={getStatusChipColor(req.status)} size="small" />
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                                    {new Date(req.createdAt).toLocaleString()}
                                </Typography>
                                <List dense sx={{ mt: 1, p: 0 }}>
                                    {req.items.map((item, index) => (
                                        <ListItem key={index} sx={{ py: 0.5, px: 0 }}>
                                            <ListItemText 
                                                primaryTypographyProps={{ variant: 'body1', fontWeight: 500 }}
                                                secondaryTypographyProps={{ variant: 'body2' }}
                                                primary={`${item.name} x ${item.quantity} ${item.unit || ''}`}
                                                secondary={`岗位: ${item.position}`}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                                {req.notes && <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary', p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>备注: {req.notes}</Typography>}
                            </CardContent>
                        </Card>
                    ))
                )
            )}
        </Box>
    );
};

const MobileRequestPage = () => {
    const [storeId, setStoreId] = useState('');
    const [view, setView] = useState('shop');
    const [cart, setCart] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const storeIdFromUrl = params.get('store');
        if (storeIdFromUrl) {
            setStoreId(storeIdFromUrl);
        } else {
            setError('URL中未指定门店ID，请通过有效的二维码或链接访问。');
        }
    }, []);
    
    const handleAddToCart = (item) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(i => i.ingredientId === item.ingredientId);
            if (existingItem) {
                return prevCart.map(i => 
                    i.ingredientId === item.ingredientId
                    ? { ...i, quantity: i.quantity + item.quantity } 
                    : i
                );
            }
            return [...prevCart, item];
        });
    };

    const handleUpdateCart = (updatedCart) => {
        setCart(updatedCart);
    };

    const renderView = () => {
        switch (view) {
            case 'cart':
                return <CartView cartItems={cart} onUpdateCart={handleUpdateCart} storeId={storeId} />;
            case 'history':
                return <HistoryView storeId={storeId} />;
            case 'shop':
            default:
                return <ShopView onAddToCart={handleAddToCart} storeId={storeId} />;
        }
    };
    
    if (error) {
        return <Container sx={{ mt: 2 }}><Alert severity="error">{error}</Alert></Container>;
    }

    return (
        <Box sx={{ pb: 7 }}>
            <Container>
                {renderView()}
            </Container>
            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
                <BottomNavigation
                    showLabels
                    value={view}
                    onChange={(event, newValue) => {
                        setView(newValue);
                    }}
                >
                    <BottomNavigationAction label="申领中心" value="shop" icon={<ShoppingBasketIcon />} />
                    <BottomNavigationAction 
                        label="购物车" 
                        value="cart" 
                        icon={
                            <Badge badgeContent={cart.length} color="primary">
                                <ShoppingCartIcon />
                            </Badge>
                        } 
                    />
                    <BottomNavigationAction label="我的申请" value="history" icon={<HistoryIcon />} />
                </BottomNavigation>
            </Paper>
        </Box>
    );
};

export default MobileRequestPage; 