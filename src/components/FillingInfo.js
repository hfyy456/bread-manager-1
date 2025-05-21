import React, { useState } from 'react';
import { Card, CardContent, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { findIngredientById, calculateFillingCost, findFillingRecipeById } from '../utils/calculator';

const FillingInfo = ({ fillings, costBreakdown }) => {
  const [highlightedSourceFilling, setHighlightedSourceFilling] = useState(null);

  if (!fillings || fillings.length === 0) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            馅料信息
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
            此面包没有馅料
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const allFillingMaterialsForDisplay = [];

  costBreakdown?.fillings?.details?.forEach((fillingDetail) => {
    const parentFillingRecipe = findFillingRecipeById(fillingDetail.name);
    if (!parentFillingRecipe) {
      console.warn(`Filling recipe not found for: ${fillingDetail.name}`);
      return;
    }

    const productUsageOfThisFillingType = Number(fillingDetail.weight) || 0;
    const scaleParentFillingToProduct = (parentFillingRecipe.yield > 0 && Number.isFinite(parentFillingRecipe.yield) && Number.isFinite(productUsageOfThisFillingType))
      ? (productUsageOfThisFillingType / parentFillingRecipe.yield)
      : 0;

    parentFillingRecipe.ingredients?.forEach((ingUsage, ingIndex) => {
      const ingredientData = findIngredientById(ingUsage.ingredientId);
      let pricePerMinUnit = 0;
      if (ingredientData && typeof ingredientData.price === 'number' && Number.isFinite(ingredientData.price) && typeof ingredientData.norms === 'number' && Number.isFinite(ingredientData.norms) && ingredientData.norms > 0) {
        pricePerMinUnit = ingredientData.price / ingredientData.norms;
      }
      if (!Number.isFinite(pricePerMinUnit)) pricePerMinUnit = 0;

      const productUsageQty = (Number(ingUsage.quantity) || 0) * scaleParentFillingToProduct;

      allFillingMaterialsForDisplay.push({
        key: `fill-direct-${parentFillingRecipe.id || parentFillingRecipe.name}-${ingUsage.ingredientId}-${ingIndex}`,
        name: ingredientData?.name || ingUsage.ingredientId,
        source: parentFillingRecipe.name,
        productUsageQty: Number.isFinite(productUsageQty) ? productUsageQty : 0,
        displayUnit: ingUsage.unit || ingredientData?.min || 'g',
        unitCost: pricePerMinUnit,
        productTotalCost: (Number.isFinite(productUsageQty) ? productUsageQty : 0) * pricePerMinUnit,
      });
    });

    parentFillingRecipe.subFillings?.forEach((sfUsage, sfIndex) => {
      const subFillingRecipe = findFillingRecipeById(sfUsage.recipeId);
      if (subFillingRecipe && subFillingRecipe.ingredients) {
        const sfBatchQtyInParentFilling = Number(sfUsage.quantity) || 0;
        const productUsageOfSubFillingType = sfBatchQtyInParentFilling * scaleParentFillingToProduct;

        subFillingRecipe.ingredients.forEach((subIngUsage, subIngIndex) => {
          const ingredientData = findIngredientById(subIngUsage.ingredientId);
          let pricePerMinUnit = 0;
          if (ingredientData && typeof ingredientData.price === 'number' && Number.isFinite(ingredientData.price) && typeof ingredientData.norms === 'number' && Number.isFinite(ingredientData.norms) && ingredientData.norms > 0) {
            pricePerMinUnit = ingredientData.price / ingredientData.norms;
          }
          if (!Number.isFinite(pricePerMinUnit)) pricePerMinUnit = 0;

          let finalProductUsageQtySubIng = 0;
          if(typeof subFillingRecipe.yield === 'number' && Number.isFinite(subFillingRecipe.yield) && subFillingRecipe.yield > 0 && Number.isFinite(productUsageOfSubFillingType)) {
            finalProductUsageQtySubIng = ( (Number(subIngUsage.quantity) || 0) / subFillingRecipe.yield ) * productUsageOfSubFillingType;
          }
          if(!Number.isFinite(finalProductUsageQtySubIng)) finalProductUsageQtySubIng = 0;

          allFillingMaterialsForDisplay.push({
            key: `sf-${parentFillingRecipe.id || parentFillingRecipe.name}-${subFillingRecipe.id || subFillingRecipe.name}-${subIngUsage.ingredientId}-${subIngIndex}`,
            name: ingredientData?.name || subIngUsage.ingredientId,
            source: subFillingRecipe.name,
            productUsageQty: finalProductUsageQtySubIng,
            displayUnit: subIngUsage.unit || ingredientData?.min || 'g',
            unitCost: pricePerMinUnit,
            productTotalCost: finalProductUsageQtySubIng * pricePerMinUnit,
          });
        });
      }
    });
  });

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          馅料物料明细
        </Typography>
        
        {allFillingMaterialsForDisplay.length > 0 ? (
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>配料名称</TableCell>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>来源</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>产品用量</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>单位成本</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>总成本 (产品中)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allFillingMaterialsForDisplay.map((item) => (
                  <TableRow 
                    key={item.key}
                    onMouseEnter={() => setHighlightedSourceFilling(item.source)}
                    onMouseLeave={() => setHighlightedSourceFilling(null)}
                    sx={{
                      ...(item.source === highlightedSourceFilling && { backgroundColor: 'rgba(0,0,0,0.04)' }),
                      transition: 'background-color 0.1s ease-in-out',
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{item.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{item.source}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>{item.productUsageQty.toFixed(1)}{item.displayUnit}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>¥{item.unitCost.toFixed(6)}/{item.displayUnit}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>¥{item.productTotalCost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell colSpan={2} sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>所有馅料物料总计</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>
                    {allFillingMaterialsForDisplay.reduce((sum, item) => sum + item.productUsageQty, 0).toFixed(1)}g
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>
                    ¥{allFillingMaterialsForDisplay.reduce((sum, item) => sum + item.productTotalCost, 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        ) : (
          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
            此面包的馅料无具体物料信息或计算出错。
          </Typography>
        )}


      </CardContent>
    </Card>
  );
};

export default FillingInfo;