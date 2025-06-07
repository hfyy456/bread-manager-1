import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, IconButton, Menu, MenuItem } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { Link } from 'react-router-dom';
import { Dashboard, ListAlt, CheckCircleOutline, MoveToInbox, EditCalendar } from '@mui/icons-material';

const navLinks = [
  { title: '数据看板', path: '/dashboard', icon: <Dashboard /> },
  { title: '面包列表', path: '/breads' },
  { title: '面团配方', path: '/dough-recipes' },
  { title: '馅料配方', path: '/filling-recipes' },
  { title: '库存总览', path: '/ingredients', icon: <ListAlt /> },
  { title: '物料列表管理', path: '/manage-ingredients' },
  { title: '原料计算器', path: '/raw-material-calculator' },
  { title: '库存盘点', path: '/inventory-check', icon: <CheckCircleOutline /> },
  { title: '生产报损登记', path: '/production-waste-report' },
  { title: '日报预览', path: '/daily-report-preview' },
  { title: '操作指南', path: '/operation-guide' },
  { title: '收货入库', path: '/receiving', icon: <MoveToInbox /> },
];

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
    <AppBar position="static" color="primary">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component={Link}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            物料消耗局
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              size="large"
              aria-label="navigation menu"
              aria-controls="menu-appbar-mobile"
              aria-haspopup="true"
              onClick={handleOpenNavMenu}
              color="inherit"
            >
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar-mobile"
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
              {navLinks.map((link) => (
                <MenuItem key={link.title} onClick={handleCloseNavMenu} component={Link} to={link.path}>
                  <Typography textAlign="center" sx={{ fontFamily: 'Inter, sans-serif' }}>{link.title}</Typography>
                </MenuItem>
              ))}
            </Menu>
          </Box>
          
          <Typography
            variant="h5"
            noWrap
            component={Link}
            to="/"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 700,
              color: 'inherit',
              textDecoration: 'none',
              justifyContent: 'center',
            }}
          >
            物料消耗局
          </Typography>
          
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}
            >
            {navLinks.map((link) => (
            <Button
                key={link.title}
              component={Link}
                to={link.path}
                onClick={handleCloseNavMenu}
                sx={{ my: 2, color: 'white', display: 'block', fontFamily: 'Inter, sans-serif', ml: 2 }}
            >
                {link.title}
            </Button>
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
  