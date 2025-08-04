import React, { useContext, useState } from "react";
import {
  Typography,
  Grid,
  Container,
  Box,
  CircularProgress,
  Tooltip,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Button,
  Fab,
} from "@mui/material";
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon, Add as AddIcon } from '@mui/icons-material';
import { DataContext } from './DataContext.jsx';
import { calculateFillingCost } from "../utils/calculator";
import RecipeCard from './RecipeCard.jsx';
import RecipeCreateDialog from './RecipeCreateDialog.jsx';
import { useSnackbar } from "./SnackbarProvider.jsx";

const formatNumberDisplay = (num, decimals = 2, fallback = 'N/A') => {
  const parsedNum = parseFloat(num);
  if (typeof parsedNum === 'number' && isFinite(parsedNum)) {
    return parsedNum.toFixed(decimals);
  }
  return fallback;
};

const FillingRecipeList = () => {
  const { fillingRecipes, fillingRecipesMap, ingredientsMap, loading, refreshData, doughRecipes } = useContext(DataContext);
  const { showSnackbar } = useSnackbar();
  
  const [dialogState, setDialogState] = useState({ open: false, recipeData: null });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });

  const handleEdit = (recipe) => {
    setDialogState({ open: true, recipeData: recipe });
  };

  const handleCreate = () => {
    setDialogState({ open: true, recipeData: null });
  };

  const handleDelete = (id) => {
    setDeleteConfirm({ open: true, id });
  };

  const handleCloseDialog = () => {
    setDialogState({ open: false, recipeData: null });
  };

  const handleConfirmDelete = async () => {
    try {
      const response = await fetch(`/api/filling-recipes/${deleteConfirm.id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || '删除失败');
      }
      showSnackbar('删除成功', 'success');
      await refreshData();
    } catch (error) {
      showSnackbar(`删除失败: ${error.message}`, 'error');
    } finally {
      setDeleteConfirm({ open: false, id: null });
    }
  };

  const handleSaveSuccess = async () => {
    showSnackbar('配方保存成功', 'success');
    await refreshData();
    handleCloseDialog();
  };

  const getCost = (recipe) => {
    if (loading || !ingredientsMap || ingredientsMap.size === 0) return { cost: 0, yield: recipe.yield || 0 };
    return calculateFillingCost(recipe.id, fillingRecipesMap, ingredientsMap);
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" alignItems="center" sx={{ mb: 6, mt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mr: 1 }}>
        馅料配方
      </Typography>
        <Tooltip title="查看操作指南">
          <IconButton component={Link} to="/operation-guide#filling-recipes" size="small" sx={{ color: 'primary.main' }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Grid container spacing={4}>
        {Array.isArray(fillingRecipes) && fillingRecipes.map((recipe) => {
          if (!recipe || !recipe.id) return null;

          const costResult = getCost(recipe);
          const cost = costResult.cost;
          const currentRecipeYield = costResult.yield;
          const isValidYield = typeof currentRecipeYield === 'number' && currentRecipeYield > 0;

          const displayCost = formatNumberDisplay(cost, 2, '计算错误');
          const displayUnitCost = isValidYield ? formatNumberDisplay(cost / currentRecipeYield, 4, '计算错误') : 'N/A';

          const ingredientsList = recipe.ingredients?.map((ing, index) => {
            const ingredient = ingredientsMap.get((ing.ingredientId || '').trim());
            return (
              <Typography key={`${ing.ingredientId}-${index}`} variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: ingredient ? 'inherit' : 'red' }}>
                - {ingredient?.name || `未知配料 (ID: ${ing.ingredientId})`}: {ing.quantity}{ing.unit || 'g'}
              </Typography>
            );
          });

          const subRecipesList = recipe.subFillings?.map((sub, index) => {
            const subFillInfo = fillingRecipesMap.get((sub.id || '').trim());
            return (
              <Typography key={`${sub.id}-${index}`} variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: subFillInfo ? 'inherit' : 'red' }}>
                - {subFillInfo?.name || sub.name || `未知子馅料 (ID: ${sub.id})`}: {sub.quantity}{sub.unit || 'g'}
              </Typography>
            );
          });

          return (
            <Grid item xs={12} md={6} lg={4} key={recipe.id}>
              <RecipeCard
                recipe={recipe}
                displayCost={displayCost}
                displayUnitCost={displayUnitCost}
                isValidYield={isValidYield}
                ingredientsList={ingredientsList}
                subRecipesList={subRecipesList}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Grid>
          );
        })}
      </Grid>

      {dialogState.open && (
        <RecipeCreateDialog
          open={dialogState.open}
          onClose={handleCloseDialog}
          recipeType="filling"
          initialData={dialogState.recipeData}
          onSuccess={handleSaveSuccess}
          doughRecipes={doughRecipes}
          fillingRecipes={fillingRecipes}
        />
      )}

      <Dialog open={deleteConfirm.open} onClose={() => setDeleteConfirm({ open: false, id: null })}>
        <DialogTitle>确认删除</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您确定要删除这个馅料配方吗？此操作无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirm({ open: false, id: null })}>取消</Button>
          <Button onClick={handleConfirmDelete} color="error">
            确认删除
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for creating new recipe */}
      <Fab
        color="primary"
        aria-label="add"
        onClick={handleCreate}
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
};

export default FillingRecipeList;
