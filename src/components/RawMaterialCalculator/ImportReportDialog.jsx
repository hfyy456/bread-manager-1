import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon
} from '@mui/icons-material';

const ImportReportDialog = ({ open, onClose, report }) => {
  if (!report) return null;

  const { summary, results } = report;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircleIcon color="success" />;
      case 'not_found':
        return <CancelIcon color="error" />;
      case 'invalid_quantity':
        return <WarningIcon color="warning" />;
      default:
        return <CancelIcon color="error" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'not_found':
        return 'error';
      case 'invalid_quantity':
        return 'warning';
      default:
        return 'error';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'not_found':
        return '未找到';
      case 'invalid_quantity':
        return '数量无效';
      default:
        return '错误';
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">Excel 导入报告</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip 
              label={`总计: ${summary.success + summary.notFound + summary.invalid}`} 
              size="small" 
              variant="outlined" 
            />
          </Box>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {/* 导入概要 */}
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          导入概要
        </Typography>
        
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`成功: ${summary.success} 项`}
            color="success"
            variant={summary.success > 0 ? "filled" : "outlined"}
          />
          <Chip
            icon={<CancelIcon />}
            label={`未找到: ${summary.notFound} 项`}
            color="error"
            variant={summary.notFound > 0 ? "filled" : "outlined"}
          />
          <Chip
            icon={<WarningIcon />}
            label={`无效数量: ${summary.invalid} 项`}
            color="warning"
            variant={summary.invalid > 0 ? "filled" : "outlined"}
          />
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* 详细信息 */}
        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          详细信息
        </Typography>
        
        <List dense sx={{ maxHeight: '400px', overflow: 'auto' }}>
          {results.map((item, index) => (
            <ListItem 
              key={index} 
              divider
              sx={{
                bgcolor: item.status === 'success' ? 'success.50' : 
                        item.status === 'not_found' ? 'error.50' : 'warning.50',
                borderRadius: 1,
                mb: 0.5,
                border: '1px solid',
                borderColor: item.status === 'success' ? 'success.200' : 
                           item.status === 'not_found' ? 'error.200' : 'warning.200'
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {getStatusIcon(item.status)}
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {item.name}
                    </Typography>
                    <Chip 
                      label={getStatusText(item.status)}
                      size="small"
                      color={getStatusColor(item.status)}
                      variant="outlined"
                    />
                    {item.value && (
                      <Typography variant="caption" color="text.secondary">
                        数量: "{item.value}"
                      </Typography>
                    )}
                  </Box>
                }
                secondary={item.status !== 'success' ? item.message : `成功导入数量: ${item.value}`}
                primaryTypographyProps={{ 
                  style: { 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  } 
                }}
              />
            </ListItem>
          ))}
        </List>

        {/* 操作建议 */}
        {(summary.notFound > 0 || summary.invalid > 0) && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'info.50', borderRadius: 1, border: '1px solid', borderColor: 'info.200' }}>
            <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600, color: 'info.main' }}>
              操作建议
            </Typography>
            <Stack spacing={1}>
              {summary.notFound > 0 && (
                <Typography variant="body2">
                  • 请检查产品名称是否与系统中的产品名称完全一致（包括空格和标点符号）
                </Typography>
              )}
              {summary.invalid > 0 && (
                <Typography variant="body2">
                  • 请确保数量列中只包含有效的正整数
                </Typography>
              )}
              <Typography variant="body2">
                • 可以下载导入模板以确保格式正确
              </Typography>
            </Stack>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          关闭
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportReportDialog;