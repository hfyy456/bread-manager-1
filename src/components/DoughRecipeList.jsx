import React, { useContext } from "react";
import {
  Typography,
  Grid,
  Container,
  Box,
  IconButton,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { DataContext } from './DataContext.jsx';
import { calculateDoughCost } from "../utils/calculator";
import RecipeCard from './RecipeCard.jsx';

const formatNumberDisplay = (num, decimals = 2, fallback = 'N/A') => {
  const parsedNum = parseFloat(num);
  if (typeof parsedNum === 'number' && isFinite(parsedNum)) {
    return parsedNum.toFixed(decimals);
  }
  return fallback;
};

const DoughRecipeList = () => {
  const { doughRecipes, doughRecipesMap, ingredientsMap, loading } = useContext(DataContext);

  const getCost = (recipe) => {
    if (loading || !ingredientsMap || ingredientsMap.size === 0) return { cost: 0, yield: recipe.yield || 0 };
    return calculateDoughCost(recipe.id, doughRecipesMap, ingredientsMap);
  };
  
  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" alignItems="center" sx={{ mb: 6, mt: 3 }}>
        <Typography variant="h4" component="h1" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mr: 1 }}>
        面团配方
      </Typography>
        <Tooltip title="查看操作指南">
          <IconButton component={Link} to="/operation-guide#dough-recipes" size="small" sx={{ color: 'primary.main' }}>
            <InfoOutlinedIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Grid container spacing={4}>
        {Array.isArray(doughRecipes) && doughRecipes.map((recipe) => {
          if (!recipe || !recipe.id) return null;

          const costResult = getCost(recipe);
          const cost = costResult.cost;
          const currentRecipeYield = costResult.yield;
          const isValidYield = typeof currentRecipeYield === 'number' && currentRecipeYield > 0;
          
          const displayCost = formatNumberDisplay(cost, 2, '计算错误');
          const displayUnitCost = isValidYield ? formatNumberDisplay(cost / currentRecipeYield, 4, '计算错误') : 'N/A';

          const ingredientsList = recipe.ingredients.map((ing, index) => {
            const ingredient = ingredientsMap.get((ing.ingredientId || '').trim());
            return (
              <Typography key={`${ing.ingredientId}-${index}`} variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: ingredient ? 'inherit' : 'red' }}>
                - {ingredient?.name || `未知配料 (ID: ${ing.ingredientId})`}: {ing.quantity}{ing.unit}
              </Typography>
            );
          });

          const subRecipesList = recipe.preFerments?.map((dough, index) => {
            const doughInfo = doughRecipesMap.get((dough.id || '').trim());
            return (
              <Typography key={`${dough.id}-${index}`} variant="body2" sx={{ fontFamily: "Inter, sans-serif", color: doughInfo ? 'inherit' : 'red' }}>
                - {doughInfo?.name || `未知预发酵物 (ID: ${dough.id})`}: {dough.quantity}{dough.unit}
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
              />
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default DoughRecipeList;
