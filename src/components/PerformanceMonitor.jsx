import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  IconButton,
  Collapse,
  LinearProgress,
  Alert,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Memory as MemoryIcon,
  Timeline as TimelineIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { generateReport } from '../utils/performanceMonitor';

const PerformanceMonitor = ({ 
  show = false, 
  position = 'bottom-right',
  autoHide = true 
}) => {
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState([]);
  const [memoryUsage, setMemoryUsage] = useState(null);
  const [warnings, setWarnings] = useState([]);

  // 获取性能指标
  const updateMetrics = useCallback(() => {
    const report = generateReport();
    if (report) {
      setMetrics(report.metrics || []);
      
      // 检查性能警告
      const newWarnings = [];
      if (report.slowOperations?.length > 0) {
        newWarnings.push(`${report.slowOperations.length} 个慢操作`);
      }
      if (report.averageDuration > 1000) {
        newWarnings.push('平均响应时间过长');
      }
      setWarnings(newWarnings);
    }
  }, []);

  // 获取内存使用情况
  const updateMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = performance.memory;
      setMemoryUsage({
        used: Math.round(memory.usedJSHeapSize / 1024 / 1024),
        total: Math.round(memory.totalJSHeapSize / 1024 / 1024),
        limit: Math.round(memory.jsHeapSizeLimit / 1024 / 1024)
      });
    }
  }, []);

  // 定期更新指标
  useEffect(() => {
    if (!show) return;

    const interval = setInterval(() => {
      updateMetrics();
      updateMemoryUsage();
    }, 2000);

    // 初始更新
    updateMetrics();
    updateMemoryUsage();

    return () => clearInterval(interval);
  }, [show, updateMetrics, updateMemoryUsage]);

  // 自动隐藏逻辑
  useEffect(() => {
    if (autoHide && warnings.length === 0 && metrics.length === 0) {
      const timer = setTimeout(() => {
        setExpanded(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [autoHide, warnings.length, metrics.length]);

  if (!show) return null;

  const positionStyles = {
    'bottom-right': {
      position: 'fixed',
      bottom: 16,
      right: 16,
      zIndex: 1300
    },
    'bottom-left': {
      position: 'fixed',
      bottom: 16,
      left: 16,
      zIndex: 1300
    },
    'top-right': {
      position: 'fixed',
      top: 16,
      right: 16,
      zIndex: 1300
    }
  };

  const hasWarnings = warnings.length > 0;
  const recentMetrics = metrics.slice(0, 5);

  return (
    <Paper
      sx={{
        ...positionStyles[position],
        minWidth: 280,
        maxWidth: 400,
        bgcolor: hasWarnings ? 'warning.50' : 'background.paper',
        border: hasWarnings ? '1px solid' : 'none',
        borderColor: hasWarnings ? 'warning.main' : 'transparent'
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
        <SpeedIcon 
          sx={{ 
            mr: 1, 
            color: hasWarnings ? 'warning.main' : 'primary.main' 
          }} 
        />
        <Typography variant="subtitle2" sx={{ flex: 1 }}>
          性能监控
        </Typography>
        
        {warnings.length > 0 && (
          <Chip
            label={warnings.length}
            size="small"
            color="warning"
            sx={{ mr: 1 }}
          />
        )}
        
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* 展开内容 */}
      <Collapse in={expanded}>
        <Box sx={{ p: 1.5, pt: 0 }}>
          {/* 警告信息 */}
          {warnings.length > 0 && (
            <Alert 
              severity="warning" 
              sx={{ mb: 2, fontSize: '0.75rem' }}
              icon={<WarningIcon fontSize="small" />}
            >
              <Typography variant="caption">
                {warnings.join(', ')}
              </Typography>
            </Alert>
          )}

          {/* 内存使用情况 */}
          {memoryUsage && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <MemoryIcon sx={{ mr: 1, fontSize: 16 }} />
                <Typography variant="caption">
                  内存使用: {memoryUsage.used}MB / {memoryUsage.total}MB
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(memoryUsage.used / memoryUsage.total) * 100}
                sx={{ height: 4, borderRadius: 2 }}
                color={memoryUsage.used / memoryUsage.total > 0.8 ? 'warning' : 'primary'}
              />
            </Box>
          )}

          {/* 最近的性能指标 */}
          {recentMetrics.length > 0 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <TimelineIcon sx={{ mr: 1, fontSize: 16 }} />
                <Typography variant="caption">
                  最近操作
                </Typography>
              </Box>
              
              <Grid container spacing={1}>
                {recentMetrics.map((metric, index) => (
                  <Grid item xs={12} key={index}>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 0.5,
                        bgcolor: 'grey.50',
                        borderRadius: 1,
                        fontSize: '0.75rem'
                      }}
                    >
                      <Tooltip title={metric.key}>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            flex: 1, 
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {metric.key}
                        </Typography>
                      </Tooltip>
                      
                      <Chip
                        label={`${metric.duration?.toFixed(0) || 0}ms`}
                        size="small"
                        variant="outlined"
                        color={
                          (metric.duration || 0) < 100 
                            ? 'success' 
                            : (metric.duration || 0) < 500 
                              ? 'warning' 
                              : 'error'
                        }
                        sx={{ 
                          fontSize: '0.6rem',
                          height: 16,
                          '& .MuiChip-label': { px: 0.5 }
                        }}
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* 无数据提示 */}
          {recentMetrics.length === 0 && warnings.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center', display: 'block' }}>
              暂无性能数据
            </Typography>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};

export default React.memo(PerformanceMonitor);