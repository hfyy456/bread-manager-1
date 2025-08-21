import React, { useState, useEffect, useContext, useMemo } from 'react';
import {
  Container, Typography, Paper, Grid, Box, Button, TextField, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, Chip, Alert,
  IconButton, Tooltip, Card, CardContent, Divider, Dialog, DialogTitle, DialogContent
} from '@mui/material';
import {
  Add as AddIcon, Delete as DeleteIcon, Save as SaveIcon,
  WbSunny as SunnyIcon, Cloud as CloudyIcon, 
  Grain as RainIcon, AcUnit as SnowIcon,
  Lock as LockIcon, LockOpen as LockOpenIcon
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { zhCN } from 'date-fns/locale';
import { format, getDay } from 'date-fns';
import { DataContext } from '@components/DataContext';
import { useSnackbar } from '@components/SnackbarProvider';
import { generateAggregatedRawMaterials } from '@utils/calculator';

// 天气选项
const WEATHER_OPTIONS = [
  { value: 'sunny', label: '晴天', icon: <SunnyIcon />, color: '#FFA726' },
  { value: 'cloudy', label: '多云', icon: <CloudyIcon />, color: '#78909C' },
  { value: 'rainy', label: '雨天', icon: <RainIcon />, color: '#42A5F5' },
  { value: 'snowy', label: '雪天', icon: <SnowIcon />, color: '#E3F2FD' }
];

// 时间段配置 (10点-20点)
const TIME_SLOTS = Array.from({ length: 11 }, (_, i) => {
  const hour = 10 + i;
  return `${hour}:00`;
});

// 周几映射
const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const ProductionPlanPage = () => {
  const { breadTypes, loading, ingredientsMap, ingredients, doughRecipesMap, fillingRecipesMap } = useContext(DataContext);
  const { showSnackbar } = useSnackbar();

  // 基础状态
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [weather, setWeather] = useState('sunny');
  const [productionItems, setProductionItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState(null);
  const [isLocked, setIsLocked] = useState(false);
  
  // 预估数据状态
  const [estimateData, setEstimateData] = useState({
    productionWaste: 0,    // 预估排产报废
    tastingWaste: 0,       // 预估品尝报废
    customerCount: 0,      // 客单数
    customerPrice: 0       // 客单价
  });
  
  // 原料计算器状态
  const [showRawMaterialsCalculator, setShowRawMaterialsCalculator] = useState(false);
  const [rawMaterialsData, setRawMaterialsData] = useState([]);

  // 计算周几
  const weekday = useMemo(() => {
    return WEEKDAYS[getDay(selectedDate)];
  }, [selectedDate]);

  // 初始化一个空的生产项目
  const createEmptyProductionItem = () => ({
    id: Date.now() + Math.random(),
    breadId: '',
    breadName: '',
    price: 0,
    packaging: [],         // 包材信息
    timeSlots: TIME_SLOTS.reduce((acc, time) => ({ ...acc, [time]: 0 }), {}), // 每个时间段的数量
    totalQuantity: 0       // 总数量
  });

  // 添加生产项目
  const handleAddProductionItem = () => {
    setProductionItems(prev => [...prev, createEmptyProductionItem()]);
  };

  // 删除生产项目
  const handleDeleteProductionItem = (id) => {
    setProductionItems(prev => prev.filter(item => item.id !== id));
  };

  // 更新生产项目
  const handleUpdateProductionItem = (id, field, value) => {
    setProductionItems(prev => prev.map(item => {
      if (item.id !== id) return item;

      const updatedItem = { ...item, [field]: value };

      // 如果更新的是面包选择
      if (field === 'breadId') {
        const selectedBread = breadTypes.find(bread => bread._id === value);
        if (selectedBread) {
          updatedItem.breadName = selectedBread.name;
          updatedItem.price = selectedBread.price || 0;
          updatedItem.packaging = selectedBread.packaging || [];
        }
      }

      // 如果更新的是时间段数量，重新计算总数量
      if (field.startsWith('timeSlot_')) {
        const timeSlot = field.replace('timeSlot_', '');
        updatedItem.timeSlots[timeSlot] = parseInt(value) || 0;
        updatedItem.totalQuantity = Object.values(updatedItem.timeSlots).reduce((sum, qty) => sum + qty, 0);
      }

      return updatedItem;
    }));
  };

  // 计算包材成本
  const calculatePackagingCost = (item) => {
    if (!item.packaging || item.packaging.length === 0) return 0;
    
    return item.packaging.reduce((total, pkg) => {
      // 从ingredientsMap中获取包材的价格
      const ingredient = ingredientsMap?.get(pkg.ingredientId);
      const unitPrice = ingredient?.price || 0;
      
      // 包材成本 = 单个面包需要的包材数量 × 面包总数量 × 包材单价
      return total + (pkg.quantity * item.totalQuantity * unitPrice);
    }, 0);
  };

  // 计算原料需求
  const calculateRawMaterials = () => {
    if (!productionItems.length || !breadTypes.length) {
      showSnackbar('请先添加生产项目', 'warning');
      return;
    }

    try {
      const aggregatedMaterials = {};
      
      productionItems.forEach(item => {
        if (!item.breadId || item.totalQuantity === 0) return;
        
        const breadType = breadTypes.find(bread => bread._id === item.breadId);
        if (!breadType) return;
        
        // 使用现有的原料计算函数
        const materials = generateAggregatedRawMaterials(
          breadType, 
          breadTypes, 
          doughRecipesMap, 
          fillingRecipesMap, 
          ingredients, 
          item.totalQuantity
        );
        
        // 聚合所有面包的原料需求
        materials.forEach(material => {
          if (aggregatedMaterials[material.id]) {
            aggregatedMaterials[material.id].quantity += material.quantity;
          } else {
            aggregatedMaterials[material.id] = { ...material };
          }
        });
      });
      
      const rawMaterialsList = Object.values(aggregatedMaterials)
        .filter(material => material.quantity > 0)
        .sort((a, b) => a.name.localeCompare(b.name));
      
      setRawMaterialsData(rawMaterialsList);
      setShowRawMaterialsCalculator(true);
      showSnackbar(`计算完成，共需要 ${rawMaterialsList.length} 种原料`, 'success');
    } catch (error) {
      console.error('原料计算失败:', error);
      showSnackbar('原料计算失败，请检查数据', 'error');
    }
  };

  // 导出原料清单
  const exportRawMaterials = () => {
    if (!rawMaterialsData.length) {
      showSnackbar('没有原料数据可导出', 'warning');
      return;
    }

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const csvContent = [
      ['原料名称', '需求数量', '单位', '规格', '采购单价', '预估成本'].join(','),
      ...rawMaterialsData.map(material => [
        material.name,
        material.quantity.toFixed(2),
        material.unit,
        material.specs || '',
        material.price ? (material.price / (ingredientsMap?.get(material.id)?.norms || 1)).toFixed(4) : '',
        material.price ? ((material.quantity * material.price) / (ingredientsMap?.get(material.id)?.norms || 1)).toFixed(2) : ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `原料清单_${dateStr}.csv`;
    link.click();
    
    showSnackbar('原料清单导出成功', 'success');
  };

  // 计算预估生产金额（预估排产报废 + 预估品尝报废 + 客单数 × 客单价）
  const estimatedProductionAmount = useMemo(() => {
    return estimateData.productionWaste + estimateData.tastingWaste + (estimateData.customerCount * estimateData.customerPrice);
  }, [estimateData]);

  // 计算总计
  const totals = useMemo(() => {
    return productionItems.reduce((acc, item) => {
      acc.totalQuantity += item.totalQuantity;
      // 计算面包的总金额（数量 × 单价）
      acc.totalProductionAmount += item.totalQuantity * item.price;
      return acc;
    }, {
      totalQuantity: 0,
      totalProductionWaste: estimateData.productionWaste,
      totalTastingWaste: estimateData.tastingWaste,
      totalSalesAmount: estimateData.customerCount * estimateData.customerPrice,
      totalProductionAmount: 0 // 面包总金额
    });
  }, [productionItems, estimateData]);

  // 切换锁定状态
  const handleToggleLock = async () => {
    if (!currentPlanId) {
      showSnackbar('请先保存生产计划后再锁定', 'warning');
      return;
    }

    try {
      const currentStoreId = localStorage.getItem('currentStoreId');
      const response = await fetch(`/api/production-plans/${currentPlanId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-store-id': currentStoreId
        },
        body: JSON.stringify({ isLocked: !isLocked })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '锁定状态更新失败');
      }

      setIsLocked(!isLocked);
      showSnackbar(
        isLocked ? '生产计划已解锁，可以修改' : '生产计划已锁定，无法修改', 
        'success'
      );
    } catch (error) {
      console.error('更新锁定状态失败:', error);
      showSnackbar(error.message || '锁定状态更新失败', 'error');
    }
  };

  // 保存生产计划
  const handleSave = async () => {
    if (productionItems.length === 0) {
      showSnackbar('请至少添加一个生产项目', 'warning');
      return;
    }

    // 验证必填字段
    const invalidItems = productionItems.filter(item => !item.breadId);
    if (invalidItems.length > 0) {
      showSnackbar('请为所有项目选择面包类型', 'warning');
      return;
    }

    setSaving(true);
    try {
      const planData = {
        date: format(selectedDate, 'yyyy-MM-dd'),
        weekday,
        weather,
        estimateData, // 添加预估数据
        items: productionItems.map(item => ({
          breadId: item.breadId,
          breadName: item.breadName,
          price: item.price,
          packaging: item.packaging,
          timeSlots: item.timeSlots,
          totalQuantity: item.totalQuantity
        })),
        totals
      };

      const currentStoreId = localStorage.getItem('currentStoreId');
      const response = await fetch('/api/production-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-store-id': currentStoreId
        },
        body: JSON.stringify(planData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '保存失败');
      }

      showSnackbar(result.message || '生产计划保存成功！', 'success');
    } catch (error) {
      console.error('保存生产计划失败:', error);
      showSnackbar(error.message || '保存失败，请重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  // 加载指定日期的生产计划
  const loadProductionPlan = async (date) => {
    setPlanLoading(true);
    try {
      const currentStoreId = localStorage.getItem('currentStoreId');
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const response = await fetch(`/api/production-plans/date/${dateStr}`, {
        headers: {
          'x-current-store-id': currentStoreId
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || '加载失败');
      }

      if (result.data) {
        // 加载现有计划
        const plan = result.data;
        setCurrentPlanId(plan._id);
        setWeather(plan.weather);
        setIsLocked(plan.isLocked || false);
        
        // 加载预估数据
        if (plan.estimateData) {
          setEstimateData(plan.estimateData);
        } else if (plan.summaryData) {
          // 兼容旧数据格式，从summaryData转换
          setEstimateData({
            productionWaste: plan.summaryData.productionWaste || 0,
            tastingWaste: plan.summaryData.tastingWaste || 0,
            customerCount: 0,
            customerPrice: 0
          });
        } else {
          // 兼容更旧的数据格式，从totals中读取
          setEstimateData({
            productionWaste: plan.totals?.totalProductionWaste || 0,
            tastingWaste: plan.totals?.totalTastingWaste || 0,
            customerCount: 0,
            customerPrice: 0
          });
        }
        
        // 转换数据格式
        const items = plan.items.map(item => ({
          id: Date.now() + Math.random(),
          breadId: item.breadId,
          breadName: item.breadName,
          price: item.price,
          packaging: item.packaging || [],
          timeSlots: item.timeSlots || TIME_SLOTS.reduce((acc, time) => ({ ...acc, [time]: 0 }), {}),
          totalQuantity: item.totalQuantity
        }));
        
        setProductionItems(items);
        showSnackbar('生产计划加载成功', 'success');
      } else {
        // 没有现有计划，创建空计划
        setCurrentPlanId(null);
        setWeather('sunny');
        setEstimateData({
          productionWaste: 0,
          tastingWaste: 0,
          customerCount: 0,
          customerPrice: 0
        });
        setProductionItems([createEmptyProductionItem()]);
      }
    } catch (error) {
      console.error('加载生产计划失败:', error);
      showSnackbar(error.message || '加载失败', 'error');
      // 加载失败时也创建空计划
      setCurrentPlanId(null);
      setWeather('sunny');
      setProductionItems([createEmptyProductionItem()]);
    } finally {
      setPlanLoading(false);
    }
  };

  // 日期变化时加载对应的生产计划
  useEffect(() => {
    if (selectedDate) {
      loadProductionPlan(selectedDate);
    }
  }, [selectedDate]);

  // 初始化时添加一个空项目（仅在没有加载到数据时）
  useEffect(() => {
    if (productionItems.length === 0 && !planLoading) {
      handleAddProductionItem();
    }
  }, [planLoading]);

  if (loading) {
    return (
      <Container>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <Typography>加载中...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={zhCN}>
      <Container maxWidth="xl">
        <Box sx={{ mb: 3 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            生产计划管理
          </Typography>
          
          {/* 基础信息卡片 */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={3} alignItems="center">
                <Grid item xs={12} md={2}>
                  <DatePicker
                    label="生产日期"
                    value={selectedDate}
                    onChange={setSelectedDate}
                    disabled={isLocked}
                    renderInput={(params) => <TextField {...params} fullWidth />}
                  />
                </Grid>
                
                <Grid item xs={12} md={1}>
                  <TextField
                    label="星期"
                    value={weekday}
                    fullWidth
                    disabled
                    sx={{ '& .MuiInputBase-input': { fontWeight: 'bold' } }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <FormControl fullWidth>
                    <InputLabel>天气</InputLabel>
                    <Select
                      value={weather}
                      onChange={(e) => setWeather(e.target.value)}
                      label="天气"
                      disabled={isLocked}
                    >
                      {WEATHER_OPTIONS.map(option => (
                        <MenuItem key={option.value} value={option.value}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {React.cloneElement(option.icon, { sx: { color: option.color } })}
                            {option.label}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={1.5}>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddProductionItem}
                    disabled={isLocked}
                    fullWidth
                  >
                    添加产品
                  </Button>
                </Grid>
                
                <Grid item xs={12} md={1.5}>
                  <Button
                    variant="outlined"
                    color="info"
                    onClick={calculateRawMaterials}
                    disabled={productionItems.length === 0}
                    fullWidth
                  >
                    原料计算
                  </Button>
                </Grid>
                
                <Grid item xs={12} md={1.2}>
                  <Button
                    variant="contained"
                    color="success"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    disabled={saving || isLocked}
                    fullWidth
                  >
                    {saving ? '保存中...' : '保存计划'}
                  </Button>
                </Grid>
                
                <Grid item xs={12} md={1.3}>
                  <Button
                    variant={isLocked ? "contained" : "outlined"}
                    color={isLocked ? "error" : "warning"}
                    startIcon={isLocked ? <LockIcon /> : <LockOpenIcon />}
                    onClick={handleToggleLock}
                    fullWidth
                  >
                    {isLocked ? '已锁定' : '锁定'}
                  </Button>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 2 }} />
              
              {/* 预估数据输入区域 */}
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                预估数据
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={2}>
                  <TextField
                    label="预估排产报废(¥)"
                    type="number"
                    value={estimateData.productionWaste}
                    onChange={(e) => setEstimateData(prev => ({ 
                      ...prev, 
                      productionWaste: parseFloat(e.target.value) || 0 
                    }))}
                    disabled={isLocked}
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <TextField
                    label="预估品尝报废(¥)"
                    type="number"
                    value={estimateData.tastingWaste}
                    onChange={(e) => setEstimateData(prev => ({ 
                      ...prev, 
                      tastingWaste: parseFloat(e.target.value) || 0 
                    }))}
                    disabled={isLocked}
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <TextField
                    label="客单数"
                    type="number"
                    value={estimateData.customerCount}
                    onChange={(e) => setEstimateData(prev => ({ 
                      ...prev, 
                      customerCount: parseInt(e.target.value) || 0 
                    }))}
                    disabled={isLocked}
                    fullWidth
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <TextField
                    label="客单价(¥)"
                    type="number"
                    value={estimateData.customerPrice}
                    onChange={(e) => setEstimateData(prev => ({ 
                      ...prev, 
                      customerPrice: parseFloat(e.target.value) || 0 
                    }))}
                    disabled={isLocked}
                    fullWidth
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <TextField
                    label="预估生产金额(¥)"
                    value={estimatedProductionAmount.toFixed(2)}
                    fullWidth
                    disabled
                    sx={{ 
                      '& .MuiInputBase-input': { 
                        fontWeight: 'bold', 
                        color: 'warning.main' 
                      } 
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} md={2}>
                  <TextField
                    label="面包总金额(¥)"
                    value={totals.totalProductionAmount.toFixed(2)}
                    fullWidth
                    disabled
                    sx={{ 
                      '& .MuiInputBase-input': { 
                        fontWeight: 'bold', 
                        color: 'success.main' 
                      } 
                    }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* 生产计划表格 */}
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>面包名称</TableCell>
                  <TableCell align="right">单价(¥)</TableCell>
                  <TableCell align="right">总数量</TableCell>
                  <TableCell align="right">包材成本(¥)</TableCell>
                  <TableCell align="right">总金额(¥)</TableCell>
                  <TableCell align="right">占比(%)</TableCell>
                  {TIME_SLOTS.map(time => (
                    <TableCell key={time} align="center" sx={{ minWidth: 80 }}>
                      {time}
                    </TableCell>
                  ))}
                  <TableCell align="center">操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {productionItems.map((item) => (
                  <TableRow key={item.id} hover>
                    <TableCell>
                      <FormControl size="small" sx={{ minWidth: 200 }}>
                        <Select
                          value={item.breadId}
                          onChange={(e) => handleUpdateProductionItem(item.id, 'breadId', e.target.value)}
                          displayEmpty
                          disabled={isLocked}
                        >
                          <MenuItem value="">
                            <em>选择面包</em>
                          </MenuItem>
                          {breadTypes.map(bread => (
                            <MenuItem key={bread._id} value={bread._id}>
                              {bread.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                        {item.price.toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Chip 
                        label={item.totalQuantity}
                        color="primary"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold', 
                          color: 'warning.main',
                          backgroundColor: 'warning.light',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {calculatePackagingCost(item).toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 'bold', 
                          color: 'success.main',
                          backgroundColor: 'success.light',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1
                        }}
                      >
                        {(item.totalQuantity * item.price).toFixed(2)}
                      </Typography>
                    </TableCell>
                    
                    <TableCell align="right">
                      <Chip 
                        label={totals.totalProductionAmount > 0 
                          ? `${((item.totalQuantity * item.price) / totals.totalProductionAmount * 100).toFixed(1)}%`
                          : '0.0%'
                        }
                        color="info"
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                    </TableCell>
                    
                    {TIME_SLOTS.map(time => (
                      <TableCell key={time} align="center">
                        <TextField
                          size="small"
                          type="number"
                          value={item.timeSlots[time]}
                          onChange={(e) => handleUpdateProductionItem(item.id, `timeSlot_${time}`, e.target.value)}
                          disabled={isLocked}
                          sx={{ width: 70 }}
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                    ))}
                    
                    <TableCell align="center">
                      <Tooltip title="删除">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteProductionItem(item.id)}
                          disabled={isLocked}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                
                {/* 合计行 */}
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell sx={{ fontWeight: 'bold' }}>合计</TableCell>
                  <TableCell></TableCell>
                  <TableCell align="right">
                    <Chip 
                      label={totals.totalQuantity}
                      color="secondary"
                      sx={{ fontWeight: 'bold' }}
                    />
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'warning.main' }}>
                    ¥{productionItems.reduce((sum, item) => sum + calculatePackagingCost(item), 0).toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'success.main' }}>
                    ¥{totals.totalProductionAmount.toFixed(2)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold', color: 'info.main' }}>
                    100.0%
                  </TableCell>
                  {TIME_SLOTS.map(time => {
                    // 计算该时间段的总金额（数量 × 单价）
                    const timeAmount = productionItems.reduce((sum, item) => {
                      const quantity = item.timeSlots[time] || 0;
                      return sum + (quantity * item.price);
                    }, 0);
                    return (
                      <TableCell key={time} align="center" sx={{ fontWeight: 'bold' }}>
                        ¥{timeAmount.toFixed(2)}
                      </TableCell>
                    );
                  })}
                  <TableCell></TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* 统计信息 */}
          <Grid container spacing={2} sx={{ mt: 2 }}>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom>
                    总生产数量
                  </Typography>
                  <Typography variant="h4" color="primary">
                    {totals.totalQuantity}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom>
                    总生产金额
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    ¥{totals.totalProductionAmount.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom>
                    销售金额
                  </Typography>
                  <Typography variant="h4" color="info.main">
                    ¥{totals.totalSalesAmount.toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography color="textSecondary" gutterBottom>
                    报废金额
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    ¥{(totals.totalProductionWaste + totals.totalTastingWaste).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>
    </LocalizationProvider>
  );
};

export default ProductionPlanPage;