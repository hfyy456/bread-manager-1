import React from 'react';
import { 
  Box, 
  Skeleton, 
  CircularProgress, 
  Typography, 
  LinearProgress,
  Fade,
  Card,
  CardContent
} from '@mui/material';
import { 
  Inventory as InventoryIcon,
  CloudDownload as CloudDownloadIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

// 简单的圆形加载器
export const SimpleLoader = ({ size = 40, color = "primary" }) => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2 }}>
    <CircularProgress size={size} color={color} />
  </Box>
);

// 带文字的加载器
export const LoaderWithText = ({ 
  text = "加载中...", 
  size = 40, 
  color = "primary" 
}) => (
  <Box sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    gap: 2, 
    p: 3 
  }}>
    <CircularProgress size={size} color={color} />
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  </Box>
);

// 进度条加载器
export const ProgressLoader = ({ 
  progress = 0, 
  text = "加载中...", 
  showPercentage = false 
}) => (
  <Box sx={{ p: 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {text}
      </Typography>
      {showPercentage && (
        <Typography variant="body2" color="text.secondary">
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
    <LinearProgress 
      variant={progress > 0 ? "determinate" : "indeterminate"} 
      value={progress} 
      sx={{ height: 6, borderRadius: 3 }}
    />
  </Box>
);

// 骨架屏 - 库存项目
export const WarehouseStockSkeleton = ({ count = 5 }) => (
  <Box>
    {Array.from({ length: count }).map((_, index) => (
      <Box key={index} sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        py: 1.5,
        borderBottom: '1px solid',
        borderColor: 'divider',
        '&:last-child': { borderBottom: 'none' }
      }}>
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={20} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Skeleton variant="text" width={80} height={20} />
          <Skeleton variant="text" width={60} height={16} />
        </Box>
      </Box>
    ))}
  </Box>
);

// 骨架屏 - 统计卡片
export const StatCardSkeleton = () => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={120} height={24} />
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Skeleton variant="rounded" width={80} height={24} />
        <Skeleton variant="rounded" width={100} height={24} />
      </Box>
      <WarehouseStockSkeleton count={3} />
    </CardContent>
  </Card>
);

// 脉冲加载动画
export const PulseLoader = ({ 
  icon: Icon = InventoryIcon, 
  text = "正在加载库存数据...",
  subText = "请稍候"
}) => (
  <Fade in timeout={300}>
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      gap: 2, 
      p: 4,
      textAlign: 'center'
    }}>
      <Box sx={{ 
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {/* 外圈脉冲动画 */}
        <Box sx={{
          position: 'absolute',
          width: 80,
          height: 80,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          opacity: 0.1,
          animation: 'pulse 2s infinite'
        }} />
        <Box sx={{
          position: 'absolute',
          width: 60,
          height: 60,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          opacity: 0.2,
          animation: 'pulse 2s infinite 0.5s'
        }} />
        {/* 中心图标 */}
        <Box sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          bgcolor: 'primary.main',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}>
          <Icon />
        </Box>
      </Box>
      
      <Box>
        <Typography variant="h6" color="text.primary" gutterBottom>
          {text}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {subText}
        </Typography>
      </Box>
      
      {/* CSS动画定义 */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            transform: scale(0.8);
            opacity: 0.3;
          }
          50% {
            transform: scale(1.2);
            opacity: 0.1;
          }
          100% {
            transform: scale(0.8);
            opacity: 0.3;
          }
        }
      `}</style>
    </Box>
  </Fade>
);

// 刷新加载器
export const RefreshLoader = ({ 
  text = "正在刷新数据...",
  spinning = true 
}) => (
  <Box sx={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 1, 
    p: 2,
    justifyContent: 'center'
  }}>
    <RefreshIcon sx={{ 
      animation: spinning ? 'spin 1s linear infinite' : 'none',
      color: 'primary.main'
    }} />
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
    
    <style jsx>{`
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `}</style>
  </Box>
);

// 数据获取加载器
export const DataFetchLoader = ({ 
  stage = "connecting", 
  progress = 0 
}) => {
  const stages = {
    connecting: { text: "连接服务器...", icon: CloudDownloadIcon },
    fetching: { text: "获取数据...", icon: CloudDownloadIcon },
    processing: { text: "处理数据...", icon: RefreshIcon },
    rendering: { text: "渲染界面...", icon: InventoryIcon }
  };
  
  const currentStage = stages[stage] || stages.connecting;
  const Icon = currentStage.icon;
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        mb: 2,
        justifyContent: 'center'
      }}>
        <Icon color="primary" />
        <Typography variant="body1" color="text.primary">
          {currentStage.text}
        </Typography>
      </Box>
      
      <LinearProgress 
        variant={progress > 0 ? "determinate" : "indeterminate"}
        value={progress}
        sx={{ 
          height: 4, 
          borderRadius: 2,
          bgcolor: 'grey.200',
          '& .MuiLinearProgress-bar': {
            borderRadius: 2
          }
        }}
      />
      
      {progress > 0 && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ display: 'block', textAlign: 'center', mt: 1 }}
        >
          {Math.round(progress)}%
        </Typography>
      )}
    </Box>
  );
};

export default {
  SimpleLoader,
  LoaderWithText,
  ProgressLoader,
  WarehouseStockSkeleton,
  StatCardSkeleton,
  PulseLoader,
  RefreshLoader,
  DataFetchLoader
};