import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  Chip,
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  Divider,
  Button,
  CardActions,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { startOfDay, endOfDay, format } from "date-fns";
import HistoryIcon from "@mui/icons-material/History";
import {
  STATUS_MAP,
  STATUS_COLORS,
  API_ENDPOINTS,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES,
} from "../constants";

const getStatusChipColor = (status) => {
  return STATUS_COLORS[status] || "warning";
};

const AllRequestsView = ({ storeId, user }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [startDate, setStartDate] = useState(startOfDay(new Date()));
  const [endDate, setEndDate] = useState(endOfDay(new Date()));
  const [nameFilter, setNameFilter] = useState("");
  const [aggregateMode, setAggregateMode] = useState(true);
  const [isWarehouseManager, setIsWarehouseManager] = useState(false);
  const [approvingRequests, setApprovingRequests] = useState(new Set());

  const fetchAllRequests = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    setError("");
    try {
      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      // Corrected URL to match the existing backend route
      const response = await fetch(
        `/api/transfer-requests?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "获取申请记录失败");
      }
      const data = await response.json();
      setRequests(
        data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storeId, startDate, endDate]);

  useEffect(() => {
    fetchAllRequests();
  }, [fetchAllRequests]);

  // 检查用户是否为库管
  useEffect(() => {
    const checkWarehouseManager = async () => {
      if (!storeId || !user?.name) return;

      try {
        const response = await fetch(`/api/stores/${storeId}`);
        if (response.ok) {
          const result = await response.json();
          const managers = result.data?.warehouseManagers || [];
          setIsWarehouseManager(managers.includes(user.name));
        }
      } catch (error) {
        console.error("检查库管权限失败:", error);
      }
    };

    checkWarehouseManager();
  }, [storeId, user]);

  // 根据名字过滤申请记录 - 优化搜索性能
  const filteredRequests = useMemo(() => {
    const trimmedFilter = nameFilter.trim().toLowerCase();
    if (!trimmedFilter) {
      return requests;
    }
    return requests.filter(
      (req) =>
        req.requestedBy && req.requestedBy.toLowerCase().includes(trimmedFilter)
    );
  }, [requests, nameFilter]);

  // 聚合物料数据
  const aggregatedData = useMemo(() => {
    if (!aggregateMode) return null;

    const itemMap = new Map();
    const requesters = new Set();

    filteredRequests.forEach((req) => {
      requesters.add(req.requestedBy || "未知");
      req.items.forEach((item) => {
        const key = item.name;
        if (itemMap.has(key)) {
          const existing = itemMap.get(key);
          existing.quantity += item.quantity;
          existing.requesters.add(req.requestedBy || "未知");
        } else {
          itemMap.set(key, {
            name: item.name,
            unit: item.unit,
            quantity: item.quantity,
            requesters: new Set([req.requestedBy || "未知"]),
          });
        }
      });
    });

    return {
      items: Array.from(itemMap.values()).map((item) => ({
        ...item,
        requesters: Array.from(item.requesters),
      })),
      totalRequesters: requesters.size,
      totalRequests: filteredRequests.length,
    };
  }, [filteredRequests, aggregateMode]);

  // 批准申请
  const handleApproveRequest = async (requestId) => {
    if (!user?.name) {
      alert("用户信息缺失");
      return;
    }

    setApprovingRequests((prev) => new Set(prev).add(requestId));

    try {
      const response = await fetch(
        `/api/transfer-requests/${requestId}/mobile-approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userName: user.name }),
        }
      );

      const result = await response.json();

      if (response.ok) {
        alert("申请已批准！");
        fetchAllRequests(); // 刷新数据
      } else {
        alert(result.message || "批准失败");
      }
    } catch (error) {
      console.error("批准申请失败:", error);
      alert("批准申请时发生错误");
    } finally {
      setApprovingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Typography
          variant="h5"
          component="h1"
          gutterBottom
          sx={{ fontWeight: "bold", textAlign: "center", my: 2 }}
        >
          所有申请单据
        </Typography>
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6}>
              <DatePicker
                label="开始日期"
                value={startDate}
                onChange={(newValue) => setStartDate(startOfDay(newValue))}
                renderInput={(params) => (
                  <TextField {...params} fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={6}>
              <DatePicker
                label="结束日期"
                value={endDate}
                onChange={(newValue) => setEndDate(endOfDay(newValue))}
                renderInput={(params) => (
                  <TextField {...params} fullWidth size="small" />
                )}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="按申请人姓名过滤"
                placeholder="输入申请人姓名..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
              <FormControlLabel
                control={
                  <Switch
                    checked={aggregateMode}
                    onChange={(e) => setAggregateMode(e.target.checked)}
                    color="primary"
                  />
                }
                label="聚合模式 - 按物料汇总当天所有申请"
              />
            </Grid>
          </Grid>
        </Paper>

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
            <CircularProgress />
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ my: 2 }}>
            {error}
          </Alert>
        )}

        {!loading &&
          !error &&
          (filteredRequests.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 4, textAlign: "center", mt: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="h6" color="text.secondary" sx={{ mt: 1 }}>
                {nameFilter.trim()
                  ? "没有找到匹配的申请记录"
                  : "该日期范围内没有申请记录"}
              </Typography>
            </Paper>
          ) : aggregateMode ? (
            // 聚合模式显示
            <Box>
              <Paper sx={{ p: 2, mb: 2, bgcolor: "info.50" }}>
                <Typography variant="h6" color="info.main" gutterBottom>
                  物料汇总统计
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      总申请人数
                    </Typography>
                    <Typography variant="h6">
                      {aggregatedData.totalRequesters}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      总申请单数
                    </Typography>
                    <Typography variant="h6">
                      {aggregatedData.totalRequests}
                    </Typography>
                  </Grid>
                  <Grid item xs={4}>
                    <Typography variant="body2" color="text.secondary">
                      物料种类
                    </Typography>
                    <Typography variant="h6">
                      {aggregatedData.items.length}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {aggregatedData.items.map((item, index) => (
                <Card
                  key={index}
                  sx={{ mb: 2, boxShadow: 2, borderRadius: 2 }}
                  variant="outlined"
                >
                  <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                        {item.name}
                      </Typography>
                      <Chip
                        label={`总计: ${item.quantity} ${item.unit || ""}`}
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 1 }}
                    >
                      申请人: {item.requesters.join(", ")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      共 {item.requesters.length} 人申请
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            // 普通模式显示
            filteredRequests.map((req) => (
              <Card
                key={req._id}
                sx={{
                  mb: 2,
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

                  <List dense sx={{ mt: 1, p: 0 }}>
                    {req.items.map((item, index) => (
                      <ListItem key={index} sx={{ py: 0.25, px: 0 }}>
                        <ListItemText
                          primary={item.name}
                          secondary={`x ${item.quantity} ${item.unit || ""}`}
                          primaryTypographyProps={{ variant: "body1" }}
                          secondaryTypographyProps={{
                            variant: "body2",
                            color: "text.secondary",
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {req.notes && (
                    <Typography
                      variant="body2"
                      sx={{
                        mt: 1.5,
                        fontStyle: "italic",
                        color: "text.secondary",
                        p: 1.5,
                        backgroundColor: "grey.100",
                        borderRadius: 1,
                      }}
                    >
                      备注: {req.notes}
                    </Typography>
                  )}
                </CardContent>

                {/* 库管批准按钮 */}
                {isWarehouseManager && req.status === "pending" && (
                  <CardActions sx={{ pt: 0, px: 1.5, pb: 1.5 }}>
                    <Button
                      variant="contained"
                      color="success"
                      size="small"
                      onClick={() => handleApproveRequest(req._id)}
                      disabled={approvingRequests.has(req._id)}
                      startIcon={
                        approvingRequests.has(req._id) ? (
                          <CircularProgress size={16} />
                        ) : null
                      }
                    >
                      {approvingRequests.has(req._id)
                        ? "批准中..."
                        : "批准申请"}
                    </Button>
                  </CardActions>
                )}
              </Card>
            ))
          ))}
      </Box>
    </LocalizationProvider>
  );
};

export default AllRequestsView;
