import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  IconButton,
  Tooltip,
  Collapse,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import {
  Inventory as InventoryIcon,
  Store as StoreIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Refresh as RefreshIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useStore } from './StoreContext';

const EnhancedInventoryValue = ({ 
  showDetails = false,
  autoRefresh = false,
  refreshInterval = 30000 // 30秒
}) => {
  const { currentStore } = useStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(showDetails);
  const [lastUpdated, setLastUpdated] = useState(null);

  // 获取库存价值数据
  const fetchInventoryValue = useCallback(async () => {
    if (!currentStore) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ingredients/inventory-value', {
        headers: {
          'x-current-store-id': currentStore._id
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.message || '获取库存价值失败');
      }
    } catch (err) {
      console.error('获取库存价值错误:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentStore]);

  // 初始加载
  useEffect(() => {
    fetchInventoryValue();
  }, [fetchInventoryValue]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(fetchInventoryValue, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchInventoryValue]);

  // 格式化数字
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatNumber = (value) => {
    return new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(value);
  };

  if (loading && !data) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            正在计算库存价值...
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <IconButton onClick={fetchInventoryValue} size="small">
                <RefreshIcon />
              </IconButton>
            }
          >
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            暂无库存价值数据
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const { summary, quantities, counts } = data;

  return (
    <Card>
      <CardContent>
        {/* 标题栏 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AssessmentIcon color="primary" />
          <Typography variant="h6" component="h3" sx={{ flex: 1 }}>
            库存价值统计
          </Typography>
          
          <Tooltip title="刷新数据">
            <IconButton 
              onClick={fetchInventoryValue} 
              disabled={loading}
              size="small"
            >
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title={expanded ? "收起详情" : "展开详情"}>
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              size="small"
            >
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* 主要统计 */}
        <Grid container spacing={3}>
          {/* 总价值 */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.50', borderRadius: 1 }}>
              <TrendingUpIcon sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(summary.totalValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                库存总价值
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {counts.itemsWithAnyStock}/{counts.totalIngredients} 种原料有库存
              </Typography>
            </Box>
          </Grid>

          {/* 主仓价值 */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
              <InventoryIcon sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(summary.mainWarehouseValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                主仓库存价值
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {counts.itemsWithMainStock} 种原料有主仓库存
              </Typography>
              <Typography variant="caption" color="primary.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                占比: {summary.mainPercentage.toFixed(1)}%
              </Typography>
            </Box>
          </Grid>

          {/* 岗位价值 */}
          <Grid item xs={12} sm={4}>
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'secondary.50', borderRadius: 1 }}>
              <StoreIcon sx={{ fontSize: 32, color: 'secondary.main', mb: 1 }} />
              <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(summary.postStockValue)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                岗位库存价值
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {counts.itemsWithPostStock} 种原料有岗位库存
              </Typography>
              <Typography variant="caption" color="secondary.main" sx={{ display: 'block', fontWeight: 'bold' }}>
                占比: {summary.postPercentage.toFixed(1)}%
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* 价值分布进度条 */}
        <Box sx={{ mt: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="primary.main">
              主仓 {summary.mainPercentage.toFixed(1)}%
            </Typography>
            <Typography variant="body2" color="secondary.main">
              岗位 {summary.postPercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={summary.mainPercentage} 
            sx={{ 
              height: 12, 
              borderRadius: 6,
              bgcolor: 'secondary.light',
              '& .MuiLinearProgress-bar': {
                bgcolor: 'primary.main',
                borderRadius: 6
              }
            }} 
          />
        </Box>

        {/* 详细信息 */}
        <Collapse in={expanded}>
          <Divider sx={{ my: 2 }} />
          
          {/* 数量统计 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              库存数量统计
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" color="primary.main">
                    {formatNumber(quantities.totalMainQuantity)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    主仓总量
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" color="secondary.main">
                    {formatNumber(quantities.totalPostQuantity)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    岗位总量
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={4}>
                <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="h6" color="success.main">
                    {formatNumber(quantities.totalQuantity)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    库存总量
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* 快速统计标签 */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Chip 
              icon={<InventoryIcon />}
              label={`主仓: ${counts.itemsWithMainStock}种`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip 
              icon={<StoreIcon />}
              label={`岗位: ${counts.itemsWithPostStock}种`}
              size="small"
              color="secondary"
              variant="outlined"
            />
            <Chip 
              icon={<TrendingUpIcon />}
              label={`平均价值: ${formatCurrency(counts.totalIngredients > 0 ? summary.totalValue / counts.totalIngredients : 0)}`}
              size="small"
              color="success"
              variant="outlined"
            />
          </Box>

          {/* 更新时间 */}
          {lastUpdated && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <InfoIcon fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                最后更新: {lastUpdated.toLocaleString()}
              </Typography>
            </Box>
          )}
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default EnhancedInventoryValue;