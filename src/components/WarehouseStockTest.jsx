import React, { useState } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Box, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Divider
} from '@mui/material';
import WarehouseStockCard from './WarehouseStockCard';
import { useWarehouseStock } from '../hooks/useWarehouseStock';
import { 
  SimpleLoader, 
  LoaderWithText, 
  ProgressLoader, 
  PulseLoader, 
  RefreshLoader, 
  DataFetchLoader 
} from './LoadingStates';

const WarehouseStockTest = () => {
  const { 
    warehouseStock, 
    loading, 
    error, 
    lastUpdated,
    loadingStage,
    progress,
    refresh 
  } = useWarehouseStock();

  const [selectedLoadingType, setSelectedLoadingType] = useState('skeleton');
  const [showLoadingDemo, setShowLoadingDemo] = useState(false);

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        主仓库存加载状态测试
      </Typography>
      
      <Grid container spacing={3}>
        {/* 主仓库存卡片 */}
        <Grid item xs={12} lg={6}>
          <Typography variant="h6" gutterBottom>
            主仓库存卡片
          </Typography>
          <Box sx={{ mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120, mr: 2 }}>
              <InputLabel>加载类型</InputLabel>
              <Select
                value={selectedLoadingType}
                label="加载类型"
                onChange={(e) => setSelectedLoadingType(e.target.value)}
              >
                <MenuItem value="skeleton">骨架屏</MenuItem>
                <MenuItem value="pulse">脉冲动画</MenuItem>
                <MenuItem value="progress">进度条</MenuItem>
              </Select>
            </FormControl>
            <Button 
              variant="outlined" 
              onClick={refresh}
              disabled={loading}
            >
              刷新数据
            </Button>
          </Box>
          <WarehouseStockCard 
            maxItems={8} 
            showRefresh={true} 
            loadingType={selectedLoadingType}
          />
        </Grid>
        
        {/* 调试信息 */}
        <Grid item xs={12} lg={6}>
          <Typography variant="h6" gutterBottom>
            调试信息
          </Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>加载状态:</strong> {loading ? '加载中' : '已完成'}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>加载阶段:</strong> {loadingStage}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>进度:</strong> {progress}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  <strong>数据数量:</strong> {warehouseStock.length} 项
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  <strong>错误信息:</strong> {error || '无'}
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2">
                  <strong>最后更新:</strong> {lastUpdated ? new Date(lastUpdated).toLocaleString() : '未更新'}
                </Typography>
              </Grid>
            </Grid>
            
            {warehouseStock.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="subtitle2" gutterBottom>
                  前5项数据预览:
                </Typography>
                {warehouseStock.slice(0, 5).map((item, index) => (
                  <Box key={item._id} sx={{ mb: 1, p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
                    <Typography variant="caption">
                      {index + 1}. {item.name}: {item.mainWarehouseStock?.quantity || 0} {item.unit}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* 加载状态演示 */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom>
            加载状态组件演示
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Button 
              variant="contained" 
              onClick={() => setShowLoadingDemo(!showLoadingDemo)}
            >
              {showLoadingDemo ? '隐藏' : '显示'}加载状态演示
            </Button>
          </Box>
          
          {showLoadingDemo && (
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>简单加载器</Typography>
                  <SimpleLoader />
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>带文字加载器</Typography>
                  <LoaderWithText text="正在加载数据..." />
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>进度条加载器</Typography>
                  <ProgressLoader progress={65} text="处理中..." showPercentage />
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>脉冲加载器</Typography>
                  <PulseLoader text="获取库存数据..." />
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>刷新加载器</Typography>
                  <RefreshLoader text="刷新中..." />
                </Paper>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <Paper sx={{ p: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>数据获取加载器</Typography>
                  <DataFetchLoader stage="processing" progress={75} />
                </Paper>
              </Grid>
            </Grid>
          )}
        </Grid>
      </Grid>
    </Container>
  );
};

export default WarehouseStockTest;