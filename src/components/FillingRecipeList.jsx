import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Container,
  Box,
  CircularProgress,
  Paper,
  Button,
  Tooltip,
  IconButton,
} from "@mui/material";
import { fillingRecipes } from "../data/fillingRecipes";
import {
  calculateFillingCost,
  findFillingRecipeById,
  findIngredientById,
} from "../utils/calculator";
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

const formatNumberDisplay = (num, decimals = 2, fallback = 'N/A') => {
  const parsedNum = parseFloat(num);
  if (typeof parsedNum === 'number' && isFinite(parsedNum)) {
    return parsedNum.toFixed(decimals);
  }
  return fallback;
};

const FillingRecipeList = () => {
  const [allIngredientsData, setAllIngredientsData] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [errorIngredients, setErrorIngredients] = useState(null);

  useEffect(() => {
    const fetchIngredients = async () => {
      setLoadingIngredients(true);
      setErrorIngredients(null);
      try {
        const response = await fetch('/api/ingredients/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setAllIngredientsData(result.data);
        } else {
          setErrorIngredients(result.message || 'Failed to load ingredients or data format is incorrect.');
          setAllIngredientsData([]);
        }
      } catch (err) {
        setErrorIngredients(`Error fetching ingredients: ${err.message}`);
        setAllIngredientsData([]);
      } finally {
        setLoadingIngredients(false);
      }
    };

    fetchIngredients();
  }, []);

  if (loadingIngredients) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>正在加载原料数据...</Typography>
      </Container>
    );
  }

  if (errorIngredients) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', backgroundColor: 'error.light' }}>
          <Typography variant="h5" color="error.contrastText">原料数据加载失败</Typography>
          <Typography color="error.contrastText" sx={{ mt: 1 }}>{errorIngredients}</Typography>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{mt: 2}}>
            刷新页面
          </Button>
        </Paper>
      </Container>
    );
  }

  if (!loadingIngredients && !errorIngredients && allIngredientsData.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
            未能加载到任何原料数据，无法显示馅料配方。请检查API或数据库。
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Box display="flex" alignItems="center" sx={{ mb: 6, mt: 3 }}>
      <Typography
        variant="h4"
        component="h1"
          sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mr: 1 }}
      >
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
          if (!recipe || typeof recipe.id === 'undefined' || typeof recipe.name === 'undefined') {
            console.warn("Invalid filling recipe object found:", recipe);
            return null; // Skip rendering this invalid recipe
          }

          const costResult = calculateFillingCost(recipe, allIngredientsData);
          const cost = costResult && typeof costResult.cost === 'number' && isFinite(costResult.cost) ? costResult.cost : undefined;
          const currentRecipeYield = costResult && typeof costResult.yield === 'number' && isFinite(costResult.yield) && costResult.yield > 0 
                                   ? costResult.yield 
                                   : (parseFloat(recipe.yield) > 0 ? parseFloat(recipe.yield) : undefined);

          const isValidYield = typeof currentRecipeYield === 'number' && currentRecipeYield > 0;

          const displayCost = formatNumberDisplay(cost, 2, '计算错误');
          const displayUnitCost = isValidYield && typeof cost === 'number'
            ? formatNumberDisplay(cost / currentRecipeYield, 4, '计算错误')
            : 'N/A';

          return (
            <Grid item xs={12} md={6} lg={4} key={recipe.id}>
              <Card
                sx={{
                  transition: "transform 0.3s, box-shadow 0.3s",
                  "&:hover": { transform: "translateY(-5px)" },
                }}
              >
                <CardContent>
                  <Typography
                    gutterBottom
                    variant="h5"
                    component="h2"
                    sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                  >
                    {recipe.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 2, fontFamily: "Inter, sans-serif" }}
                  >
                    总重量: {isValidYield ? currentRecipeYield.toString() + 'g' : 'N/A'} | 总成本: ¥{displayCost} |
                    单位成本: ¥{displayUnitCost}/g
                  </Typography>

                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      配料:
                    </Typography>
                    <Box sx={{ mt: 1, ml: 2 }}>
                      {Array.isArray(recipe.ingredients) && recipe.ingredients.map((ing, index) => {
                        if (!ing || typeof ing.ingredientId === 'undefined') {
                           console.warn("Invalid ingredient entry in filling recipe:", recipe.name, ing);
                           return <Typography key={`fill-ing-invalid-${index}`} variant="body2" sx={{ color: "orange" }}>- 配料条目数据缺失</Typography>;
                        }
                        const ingredient = findIngredientById(ing.ingredientId, allIngredientsData);
                        return (
                          <Typography
                            key={ing.ingredientId + '-' + index} // Ensure unique key if ingredientId can repeat
                            variant="body2"
                            sx={{ fontFamily: "Inter, sans-serif" }}
                          >
                            -{" "}
                            {ingredient?.name ||
                              ("未知配料 ID: " + ing.ingredientId)}
                            : {typeof ing.quantity === 'number' && isFinite(ing.quantity) ? ing.quantity : 'N/A'}
                            {ing?.unit || ""}
                          </Typography>
                        );
                      })}
                      {Array.isArray(recipe.subFillings) && recipe.subFillings.map((sub, index) => {
                        if (!sub || typeof sub.recipeId === 'undefined') {
                          console.warn("Invalid subFilling entry in filling recipe:", recipe.name, sub);
                          return <Typography key={`fill-sub-invalid-${index}`} variant="body2" sx={{ color: "orange" }}>- 子馅料条目数据缺失</Typography>;
                        }
                        const subFill = findFillingRecipeById(sub.recipeId);
                        return (
                          <Typography
                            key={sub.recipeId + '-' + index} // Ensure unique key
                            variant="body2"
                            sx={{ fontFamily: "Inter, sans-serif" }}
                          >
                            - {subFill?.name || ("未知子馅料 ID: " + sub.recipeId)}: {typeof sub.quantity === 'number' && isFinite(sub.quantity) ? sub.quantity : 'N/A'}
                            {sub?.unit || ""}
                          </Typography>
                        );
                      })}
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      注释:
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 1, fontFamily: "Inter, sans-serif" }}
                    >
                      {recipe.notes || '无'}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Container>
  );
};

export default FillingRecipeList;
