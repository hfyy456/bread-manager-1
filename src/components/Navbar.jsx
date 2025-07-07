import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box, IconButton, Menu, MenuItem, Collapse } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useTheme } from '@mui/material/styles';
import { useMediaQuery } from '@mui/material';
import { Link } from 'react-router-dom';
import { Dashboard } from '@mui/icons-material';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

const navConfig = [
  { title: '数据看板', path: '/dashboard', icon: <Dashboard /> },
  {
    title: '配方管理',
    children: [
      { title: '面包配方编辑器', path: '/bread-type-editor' },
  { title: '面包列表', path: '/breads' },
  { title: '面团配方', path: '/dough-recipes' },
  { title: '馅料配方', path: '/filling-recipes' },
    ]
  },
  {
    title: '库存作业',
    children: [
      { title: '库存总览', path: '/ingredients' },
      { title: '库存盘点', path: '/inventory-check' },
      { title: '收货入库', path: '/receiving' },
      { title: '生产报损登记', path: '/production-waste-report' },
    ]
  },
  {
    title: '数据中心',
    children: [
  { title: '原料计算器', path: '/raw-material-calculator' },
  { title: '日报预览', path: '/daily-report-preview' },
      { title: '物料列表管理', path: '/manage-ingredients' },
    ]
  },
  { title: '操作指南', path: '/operation-guide' },
];

const MobileNavItem = ({ item, handleClose }) => {
  const [open, setOpen] = useState(false);

  const handleClick = () => {
    if (item.children) {
      setOpen(!open);
    } else {
      handleClose();
    }
  };

  if (!item.children) {
    return (
      <MenuItem onClick={handleClose} component={Link} to={item.path}>
        {item.title}
      </MenuItem>
    );
  }

  return (
    <>
      <MenuItem onClick={handleClick}>
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <Box sx={{ flexGrow: 1 }}>{item.title}</Box>
          <ArrowDropDownIcon sx={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
        </Box>
      </MenuItem>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Box sx={{ pl: 2 }}>
          {item.children.map((child) => (
            <MenuItem key={child.title} onClick={handleClose} component={Link} to={child.path} sx={{ pl: 4 }}>
              {child.title}
            </MenuItem>
          ))}
        </Box>
      </Collapse>
    </>
  );
};

const NavMenu = ({ item }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  return (
    <Box>
      <Button
        aria-controls={open ? `menu-${item.title}` : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleOpenMenu}
        sx={{ my: 1, color: 'white', display: 'block', fontFamily: 'Inter, sans-serif' }}
        endIcon={<ArrowDropDownIcon />}
      >
        {item.title}
      </Button>
      <Menu
        id={`menu-${item.title}`}
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        MenuListProps={{
          'aria-labelledby': 'basic-button',
        }}
      >
        {item.children.map((child) => (
          <MenuItem key={child.title} onClick={handleCloseMenu} component={Link} to={child.path}>
            {child.title}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

const Navbar = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorElNav, setAnchorElNav] = useState(null);

  const handleOpenNavMenu = (event) => setAnchorElNav(event.currentTarget);
  const handleCloseNavMenu = () => setAnchorElNav(null);

  return (
    <AppBar position="static" color="primary">
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: { xs: 56, sm: 60 } }}>
          {/* Desktop Logo */}
          <Typography variant="h6" noWrap component={Link} to="/" sx={{ mr: 2, display: { xs: 'none', md: 'flex' }, fontFamily: 'Inter, sans-serif', fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
            物料消耗局
          </Typography>

          {/* Mobile Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <IconButton size="large" onClick={handleOpenNavMenu} color="inherit">
              <MenuIcon />
            </IconButton>
            <Menu
              id="menu-appbar-mobile"
              anchorEl={anchorElNav}
              open={Boolean(anchorElNav)}
              onClose={handleCloseNavMenu}
              sx={{ display: { xs: 'block', md: 'none' } }}
              MenuListProps={{ style: { width: '250px' } }}
            >
              {navConfig.map((item) => (
                <MobileNavItem key={item.title} item={item} handleClose={handleCloseNavMenu} />
              ))}
            </Menu>
          </Box>
          
          {/* Mobile Logo */}
          <Typography variant="h5" noWrap component={Link} to="/" sx={{ mr: 2, display: { xs: 'flex', md: 'none' }, flexGrow: 1, fontFamily: 'Inter, sans-serif', fontWeight: 700, color: 'inherit', textDecoration: 'none' }}>
            物料消耗局
          </Typography>
          
          {/* Desktop Menu */}
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' }, justifyContent: 'flex-end' }}>
            {navConfig.map((item) => (
              item.children ? (
                <NavMenu key={item.title} item={item} />
              ) : (
                <Button key={item.title} component={Link} to={item.path} sx={{ my: 1, color: 'white', display: 'block', fontFamily: 'Inter, sans-serif' }}>
                  {item.title}
            </Button>
              )
            ))}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
  