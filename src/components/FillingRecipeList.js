import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Container,
  Box,
} from "@mui/material";
import { fillingRecipes } from "../data/fillingRecipes";
import {
  calculateFillingCost,
  findFillingRecipeById,
  findIngredientById,
} from "../utils/calculator";

const FillingRecipeList = () => {
  return (
    <Container maxWidth="xl">
      <Typography
        variant="h4"
        component="h1"
        sx={{ mb: 6, mt: 3, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
      >
        馅料配方
      </Typography>
      <Grid container spacing={4}>
        {fillingRecipes.map((recipe) => {
          const cost = calculateFillingCost(recipe);
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
                    总重量: {recipe.yield}g | 总成本: ¥{cost.toFixed(2)} |
                    单位成本: ¥{(cost / recipe.yield).toFixed(4)}/g
                  </Typography>

                  <Box sx={{ mt: 3 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      配料:
                    </Typography>
                    <Box sx={{ mt: 1, ml: 2 }}>
                      {recipe.ingredients.map((ing) => {
                        const ingredient = findIngredientById(ing.ingredientId);
                        return (
                          <Typography
                            key={ing.ingredientId}
                            variant="body2"
                            sx={{ fontFamily: "Inter, sans-serif" }}
                          >
                            -{" "}
                            {ingredient?.name ||
                              "未知配料" + "-" + ing.ingredientId}
                            : {ing.quantity}
                            {ing?.unit || ""}
                          </Typography>
                        );
                      })}
                      {recipe.subFillings.map((sub) => {
                        const subFill = findFillingRecipeById(sub.recipeId);
                        return (
                          <Typography
                            key={sub.recipeId}
                            variant="body2"
                            sx={{ fontFamily: "Inter, sans-serif" }}
                          >
                            - {subFill?.name || "未知配料"}: {sub.quantity}
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
                      {recipe.notes}
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
