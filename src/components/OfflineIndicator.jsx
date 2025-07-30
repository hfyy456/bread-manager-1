import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Collapse,
  Button,
  Alert,
  LinearProgress,
  Tooltip,
  Badge
} from '@mui/material';
import {
  CloudOff as OfflineIcon,
  Cloud as OnlineIcon,
  Sync as SyncIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useOfflineWarehouse } from '../hooks/useOfflineWarehouse';

const OfflineIndicator = ({ 
  position = 'top-right',
  autoHide = true 
}) => {
  const [expanded, setExpanded] = useState(false);
  const {
    isOnline,
    pendingChanges,
    syncStatus,
    lastSyncTime,
    forcSync,
    clearOfflineData,
    getOfflineStats
  } = useOfflineWarehouse();

  const stats = getOfflineStats();

  // 如果在线且没有待同步数据，且设置了自动隐藏，则不显示
  if (autoHide && isOnline && pendingChanges.length === 0) {
    return null;
  }

  const positionStyles = {
    'top-right': {
      position: 'fixed',
      top: 80,
      right: 16,
      zIndex: 1200
    },
    'top-left': {
      position: 'fixed',
      top: 80,
      left: 16,
      zIndex: 1200
    },
    'bottom-right': {
      position: 'fixed',
      bottom: 80,
      right: 16,
      zIndex: 1200
    }
  };

  const getSyncStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <SyncIcon sx={{ animation: 'spin 1s linear infinite' }} />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'idle':
        return pendingChanges.length > 0 ? <WarningIcon color="warning" /> : <CheckIcon color="success" />;
      default:
        return <SyncIcon />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return '同步中...';
      case 'error':
        return '同步失败';
      case 'idle':
        return pendingChanges.length > 0 ? '待同步' : '已同步';
      default:
        return '未知状态';
    }
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return '从未同步';
    
    const now = Date.now();
    const diff = now - lastSyncTime;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}小时前`;
    } else if (minutes > 0) {
      return `${minutes}分钟前`;
    } else {
      return '刚刚';
    }
  };

  return (
    <>
      <Paper
        sx={{
          ...positionStyles[position],
          minWidth: 200,
          maxWidth: 350,
          bgcolor: isOnline ? 'background.paper' : 'warning.50',
          border: isOnline ? 'none' : '1px solid',
          borderColor: isOnline ? 'transparent' : 'warning.main'
        }}
        elevation={4}
      >
        {/* 头部 */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            p: 1.5,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'action.hover' }
          }}
          onClick={() => setExpanded(!expanded)}
        >
          <Badge
            badgeContent={pendingChanges.length}
            color="warning"
            sx={{ mr: 1 }}
          >
            {isOnline ? (
              <OnlineIcon color="success" />
            ) : (
              <OfflineIcon color="warning" />
            )}
          </Badge>
          
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2">
              {isOnline ? '在线' : '离线模式'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getSyncStatusText()}
            </Typography>
          </Box>
          
          <IconButton size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* 展开内容 */}
        <Collapse in={expanded}>
          <Box sx={{ p: 1.5, pt: 0 }}>
            {/* 网络状态 */}
            <Alert 
              severity={isOnline ? 'success' : 'warning'} 
              sx={{ mb: 2, fontSize: '0.75rem' }}
            >
              <Typography variant="caption">
                {isOnline 
                  ? '网络连接正常，数据将自动同步'
                  : '网络连接断开，更改将保存在本地'
                }
              </Typography>
            </Alert>

            {/* 同步状态 */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {getSyncStatusIcon()}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  同步状态: {getSyncStatusText()}
                </Typography>
              </Box>
              
              {syncStatus === 'syncing' && (
                <LinearProgress size="small" sx={{ mb: 1 }} />
              )}
              
              <Typography variant="caption" color="text.secondary">
                最后同步: {formatLastSyncTime()}
              </Typography>
            </Box>

            {/* 待同步数据 */}
            {pendingChanges.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  待同步更改: {pendingChanges.length} 项
                </Typography>
                
                <Box sx={{ maxHeight: 100, overflow: 'auto' }}>
                  {pendingChanges.slice(0, 5).map((change, index) => (
                    <Box
                      key={change.id}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 0.5,
                        px: 1,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    >
                      <Typography variant="caption">
                        {change.type === 'bulkUpdate' 
                          ? `批量更新 ${change.updates?.length || 0} 项`
                          : '单项更新'
                        }
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(change.timestamp).toLocaleTimeString()}
                      </Typography>
                    </Box>
                  ))}
                  
                  {pendingChanges.length > 5 && (
                    <Typography variant="caption" color="text.secondary">
                      还有 {pendingChanges.length - 5} 项...
                    </Typography>
                  )}
                </Box>
              </Box>
            )}

            {/* 存储使用情况 */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                本地存储: {stats.storageUsed} KB
              </Typography>
            </Box>

            {/* 操作按钮 */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {isOnline && pendingChanges.length > 0 && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<SyncIcon />}
                  onClick={forcSync}
                  disabled={syncStatus === 'syncing'}
                >
                  立即同步
                </Button>
              )}
              
              {pendingChanges.length > 0 && (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => {
                    if (confirm('确定要清除所有离线数据吗？此操作不可撤销。')) {
                      clearOfflineData();
                    }
                  }}
                >
                  清除数据
                </Button>
              )}
            </Box>
          </Box>
        </Collapse>
      </Paper>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default React.memo(OfflineIndicator);