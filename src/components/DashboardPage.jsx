import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
    Container, Typography, Paper, Grid, Box, Tabs, Tab, AppBar, Tooltip, IconButton,
    TextField, CircularProgress, Alert as MuiAlert, useTheme, LinearProgress
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { 
  formatDateInBJT, 
  toBJTime, 
  DATE_FORMATS,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
  subDays
} from '../utils/dateUtils';
import { DataContext } from './DataContext';
import { useStore } from './StoreContext';
import { getBreadCostBreakdown, calculateDoughCost, calculateFillingCost, generateAggregatedRawMaterials } from '../utils/calculator'; 

const MaterialConsumptionPanel = ({ consumptionData, ingredientsMap }) => {
        if (!consumptionData || Object.keys(consumptionData).length === 0) {
            return (
            <Typography sx={{ textAlign: 'center', py: 4 }} color="text.secondary">
                当前周期内无原料消耗。
                </Typography>
            );
        }

    const consumptionList = Object.entries(consumptionData).map(([name, data]) => {
        const ingredientDetails = ingredientsMap.get(name);
        
        // Stock in purchase units (e.g., 10 packs)
        const stockInPurchaseUnits = ingredientDetails?.stockByPost 
            ? Object.values(ingredientDetails.stockByPost).reduce((acc, curr) => acc + (curr.quantity || 0), 0)
            : 0;
        
        // Conversion factor (e.g., 5000g per pack)
        const norms = ingredientDetails?.norms || 1;

        // Total stock in base units (e.g., 50000g)
        const totalStockInBaseUnit = stockInPurchaseUnits * norms;

        return { 
            name, 
            ...data, // contains 'quantity' (consumed in base unit) and 'unit' (base unit 'g')
            stockInBaseUnit: totalStockInBaseUnit,
            stockInPurchaseUnits: stockInPurchaseUnits,
            purchaseUnit: ingredientDetails?.unit || data.unit,
            norms: norms,
        };
    }).sort((a, b) => b.quantity - a.quantity);


        return (
            <Paper elevation={2} sx={{ p: 2, mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', mb: 2 }}>理论原料消耗</Typography>
                <Grid container spacing={2}>
                {consumptionList.map(({ name, quantity, unit, stockInBaseUnit, stockInPurchaseUnits, purchaseUnit, norms }) => {
                    const consumedInBaseUnit = quantity || 0;
                    
                    let progress = 0;
                    if (stockInBaseUnit > 0) {
                        progress = Math.min((consumedInBaseUnit / stockInBaseUnit) * 100, 100);
                    } else if (consumedInBaseUnit > 0) {
                        progress = 100;
                    }
                    
                    const isOverBudget = consumedInBaseUnit > stockInBaseUnit;
                    const consumedForDisplay = consumedInBaseUnit / norms;
                    
                    const tooltipTitle = `${name}: 已消耗 ${consumedForDisplay.toFixed(2)}${purchaseUnit} (${consumedInBaseUnit.toFixed(2)}${unit}) / 总库存 ${stockInPurchaseUnits.toFixed(2)}${purchaseUnit} (${stockInBaseUnit.toFixed(2)}${unit})`;

                    return (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={name}>
                            <Tooltip title={tooltipTitle} placement="top">
                                <Paper variant="outlined" sx={{ p: 1.5 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                        <Typography variant="body2" component="span" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {name}
                                        </Typography>
                                        <Typography variant="body2" component="span" noWrap sx={{ fontWeight: isOverBudget ? 'bold' : 'normal', color: isOverBudget ? 'error.main' : 'text.secondary', pl: 1 }}>
                                            {`${consumedForDisplay.toFixed(2)} / ${stockInPurchaseUnits.toFixed(2)} ${purchaseUnit}`}
                                        </Typography>
                                    </Box>
                                    <LinearProgress
                                        variant="determinate"
                                        value={progress}
                                        color={isOverBudget ? 'error' : 'primary'}
                                        sx={{ height: 8, borderRadius: 4 }}
                                    />
                                </Paper>
                            </Tooltip>
                        </Grid>
                    );
                })}
                </Grid>
            </Paper>
        );
    };

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
                <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
                    {children}
                </Box>
            )}
        </div>
    );
};

