import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  IconButton,
  Collapse,
  Typography,
  Slider,
  Switch,
  FormControlLabel,
  Divider
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

const WarehouseSearchFilter = ({
  warehouseStock = [],
  onFilterChange,
  loading = false
}) => {
  const [searchText, setSearchText] = useState('');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [stockRange, setStockRange] = useState([0, 1000]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showZeroStock, setShowZeroStock] = useState(true);
  const [showExpanded, setShowExpanded] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // 计算价格和库存范围
  const ranges = useMemo(() => {
    if (warehouseStock.length === 0) {
      return { maxPrice: 1000, maxStock: 1000 };
    }

    const prices = warehouseStock.map(item => item.ingredient.price || 0);
    const stocks = warehouseStock.map(item => item.mainWarehouseStock?.quantity || 0);

    return {
      maxPrice: Math.max(...prices, 100),
      maxStock: Math.max(...stocks, 100)
    };
  }, [warehouseStock]);

  // 提取分类（基于物料名称的前缀或规格）
  const categories = useMemo(() => {
    const categorySet = new Set();
    warehouseStock.forEach(item => {
      // 简单的分类逻辑：基于名称的第一个词
      const firstWord = item.ingredient.name.split(/[\s\-_]/)[0];
      if (firstWord.length > 1) {
        categorySet.add(firstWord);
      }
    });
    return Array.from(categorySet).sort();
  }, [warehouseStock]);

  // 应用过滤器
  const applyFilters = useCallback(() => {
    let filtered = [...warehouseStock];

    // 文本搜索
    if (searchText.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.ingredient.name.toLowerCase().includes(searchLower) ||
        (item.ingredient.specs && item.ingredient.specs.toLowerCase().includes(searchLower))
      );
    }

    // 价格范围过滤
    filtered = filtered.filter(item => {
      const price = item.ingredient.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // 库存范围过滤
    filtered = filtered.filter(item => {
      const stock = item.mainWarehouseStock?.quantity || 0;
      return stock >= stockRange[0] && stock <= stockRange[1];
    });

    // 分类过滤
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(item => {
        const firstWord = item.ingredient.name.split(/[\s\-_]/)[0];
        return selectedCategories.includes(firstWord);
      });
    }

    // 零库存过滤
    if (!showZeroStock) {
      filtered = filtered.filter(item => 
        (item.mainWarehouseStock?.quantity || 0) > 0
      );
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.ingredient.name;
          bValue = b.ingredient.name;
          break;
        case 'price':
          aValue = a.ingredient.price || 0;
          bValue = b.ingredient.price || 0;
          break;
        case 'stock':
          aValue = a.mainWarehouseStock?.quantity || 0;
          bValue = b.mainWarehouseStock?.quantity || 0;
          break;
        case 'totalPrice':
          aValue = parseFloat(a.totalPrice) || 0;
          bValue = parseFloat(b.totalPrice) || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      } else {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
    });

    onFilterChange(filtered);
  }, [
    warehouseStock,
    searchText,
    priceRange,
    stockRange,
    selectedCategories,
    showZeroStock,
    sortBy,
    sortOrder,
    onFilterChange
  ]);

  // 实时应用过滤器
  React.useEffect(() => {
    const timer = setTimeout(applyFilters, 300); // 300ms防抖
    return () => clearTimeout(timer);
  }, [applyFilters]);

  // 清除所有过滤器
  const clearAllFilters = useCallback(() => {
    setSearchText('');
    setPriceRange([0, ranges.maxPrice]);
    setStockRange([0, ranges.maxStock]);
    setSelectedCategories([]);
    setShowZeroStock(true);
    setSortBy('name');
    setSortOrder('asc');
  }, [ranges]);

  // 处理分类选择
  const handleCategoryToggle = useCallback((category) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  }, []);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      {/* 基础搜索栏 */}
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
        <TextField
          fullWidth
          placeholder="搜索物料名称或规格..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          disabled={loading}
          InputProps={{
            startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />,
            endAdornment: searchText && (
              <IconButton size="small" onClick={() => setSearchText('')}>
                <ClearIcon />
              </IconButton>
            )
          }}
          sx={{ flex: 1 }}
        />

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>排序</InputLabel>
          <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            disabled={loading}
            label="排序"
          >
            <MenuItem value="name">名称</MenuItem>
            <MenuItem value="price">单价</MenuItem>
            <MenuItem value="stock">库存</MenuItem>
            <MenuItem value="totalPrice">总价</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 80 }}>
          <InputLabel>顺序</InputLabel>
          <Select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            disabled={loading}
            label="顺序"
          >
            <MenuItem value="asc">升序</MenuItem>
            <MenuItem value="desc">降序</MenuItem>
          </Select>
        </FormControl>

        <IconButton
          onClick={() => setShowExpanded(!showExpanded)}
          disabled={loading}
          sx={{ 
            bgcolor: showExpanded ? 'primary.main' : 'transparent',
            color: showExpanded ? 'white' : 'inherit',
            '&:hover': {
              bgcolor: showExpanded ? 'primary.dark' : 'action.hover'
            }
          }}
        >
          <FilterIcon />
        </IconButton>
      </Box>

      {/* 高级过滤器 */}
      <Collapse in={showExpanded}>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* 价格范围 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              价格范围: ¥{priceRange[0]} - ¥{priceRange[1]}
            </Typography>
            <Slider
              value={priceRange}
              onChange={(_, newValue) => setPriceRange(newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={ranges.maxPrice}
              disabled={loading}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* 库存范围 */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              库存范围: {stockRange[0]} - {stockRange[1]}
            </Typography>
            <Slider
              value={stockRange}
              onChange={(_, newValue) => setStockRange(newValue)}
              valueLabelDisplay="auto"
              min={0}
              max={ranges.maxStock}
              disabled={loading}
              sx={{ mt: 1 }}
            />
          </Box>

          {/* 分类过滤 */}
          {categories.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                物料分类
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {categories.map(category => (
                  <Chip
                    key={category}
                    label={category}
                    onClick={() => handleCategoryToggle(category)}
                    color={selectedCategories.includes(category) ? 'primary' : 'default'}
                    variant={selectedCategories.includes(category) ? 'filled' : 'outlined'}
                    disabled={loading}
                    size="small"
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* 其他选项 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showZeroStock}
                  onChange={(e) => setShowZeroStock(e.target.checked)}
                  disabled={loading}
                />
              }
              label="显示零库存"
            />

            <Box sx={{ flex: 1 }} />

            <IconButton
              onClick={clearAllFilters}
              disabled={loading}
              color="error"
              size="small"
            >
              <ClearIcon />
            </IconButton>
            <Typography variant="caption" color="text.secondary">
              清除过滤器
            </Typography>
          </Box>
        </Box>
      </Collapse>

      {/* 过滤结果统计 */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        mt: 2,
        pt: 1,
        borderTop: '1px solid',
        borderColor: 'divider'
      }}>
        <Typography variant="caption" color="text.secondary">
          {searchText || selectedCategories.length > 0 || !showZeroStock
            ? `已过滤 • 显示结果`
            : `显示全部 ${warehouseStock.length} 种物料`
          }
        </Typography>
        
        {(searchText || selectedCategories.length > 0 || !showZeroStock) && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {searchText && (
              <Chip
                label={`搜索: ${searchText}`}
                size="small"
                onDelete={() => setSearchText('')}
                color="primary"
                variant="outlined"
              />
            )}
            {selectedCategories.map(category => (
              <Chip
                key={category}
                label={category}
                size="small"
                onDelete={() => handleCategoryToggle(category)}
                color="primary"
                variant="filled"
              />
            ))}
            {!showZeroStock && (
              <Chip
                label="隐藏零库存"
                size="small"
                onDelete={() => setShowZeroStock(true)}
                color="secondary"
                variant="outlined"
              />
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default React.memo(WarehouseSearchFilter);