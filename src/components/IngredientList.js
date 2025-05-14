import React from 'react';
import { 
  Card, CardContent, Typography, Grid, Container, Box, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  TextField, InputAdornment, Button, IconButton, Dialog, DialogTitle, DialogContent, 
  DialogActions, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { ingredients } from '../data/ingredients';
import { useCallback, useState } from 'react';

const categories = ['基础材料', '发酵剂', '调味料', '油脂', '液体', '辅料', '馅料材料'];

const IngredientList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  // 过滤配料
  const filteredIngredients = useCallback(() => {
    return ingredients.filter(ingredient => 
      ingredient.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // 打开添加对话框
  const handleAdd = () => {
    setSelectedIngredient({ id: '', name: '', unit: '克', pricePerUnit: 0, category: '基础材料' });
    setIsEditing(false);
    setDialogOpen(true);
  };

  // 打开编辑对话框
  const handleEdit = (ingredient) => {
    setSelectedIngredient({ ...ingredient });
    setIsEditing(true);
    setDialogOpen(true);
  };

  // 处理删除
  const handleDelete = (id) => {
    if (window.confirm('确定要删除这个配料吗？')) {
      // 实际应用中这里应该调用API删除数据
      console.log(`删除配料: ${id}`);
    }
  };

  // 处理表单提交
  const handleSubmit = () => {
    if (!selectedIngredient.name || !selectedIngredient.pricePerUnit) {
      alert('名称和价格是必填项');
      return;
    }
    
    if (isEditing) {
      // 实际应用中这里应该调用API更新数据
      console.log('更新配料:', selectedIngredient);
    } else {
      // 实际应用中这里应该调用API添加数据
      console.log('添加配料:', selectedIngredient);
    }
    
    setDialogOpen(false);
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4, mt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          物料管理
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ fontFamily: 'Inter, sans-serif' }}
        >
          添加物料
        </Button>
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <TextField
          label="搜索物料"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ fontFamily: 'Inter, sans-serif' }}
        />
      </Box>
      
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>ID</TableCell>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>名称</TableCell>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>单位</TableCell>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>单价(元/{'{'}单位{'}'})</TableCell>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>类别</TableCell>
              <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>操作</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredIngredients().map((ingredient) => (
              <TableRow key={ingredient.id} hover>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.id}</TableCell>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.name}</TableCell>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.unit}</TableCell>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.pricePerUnit.toFixed(4)}</TableCell>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{ingredient.category}</TableCell>
                <TableCell>
                  <IconButton color="primary" onClick={() => handleEdit(ingredient)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDelete(ingredient.id)}>
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* 添加/编辑对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          {isEditing ? '编辑物料' : '添加物料'}
        </DialogTitle>
        <DialogContent>
          {selectedIngredient && (
            <Box sx={{ width: 400, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="ID"
                variant="outlined"
                value={selectedIngredient.id}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, id: e.target.value })}
                disabled={isEditing}
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="名称"
                variant="outlined"
                value={selectedIngredient.name}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, name: e.target.value })}
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="单位"
                variant="outlined"
                value={selectedIngredient.unit}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, unit: e.target.value })}
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <TextField
                label="单价"
                variant="outlined"
                type="number"
                value={selectedIngredient.pricePerUnit}
                onChange={(e) => setSelectedIngredient({ ...selectedIngredient, pricePerUnit: parseFloat(e.target.value) })}
                sx={{ fontFamily: 'Inter, sans-serif' }}
              />
              <FormControl variant="outlined">
                <InputLabel sx={{ fontFamily: 'Inter, sans-serif' }}>类别</InputLabel>
                <Select
                  value={selectedIngredient.category}
                  onChange={(e) => setSelectedIngredient({ ...selectedIngredient, category: e.target.value })}
                  label="类别"
                  sx={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {categories.map(cat => (
                    <MenuItem key={cat} value={cat} sx={{ fontFamily: 'Inter, sans-serif' }}>{cat}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontFamily: 'Inter, sans-serif' }}>
            取消
          </Button>
          <Button onClick={handleSubmit} color="primary" sx={{ fontFamily: 'Inter, sans-serif' }}>
            {isEditing ? '保存' : '添加'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IngredientList;
  