import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Container,
  Typography,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  CircularProgress,
  Snackbar,
  Alert as MuiAlert,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  AppBar,
  Toolbar,
  LinearProgress,
  Chip,
  Divider,
} from "@mui/material";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  Inventory as InventoryIcon,
  Blender as BlenderIcon,
  Cake as CakeIcon,
  Build as BuildIcon,
  LocalFireDepartment as FireIcon,
  AcUnit as ColdIcon,
  ShoppingBag as BagIcon,
  LocalCafe as CafeIcon,
  Restaurant as RestaurantIcon,
  Store as StoreIcon,
  Work as WorkIcon,
  LocalShipping as LocalShippingIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
} from "@mui/icons-material";

const POSTNAME = {
  1: "搅拌",
  2: "丹麦",
  3: "整形",
  4: "烤炉",
  5: "冷加工",
  6: "收银打包",
  7: "水吧",
  8: "馅料",
  9: "小库房",
};

const POST_ICONS = {
  1: BlenderIcon,
  2: CakeIcon,
  3: BuildIcon,
  4: FireIcon,
  5: ColdIcon,
  6: BagIcon,
  7: CafeIcon,
  8: RestaurantIcon,
  9: StoreIcon,
};

const POST_COLORS = {
  1: '#2196f3', // 蓝色 - 搅拌
  2: '#ff9800', // 橙色 - 丹麦
  3: '#4caf50', // 绿色 - 整形
  4: '#f44336', // 红色 - 烤炉
  5: '#00bcd4', // 青色 - 冷加工
  6: '#9c27b0', // 紫色 - 收银打包
  7: '#795548', // 棕色 - 水吧
  8: '#ff5722', // 深橙 - 馅料
  9: '#607d8b', // 蓝灰 - 小库房
};

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const MobileInventoryCheck = ({ onBack }) => {
  const navigate = useNavigate();
  const [allIngredients, setAllIngredients] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [errorIngredients, setErrorIngredients] = useState(null);

  const [selectedPost, setSelectedPost] = useState("");
  const [postIngredients, setPostIngredients] = useState([]);
  const [stockInputs, setStockInputs] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingSubmitData, setPendingSubmitData] = useState(null);
  const [missingCount, setMissingCount] = useState(0);

  const fetchIngredients = useCallback(async () => {
    setLoadingIngredients(true);
    setErrorIngredients(null);
    try {
      const response = await fetch("/api/ingredients/list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-current-store-id": localStorage.getItem("currentStoreId"),
        },
        body: JSON.stringify({}),
      });
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        console.log("MobileInventoryCheck - 获取到的原料数据:", result.data);
        console.log("第一个原料的post字段:", result.data[0]?.post);
        setAllIngredients(result.data);
      } else {
        setErrorIngredients(
          result.message || "Failed to load ingredients data."
        );
      }
    } catch (err) {
      setErrorIngredients(`Error fetching ingredients: ${err.message}`);
    } finally {
      setLoadingIngredients(false);
    }
  }, []);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  useEffect(() => {
    if (selectedPost && allIngredients.length > 0) {
      console.log("MobileInventoryCheck - 选择的岗位:", selectedPost);
      console.log("MobileInventoryCheck - 所有原料数量:", allIngredients.length);
      
      // 修改过滤逻辑：根据stockByPost字段过滤，显示该岗位有库存的原料
      const filtered = allIngredients.filter((ing, index) => {
        // 检查该原料是否在选择的岗位有库存
        const hasStockInPost = ing.stockByPost && 
                              ing.stockByPost[selectedPost] && 
                              ing.stockByPost[selectedPost].quantity > 0;
        
        // 或者检查该原料是否分配给该岗位（备用逻辑）
        const isAssignedToPost = Array.isArray(ing.post) &&
                                ing.post.map(String).includes(String(selectedPost));
        
        if (index < 3) { // 只打印前3个原料的详细信息
          console.log(`原料 ${index}: ${ing.name}`, {
            stockByPost: ing.stockByPost,
            hasStockInPost: hasStockInPost,
            post: ing.post,
            isAssignedToPost: isAssignedToPost,
            selectedPost: selectedPost,
            finalResult: hasStockInPost || isAssignedToPost
          });
        }
        
        // 显示该岗位有库存的原料，或者分配给该岗位的原料
        return hasStockInPost || isAssignedToPost;
      });
      
      console.log("MobileInventoryCheck - 过滤后的原料:", filtered);
      console.log("MobileInventoryCheck - 过滤后的原料数量:", filtered.length);
      
      setPostIngredients(filtered);
      const initialInputs = {};
      filtered.forEach((ing) => {
        let currentQuantity = "";
        if (ing.stockByPost) {
          const stockMap = new Map(Object.entries(ing.stockByPost));
          if (
            stockMap.has(selectedPost) &&
            stockMap.get(selectedPost) &&
            typeof stockMap.get(selectedPost).quantity === "number"
          ) {
            currentQuantity = stockMap.get(selectedPost).quantity.toString();
          }
        }
        initialInputs[ing._id] = currentQuantity;
      });
      setStockInputs(initialInputs);
    } else {
      setPostIngredients([]);
      setStockInputs({});
    }
  }, [selectedPost, allIngredients]);

  const handleShowSnackbar = (message, severity = "info") => {
    setSnackbarMessage(message);
    setSnackbarSeverity(severity);
    setSnackbarOpen(true);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const handlePostChange = (event) => {
    setSelectedPost(event.target.value);
  };

  const handleStockInputChange = useCallback((ingredientId, value) => {
    const sanitizedValue = value.replace(/[^0-9.]/g, "");
    setStockInputs((prev) => ({ ...prev, [ingredientId]: sanitizedValue }));
  }, []);

  const handleIncrement = (ingredientId) => {
    const currentValue = parseFloat(stockInputs[ingredientId] || 0);
    handleStockInputChange(ingredientId, (currentValue + 1).toString());
  };

  const handleDecrement = (ingredientId) => {
    const currentValue = parseFloat(stockInputs[ingredientId] || 0);
    handleStockInputChange(
      ingredientId,
      Math.max(0, currentValue - 1).toString()
    );
  };

  const handleSubmitStock = async () => {
    if (!selectedPost) {
      handleShowSnackbar("请先选择一个岗位。", "warning");
      return;
    }
    const missing = postIngredients.filter(
      (ing) => stockInputs[ing._id] === "" || stockInputs[ing._id] === undefined
    );
    const stockDataToSubmit = postIngredients
      .map((ing) => ({
        ingredientId: ing._id,
        ingredientName: ing.name,
        quantity: parseFloat(stockInputs[ing._id]),
        unit: ing.unit || ing.baseUnit || ing.min || "g",
        baseUnit: ing.baseUnit || ing.min,
        norms: ing.norms,
      }))
      .filter((item) => !isNaN(item.quantity) && item.quantity >= 0);

    if (stockDataToSubmit.length === 0 && postIngredients.length > 0) {
      handleShowSnackbar("没有有效的库存数量被输入。", "warning");
      return;
    }

    if (missing.length > 0) {
      setMissingCount(missing.length);
      setPendingSubmitData(stockDataToSubmit);
      setConfirmDialogOpen(true);
      return;
    }

    if (stockDataToSubmit.length > 0) {
      await submitStockData(stockDataToSubmit);
    } else if (postIngredients.length === 0) {
      handleShowSnackbar("当前岗位没有需要盘点的物料。", "info");
    }
  };

  const submitStockData = async (data) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/inventory/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: selectedPost, stocks: data }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "HTTP error!");

      if (result.success) {
        handleShowSnackbar(
          result.message || "库存盘点数据提交成功！",
          "success"
        );
        fetchIngredients(); // 重新获取数据以更新理论库存
      } else {
        throw new Error(result.message || "库存提交失败");
      }
    } catch (error) {
      handleShowSnackbar(`提交失败: ${error.message}`, "error");
    } finally {
      setIsSubmitting(false);
      setConfirmDialogOpen(false);
    }
  };

  const handleConfirmSubmit = () => {
    if (pendingSubmitData) {
      submitStockData(pendingSubmitData);
    }
    setConfirmDialogOpen(false);
  };

  const renderIngredientCard = (ing) => {
    const hasInput = stockInputs[ing._id] && stockInputs[ing._id] !== "";
    const unit = ing.unit || ing.baseUnit || ing.min || "g";
    
    return (
      <Card 
        key={ing._id} 
        sx={{ 
          mb: { xs: 1.5, sm: 2 }, // 响应式间距
          mx: { xs: 0, sm: 0 },
          borderRadius: { xs: 2, sm: 3 },
          border: '1px solid #e0e0e0',
          boxShadow: 1,
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'visible',
          // 移动端触摸优化
          touchAction: 'manipulation'
        }}
      >

        
        <CardContent sx={{ 
          pb: 1,
          p: { xs: 2, sm: 3 }, // 响应式内边距
          '&:last-child': { pb: { xs: 2, sm: 3 } }
        }}>
          {/* 原料名称和规格 */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
              {ing.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              规格: {ing.specs || "N/A"} | 单位: {unit}
            </Typography>
          </Box>
          

          
          {/* 数量输入区域 */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
              实际库存录入
            </Typography>
            

            
            <TextField
              fullWidth
              label="请输入实际库存数量"
              variant="outlined"
              type="number"
              value={stockInputs[ing._id] || ""}
              onChange={(e) => {
                const value = e.target.value;
                // 输入验证：只允许非负数，最多2位小数
                if (value === '' || (/^\d*\.?\d{0,2}$/.test(value) && parseFloat(value) >= 0)) {
                  handleStockInputChange(ing._id, value);
                }
              }}
              onFocus={(e) => {
                // 移动端优化：聚焦时选中全部文本
                e.target.select();
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2
                }
              }}
              InputProps={{
                inputProps: {
                  min: 0,
                  step: 0.01,
                  inputMode: 'decimal', // 移动端优化：显示数字键盘
                  pattern: '[0-9]*\.?[0-9]*' // 移动端优化：数字输入模式
                },
                startAdornment: (
                  <InputAdornment position="start">
                    <IconButton
                      onClick={() => handleDecrement(ing._id)}
                      size="small"
                      sx={{
                        minWidth: { xs: 40, sm: 44 },
                        minHeight: { xs: 40, sm: 44 },
                        touchAction: 'manipulation',
                        '&:active': {
                          transform: 'scale(0.95)'
                        }
                      }}
                    >
                      <RemoveIcon />
                    </IconButton>
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => handleIncrement(ing._id)}
                      size="small"
                      sx={{
                        minWidth: { xs: 40, sm: 44 },
                        minHeight: { xs: 40, sm: 44 },
                        touchAction: 'manipulation',
                        mr: 1,
                        '&:active': {
                          transform: 'scale(0.95)'
                        }
                      }}
                    >
                      <AddIcon />
                    </IconButton>
                    <Typography variant="caption" color="text.secondary">
                      {unit}
                    </Typography>
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </CardContent>
      </Card>
    );
  };

  // 计算盘点进度
  const completedCount = useMemo(() => {
    return postIngredients.filter(ing => 
      stockInputs[ing._id] && stockInputs[ing._id] !== ""
    ).length;
  }, [postIngredients, stockInputs]);

  const progressPercentage = postIngredients.length > 0 
    ? (completedCount / postIngredients.length) * 100 
    : 0;

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* 页面头部 */}
      <AppBar position="sticky" elevation={1} sx={{ bgcolor: 'primary.main' }}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => onBack ? onBack() : navigate('/mobileHome')}
            sx={{ mr: 2 }}
          >
            <ArrowBackIcon />
          </IconButton>
          <InventoryIcon sx={{ mr: 1 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            库存盘点
          </Typography>
          {selectedPost && postIngredients.length > 0 && (
            <Chip
              label={`${completedCount}/${postIngredients.length}`}
              size="small"
              color={completedCount === postIngredients.length ? "success" : "default"}
              sx={{ 
                bgcolor: 'rgba(255,255,255,0.2)', 
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          )}
        </Toolbar>
        {/* 进度条 */}
        {selectedPost && postIngredients.length > 0 && (
          <LinearProgress 
            variant="determinate" 
            value={progressPercentage}
            sx={{
              height: 3,
              bgcolor: 'rgba(255,255,255,0.2)',
              '& .MuiLinearProgress-bar': {
                bgcolor: completedCount === postIngredients.length ? '#4caf50' : '#fff'
              }
            }}
          />
        )}
      </AppBar>

      <Container 
        maxWidth="sm" 
        sx={{ 
          pb: 12, 
          pt: 2,
          px: { xs: 1, sm: 2 }, // 响应式内边距
          minHeight: '100vh'
        }}
      >
        {/* 岗位选择器 */}
        <Paper 
          elevation={2} 
          sx={{ 
            p: { xs: 2, sm: 3 }, // 响应式内边距
            mb: 3, 
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            // 移动端触摸优化
            touchAction: 'manipulation'
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
            <WorkIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            选择盘点岗位
          </Typography>
          <FormControl fullWidth>
            <InputLabel id="post-select-label">请选择岗位</InputLabel>
            <Select
              labelId="post-select-label"
              value={selectedPost}
              label="请选择岗位"
              onChange={handlePostChange}
              sx={{
                bgcolor: 'white',
                borderRadius: 1,
                minHeight: { xs: 48, sm: 56 }, // 移动端最小触摸目标
                '& .MuiSelect-select': {
                  display: 'flex',
                  alignItems: 'center'
                },
                // 触摸反馈
                '&:active': {
                  transform: 'scale(0.98)'
                }
              }}
            >
              <MenuItem value="">
                <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                  <WorkIcon sx={{ mr: 1, opacity: 0.5 }} />
                  <em>请选择岗位...</em>
                </Box>
              </MenuItem>
              {Object.entries(POSTNAME).map(([id, name]) => {
                const IconComponent = POST_ICONS[id];
                const color = POST_COLORS[id];
                return (
                  <MenuItem key={id} value={id}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <IconComponent sx={{ mr: 1.5, color, fontSize: 20 }} />
                      <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                        {name}
                      </Typography>
                    </Box>
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>
          {selectedPost && (
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center' }}>
              <Chip
                icon={React.createElement(POST_ICONS[selectedPost])}
                label={`当前岗位: ${POSTNAME[selectedPost]}`}
                sx={{
                  bgcolor: POST_COLORS[selectedPost],
                  color: 'white',
                  fontWeight: 'bold',
                  '& .MuiChip-icon': {
                    color: 'white'
                  }
                }}
              />
            </Box>
          )}
        </Paper>

        {/* 原料列表 */}
        {loadingIngredients ? (
          <Box 
            sx={{ 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mt: 8,
              mb: 4
            }}
          >
            <CircularProgress size={60} thickness={4} />
            <Typography variant="h6" sx={{ mt: 3, color: 'text.secondary' }}>
              正在加载原料数据...
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, color: 'text.disabled' }}>
              请稍候，正在获取最新库存信息
            </Typography>
          </Box>
        ) : errorIngredients ? (
          <Paper 
            sx={{ 
              p: 4, 
              mt: 4, 
              textAlign: 'center',
              bgcolor: '#fff3e0',
              border: '1px solid #ffcc02'
            }}
          >
            <WarningIcon sx={{ fontSize: 64, color: 'warning.main', mb: 2 }} />
            <Typography variant="h6" color="error" sx={{ mb: 2 }}>
              数据加载失败
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {errorIngredients}
            </Typography>
            <Button 
              variant="contained" 
              onClick={() => fetchIngredients()}
              startIcon={<InventoryIcon />}
            >
              重新加载
            </Button>
          </Paper>
        ) : !selectedPost ? (
          <Paper 
            sx={{ 
              p: 4, 
              mt: 4, 
              textAlign: 'center',
              bgcolor: '#f3f4f6',
              border: '2px dashed #d1d5db'
            }}
          >
            <WorkIcon sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: 'text.primary' }}>
              选择工作岗位
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 300, mx: 'auto' }}>
              请先在上方选择您要进行库存盘点的工作岗位，系统将为您加载对应的原料清单
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, flexWrap: 'wrap' }}>
              {Object.entries(POSTNAME).slice(0, 3).map(([id, name]) => {
                const IconComponent = POST_ICONS[id];
                return (
                  <Chip
                    key={id}
                    icon={<IconComponent />}
                    label={name}
                    variant="outlined"
                    sx={{ 
                      borderColor: POST_COLORS[id],
                      color: POST_COLORS[id],
                      '&:hover': {
                        bgcolor: `${POST_COLORS[id]}20`
                      }
                    }}
                  />
                );
              })}
            </Box>
          </Paper>
        ) : postIngredients.length === 0 ? (
          <Paper 
            sx={{ 
              p: 4, 
              mt: 4, 
              textAlign: 'center',
              bgcolor: '#f8f9fa',
              border: '1px solid #e9ecef'
            }}
          >
            <Box
              sx={{
                width: 120,
                height: 120,
                mx: 'auto',
                mb: 3,
                borderRadius: '50%',
                bgcolor: '#e3f2fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <InventoryIcon sx={{ fontSize: 60, color: 'primary.main' }} />
            </Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              暂无原料数据
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 280, mx: 'auto' }}>
              {POSTNAME[selectedPost]} 岗位目前没有需要盘点的原料，请联系管理员确认或选择其他岗位
            </Typography>
            <Button 
              variant="outlined" 
              onClick={() => setSelectedPost('')}
              startIcon={<WorkIcon />}
            >
              重新选择岗位
            </Button>
          </Paper>
        ) : (
          <>
            <Typography variant="h6" sx={{ mb: 2 }}>
              找到 {postIngredients.length} 个原料需要盘点
            </Typography>
            <List>{postIngredients.map(renderIngredientCard)}</List>
            
            {/* 盘点完成提示 */}
            {completedCount === postIngredients.length && postIngredients.length > 0 && (
              <Paper 
                sx={{ 
                  p: 3, 
                  mt: 3, 
                  textAlign: 'center',
                  bgcolor: '#e8f5e8',
                  border: '2px solid #4caf50'
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 48, color: 'success.main', mb: 1 }} />
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold', color: 'success.main' }}>
                  盘点完成！
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  所有原料已完成盘点，请点击底部按钮提交数据
                </Typography>
              </Paper>
            )}
          </>
        )}

      <Paper
        elevation={6}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          zIndex: 1000,
          borderTop: '1px solid',
          borderColor: 'divider',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.12)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,1) 100%)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <Container maxWidth="sm" sx={{ p: 0 }}>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            size="large"
            onClick={handleSubmitStock}
            disabled={
              isSubmitting || !selectedPost || postIngredients.length === 0
            }
            sx={{
              py: 1.5,
              borderRadius: 3,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              boxShadow: 4,
              background: completedCount === postIngredients.length && postIngredients.length > 0
                ? 'linear-gradient(45deg, #4caf50 30%, #66bb6a 90%)'
                : 'linear-gradient(45deg, #2196f3 30%, #42a5f5 90%)',
              '&:hover': {
                boxShadow: 8,
                transform: 'translateY(-2px)',
                transition: 'all 0.3s ease'
              },
              '&:disabled': {
                background: '#e0e0e0',
                color: '#9e9e9e',
                transform: 'none'
              }
            }}
            startIcon={
              isSubmitting ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      border: '2px solid #fff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                </Box>
              ) : completedCount === postIngredients.length && postIngredients.length > 0 ? (
                <CheckCircleIcon />
              ) : (
                <SaveIcon />
              )
            }
          >
            {isSubmitting 
              ? "正在提交..." 
              : completedCount === postIngredients.length && postIngredients.length > 0
                ? "盘点完成，提交数据" 
                : "提交盘点"
            }
          </Button>
          
          {/* 进度提示 */}
          {postIngredients.length > 0 && (
            <Box sx={{ mt: 1, textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                已完成 {completedCount} / {postIngredients.length} 项
                {completedCount === postIngredients.length ? ' ✓' : ''}
              </Typography>
            </Box>
          )}
        </Container>
      </Paper>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
      >
        <DialogTitle>确认提交</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您有 {missingCount}{" "}
            项物料未填写库存，确定要提交吗？未填写的项目将不会被保存。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialogOpen(false)}>取消</Button>
          <Button onClick={handleConfirmSubmit} color="primary" autoFocus>
            确认提交
          </Button>
        </DialogActions>
      </Dialog>
      </Container>
    </Box>
  );
};

export default MobileInventoryCheck;
