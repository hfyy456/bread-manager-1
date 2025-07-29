import React from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import { Inventory as InventoryIcon, Store as StoreIcon } from '@mui/icons-material';

const StockBreakdown = ({ 
  mainWarehouseStock = 0, 
  postStock = 0, 
  unit = '', 
  compact = false,
  showTooltip = true 
}) => {
  const totalStock = mainWarehouseStock + postStock;
  
  // 计算百分比
  const mainPercentage = totalStock > 0 ? (mainWarehouseStock / totalStock * 100) : 0;
  const postPercentage = totalStock > 0 ? (postStock / totalStock * 100) : 0;

  const content = (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: compact ? 'row' : 'column',
      alignItems: compact ? 'center' : 'flex-end',
      gap: compact ? 1 : 0.5,
      minWidth: compact ? 'auto' : 80
    }}>
      {compact ? (
        // 紧凑模式：横向显示
        <>
          <Chip 
            icon={<InventoryIcon />}
            label={`${mainWarehouseStock.toFixed(1)}`}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
          <Typography variant="caption" color="text.secondary">+</Typography>
          <Chip 
            icon={<StoreIcon />}
            label={`${postStock.toFixed(1)}`}
            size="small"
            variant="outlined"
            color="secondary"
            sx={{ fontSize: '0.7rem', height: 20 }}
          />
        </>
      ) : (
        // 标准模式：纵向显示
        <>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <InventoryIcon sx={{ fontSize: 12, color: 'primary.main' }} />
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'primary.main' }}>
              {mainWarehouseStock.toFixed(1)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <StoreIcon sx={{ fontSize: 12, color: 'secondary.main' }} />
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: 'secondary.main' }}>
              {postStock.toFixed(1)}
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ 
            fontSize: '0.7rem', 
            color: 'text.secondary',
            borderTop: '1px solid',
            borderColor: 'divider',
            pt: 0.5,
            mt: 0.5
          }}>
            = {totalStock.toFixed(1)} {unit}
          </Typography>
        </>
      )}
    </Box>
  );

  if (!showTooltip) {
    return content;
  }

  return (
    <Tooltip 
      title={
        <Box>
          <Typography variant="body2" gutterBottom>库存分解详情</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <InventoryIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">
              主仓库存: {mainWarehouseStock.toFixed(2)} {unit} ({mainPercentage.toFixed(1)}%)
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <StoreIcon sx={{ fontSize: 16 }} />
            <Typography variant="body2">
              岗位库存: {postStock.toFixed(2)} {unit} ({postPercentage.toFixed(1)}%)
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 'bold', mt: 1 }}>
            总库存: {totalStock.toFixed(2)} {unit}
          </Typography>
        </Box>
      }
      arrow
      placement="top"
    >
      <Box sx={{ cursor: 'help' }}>
        {content}
      </Box>
    </Tooltip>
  );
};

export default StockBreakdown;