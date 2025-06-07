import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const RecipeCard = ({ recipe, displayCost, displayUnitCost, isValidYield, ingredientsList, subRecipesList }) => {
  return (
    <Card sx={{ transition: "transform 0.3s, box-shadow 0.3s", "&:hover": { transform: "translateY(-5px)" }, height: '100%' }}>
      <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Typography gutterBottom variant="h5" component="h2" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
            {recipe.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontFamily: "Inter, sans-serif" }}>
            总重量: {isValidYield ? `${recipe.yield}g` : 'N/A'} | 总成本: ¥{displayCost} |
            单位成本: ¥{displayUnitCost}/g
          </Typography>

          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle1" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
              配料:
            </Typography>
            <Box sx={{ mt: 1, ml: 2 }}>
              {ingredientsList}
              {subRecipesList}
            </Box>
          </Box>
        </Box>

        {recipe.notes && (
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="subtitle1" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                注释:
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontFamily: "Inter, sans-serif", whiteSpace: 'pre-line' }}>
                {recipe.notes}
                </Typography>
            </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecipeCard; 