const DashboardPage = () => {
    const theme = useTheme();
    const [currentTab, setCurrentTab] = useState(0);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    const [rawReports, setRawReports] = useState({ periodReports: [], trendReports: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const { 
        ingredientsMap, 
        doughRecipesMap, 
        fillingRecipesMap, 
        breadsMap, 
        dataLoaded 
    } = useContext(DataContext);

    // Get the current store using the useStore hook
    const { currentStore } = useStore();

    useEffect(() => {
        const fetchDashboardReports = async () => {
            if (!selectedDate || !dataLoaded || !currentStore) return;
            setLoading(true);
            setError(null);
            
            const periodMap = { 0: 'daily', 1: 'weekly', 2: 'monthly' };
            const periodType = periodMap[currentTab];

            try {
                const response = await fetch(`/api/dashboard/summary?periodType=${periodType}&date=${selectedDate}`, {
                    headers: {
                        'x-current-store-id': currentStore._id // Add the store ID to the request headers
                    }
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || `获取看板数据失败`);
                }
                setRawReports(result.data);
            } catch (err) {
                console.error('Fetch dashboard data error:', err);
                setError(err.message);
                setRawReports({ periodReports: [], trendReports: [] });
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardReports();
    }, [selectedDate, currentTab, dataLoaded, currentStore]);

    const processedData = useMemo(() => {
        if (!dataLoaded || !rawReports.periodReports) {
            return {
                summary: {},
                productionByCategory: [],
                wasteByCategory: [],
                materialConsumption: {},
                trendData: [],
                inventoryValue: 0,
            };
        }

        // 1. Calculate Total Inventory Value (仓库 + 岗位)
        let totalInventoryValue = 0;
        ingredientsMap.forEach(ing => {
            const price = ing.price || 0;
            
            // 计算岗位库存价值
            if (ing.stockByPost) {
                Object.values(ing.stockByPost).forEach(stock => {
                    totalInventoryValue += (stock.quantity || 0) * price;
                });
            }
            
            // 计算主仓库存价值
            if (ing.mainWarehouseStock) {
                totalInventoryValue += (ing.mainWarehouseStock.quantity || 0) * price;
            }
        });

        // 2. Process Period Reports for Summary & Pie Charts
        const aggregatedProducts = new Map();
        const aggregatedDoughWastes = new Map();
        const aggregatedFillingWastes = new Map();
        let totalProductionValue = 0;
        let totalFinishedWasteValue = 0;
        const productionValueMap = new Map();
        const wasteValueMap = new Map();

        rawReports.periodReports.forEach(report => {
            // 聚合产品数据，并计算产值和报废价值
            report.products?.forEach(p => {
                const bread = breadsMap.get(p.productId);
                if (!bread || p.quantityProduced <= 0) return;

                const currentQty = aggregatedProducts.get(p.productId) || 0;
                aggregatedProducts.set(p.productId, currentQty + p.quantityProduced);

                const value = p.quantityProduced * (bread.price || 0);
                const wasteValue = p.finishedWasteQuantity * (bread.price || 0);
                const productionValue = value - wasteValue;

                totalProductionValue += productionValue;
                totalFinishedWasteValue += wasteValue;

                const category = bread.category || '未分类';
                productionValueMap.set(category, (productionValueMap.get(category) || 0) + productionValue);
                if (wasteValue > 0) {
                    wasteValueMap.set(category, (wasteValueMap.get(category) || 0) + wasteValue);
                }
            });

            // 聚合面团报废
            report.doughWastes?.forEach(dw => {
                if (!dw.doughId || !dw.quantity || dw.quantity <= 0) return;
                const currentQty = aggregatedDoughWastes.get(dw.doughId) || 0;
                aggregatedDoughWastes.set(dw.doughId, currentQty + dw.quantity);
            });

            // 聚合馅料报废
            report.fillingWastes?.forEach(fw => {
                if (!fw.fillingId || !fw.quantity || fw.quantity <= 0) return;
                const currentQty = aggregatedFillingWastes.get(fw.fillingId) || 0;
                aggregatedFillingWastes.set(fw.fillingId, currentQty + fw.quantity);
            });
        });

        // 基于聚合后的数据，计算总物料消耗
        const materialConsumptionMap = new Map();

        // 从产品计算
        aggregatedProducts.forEach((quantityProduced, productId) => {
            const bread = breadsMap.get(productId);
            if (!bread) return;

            // Use the correct function to get raw materials for a single bread unit
            const materials = generateAggregatedRawMaterials(bread, breadsMap, doughRecipesMap, fillingRecipesMap, Array.from(ingredientsMap.values()));
            
            if (materials && materials.length > 0) {
                materials.forEach(material => {
                    const existing = materialConsumptionMap.get(material.name) || { quantity: 0, unit: material.unit };
                    // The returned material.quantity is for ONE bread, so we multiply by total quantity
                    materialConsumptionMap.set(material.name, {
                        quantity: existing.quantity + (material.quantity * quantityProduced),
                        unit: material.unit || existing.unit
                    });
                });
            }
        });

        // 从面团报废计算
        aggregatedDoughWastes.forEach((wastedQuantity, doughId) => {
            const recipe = doughRecipesMap.get(doughId);
            if (!recipe || !recipe.yield || recipe.yield <= 0) return;

            const costResult = calculateDoughCost(doughId, doughRecipesMap, ingredientsMap);
            if (!costResult || !costResult.ingredientCosts) return; 

            const materials = Object.entries(costResult.ingredientCosts).map(([name, data]) => ({
                name,
                quantity: data.quantity,
                unit: ingredientsMap.get(name)?.min || 'g',
            }));

            const wasteRatio = wastedQuantity / recipe.yield;

            materials.forEach(material => {
                 const existing = materialConsumptionMap.get(material.name) || { quantity: 0, unit: material.unit };
                 materialConsumptionMap.set(material.name, {
                     quantity: existing.quantity + (material.quantity * wasteRatio),
                     unit: material.unit || existing.unit
                 });
            });
        });
        
        // 从馅料报废计算
        aggregatedFillingWastes.forEach((wastedQuantity, fillingId) => {
            const recipe = fillingRecipesMap.get(fillingId);
            if (!recipe || !recipe.yield || recipe.yield <= 0) return;

            const costResult = calculateFillingCost(fillingId, fillingRecipesMap, ingredientsMap);
            if (!costResult || !costResult.ingredientCosts) return;

            const materials = Object.entries(costResult.ingredientCosts).map(([name, data]) => ({
                name,
                quantity: data.quantity,
                unit: ingredientsMap.get(name)?.min || 'g',
            }));

            const wasteRatio = wastedQuantity / recipe.yield;

            materials.forEach(material => {
                 const existing = materialConsumptionMap.get(material.name) || { quantity: 0, unit: material.unit };
                 materialConsumptionMap.set(material.name, {
                     quantity: existing.quantity + (material.quantity * wasteRatio),
                     unit: material.unit || existing.unit
                 });
            });
        });

        // 3. Format data for charts
        const productionByCategory = Array.from(productionValueMap.entries()).map(([name, value]) => ({ name, value }));
        const wasteByCategory = Array.from(wasteValueMap.entries()).map(([name, value]) => ({ name, value }));
        const materialConsumption = Object.fromEntries(materialConsumptionMap);

        // 4. Process Trend Data
        const trendDataMap = new Map();
        const periodMap = { 0: 'daily', 1: 'weekly', 2: 'monthly' };
        const periodType = periodMap[currentTab];
        const targetDateInBJT = toBJTime(selectedDate);
        const trendFormat = 'MM-DD';

        // Initialize the trend map with all days in the period to ensure a continuous axis.
        if (periodType === 'daily') {
            const startDate = subDays(targetDateInBJT, 6);
            let currentDate = startDate;
            while (currentDate <= targetDateInBJT) {
                const dateKey = formatDateInBJT(currentDate, DATE_FORMATS.MONTH_DAY);
                trendDataMap.set(dateKey, { date: dateKey, productionValue: 0, wasteValue: 0 });
                currentDate = addDays(currentDate, 1);
            }
        } else if (periodType === 'weekly') {
            const startDate = startOfWeek(targetDateInBJT, { weekStartsOn: 1 });
            const endDate = endOfWeek(targetDateInBJT, { weekStartsOn: 1 });
            let currentDate = startDate;
            while (currentDate <= endDate) {
                const dateKey = formatDateInBJT(currentDate, DATE_FORMATS.MONTH_DAY);
                trendDataMap.set(dateKey, { date: dateKey, productionValue: 0, wasteValue: 0 });
                currentDate = addDays(currentDate, 1);
            }
        } else { // monthly
            const startDate = startOfMonth(targetDateInBJT);
            const endDate = endOfMonth(targetDateInBJT);
            let currentDate = startDate;
            while (currentDate <= endDate) {
                const dateKey = formatDateInBJT(currentDate, DATE_FORMATS.MONTH_DAY);
                trendDataMap.set(dateKey, { date: dateKey, productionValue: 0, wasteValue: 0 });
                currentDate = addDays(currentDate, 1);
            }
        }
        
        // Populate the map with actual data from reports
        rawReports.trendReports.forEach(report => {
            const dateKey = formatDateInBJT(report.date, DATE_FORMATS.MONTH_DAY);
            
            let dailyProductionValue = 0;
            let dailyWasteValue = 0;

            report.products.forEach(p => {
                const bread = breadsMap.get(p.productId);
                if (bread) {
                    dailyProductionValue += (p.quantityProduced - p.finishedWasteQuantity) * bread.price;
                    dailyWasteValue += p.finishedWasteQuantity * bread.price;
                }
            });
            
            const existing = trendDataMap.get(dateKey);
            if (existing) {
                existing.productionValue += dailyProductionValue;
                existing.wasteValue += dailyWasteValue;
            }
        });

        return {
            summary: {
                totalProductionValue,
                totalFinishedWasteValue,
            },
            productionByCategory,
            wasteByCategory,
            materialConsumption,
            trendData: Array.from(trendDataMap.values()),
            inventoryValue: totalInventoryValue,
            currentDate: rawReports.currentDate,
        };

    }, [rawReports, dataLoaded, ingredientsMap, doughRecipesMap, fillingRecipesMap, breadsMap, currentTab, selectedDate]);

    const handleTabChange = (event, newValue) => {
        setCurrentTab(newValue);
    };

    const handleDateChange = (event) => {
        setSelectedDate(event.target.value);
    };

    const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#DD84D8'];

    // Helper rendering functions
    const renderSummaryCard = (title, value, color) => (
        <Grid item xs={12} sm={6} md={3}>
            <Paper elevation={2} sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="subtitle1" color="textSecondary">{title}</Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }} color={color}>
                    {typeof value === 'number' ? `¥${value.toFixed(2)}` : 'N/A'}
                </Typography>
            </Paper>
        </Grid>
    );

    const renderPieChart = (data, title) => (
        <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 2, height: 350 }}>
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>{title}</Typography>
                {data && data.length > 0 ? (
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                                ))}
                            </Pie>
                            <RechartsTooltip formatter={(value) => `¥${value.toFixed(2)}`} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : <Typography sx={{ textAlign: 'center', pt: 8 }} color="text.secondary">暂无数据</Typography>}
            </Paper>
        </Grid>
    );
    
    if (!dataLoaded) {
        return (
            <Container maxWidth="xl" sx={{ py: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography sx={{ mt: 2 }}>正在加载核心数据...</Typography>
            </Container>
        );
    }

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
                InputLabelProps={{ shrink: true }}
                disabled={loading}
            />

            {error && (
                <MuiAlert severity="error" sx={{ mb: 2 }}>
                    {error}
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
                    disabled={loading}
                >
                    <Tab label="按日汇总" />
                    <Tab label="按周汇总" />
                    <Tab label="按月汇总" />
                </Tabs>
            </AppBar>

            <Paper elevation={2} sx={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                 {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TabPanel value={currentTab} index={currentTab}>
                        <Typography variant="h6" gutterBottom>
                           {['每日', '每周', '每月'][currentTab]}数据汇总 {processedData.currentDate && `(${processedData.currentDate})`}
                                </Typography>
                    <Grid container spacing={3}>
                            {renderSummaryCard("总出品价值", processedData.summary.totalProductionValue)}
                            {renderSummaryCard("总成品报废价值", processedData.summary.totalFinishedWasteValue, 'error')}
                            {renderSummaryCard("库存总价值(仓库+岗位)", processedData.inventoryValue)}
                            
                            <Grid item xs={12}>
                                <Paper elevation={2} sx={{ p: 2, height: 350 }}>
                                    <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>生产/报废趋势</Typography>
                                    <ResponsiveContainer>
                                        <LineChart data={processedData.trendData}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <RechartsTooltip formatter={(value) => `¥${value.toFixed(2)}`} />
                                            <Legend />
                                            <Line type="monotone" dataKey="productionValue" name="出品价值" stroke={theme.palette.primary.main} activeDot={{ r: 8 }} />
                                            <Line type="monotone" dataKey="wasteValue" name="报废价值" stroke={theme.palette.error.main} />
                                        </LineChart>
                                    </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        

                            <Grid item xs={12}>
                                <MaterialConsumptionPanel 
                                    consumptionData={processedData.materialConsumption}
                                    ingredientsMap={ingredientsMap}
                                />
                        </Grid>
                        </Grid>
            </TabPanel>
                )}
            </Paper>
        </Container>
    );
};

export default DashboardPage;