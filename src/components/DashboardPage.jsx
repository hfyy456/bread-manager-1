import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Paper, Grid, Box, Tabs, Tab, AppBar, Tooltip, IconButton,
    TextField, CircularProgress, Alert as MuiAlert
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import moment from 'moment';

const TabPanel = (props) => {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`dashboard-tabpanel-${index}`}
            aria-labelledby={`dashboard-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

function a11yProps(index) {
    return {
        id: `dashboard-tab-${index}`,
        'aria-controls': `dashboard-tabpanel-${index}`,
    };
}

const DashboardPage = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [dashboardData, setDashboardData] = useState(null);
    const [inventoryValue, setInventoryValue] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [loadingInventory, setLoadingInventory] = useState(false);
    const [error, setError] = useState(null);

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleDateChange = (event) => {
        setSelectedDate(event.target.value);
    };

    const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!selectedDate) return;
            setLoadingSummary(true);
            setError(null);
            let period = 'daily';
            if (currentTab === 1) period = 'weekly';
            if (currentTab === 2) period = 'monthly';

            try {
                const response = await fetch(`/api/dashboard/summary?periodType=${period}&date=${selectedDate}`);
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || `获取${period}看板数据失败`);
                }
                setDashboardData(result.data);
            } catch (err) {
                console.error('Fetch dashboard data error:', err);
                setError(err.message);
                setDashboardData(null);
            } finally {
                setLoadingSummary(false);
            }
        };
        fetchDashboardData();
    }, [selectedDate, currentTab]);

    useEffect(() => {
        const fetchInventoryValue = async () => {
            setLoadingInventory(true);
            try {
                const response = await fetch('/api/ingredients/current-total-value');
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || '获取总库存价值失败');
                }
                setInventoryValue(result.totalValue);
            } catch (err) {
                console.error('Fetch inventory value error:', err);
                setError(prevError => prevError ? `${prevError}\\n${err.message}` : err.message);
                setInventoryValue(null);
            } finally {
                setLoadingInventory(false);
            }
        };
        fetchInventoryValue();
    }, []);

    const renderMaterialConsumption = (consumptionData, title) => {
        if (!consumptionData || Object.keys(consumptionData).length === 0) {
            return (
                <Typography sx={{ textAlign: 'center', py: 2 }} color="text.secondary">
                    暂无原料消耗数据或数据正在加载中。
                </Typography>
            );
        }
        return (
            <Paper elevation={2} sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>{title}</Typography>
                <Grid container spacing={1.5}>
                    {Object.entries(consumptionData)
                        .sort(([, a], [, b]) => {
                            // Sort by consumption percentage, descending
                            const percentageA = a.currentStock > 0 ? (a.quantity / a.currentStock) : (a.quantity > 0 ? Infinity : 0);
                            const percentageB = b.currentStock > 0 ? (b.quantity / b.currentStock) : (b.quantity > 0 ? Infinity : 0);
                            return percentageB - percentageA;
                        })
                        .map(([name, data]) => {
                            const consumed = data.quantity || 0;
                            const stock = data.currentStock || 0;
                            const unit = data.unit || '单位未知';
                            
                            let progress = 0;
                            if (stock > 0) {
                                progress = Math.min((consumed / stock) * 100, 100);
                            } else if (consumed > 0) {
                                progress = 100; // Consumed something with zero stock
                            }
                            
                            const isOverBudget = consumed > stock;
                            const progressBarColor = isOverBudget ? 'error.light' : 'primary.light';

                            return (
                                <Grid item xs={12} sm={6} md={4} lg={3} key={name}>
                                    <Tooltip title={`${name}: 已消耗 ${consumed.toFixed(2)} / 库存 ${stock.toFixed(2)} ${unit}`} placement="top">
                                        <Paper variant="outlined" sx={{ p: 1.5, position: 'relative', overflow: 'hidden' }}>
                                            <Box
                                                sx={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    height: '100%',
                                                    width: `${progress}%`,
                                                    backgroundColor: progressBarColor,
                                                    transition: 'width 0.5s ease-in-out',
                                                    zIndex: 1,
                                                }}
                                            />
                                            <Box sx={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" component="span" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexGrow: 1, pr: 1 }}>
                                                    {name}
                                                </Typography>
                                                <Typography variant="body2" component="span" noWrap sx={{ fontWeight: isOverBudget ? 'bold' : 'normal', color: isOverBudget ? 'error.main' : 'text.secondary' }}>
                                                    {`${consumed.toFixed(2)} / ${stock.toFixed(2)}`}
                                                </Typography>
                                            </Box>
                                        </Paper>
                                    </Tooltip>
                                </Grid>
                            );
                        })}
                </Grid>
            </Paper>
        );
    };


    return (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h4" component="h1" sx={{ fontWeight: 500, flexGrow: 1 }}>
                    数据看板
                </Typography>
                <Tooltip title="查看操作指南">
                    <IconButton component={RouterLink} to="/operation-guide#dashboard" size="small" sx={{ color: 'primary.main' }}>
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>
            </Box>

            <TextField
                id="dashboard-date-picker"
                label="选择基准日期"
                type="date"
                value={selectedDate}
                onChange={handleDateChange}
                sx={{ mb: 2, maxWidth: 220 }}
                InputLabelProps={{
                    shrink: true,
                }}
            />

            {error && (
                <MuiAlert severity="error" sx={{ mb: 2 }}>
                    {error.split('\\n').map((line, index) => <div key={index}>{line}</div>)}
                </MuiAlert>
            )}

            <AppBar position="static" color="default" elevation={1} sx={{ borderTopLeftRadius: 4, borderTopRightRadius: 4}}>
                <Tabs
                    value={currentTab}
                    onChange={handleTabChange}
                    aria-label="Dashboard time period tabs"
                    indicatorColor="primary"
                    textColor="primary"
                    variant="fullWidth"
                >
                    <Tab label="按日汇总" {...a11yProps(0)} />
                    <Tab label="按周汇总" {...a11yProps(1)} />
                    <Tab label="按月汇总" {...a11yProps(2)} />
                </Tabs>
            </AppBar>

            {/* Daily Tab Content */}
            <TabPanel value={currentTab} index={0}>
                <Typography variant="h6" gutterBottom>每日数据 {dashboardData?.currentDate && `(${dashboardData.currentDate})`}</Typography>
                {loadingSummary && <Box sx={{display:'flex', justifyContent:'center', my:3}}><CircularProgress /></Box>}
                {!loadingSummary && dashboardData && (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总出品价值</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>¥{dashboardData.summary?.totalProductionValue?.toFixed(2) || 'N/A'}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总成品报废价值</Typography>
                                <Typography variant="h5" color="error" sx={{fontWeight: 'bold'}}>¥{dashboardData.summary?.totalFinishedProductWasteValue?.toFixed(2) || 'N/A'}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总库存价值(当前)</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>
                                    {loadingInventory ? <CircularProgress size={24} /> : `¥${inventoryValue?.toFixed(2) || 'N/A'}`}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">面团/馅料报废量</Typography>
                                <Typography variant="h5" color="orange" sx={{fontWeight: 'bold'}}>
                                     {`${dashboardData.summary?.totalDoughWasteQuantity || 0} ${dashboardData.summary?.doughWasteUnit || 'g'} / ${dashboardData.summary?.totalFillingWasteQuantity || 0} ${dashboardData.summary?.fillingWasteUnit || 'g'}`}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={2} sx={{ p: 2, height: 300}}>
                                <Typography variant="subtitle2" gutterBottom align="center">出品与报废趋势 (最近7天)</Typography>
                                {dashboardData.charts?.productionWasteTrend ? (
                                    <ResponsiveContainer width="100%" height="calc(100% - 24px)">
                                        <LineChart data={dashboardData.charts.productionWasteTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" tickFormatter={(tick) => moment(tick, 'YYYY-MM-DD').format('MM-DD')} />
                                            <YAxis />
                                            <RechartsTooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="productionValue" name="出品价值" stroke="#82ca9d" activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="wasteValue" name="报废价值" stroke="#ff7300" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : <Typography sx={{textAlign:'center', pt:5}}>图表数据加载中或无数据</Typography>}
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={2} sx={{ p: 2, height: 300}}>
                                <Typography variant="subtitle2" gutterBottom align="center">报废构成</Typography>
                                 {dashboardData.charts?.wasteComposition && dashboardData.charts.wasteComposition.some(item => item.value > 0) ? (
                                    <ResponsiveContainer width="100%" height="calc(100% - 24px)">
                                        <PieChart>
                                            <Pie
                                                data={dashboardData.charts.wasteComposition.filter(item => item.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                                nameKey="name"
                                            >
                                                {dashboardData.charts.wasteComposition.filter(item => item.value > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(value, name) => [parseFloat(value).toFixed(2), name]} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Typography sx={{textAlign:'center', pt:5}}>图表数据加载中或无数据 / 无报废</Typography>}
                            </Paper>
                        </Grid>
                        <Grid item xs={12}>
                           {renderMaterialConsumption(dashboardData.rawMaterialConsumption, '本日理论消耗')}
                        </Grid>
                    </Grid>
                )}
            </TabPanel>

            {/* Weekly Tab Content */}
            <TabPanel value={currentTab} index={1}>
                <Typography variant="h6" gutterBottom>每周数据 {dashboardData?.currentDateRange && `(${dashboardData.currentDateRange})`}</Typography>
                {loadingSummary && <Box sx={{display:'flex', justifyContent:'center', my:3}}><CircularProgress /></Box>}
                {!loadingSummary && dashboardData && (
                    <Grid container spacing={3}>
                        {/* Summary Cards - similar to daily */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总出品价值</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>¥{dashboardData.summary?.totalProductionValue?.toFixed(2) || 'N/A'}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总成品报废价值</Typography>
                                <Typography variant="h5" color="error" sx={{fontWeight: 'bold'}}>¥{dashboardData.summary?.totalFinishedProductWasteValue?.toFixed(2) || 'N/A'}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                             <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总库存价值(当前)</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>
                                    {loadingInventory ? <CircularProgress size={24} /> : `¥${inventoryValue?.toFixed(2) || 'N/A'}`}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">面团/馅料报废量</Typography>
                                <Typography variant="h5" color="orange" sx={{fontWeight: 'bold'}}>
                                     {`${dashboardData.summary?.totalDoughWasteQuantity || 0} ${dashboardData.summary?.doughWasteUnit || 'g'} / ${dashboardData.summary?.totalFillingWasteQuantity || 0} ${dashboardData.summary?.fillingWasteUnit || 'g'}`}
                                </Typography>
                            </Paper>
                        </Grid>
                        
                        {/* Charts - similar to daily, but using weekly data */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={2} sx={{ p: 2, height: 300}}>
                                <Typography variant="subtitle2" gutterBottom align="center">出品与报废趋势 (本周)</Typography>
                                {dashboardData.charts?.productionWasteTrend && dashboardData.charts.productionWasteTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="calc(100% - 24px)">
                                        <LineChart data={dashboardData.charts.productionWasteTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <RechartsTooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="productionValue" name="出品价值" stroke="#82ca9d" />
                                            <Line type="monotone" dataKey="wasteValue" name="报废价值" stroke="#ff7300" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                 ) : <Typography sx={{textAlign:'center', pt:5}}>图表数据加载中或无数据</Typography>}
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                             <Paper elevation={2} sx={{ p: 2, height: 300}}>
                                <Typography variant="subtitle2" gutterBottom align="center">报废构成 (本周)</Typography>
                                {dashboardData.charts?.wasteComposition && dashboardData.charts.wasteComposition.some(item=>item.value > 0) ? (
                                    <ResponsiveContainer width="100%" height="calc(100% - 24px)">
                                        <PieChart>
                                            <Pie
                                                data={dashboardData.charts.wasteComposition.filter(item => item.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {dashboardData.charts.wasteComposition.filter(item => item.value > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Typography sx={{textAlign:'center', pt:5}}>图表数据加载中或无数据</Typography>}
                            </Paper>
                        </Grid>
                         {/* Material Consumption - weekly */}
                        <Grid item xs={12}>
                           {renderMaterialConsumption(dashboardData.rawMaterialConsumption, '本周理论消耗')}
                        </Grid>
                    </Grid>
                )}
            </TabPanel>

            {/* Monthly Tab Content */}
            <TabPanel value={currentTab} index={2}>
                <Typography variant="h6" gutterBottom>每月数据 {dashboardData?.currentDateRange && `(${dashboardData.currentDateRange})`}</Typography>
                {loadingSummary && <Box sx={{display:'flex', justifyContent:'center', my:3}}><CircularProgress /></Box>}
                {!loadingSummary && dashboardData && (
                    <Grid container spacing={3}>
                        {/* Summary Cards - similar to daily/weekly */}
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总出品价值</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>¥{dashboardData.summary?.totalProductionValue?.toFixed(2) || 'N/A'}</Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总成品报废价值</Typography>
                                <Typography variant="h5" color="error" sx={{fontWeight: 'bold'}}>¥{dashboardData.summary?.totalFinishedProductWasteValue?.toFixed(2) || 'N/A'}</Typography>
                            </Paper>
                        </Grid>
                         <Grid item xs={12} sm={6} md={3}>
                             <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">总库存价值(当前)</Typography>
                                <Typography variant="h5" sx={{fontWeight: 'bold'}}>
                                    {loadingInventory ? <CircularProgress size={24} /> : `¥${inventoryValue?.toFixed(2) || 'N/A'}`}
                                </Typography>
                            </Paper>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="subtitle1" color="textSecondary">面团/馅料报废量</Typography>
                                <Typography variant="h5" color="orange" sx={{fontWeight: 'bold'}}>
                                     {`${dashboardData.summary?.totalDoughWasteQuantity || 0} ${dashboardData.summary?.doughWasteUnit || 'g'} / ${dashboardData.summary?.totalFillingWasteQuantity || 0} ${dashboardData.summary?.fillingWasteUnit || 'g'}`}
                                </Typography>
                            </Paper>
                        </Grid>

                        {/* Charts - similar to daily/weekly, but using monthly data */}
                        <Grid item xs={12} md={6}>
                            <Paper elevation={2} sx={{ p: 2, height: 300}}>
                                <Typography variant="subtitle2" gutterBottom align="center">出品与报废趋势 (本月)</Typography>
                                {dashboardData.charts?.productionWasteTrend && dashboardData.charts.productionWasteTrend.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="calc(100% - 24px)">
                                        <LineChart data={dashboardData.charts.productionWasteTrend} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <RechartsTooltip />
                                            <Legend />
                                            <Line type="monotone" dataKey="productionValue" name="出品价值" stroke="#82ca9d" />
                                            <Line type="monotone" dataKey="wasteValue" name="报废价值" stroke="#ff7300" />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : <Typography sx={{textAlign:'center', pt:5}}>图表数据加载中或无数据</Typography>}
                            </Paper>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Paper elevation={2} sx={{ p: 2, height: 300}}>
                                <Typography variant="subtitle2" gutterBottom align="center">报废构成 (本月)</Typography>
                                {dashboardData.charts?.wasteComposition && dashboardData.charts.wasteComposition.some(item=>item.value > 0) ? (
                                    <ResponsiveContainer width="100%" height="calc(100% - 24px)">
                                        <PieChart>
                                            <Pie
                                                data={dashboardData.charts.wasteComposition.filter(item => item.value > 0)}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {dashboardData.charts.wasteComposition.filter(item => item.value > 0).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : <Typography sx={{textAlign:'center', pt:5}}>图表数据加载中或无数据</Typography>}
                            </Paper>
                        </Grid>
                         {/* Material Consumption - monthly */}
                        <Grid item xs={12}>
                           {renderMaterialConsumption(dashboardData.rawMaterialConsumption, '本月理论消耗')}
                        </Grid>
                    </Grid>
                )}
            </TabPanel>

        </Container>
    );
};

export default DashboardPage;