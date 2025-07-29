import React, { memo, useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  Alert,
  IconButton,
  Tooltip,
  Fade,
  Collapse
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Inventory as InventoryIcon,
  TrendingUp as TrendingUpIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useWarehouseStock } from '../hooks/useWarehouseStock';
import { 
  WarehouseStockSkeleton, 
  PulseLoader, 
  RefreshLoader,
  DataFetchLoader
} from './LoadingStates';

const WarehouseStockItem = memo(({ item }) => (
  <Box sx={{ 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    py: 1,
    borderBottom: '1px solid',
    borderColor: 'divider',
    '&:last-child': { borderBottom: 'none' }
  }}>
    <Box sx={{ flex: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {item.name}
      </Typography>
      {item.specs && (
        <Typography variant="caption" color="text.secondary">
          {item.specs}
        </Typography>
      )}
    </Box>
    <Box sx={{ textAlign: 'right' }}>
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        {item.mainWarehouseStock?.quantity?.toFixed(2) || '0.00'} {item.unit}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        ¥{((item.mainWarehouseStock?.quantity || 0) * (item.price || 0)).toFixed(2)}
      </Typography>
    </Box>
  </Box>
));

WarehouseStockItem.displayName = 'WarehouseStockItem';

const WarehouseStockCard = ({ 
  maxItems = 10, 
  showRefresh = true, 
  loadingType = "skeleton", // "skeleton", "pulse", "progress"
  showStats = true 
}) => {
  const { 
    warehouseStock, 
    loading, 
    error, 
    lastUpdated, 
    refresh 
  } = useWarehouseStock();
  
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // 计算总价值
  const totalValue = warehouseStock.reduce((sum, item) => {
    const quantity = item.mainWarehouseStock?.quantity || 0;
    const price = item.price || 0;
    return sum + (quantity * price);
  }, 0);

  // 显示的库存项目（限制数量）
  const displayItems = expanded ? warehouseStock : warehouseStock.slice(0, maxItems);
  const hasMore = warehouseStock.length > maxItems;

  // 处理刷新
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500); // 延迟一点让用户看到刷新动画
    }
  };

  if (error) {
    return (
      <Card>
        <CardContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
          <Box sx={{ textAlign: 'center' }}>
            <IconButton onClick={refresh} color="primary">
              <RefreshIcon />
            </IconButton>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        {/* 标题栏 */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InventoryIcon color="primary" />
            <Typography variant="h6" component="h3">
              主仓库存
            </Typography>
          </Box>
          {showRefresh && (
            <Tooltip title={isRefreshing ? "刷新中..." : "刷新库存数据"}>
              <IconButton 
                onClick={handleRefresh} 
                disabled={loading || isRefreshing}
                size="small"
                sx={{
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* 统计信息 */}
        {showStats && (
          <Fade in={!loading} timeout={600}>
            <Box sx={{ 
              display: 'flex', 
              gap: 2, 
              mb: 2,
              flexWrap: 'wrap'
            }}>
              <Chip 
                icon={<InventoryIcon />}
                label={`${warehouseStock.length} 种原料`}
                variant="outlined"
                size="small"
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              />
              <Chip 
                icon={<TrendingUpIcon />}
                label={`总价值 ¥${totalValue.toFixed(2)}`}
                color="primary"
                variant="outlined"
                size="small"
                sx={{
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    bgcolor: 'primary.50'
                  }
                }}
              />
            </Box>
          </Fade>
        )}

        {/* 库存列表 */}
        <Box sx={{ maxHeight: expanded ? 600 : 400, overflow: 'auto' }}>
          {loading || isRefreshing ? (
            // 不同类型的加载状态
            <Fade in timeout={300}>
              <Box>
                {loadingType === "pulse" ? (
                  <PulseLoader 
                    icon={InventoryIcon}
                    text="正在加载库存数据..."
                    subText="请稍候片刻"
                  />
                ) : loadingType === "progress" ? (
                  <DataFetchLoader 
                    stage={isRefreshing ? "fetching" : "connecting"}
                    progress={0}
                  />
                ) : isRefreshing ? (
                  <RefreshLoader text="正在刷新库存数据..." />
                ) : (
                  <WarehouseStockSkeleton count={Math.min(maxItems, 8)} />
                )}
              </Box>
            </Fade>
          ) : displayItems.length > 0 ? (
            <>
              <Fade in timeout={500}>
                <Box>
                  {displayItems.map((item, index) => (
                    <Fade 
                      key={item._id} 
                      in 
                      timeout={300} 
                      style={{ transitionDelay: `${index * 50}ms` }}
                    >
                      <div>
                        <WarehouseStockItem item={item} />
                      </div>
                    </Fade>
                  ))}
                </Box>
              </Fade>
              
              {hasMore && !expanded && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <IconButton 
                    onClick={() => setExpanded(true)}
                    size="small"
                    sx={{ 
                      bgcolor: 'action.hover',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                  <Typography variant="caption" color="text.secondary" display="block">
                    还有 {warehouseStock.length - maxItems} 种原料
                  </Typography>
                </Box>
              )}
              
              {expanded && hasMore && (
                <Box sx={{ textAlign: 'center', mt: 2 }}>
                  <IconButton 
                    onClick={() => setExpanded(false)}
                    size="small"
                    sx={{ 
                      bgcolor: 'action.hover',
                      transform: 'rotate(180deg)',
                      '&:hover': { bgcolor: 'action.selected' }
                    }}
                  >
                    <ExpandMoreIcon />
                  </IconButton>
                  <Typography variant="caption" color="text.secondary" display="block">
                    收起列表
                  </Typography>
                </Box>
              )}
            </>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <InventoryIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="body2" color="text.secondary" gutterBottom>
                暂无主仓库存数据
              </Typography>
              <Typography variant="caption" color="text.secondary">
                请在大仓库存管理页面添加库存数据
              </Typography>
            </Box>
          )}
        </Box>

        {/* 最后更新时间 */}
        {lastUpdated && (
          <Fade in timeout={800}>
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                最后更新: {new Date(lastUpdated).toLocaleString()}
              </Typography>
            </Box>
          </Fade>
        )}
      </CardContent>
      
      {/* CSS动画样式 */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Card>
  );
};

export default memo(WarehouseStockCard);