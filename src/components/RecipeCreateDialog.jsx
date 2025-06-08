import React, { useState, useContext, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid,
  IconButton, Typography, Box, Select, MenuItem, FormControl, InputLabel, Divider, Autocomplete
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import { DataContext } from './DataContext';

const RecipeCreateDialog = ({ open, onClose, recipeType, onSuccess, doughRecipes, fillingRecipes, initialData }) => {
  const { ingredients } = useContext(DataContext);
  const [recipe, setRecipe] = useState({
    name: '',
    yield: '',
    id: '',
    unit: 'g',
    ingredients: [{ ingredientId: '', quantity: '', unit: 'g' }],
    subRecipes: []
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        // Editing: Use initialData and ensure sub-recipes have the correct ID field.
        const subRecipeKey = recipeType === 'dough' ? 'preFerments' : 'subFillings';
        const subs = (initialData[subRecipeKey] || []).map(sub => ({
          recipeId: sub.id, // The 'id' in the sub-recipe IS the name/identifier.
          quantity: sub.quantity
        }));
        
        setRecipe({
          ...initialData,
          ingredients: initialData.ingredients || [{ ingredientId: '', quantity: '', unit: 'g' }],
          subRecipes: subs
        });
      } else {
        // Creating: Reset to a clean slate.
        setRecipe({
          name: '',
          yield: '',
          id: '',
          unit: 'g',
          ingredients: [{ ingredientId: '', quantity: '', unit: 'g' }],
          subRecipes: []
        });
      }
    }
  }, [open, initialData, recipeType]);

  const dialogTitle = initialData ? `编辑 ${recipe.name}` : `创建新${recipeType === 'dough' ? '面团' : '馅料'}配方`;
  const apiEndpoint = initialData 
    ? `/api/${recipeType}-recipes/${initialData._id}` 
    : `/api/${recipeType}-recipes/create`;
  const apiMethod = initialData ? 'PUT' : 'POST';

  const subRecipeTitle = recipeType === 'dough' ? '预发酵物' : '子馅料';
  const subRecipeSource = recipeType === 'dough' ? doughRecipes : fillingRecipes;
  const subRecipePayloadKey = recipeType === 'dough' ? 'preFerments' : 'subFillings';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setRecipe(prev => ({ ...prev, [name]: value }));
  };

  const handleDynamicChange = (listName, index, field, value) => {
    const newList = [...recipe[listName]];
    newList[index][field] = value;
    setRecipe(prev => ({ ...prev, [listName]: newList }));
  };

  const addListItem = (listName) => {
    const newItem = listName === 'ingredients'
      ? { ingredientId: '', quantity: '', unit: 'g' }
      : { recipeId: '', quantity: '' };
    setRecipe(prev => ({ ...prev, [listName]: [...prev[listName], newItem] }));
  };

  const removeListItem = (listName, index) => {
    const newList = recipe[listName].filter((_, i) => i !== index);
    setRecipe(prev => ({ ...prev, [listName]: newList }));
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    const payload = {
      ...recipe,
      yield: Number(recipe.yield),
      ingredients: recipe.ingredients
        .filter(ing => ing.ingredientId && ing.quantity)
        .map(ing => ({
          ingredientId: ing.ingredientId,
          quantity: Number(ing.quantity),
          unit: ing.unit
        })),
    };
    // Remove subRecipes before adding the correctly keyed one
    delete payload.subRecipes; 
    
    if (recipe.subRecipes && recipe.subRecipes.length > 0) {
      const subRecipeIdKey = recipeType === 'dough' ? 'id' : 'subFillingId';
      
      payload[subRecipePayloadKey] = recipe.subRecipes
        .filter(sub => sub.recipeId && sub.quantity)
        .map(sub => ({
          [subRecipeIdKey]: sub.recipeId,
          quantity: Number(sub.quantity),
          unit: 'g'
        }));
    }

    try {
      const response = await fetch(apiEndpoint, {
        method: apiMethod,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || '保存失败');
      }
      onSuccess(result.data);
    } catch (error) {
      console.error(`Error processing recipe:`, error);
      alert(`错误: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{dialogTitle}</DialogTitle>
      <DialogContent>
        {/* Basic Info */}
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth name="name" label="配方名称" value={recipe.name} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth name="id" label="配方ID (通常同名称)" value={recipe.id} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth name="yield" label="批量产出" type="number" value={recipe.yield} onChange={handleChange} required />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth name="unit" label="产出单位" value={recipe.unit} onChange={handleChange} required />
          </Grid>
        </Grid>
        <Divider sx={{ my: 3 }} />

        {/* Ingredients List */}
        <Typography variant="h6" sx={{ mb: 1 }}>基础原料</Typography>
        {recipe.ingredients.map((ing, index) => (
          <Grid container spacing={1} key={`ing-${index}`} alignItems="center" sx={{ mb: 1 }}>
            <Grid item xs={12} sm={6}>
              <Autocomplete
                fullWidth
                size="small"
                options={ingredients}
                getOptionLabel={(option) => option.name || ''}
                value={ingredients.find(i => i.name === ing.ingredientId) || null}
                onChange={(event, newValue) => {
                  handleDynamicChange('ingredients', index, 'ingredientId', newValue ? newValue.name : '');
                }}
                isOptionEqualToValue={(option, value) => option.name === value.name}
                renderInput={(params) => <TextField {...params} label="原料" required />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="用量" type="number" value={ing.quantity} onChange={(e) => handleDynamicChange('ingredients', index, 'quantity', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField fullWidth size="small" label="单位" value={ing.unit} onChange={(e) => handleDynamicChange('ingredients', index, 'unit', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={1}>
              <IconButton onClick={() => removeListItem('ingredients', index)}><RemoveCircleOutlineIcon /></IconButton>
            </Grid>
          </Grid>
        ))}
        <Button startIcon={<AddCircleOutlineIcon />} onClick={() => addListItem('ingredients')} sx={{ mt: 1 }}>添加原料</Button>

        <Divider sx={{ my: 3 }} />

        {/* Sub-Recipes List */}
        <Typography variant="h6" sx={{ mb: 1 }}>{subRecipeTitle}</Typography>
        {recipe.subRecipes.map((sub, index) => (
          <Grid container spacing={1} key={`sub-${index}`} alignItems="center" sx={{ mb: 1 }}>
            <Grid item xs={12} sm={8}>
              <Autocomplete
                fullWidth
                size="small"
                options={subRecipeSource || []}
                getOptionLabel={(option) => option.name || ''}
                value={(subRecipeSource || []).find(r => r.id === sub.recipeId) || null}
                onChange={(event, newValue) => {
                  handleDynamicChange('subRecipes', index, 'recipeId', newValue ? newValue.id : '');
                }}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                renderInput={(params) => <TextField {...params} label="配方" required />}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField fullWidth size="small" label="用量 (g)" type="number" value={sub.quantity} onChange={(e) => handleDynamicChange('subRecipes', index, 'quantity', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={1}>
              <IconButton onClick={() => removeListItem('subRecipes', index)}><RemoveCircleOutlineIcon /></IconButton>
            </Grid>
          </Grid>
        ))}
        <Button startIcon={<AddCircleOutlineIcon />} onClick={() => addListItem('subRecipes')} sx={{ mt: 1 }}>添加{subRecipeTitle}</Button>

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSaving}>
          {isSaving ? '正在保存...' : '保存配方'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecipeCreateDialog; 