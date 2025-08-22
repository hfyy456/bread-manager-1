import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Container, Box, Paper, BottomNavigation, BottomNavigationAction,
    Typography, List, ListItem, ListItemText, CircularProgress, Alert,
    Button, TextField, Chip, Grid, Card, CardContent, CardActions, IconButton,
    Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
    Snackbar, Collapse,
} from '@mui/material';
import ShoppingBasketIcon from '@mui/icons-material/ShoppingBasket';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import HistoryIcon from '@mui/icons-material/History';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import { Badge, InputAdornment } from '@mui/material';
import { POSTNAME } from '../config/constants';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import InventoryIcon from '@mui/icons-material/Inventory';
import ArticleIcon from '@mui/icons-material/Article';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import MobileInventoryCheck from '../pages/mobile/MobileInventoryCheck';
import AllRequestsView from '../pages/mobile/components/AllRequestsView';
import StoreSelectorView from '../pages/mobile/components/StoreSelectorView'; // 导入门店选择器

// 未批准库存提示组件
const PendingRequestsAlert = ({ 
    pendingRequests, 
    onBulkApprove, 
    bulkApproving, 
    expanded, 
    onToggleExpand,
    user 
}) => {
    if (pendingRequests.length === 0) return null;

    const totalPendingItems = pendingRequests.reduce((sum, req) => sum + req.items.length, 0);
    
    return (
        <Alert 
            severity="warning" 
            sx={{ 
                mb: 2, 
                '& .MuiAlert-message': { width: '100%' }
            }}
            icon={<WarningIcon />}
            action={
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Button
                        color="inherit"
                        size="small"
                        onClick={onBulkApprove}
                        disabled={bulkApproving}
                        startIcon={bulkApproving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                    >
                        {bulkApproving ? '批准中...' : '一键批准'}
                    </Button>
                    <IconButton
                        size="small"
                        onClick={onToggleExpand}
                        color="inherit"
                    >
                        {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    </IconButton>
                </Box>
            }
        >
            <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                ⚠️ 有 {pendingRequests.length} 个申请待批准，影响 {totalPendingItems} 个物料的库存显示
            </Typography>
            
            <Collapse in={expanded}>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                        <strong>未批准申请的影响：</strong>
                        <br />• 占用虚拟库存，影响其他人申请
                        <br />• 库存显示不准确，可能导致缺货
                        <br />• 延误生产计划和配送安排
                    </Typography>
                    
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                        待批准申请详情：
                    </Typography>
                    
                    {pendingRequests.slice(0, 3).map(req => (
                        <Box key={req._id} sx={{ 
                            mb: 1, 
                            p: 1, 
                            bgcolor: 'rgba(255, 152, 0, 0.1)', 
                            borderRadius: 1,
                            fontSize: '0.875rem'
                        }}>
                            <Typography variant="caption" display="block">
                                申请单 #{req._id.slice(-6)} - {req.requestedBy || '未知用户'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {req.items.length} 个物料 | {new Date(req.createdAt).toLocaleDateString()}
                            </Typography>
                        </Box>
                    ))}
                    
                    {pendingRequests.length > 3 && (
                        <Typography variant="caption" color="text.secondary">
                            还有 {pendingRequests.length - 3} 个申请...
                        </Typography>
                    )}
                </Box>
            </Collapse>
        </Alert>
    );
};

// Custom hook to manage user authentication AND environment check
const useUser = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // For user data fetching
    const [error, setError] = useState('');
    const [isFeishuEnv, setIsFeishuEnv] = useState(false);
    const [checkingEnv, setCheckingEnv] = useState(true);

    useEffect(() => {
        const getQueryParam = (param) => new URLSearchParams(window.location.search).get(param);
        const appId = getQueryParam('appId');
        console.log("--- [Feishu Auth Hook] Initializing ---");
        console.log(`- appId from URL: ${appId}`);

        // Poll for the Feishu SDK to be ready
        let checks = 0;
        const maxChecks = 6; // 6 * 500ms = 3 seconds timeout
        const intervalId = setInterval(() => {
            console.log(`- Polling for SDK, check #${checks + 1}`);
            if (window.h5sdk && window.tt) {
                clearInterval(intervalId);
                console.log("- SDK found! Proceeding with auth.");
                setIsFeishuEnv(true);
                setCheckingEnv(false);

                // Now proceed with authentication
                const userFromStorage = localStorage.getItem('user');
                if (userFromStorage && userFromStorage !== "undefined") {
                    console.log("- Found user in localStorage. Skipping auth flow.");
                    setUser(JSON.parse(userFromStorage));
                    setLoading(false);
                    return;
                }
                console.log("- No user in localStorage.");

                if (!appId) {
                    console.error("[Feishu Auth Hook Error] appId is missing from URL.");
                    setError('URL中缺少appId参数。');
                    setLoading(false);
                    return;
                }

                window.h5sdk.ready(() => {
                    console.log("- h5sdk is ready. Calling tt.requestAccess.");
                    console.log(`- Passing appId to tt.requestAccess: ${appId}`); // Log the appId being passed
                   // window.h5sdk.biz.navigation.setTitle({ title: '大仓要货申请' });

                    const authTimeout = setTimeout(() => {
                        console.error("[Feishu Auth Hook Error] tt.requestAccess timed out after 5 seconds.");
                        setError("飞书授权请求超时，请稍后重试。");
                        setLoading(false);
                    }, 10000);

                    tt.requestAccess({
                        appID: appId,
                        scopeList: [], // Added the missing scopeList parameter
                        success: (res) => {
                            clearTimeout(authTimeout);
                            console.log("- tt.requestAccess succeeded. Code:", res.code);
                            console.log("- Sending code to backend...");
                            fetch('/api/feishu/auth', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ code: res.code, appID: appId }),
                            })
                            .then(response => {
                                if (!response.ok) {
                                    console.error("[Feishu Auth Hook Error] Backend fetch failed.", response);
                                    throw new Error('获取用户信息失败');
                                }
                                return response.json();
                            })
                            .then(userData => {
                                console.log("- Backend returned user data:", userData);
                                localStorage.setItem('user', JSON.stringify(userData));
                                setUser(userData);
                            })
                            .catch(err => {
                                console.error("[Feishu Auth Hook Error] Error in fetch chain:", err);
                                setError(err.message);
                            })
                            .finally(() => setLoading(false));
                        },
                        fail: (err) => {
                            clearTimeout(authTimeout);
                            console.error("[Feishu Auth Hook Error] tt.requestAccess failed:", err);
                            setError(`飞书授权失败: ${JSON.stringify(err)}`);
                            setLoading(false);
                        },
                    });
                });
            } else {
                checks++;
                if (checks >= maxChecks) {
                    clearInterval(intervalId);
                    console.warn('[Feishu Auth Hook] SDK polling timed out.');
                    setCheckingEnv(false);
                    setIsFeishuEnv(false);
                    setLoading(false);
                }
            }
        }, 500);

        return () => clearInterval(intervalId);
    }, []);

    return { user, loading, error, isFeishuEnv, checkingEnv };
};


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
    const [searchText, setSearchText] = useState('');

    useEffect(() => {
        setFilteredIngredients(ingredients);
        setActiveFilter('all');
    }, [ingredients]);

    useEffect(() => {
        let filtered = ingredients;
        
        // 按岗位筛选
        if (activeFilter !== 'all') {
            filtered = filtered.filter(item => 
                item.ingredient.post?.includes(Number(activeFilter))
            );
        }
        
        // 按名称搜索
        if (searchText.trim()) {
            filtered = filtered.filter(item => 
                item.ingredient.name.toLowerCase().includes(searchText.toLowerCase().trim()) ||
                (item.ingredient.specs && item.ingredient.specs.toLowerCase().includes(searchText.toLowerCase().trim()))
            );
        }
        
        setFilteredIngredients(filtered);
    }, [activeFilter, ingredients, searchText]);
    
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
                {/* 搜索框 */}
                <TextField
                    fullWidth
                    size="small"
                    placeholder="搜索原料名称或规格..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    sx={{ mb: 2 }}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="action" />
                            </InputAdornment>
                        ),
                        endAdornment: searchText && (
                            <InputAdornment position="end">
                                <IconButton
                                    size="small"
                                    onClick={() => setSearchText('')}
                                    edge="end"
                                >
                                    <ClearIcon />
                                </IconButton>
                            </InputAdornment>
                        ),
                    }}
                />
                
                {/* 岗位筛选 */}
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
                            {searchText.trim() 
                                ? '未找到匹配的物料' 
                                : activeFilter === 'all' 
                                    ? '暂无可用物料' 
                                    : '当前筛选下没有物料'}
                        </Typography>
                        {searchText.trim() ? (
                            <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>
                                尝试修改搜索关键词或清空搜索条件。
                            </Typography>
                        ) : activeFilter !== 'all' && (
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

const CartView = ({ user, cartItems, onUpdateCart, storeId, refetchData }) => {
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
                .filter(req => req.status === 'pending')
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

            const payload = {
                items: itemsToSubmit,
                requestedBy: user?.name || '未知飞书用户', // Add user name to the payload
                // 'notes' can be added here if there's a notes field in the UI
            };

            const response = await fetch('/api/transfer-requests', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-current-store-id': storeId,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.message || '提交申请失败');
            }
            
            setSuccessMessage('您的要货申请已成功提交！');
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

const HistoryView = ({ requests, loading, error, user, storeId }) => {
    const [showAllRequests, setShowAllRequests] = useState(false);
    const [allRequests, setAllRequests] = useState([]);
    const [loadingAll, setLoadingAll] = useState(false);
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

    const fetchAllRequests = async () => {
        if (!storeId) return;
        
        setLoadingAll(true);
        try {
            const response = await fetch('/api/transfer-requests', { 
                headers: { 'x-current-store-id': storeId } 
            });
            if (!response.ok) throw new Error('获取所有申请记录失败');
            const data = await response.json();
            setAllRequests(data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        } catch (err) {
            console.error('获取所有申请记录失败:', err);
        } finally {
            setLoadingAll(false);
        }
    };

    const handleToggleView = () => {
        if (!showAllRequests) {
            fetchAllRequests();
        }
        setShowAllRequests(!showAllRequests);
    };

    const displayRequests = showAllRequests ? allRequests : requests;
    const isLoading = showAllRequests ? loadingAll : loading;
    
    return (
        <Box>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center', my: 2 }}>
                {showAllRequests ? '所有申请记录' : '我的申请记录'}
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                <Button
                    variant={showAllRequests ? 'outlined' : 'contained'}
                    onClick={handleToggleView}
                    size="small"
                >
                    {showAllRequests ? '只看我的申请' : '查看所有申请'}
                </Button>
            </Box>
            
            {isLoading && <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>}
            {error && <Alert severity="error">{error}</Alert>}

            {!isLoading && !error && (
                displayRequests.length === 0 ? (
                     <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', mt: 4 }}>
                         <HistoryIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
                         <Typography variant="h6" color="text.secondary" sx={{mt: 1}}>
                             {showAllRequests ? '暂无申请记录' : '暂无我的申请记录'}
                         </Typography>
                    </Paper>
                ) : (
                    displayRequests.map(req => (
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
                                        {showAllRequests && (
                                            <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                                                申请人: {req.requestedBy || '未知'}
                                            </Typography>
                                        )}
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
    const [storeId, setStoreId] = useState(null); // 初始为null
    const [selectedView, setSelectedView] = useState('shop');
    const [cart, setCart] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);
    const [ingredientsWithVirtualStock, setIngredientsWithVirtualStock] = useState([]);
    const [historyRequests, setHistoryRequests] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [showPendingAlert, setShowPendingAlert] = useState(false);
    const [expandPendingDetails, setExpandPendingDetails] = useState(false);
    const [bulkApproving, setBulkApproving] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('info');
    const { user, loading: userLoading, error: userError, isFeishuEnv, checkingEnv } = useUser();

    useEffect(() => {
        const urlStoreId = new URLSearchParams(window.location.search).get('store');
        if (urlStoreId) {
            console.log(`[Mobile Page] Found store in URL: ${urlStoreId}. Locking it in sessionStorage.`);
            sessionStorage.setItem('lockedStoreId', urlStoreId);
            setStoreId(urlStoreId);
            return; // 优先使用URL参数
        }

        const lockedStoreId = sessionStorage.getItem('lockedStoreId');
        if (lockedStoreId) {
             console.log(`[Mobile Page] Found locked storeId in sessionStorage: ${lockedStoreId}.`);
            setStoreId(lockedStoreId);
            return; // 其次使用sessionStorage
        }

        const defaultStoreId = localStorage.getItem('defaultStoreId');
        if (defaultStoreId) {
            console.log(`[Mobile Page] Found default storeId in localStorage: ${defaultStoreId}.`);
            setStoreId(defaultStoreId);
            return; // 最后使用localStorage
        }

        console.log('[Mobile Page] No storeId found. Waiting for user selection.');
        // 如果都没有，storeId 保持为 null，等待用户选择
    }, []); // Run only on component mount

    const fetchData = useCallback(async () => {
        if (!storeId) {
            // setError('无法获取门店信息，请检查URL或重新登录。');
            return;
        }
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
            
            // 过滤出当前用户的申请记录
            const userRequests = requestsData.filter(req => 
                req.requestedBy === user?.name
            );
            
            setHistoryRequests(userRequests.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));

            // 获取待批准的申请
            const pendingRequestsData = requestsData.filter(req => req.status === 'pending');
            setPendingRequests(pendingRequestsData);
            setShowPendingAlert(pendingRequestsData.length > 0);

            const pendingQuantities = {};
            requestsData
                .filter(req => req.status === 'pending')
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
        // Only fetch main data if we are in the correct env and have a user and storeId
        if (isFeishuEnv && user && storeId) {
            fetchData();
        }
    }, [isFeishuEnv, user, storeId, fetchData]);
    
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

    const handleViewChange = (event, newValue) => {
        setSelectedView(newValue);
    };

    // 显示Snackbar消息
    const showSnackbar = (message, severity = 'info') => {
        setSnackbarMessage(message);
        setSnackbarSeverity(severity);
        setSnackbarOpen(true);
    };

    // 一键批准所有待批准申请
    const handleBulkApprove = async () => {
        if (pendingRequests.length === 0) {
            showSnackbar('没有待批准的申请', 'info');
            return;
        }

        setBulkApproving(true);
        try {
            const requestIds = pendingRequests.map(req => req._id);
            const response = await fetch('/api/transfer-requests/bulk-approve', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-current-store-id': storeId,
                },
                body: JSON.stringify({ requestIds }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '批准申请失败');
            }

            const result = await response.json();
            showSnackbar(result.message || '批准成功！', 'success');
            
            // 重新获取数据以更新界面
            fetchData();
            
        } catch (error) {
            console.error('批准申请失败:', error);
            showSnackbar(`批准失败: ${error.message}`, 'error');
        } finally {
            setBulkApproving(false);
        }
    };

    const renderView = () => {
        if (loading && selectedView !== 'all-requests') {
            return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
        }
        switch (selectedView) {
            case 'cart':
                return <CartView user={user} cartItems={cart} onUpdateCart={handleUpdateCart} storeId={storeId} refetchData={fetchData} />;
            case 'history':
                return <HistoryView requests={historyRequests} loading={loading} error={error} user={user} storeId={storeId} />;
            case 'inventory':
                return <MobileInventoryCheck />;
            case 'all-requests':
                return <AllRequestsView storeId={storeId} user={user} />;
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
    
    if (checkingEnv || userLoading) {
        return (
            <Container sx={{ mt: 4, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>
                    {checkingEnv ? '正在检查运行环境...' : '正在获取用户信息...'}
                </Typography>
            </Container>
        );
        }

    if (!isFeishuEnv) {
        return (
            <Container sx={{ mt: 4 }}>
                <Paper sx={{ p: 3, textAlign: 'center', backgroundColor: 'warning.light' }}>
                    <ReportProblemIcon sx={{ fontSize: 48, color: 'warning.main' }} />
                    <Typography variant="h5" sx={{ mt: 2, fontWeight: 'bold' }}>
                        请在飞书客户端中打开
                    </Typography>
                    <Typography sx={{ mt: 1 }}>
                        此页面需要飞书应用环境支持，请复制链接并在飞书中访问。
                    </Typography>
                </Paper>
            </Container>
        );
    }
    
    if (userError) {
         return <Container sx={{ mt: 2 }}><Alert severity="error">{userError}</Alert></Container>;
    }

    // 新增：如果storeId未确定，则显示门店选择器
    if (!storeId) {
        return <StoreSelectorView onStoreSelect={setStoreId} />;
    }

    return (
        <Box sx={{ pb: 7 }}>
            <Container>
                <Box sx={{ display: 'flex', alignItems: 'center', p: 1, mb: 1 }}>
                    <AccountCircleIcon sx={{ color: 'action.active', mr: 1 }} />
                    <Typography variant="subtitle1">
                        欢迎, {user?.name || '用户'}
                    </Typography>
                </Box>
                
                {/* 未批准库存提示 */}
                {showPendingAlert && (
                    <PendingRequestsAlert
                        pendingRequests={pendingRequests}
                        onBulkApprove={handleBulkApprove}
                        bulkApproving={bulkApproving}
                        expanded={expandPendingDetails}
                        onToggleExpand={() => setExpandPendingDetails(!expandPendingDetails)}
                        user={user}
                    />
                )}
                
                {renderView()}
            </Container>
            <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
                <BottomNavigation
                    showLabels
                    value={selectedView}
                    onChange={handleViewChange}
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
                    <BottomNavigationAction label="所有申请" value="all-requests" icon={<ArticleIcon />} />
                    <BottomNavigationAction label="库存盘点" value="inventory" icon={<InventoryIcon />} />
                </BottomNavigation>
            </Paper>
            
            {/* Snackbar for notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={6000}
                onClose={() => setSnackbarOpen(false)}
                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbarOpen(false)}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default MobileRequestPage;