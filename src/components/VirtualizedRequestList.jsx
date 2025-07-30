import React, { memo, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Box, Card, CardContent, Typography, Chip } from '@mui/material';

const RequestItem = memo(({ index, style, data }) => {
  const { requests, getStatusChipColor, STATUS_MAP } = data;
  const req = requests[index];

  return (
    <div style={style}>
      <Card
        sx={{
          m: 1,
          boxShadow: 2,
          borderRadius: 2,
          borderLeft: "4px solid",
          borderColor: `${getStatusChipColor(req.status)}.main`,
        }}
        variant="outlined"
      >
        <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              mb: 1.5,
            }}
          >
            <Box>
              <Typography variant="body1" sx={{ fontWeight: "bold" }}>
                申请人: {req.requestedBy || "未知"}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                {new Date(req.createdAt).toLocaleString("zh-CN", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Typography>
            </Box>
            <Chip
              label={STATUS_MAP[req.status] || req.status}
              color={getStatusChipColor(req.status)}
              size="small"
              sx={{ mt: 0.5 }}
            />
          </Box>
          {/* 物品列表简化显示 */}
          <Typography variant="body2" color="text.secondary">
            {req.items.length} 种物品
          </Typography>
        </CardContent>
      </Card>
    </div>
  );
});

RequestItem.displayName = 'RequestItem';

const VirtualizedRequestList = ({ 
  requests, 
  height = 600,
  getStatusChipColor,
  STATUS_MAP 
}) => {
  const itemData = useMemo(() => ({
    requests,
    getStatusChipColor,
    STATUS_MAP
  }), [requests, getStatusChipColor, STATUS_MAP]);

  if (requests.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="h6" color="text.secondary">
          没有找到申请记录
        </Typography>
      </Box>
    );
  }

  return (
    <List
      height={height}
      itemCount={requests.length}
      itemSize={120} // 每个项目的高度
      itemData={itemData}
    >
      {RequestItem}
    </List>
  );
};

export default memo(VirtualizedRequestList);