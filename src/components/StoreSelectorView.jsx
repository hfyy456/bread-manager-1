import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Paper,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Divider
} from '@mui/material';
import StorefrontIcon from '@mui/icons-material/Storefront';

const StoreSelectorView = ({ onStoreSelect, storageKey = 'defaultStoreId' }) => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchStores = async () => {
            try {
                const response = await fetch('/api/stores');
                if (!response.ok) {
                    throw new Error('获取门店列表失败');
                }
                const result = await response.json();
                if (result.success) {
                    setStores(result.data);
                } else {
                    throw new Error(result.message || '未能加载门店数据');
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStores();
    }, []);

    const handleSelect = (storeId) => {
        localStorage.setItem(storageKey, storeId);
        onStoreSelect(storeId);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>正在加载门店列表...</Typography>
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
    }

    return (
        <Paper sx={{ m: 2, p: 2 }}>
            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 'bold', textAlign: 'center' }}>
                请选择您的门店
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 2 }}>
                您的选择将被记住，下次访问时将直接进入该门店。
            </Typography>
            <List component="nav" aria-label="门店列表">
                {stores.map((store, index) => (
                    <React.Fragment key={store._id}>
                        <ListItem disablePadding>
                            <ListItemButton onClick={() => handleSelect(store._id)}>
                                <ListItemIcon>
                                    <StorefrontIcon />
                                </ListItemIcon>
                                <ListItemText primary={store.name} />
                            </ListItemButton>
                        </ListItem>
                        {index < stores.length - 1 && <Divider />}
                    </React.Fragment>
                ))}
            </List>
        </Paper>
    );
};

export default StoreSelectorView; 