import React, { useState, useContext } from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, useTheme, useMediaQuery } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import MenuIcon from '@mui/icons-material/Menu';
import { useStore } from './StoreContext';
import StoreSelector from './common/StoreSelector';

const Navbar = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [anchorElNav, setAnchorElNav] = useState(null);

    const handleOpenNavMenu = (event) => {
        setAnchorElNav(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
        setAnchorElNav(null);
    };

    return (
        <AppBar position="static">
            <Toolbar>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    面包坊管理系统
                </Typography>
                <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center' }}>
                    <Button color="inherit" component={RouterLink} to="/ingredients">物料列表</Button>
                    <Button color="inherit" component={RouterLink} to="/warehouse">主仓库</Button>
                    <Button color="inherit" component={RouterLink} to="/receiving">收货管理</Button>
                    <Button color="inherit" component={RouterLink} to="/inventory-check">库存盘点</Button>
                    <Button color="inherit" component={RouterLink} to="/production-waste-report">报废管理</Button>
                    <Button color="inherit" component={RouterLink} to="/daily-report-preview">生产看板</Button>
                    <Button color="inherit" component={RouterLink} to="/dashboard">数据看板</Button>
                    <StoreSelector />
                </Box>
                <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
                    <IconButton
                        size="large"
                        aria-label="account of current user"
                        aria-controls="menu-appbar"
                        aria-haspopup="true"
                        onClick={handleOpenNavMenu}
                        color="inherit"
                    >
                        <MenuIcon />
                    </IconButton>
                    <Menu
                        id="menu-appbar"
                        anchorEl={anchorElNav}
                        anchorOrigin={{
                            vertical: 'bottom',
                            horizontal: 'left',
                        }}
                        keepMounted
                        transformOrigin={{
                            vertical: 'top',
                            horizontal: 'left',
                        }}
                        open={Boolean(anchorElNav)}
                        onClose={handleCloseNavMenu}
                        sx={{
                            display: { xs: 'block', md: 'none' },
                        }}
                    >
                        <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/ingredients">物料列表</MenuItem>
                        <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/warehouse">主仓库</MenuItem>
                        <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/receiving">收货管理</MenuItem>
                        <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/inventory-check">库存盘点</MenuItem>
                        <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/production-waste-report">报废管理</MenuItem>
                        <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/daily-report-preview">生产看板</MenuItem>
                        <MenuItem onClick={handleCloseNavMenu} component={RouterLink} to="/dashboard">数据看板</MenuItem>
                    </Menu>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default Navbar;
  