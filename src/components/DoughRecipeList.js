import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Container,
  Box,
  IconButton,
} from "@mui/material";
import { doughRecipes } from "../data/doughRecipes";
import {
  calculateDoughCost,
  findIngredientById,
  findDoughRecipeById,
} from "../utils/calculator";
import { styled } from "@mui/material/styles";

const ExpandMore = styled((props) => {
  const { expand, ...other } = props;
  return <IconButton {...other} />;
})(({ theme, expand }) => ({
  transform: expand ? "rotate(180deg)" : "rotate(0deg)",
  marginLeft: "auto",
  transition: theme.transitions.create("transform", {
    duration: theme.transitions.duration.shortest,
  }),
}));

const DoughRecipeList = () => {
  const [expanded, setExpanded] = React.useState({});

  const handleExpandClick = (id) => {
    setExpanded((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <Container maxWidth="xl">
      <Typography
        variant="h4"
        component="h1"
        sx={{ mb: 6, mt: 3, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
      >
        面团配方
      </Typography>
      <Grid container spacing={4}>
        {doughRecipes.map((recipe) => {
          const cost = calculateDoughCost(recipe);
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
                        // 检查配料是否存在
                        if (!ingredient) {
                          return (
                            <Typography
                              key={ing.ingredientId}
                              variant="body2"
                              sx={{
                                fontFamily: "Inter, sans-serif",
                                color: "red",
                              }}
                            >
                              - 未知配料 (ID: {ing.ingredientId})
                            </Typography>
                          );
                        }

                        return (
                          <Typography
                            key={ing.ingredientId}
                            variant="body2"
                            sx={{ fontFamily: "Inter, sans-serif" }}
                          >
                            - {ingredient.name}: {ing.quantity}
                            {ing.unit}
                          </Typography>
                        );
                      })}
                      {recipe.preFerments &&
                        recipe.preFerments.map((dough) => {
                          const doughInfo = findDoughRecipeById(
                            dough.ingredientId
                          );

                          return (
                            <Typography
                              key={dough.ingredientId}
                              variant="body2"
                              sx={{ fontFamily: "Inter, sans-serif" }}
                            >
                              - {doughInfo.name}: {dough.quantity}
                              {dough.unit}
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

export default DoughRecipeList;
