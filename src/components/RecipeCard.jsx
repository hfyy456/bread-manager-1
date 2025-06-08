import React from 'react';
import { Card, CardContent, Typography, Box, CardActions, Button, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

const RecipeCard = ({ recipe, displayCost, displayUnitCost, isValidYield, ingredientsList, subRecipesList, onEdit, onDelete }) => {
  return (
    <Card sx={{ transition: "transform 0.3s, box-shadow 0.3s", "&:hover": { transform: "translateY(-5px)" }, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
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
      <CardActions sx={{ justifyContent: 'flex-end', pr: 2, pb: 2 }}>
        <IconButton aria-label="edit" onClick={() => onEdit(recipe)}>
          <EditIcon />
        </IconButton>
        <IconButton aria-label="delete" onClick={() => onDelete(recipe._id)}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};

export default RecipeCard; 