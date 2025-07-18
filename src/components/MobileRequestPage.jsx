import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Box, Paper, BottomNavigation, BottomNavigationAction,
    Typography, List, ListItem, ListItemText, CircularProgress, Alert,
    Button, TextField, Chip, Grid, Card, CardContent, CardActions, IconButton,
} from '@mui/material';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { Badge } from '@mui/material';
import { POSTNAME } from '../config/constants';

const ShopView = ({ 
    onAddToCart, 
    onUpdateCart, 
    cartItems, 
    ingredients,
    loading,
    error,
}) => {
    const [filteredIngredients, setFilteredIngredients] = useState([]);
    const [activeFilter, setActiveFilter] = useState('all');

    useEffect(() => {
        setFilteredIngredients(ingredients);
        setActiveFilter('all');
    }, [ingredients]);

    useEffect(() => {
        if (activeFilter === 'all') {
            setFilteredIngredients(ingredients);
        } else {
            const filtered = ingredients.filter(item => 
                item.ingredient.post?.includes(Number(activeFilter))
            );
            setFilteredIngredients(filtered);
        }
    }, [activeFilter, ingredients]);
    
    const handleIncrement = (item) => {
        const existingCartItem = cartItems.find(cartItem => cartItem.ingredientId === item.ingredient._id);
        const currentQuantityInCart = existingCartItem ? existingCartItem.quantity : 0;

        if (currentQuantityInCart + 1 > item.virtualStock) {
            alert('申请数量超过可用库存');
            return;
        }

        onAddToCart({
            ingredientId: item.ingredient._id,
            name: item.ingredient.name,
            quantity: 1,
            unit: item.ingredient.unit,
        });
    };

    const handleDecrement = (item) => {
        const existingCartItem = cartItems.find(cartItem => cartItem.ingredientId === item.ingredient._id);
        if (!existingCartItem) return;

        const updatedCart = cartItems.map(cartItem => 
            cartItem.ingredientId === item.ingredient._id
                ? { ...cartItem, quantity: cartItem.quantity - 1 }
                : cartItem
        ).filter(cartItem => cartItem.quantity > 0);
        onUpdateCart(updatedCart);
    };

    return (
        <Box>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', my: 2 }}>
                申领中心
            </Typography>
            <Paper sx={{ p: 1.5, mb: 2, position: 'sticky', top: 0, zIndex: 1, backgroundColor: 'background.paper' }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>按岗位筛选</Typography>
                <Box sx={{ position: 'relative' }}>
                    <Box sx={{
                        overflowX: 'auto',
                        scrollbarWidth: 'none', // for Firefox
                        '&::-webkit-scrollbar': { display: 'none' }, // for Chrome, Safari
                    }}>
                        <Box sx={{ display: 'flex', gap: 1, py: 0.5, pr: '30px' }}>
                            <Button size="small" variant={activeFilter === 'all' ? 'contained' : 'outlined'} onClick={() => setActiveFilter('all')}>全部</Button>
                            {Object.entries(POSTNAME).map(([id, name]) => (
                                <Button key={id} size="small" variant={activeFilter === id ? 'contained' : 'outlined'} onClick={() => setActiveFilter(id)} sx={{ flexShrink: 0 }}>{name}</Button>
                            ))}
                        </Box>
                    </Box>
                    <Box sx={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '30px',
                        height: '100%',
                        background: theme => `linear-gradient(to left, ${theme.palette.background.paper}, transparent)`,
                        pointerEvents: 'none',
                    }} />
                </Box>
            </Paper>

            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}

            {!loading && !error && (
                 filteredIngredients.length > 0 ? (
                    <Grid container spacing={2}>
                        {filteredIngredients.map(item => {
                            const id = item.ingredient._id;
                            const itemInCart = cartItems.find(cartItem => cartItem.ingredientId === id);

                            return (
                                <Grid item xs={12} key={id}>
                                    <Card sx={{ display: 'flex', flexDirection: 'column', boxShadow: 3, borderRadius: 2 }}>
                                        <CardContent sx={{ flexGrow: 1, p: 1.5 }}>
                                            <Typography gutterBottom variant="h6" component="h2" sx={{ fontSize: '1rem', fontWeight: 'bold' }}>
                                                {item.ingredient.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                规格: {item.ingredient.specs || '无'}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                可用库存: {item.virtualStock} {item.ingredient.unit}
                                            </Typography>
                                        </CardContent>
                                        <CardActions sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', p: 1.5, pt: 0 }}>
                                            {!itemInCart ? (
                                                <Button 
                                                    variant="contained" 
                                                    size="medium"
                                                    onClick={() => handleIncrement(item)}
                                                >
                                                    加入购物车
                                                </Button>
                                            ) : (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    <IconButton color="primary" onClick={() => handleDecrement(item)} size="small">
                                                        <RemoveCircleOutlineIcon />
                                                    </IconButton>
                                                    <Typography variant="h6" component="span">{itemInCart.quantity}</Typography>
                                                    <IconButton 
                                                        color="primary" 
                                                        onClick={() => handleIncrement(item)} 
                                                        size="small" 
                                                        disabled={itemInCart.quantity >= item.virtualStock}
                                                    >
                                                        <AddCircleOutlineIcon />
                                                    </IconButton>
                                                </Box>
                                            )}
                                        </CardActions>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                 ) : (
                    <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', mt: 4 }}>
                        <SearchOffIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                        <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
                            {activeFilter === 'all' 
                                ? '暂无可用物料' 
                                : '当前筛选下没有物料'}
                        </Typography>
                        {activeFilter !== 'all' && (
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                                尝试选择其他岗位或“全部”。
                            </Typography>
                        )}
                    </Paper>
                 )
            )}
        </Box>
    );
};

const CartView = ({ cartItems, onUpdateCart, storeId, refetchData }) => {
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
            // Re-fetch latest stock and requests to validate cart before submission
            const [stockResponse, requestsResponse] = await Promise.all([
                fetch('/api/warehouse/stock', { headers: { 'x-current-store-id': storeId } }),
                fetch('/api/transfer-requests', { headers: { 'x-current-store-id': storeId } })
            ]);

            if (!stockResponse.ok) throw new Error('无法获取最新库存信息进行校验');
            if (!requestsResponse.ok) throw new Error('无法获取最新申请信息进行校验');

            const stockData = await stockResponse.json();
            const requestsData = await requestsResponse.json();

            // Calculate virtual stock just for validation
            const pendingQuantities = {};
            requestsData
                .filter(req => req.status === 'pending' || req.status === 'approved')
                .forEach(req => {
                    req.items.forEach(item => {
                        pendingQuantities[item.ingredientId] = (pendingQuantities[item.ingredientId] || 0) + item.quantity;
                    });
                });
            
            const latestVirtualStockMap = new Map();
            (stockData.items || []).forEach(item => {
                if (item.mainWarehouseStock) {
                    const pendingQty = pendingQuantities[item.ingredient._id] || 0;
                    const virtualStock = item.mainWarehouseStock.quantity - pendingQty;
                    latestVirtualStockMap.set(item.ingredient._id, virtualStock > 0 ? virtualStock : 0);
                }
            });

            // Validate cart items
            const invalidItems = cartItems.filter(cartItem => {
                const availableStock = latestVirtualStockMap.get(cartItem.ingredientId);
                return cartItem.quantity > (availableStock === undefined ? 0 : availableStock);
            });

            if (invalidItems.length > 0) {
                const itemNames = invalidItems.map(item => item.name).join(', ');
                throw new Error(`库存不足或物料已下架: ${itemNames}。请返回修改数量或移除物料。`);
            }
            
            // If validation passes, proceed to submit
            const itemsToSubmit = cartItems.map(item => ({
                ingredientId: item.ingredientId,
                name: item.name,
                unit: item.unit,
                quantity: item.quantity,
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
            if (refetchData) refetchData();

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
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', mx: 2 }}>
                                <TextField
                                    type="number"
                                    size="small"
                                    variant="outlined"
                                    value={item.quantity}
                                    onChange={(e) => handleQuantityChange(index, e.target.value)}
                                    sx={{ width: '70px' }}
                                    inputProps={{ min: 1 }}
                                />
                                <Typography variant="body1" component="span" sx={{ ml: 1.5, minWidth: '30px', textAlign: 'left' }}>
                                    {item.unit}
                                </Typography>
                            </Box>
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

const HistoryView = ({ requests, loading, error }) => {
    const getStatusChipColor = (status) => {
        switch (status) {
            case 'completed': return 'success';
            case 'approved': return 'info';
            case 'rejected': return 'error';
            case 'pending':
            default: return 'warning';
        }
    };

    const STATUS_MAP = {
        pending: '待处理',
        approved: '已批准',
        rejected: '已拒绝',
        completed: '已完成',
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
                                           申请单 #{req._id.slice(-6)}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                            {new Date(req.createdAt).toLocaleString('zh-CN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
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
                                                primaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
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
    );
};

const MobileRequestPage = () => {
    const [storeId, setStoreId] = useState('');
    const [view, setView] = useState('shop');
    const [cart, setCart] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [ingredientsWithVirtualStock, setIngredientsWithVirtualStock] = useState([]);
    const [historyRequests, setHistoryRequests] = useState([]);

    const fetchData = useCallback(async () => {
        if (!storeId) return;
        setLoading(true);
        setError('');
        try {
            const [stockResponse, requestsResponse] = await Promise.all([
                fetch('/api/warehouse/stock', { headers: { 'x-current-store-id': storeId } }),
                fetch('/api/transfer-requests', { headers: { 'x-current-store-id': storeId } })
            ]);

            if (!stockResponse.ok) throw new Error('获取物料列表失败');
            if (!requestsResponse.ok) throw new Error('获取申请记录失败');

            const stockData = await stockResponse.json();
            const requestsData = await requestsResponse.json();
            
            setHistoryRequests(requestsData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

            const pendingQuantities = {};
            requestsData
                .filter(req => req.status === 'pending' || req.status === 'approved')
                .forEach(req => {
                    req.items.forEach(item => {
                        pendingQuantities[item.ingredientId] = (pendingQuantities[item.ingredientId] || 0) + item.quantity;
                    });
                });

            const calculatedIngredients = (stockData.items || [])
                .filter(item => item.mainWarehouseStock && item.mainWarehouseStock.quantity > 0)
                .map(item => {
                    const pendingQty = pendingQuantities[item.ingredient._id] || 0;
                    const virtualStock = item.mainWarehouseStock.quantity - pendingQty;
                    return {
                        ...item,
                        virtualStock: virtualStock > 0 ? virtualStock : 0,
                    };
                });
            
            setIngredientsWithVirtualStock(calculatedIngredients);

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [storeId]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const storeIdFromUrl = params.get('store');
        if (storeIdFromUrl) {
            setStoreId(storeIdFromUrl);
        } else {
            setError('URL中未指定门店ID，请通过有效的二维码或链接访问。');
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
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
        if (loading) {
            return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
        }
        switch (view) {
            case 'cart':
                return <CartView cartItems={cart} onUpdateCart={handleUpdateCart} storeId={storeId} refetchData={fetchData} />;
            case 'history':
                return <HistoryView requests={historyRequests} loading={loading} error={error} />;
            case 'shop':
            default:
                return <ShopView 
                    onAddToCart={handleAddToCart} 
                    onUpdateCart={handleUpdateCart} 
                    cartItems={cart} 
                    ingredients={ingredientsWithVirtualStock}
                    loading={loading}
                    error={error}
                    refetchData={fetchData}
                />;
        }
    };
    
    if (error && !loading) {
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