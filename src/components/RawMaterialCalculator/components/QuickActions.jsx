import React from 'react';
import {
  Box,
  Button,
  Chip,
  Stack,
  Typography,
  Tooltip,
  IconButton,
  Collapse
} from '@mui/material';
import {
  Speed as SpeedIcon,
  Bookmark as BookmarkIcon,
  History as HistoryIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

const QuickPresets = ({ onApplyPreset, isMobile }) => {
  const [showPresets, setShowPresets] = React.useState(false);
  
  const presets = [
    { name: '早餐套餐', items: { '吐司面包': 50, '牛角包': 30, '丹麦酥': 20 } },
    { name: '午餐热销', items: { '法棍': 40, '全麦面包': 25, '意式面包': 15 } },
    { name: '下午茶', items: { '司康饼': 35, '马卡龙': 20, '泡芙': 25 } },
    { name: '周末特供', items: { '生日蛋糕': 10, '慕斯蛋糕': 15, '芝士蛋糕': 12 } }
  ];

  return (
    <Box sx={{ mb: 2 }}>
      <Button
        variant="outlined"
        onClick={() => setShowPresets(!showPresets)}
        startIcon={showPresets ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        endIcon={<BookmarkIcon />}
        size={isMobile ? "small" : "medium"}
        sx={{ mb: 1 }}
      >
        快速预设方案
      </Button>
      
      <Collapse in={showPresets}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {presets.map((preset, index) => (
            <Tooltip key={index} title={`包含: ${Object.keys(preset.items).join(', ')}`}>
              <Chip
                label={preset.name}
                onClick={() => onApplyPreset(preset.items)}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
                sx={{ mb: 1, cursor: 'pointer', '&:hover': { bgcolor: 'primary.50' } }}
              />
            </Tooltip>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
};

const QuickActions = ({ 
  onApplyPreset, 
  onQuickCalculate, 
  hasData, 
  isMobile,
  recentCalculations = [] 
}) => {
  const [showHistory, setShowHistory] = React.useState(false);

  return (
    <Box sx={{ mb: 3, p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <SpeedIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          快速操作
        </Typography>
      </Box>

      {/* 快速预设 */}
      <QuickPresets onApplyPreset={onApplyPreset} isMobile={isMobile} />

      {/* 快速计算按钮 */}
      {hasData && (
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            onClick={onQuickCalculate}
            startIcon={<SpeedIcon />}
            size={isMobile ? "small" : "medium"}
            color="secondary"
          >
            快速计算 (跳过成本分析)
          </Button>
        </Box>
      )}

      {/* 历史记录 */}
      {recentCalculations.length > 0 && (
        <Box>
          <Button
            variant="text"
            onClick={() => setShowHistory(!showHistory)}
            startIcon={<HistoryIcon />}
            size="small"
          >
            最近计算 ({recentCalculations.length})
          </Button>
          
          <Collapse in={showHistory}>
            <Stack spacing={1} sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
              {recentCalculations.slice(0, 5).map((calc, index) => (
                <Box 
                  key={index}
                  sx={{ 
                    p: 1, 
                    bgcolor: 'white', 
                    borderRadius: 1, 
                    border: '1px solid', 
                    borderColor: 'grey.200',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'primary.50' }
                  }}
                  onClick={() => onApplyPreset(calc.quantities)}
                >
                  <Typography variant="caption" color="text.secondary">
                    {calc.date} - {calc.totalProducts}个产品
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    预估成本: ¥{calc.totalCost}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}
    </Box>
  );
};

export default QuickActions;