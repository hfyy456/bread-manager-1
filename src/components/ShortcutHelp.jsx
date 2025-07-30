import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Fade
} from '@mui/material';
import {
  Keyboard as KeyboardIcon,
  Close as CloseIcon,
  Help as HelpIcon
} from '@mui/icons-material';

const ShortcutHelp = ({ 
  open, 
  onClose, 
  shortcuts = [] 
}) => {
  const defaultShortcuts = [
    { key: 'Ctrl + S', action: '保存所有更改', category: '编辑' },
    { key: 'Ctrl + R', action: '刷新数据', category: '导航' },
    { key: 'F5', action: '刷新数据', category: '导航' },
    { key: 'Ctrl + Z', action: '重置更改', category: '编辑' },
    { key: 'Ctrl + A', action: '全选物料', category: '选择' },
    { key: 'Escape', action: '清除选择', category: '选择' },
    { key: 'Ctrl + F', action: '切换过滤器', category: '搜索' },
    { key: 'Ctrl + E', action: '导出数据', category: '数据' },
    { key: '?', action: '显示快捷键帮助', category: '帮助' }
  ];

  const allShortcuts = shortcuts.length > 0 ? shortcuts : defaultShortcuts;

  // 按类别分组
  const groupedShortcuts = allShortcuts.reduce((groups, shortcut) => {
    const category = shortcut.category || '其他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(shortcut);
    return groups;
  }, {});

  const categoryColors = {
    '编辑': 'primary',
    '导航': 'secondary',
    '选择': 'success',
    '搜索': 'info',
    '数据': 'warning',
    '帮助': 'error',
    '其他': 'default'
  };

  const formatKeyCombo = (keyCombo) => {
    return keyCombo.split(' + ').map((key, index, array) => (
      <React.Fragment key={key}>
        <Chip
          label={key}
          size="small"
          variant="outlined"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            height: 24,
            bgcolor: 'grey.100'
          }}
        />
        {index < array.length - 1 && (
          <Typography
            component="span"
            sx={{ mx: 0.5, color: 'text.secondary' }}
          >
            +
          </Typography>
        )}
      </React.Fragment>
    ));
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: 500 }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <KeyboardIcon color="primary" />
          <Typography variant="h6" sx={{ flex: 1 }}>
            键盘快捷键
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary" paragraph>
          使用以下快捷键可以提高操作效率：
        </Typography>

        {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
          <Fade in timeout={300} key={category}>
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Chip
                  label={category}
                  color={categoryColors[category] || 'default'}
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
                <Typography variant="caption" color="text.secondary">
                  {categoryShortcuts.length} 个快捷键
                </Typography>
              </Box>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold', width: '40%' }}>
                        快捷键
                      </TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>
                        功能
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categoryShortcuts.map((shortcut, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {formatKeyCombo(shortcut.key)}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {shortcut.action}
                          </Typography>
                          {shortcut.description && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {shortcut.description}
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Fade>
        ))}

        <Box sx={{ 
          mt: 3, 
          p: 2, 
          bgcolor: 'info.50', 
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'info.200'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <HelpIcon color="info" fontSize="small" />
            <Typography variant="subtitle2" color="info.main">
              使用提示
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            • 在输入框中时，只有 Ctrl/Cmd 组合键生效<br />
            • 快捷键执行时会显示确认提示<br />
            • 按 ? 键可以随时打开此帮助窗口<br />
            • Mac 用户请使用 Cmd 键替代 Ctrl 键
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained">
          知道了
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// 快捷键帮助触发器组件
export const ShortcutHelpTrigger = ({ shortcuts = [] }) => {
  const [open, setOpen] = useState(false);

  // 监听 ? 键
  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === '?' && !event.ctrlKey && !event.metaKey) {
        // 检查是否在输入框中
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName
        );
        
        if (!isInputFocused) {
          event.preventDefault();
          setOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <Tooltip title="键盘快捷键 (按 ? 键)">
        <IconButton
          onClick={() => setOpen(true)}
          size="small"
          sx={{
            position: 'fixed',
            bottom: 16,
            left: 16,
            bgcolor: 'background.paper',
            boxShadow: 2,
            '&:hover': {
              bgcolor: 'action.hover'
            }
          }}
        >
          <KeyboardIcon />
        </IconButton>
      </Tooltip>

      <ShortcutHelp
        open={open}
        onClose={() => setOpen(false)}
        shortcuts={shortcuts}
      />
    </>
  );
};

export default ShortcutHelp;