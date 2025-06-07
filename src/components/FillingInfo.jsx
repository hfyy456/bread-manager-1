import React, { useState } from 'react';
import { Card, CardContent, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Tooltip, IconButton } from '@mui/material';
import { findIngredientById, findFillingRecipeById, adjustCost } from '../utils/calculator';
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

const FillingInfo = ({ fillings, costBreakdown, allIngredientsList }) => {
  const [highlightedSourceFilling, setHighlightedSourceFilling] = useState(null);

  if (!costBreakdown || !costBreakdown.fillingsDetails || costBreakdown.fillingsDetails.length === 0) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            馅料物料明细
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
            此面包没有馅料信息或馅料成本为零。
          </Typography>
        </CardContent>
      </Card>
    );
  }

  if (!allIngredientsList || allIngredientsList.length === 0) {
    return (
        <Card sx={{ mt: 4 }}>
            <CardContent>
                <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>馅料物料明细</Typography>
                <Typography variant="body2" color="error" sx={{ fontFamily: 'Inter, sans-serif' }}>原料数据列表未提供给 FillingInfo 组件，无法显示馅料详情。</Typography>
        </CardContent>
      </Card>
    );
  }

  const allFillingMaterialsForDisplay = [];
  let totalCostOfAllFillingMaterials = 0;

  costBreakdown.fillingsDetails.forEach((fillingUsageInProduct, usageIndex) => {
    if (fillingUsageInProduct.isDirectIngredient) {
      const ingredientData = findIngredientById(fillingUsageInProduct.id, allIngredientsList);
      let pricePerMinUnit = 0;
      if (ingredientData && typeof ingredientData.price === 'number' && ingredientData.norms > 0) {
        pricePerMinUnit = ingredientData.price / ingredientData.norms;
      }
      const productUsageQty = Number(fillingUsageInProduct.quantityInProduct) || 0;
      const productTotalCost = Number(fillingUsageInProduct.costInProduct) || 0;
      totalCostOfAllFillingMaterials += productTotalCost;

      allFillingMaterialsForDisplay.push({
        key: `direct-fill-${fillingUsageInProduct.id}-${usageIndex}`,
        name: ingredientData?.name || fillingUsageInProduct.id,
        source: "直接原料",
        productUsageQty: productUsageQty,
        displayUnit: fillingUsageInProduct.unit || ingredientData?.baseUnit || ingredientData?.min || 'g',
        unitCost: pricePerMinUnit, 
        productTotalCost: productTotalCost,
      });
    } else {
      const fillingRecipe = findFillingRecipeById(fillingUsageInProduct.id);
      if (!fillingRecipe) {
        console.warn(`[FillingInfo] Filling recipe not found for ID: ${fillingUsageInProduct.id} (expected name: ${fillingUsageInProduct.recipeName})`);
        allFillingMaterialsForDisplay.push({
          key: `missing-recipe-${fillingUsageInProduct.id}-${usageIndex}`,
          name: `配方未找到: ${fillingUsageInProduct.recipeName || fillingUsageInProduct.id}`,
          source: "错误",
          productUsageQty: Number(fillingUsageInProduct.quantityInProduct) || 0,
          displayUnit: fillingUsageInProduct.unit || 'g',
          unitCost: 0,
          productTotalCost: Number(fillingUsageInProduct.costInProduct) || 0,
        });
        totalCostOfAllFillingMaterials += (Number(fillingUsageInProduct.costInProduct) || 0);
        return;
      }
      
      const totalProductUsageOfThisFillingType = Number(fillingUsageInProduct.quantityInProduct) || 0;
      const fillingRecipeYield = (fillingRecipe.yield > 0 && Number.isFinite(fillingRecipe.yield)) ? fillingRecipe.yield : 0;
      
      const scaleFillingRecipeToProduct = (fillingRecipeYield > 0 && Number.isFinite(totalProductUsageOfThisFillingType)) 
        ? (totalProductUsageOfThisFillingType / fillingRecipeYield)
        : 0;
      
      let costSumForThisRecipeInProduct = 0;

      fillingRecipe.ingredients?.forEach((ingUsage, ingIndex) => {
        const ingredientData = findIngredientById(ingUsage.ingredientId, allIngredientsList);
        let pricePerMinUnit = 0;
        if (ingredientData && typeof ingredientData.price === 'number' && ingredientData.norms > 0) {
          pricePerMinUnit = ingredientData.price / ingredientData.norms;
        }
        
        const recipeQty = Number(ingUsage.quantity) || 0;
        const productUsageQty = recipeQty * scaleFillingRecipeToProduct;
        const ingredientCostInProduct = productUsageQty * pricePerMinUnit;
        costSumForThisRecipeInProduct += ingredientCostInProduct;

        allFillingMaterialsForDisplay.push({
          key: `fill-main-${fillingRecipe.id}-${ingUsage.ingredientId}-${ingIndex}`,
          name: ingredientData?.name || ingUsage.ingredientId,
          source: fillingRecipe.name,
          productUsageQty: productUsageQty,
          displayUnit: ingUsage.unit || ingredientData?.baseUnit || ingredientData?.min || 'g',
          unitCost: pricePerMinUnit,
          productTotalCost: adjustCost(ingredientCostInProduct),
        });
      });

      fillingRecipe.subFillings?.forEach((sfUsage, sfIndex) => {
        const subFillingRecipe = findFillingRecipeById(sfUsage.recipeId);
        if (subFillingRecipe && subFillingRecipe.ingredients) {
          const subFillingRecipeYield = (subFillingRecipe.yield > 0 && Number.isFinite(subFillingRecipe.yield)) ? subFillingRecipe.yield : 0;
          const sfQtyInParentRecipe = Number(sfUsage.quantity) || 0; 
          
          const totalProductUsageOfThisSubFillingType = sfQtyInParentRecipe * scaleFillingRecipeToProduct;

          if (subFillingRecipeYield > 0) {
            const scaleSubFillingToProduct = totalProductUsageOfThisSubFillingType / subFillingRecipeYield;

            subFillingRecipe.ingredients.forEach((subIngUsage, subIngIndex) => {
              const ingredientData = findIngredientById(subIngUsage.ingredientId, allIngredientsList);
              let pricePerMinUnit = 0;
              if (ingredientData && typeof ingredientData.price === 'number' && ingredientData.norms > 0) {
                pricePerMinUnit = ingredientData.price / ingredientData.norms;
              }
              const subRecipeIngQty = Number(subIngUsage.quantity) || 0;
              const productUsageQty = subRecipeIngQty * scaleSubFillingToProduct;
              const ingredientCostInProduct = productUsageQty * pricePerMinUnit;
              costSumForThisRecipeInProduct += ingredientCostInProduct; 

              allFillingMaterialsForDisplay.push({
                key: `sf-ing-${fillingRecipe.id}-${subFillingRecipe.id}-${subIngUsage.ingredientId}-${subIngIndex}`,
                name: ingredientData?.name || subIngUsage.ingredientId,
                source: subFillingRecipe.name,
                productUsageQty: productUsageQty,
                displayUnit: subIngUsage.unit || ingredientData?.baseUnit || ingredientData?.min || 'g',
                unitCost: pricePerMinUnit,
                productTotalCost: adjustCost(ingredientCostInProduct),
              });
            });
          }
        }
      });
      totalCostOfAllFillingMaterials += adjustCost(costSumForThisRecipeInProduct);
    }
  });

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, mr: 1 }}>
            馅料物料明细
          </Typography>
          <Tooltip title="查看馅料配方操作指南">
            <IconButton component={Link} to="/operation-guide#filling-recipes" size="small" sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Box>
        
        {allFillingMaterialsForDisplay.length > 0 ? (
          <TableContainer component={Paper} sx={{ mt: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>配料名称</TableCell>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>来源馅料</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>产品用量</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>单位成本 (元/{allFillingMaterialsForDisplay[0]?.displayUnit || 'g'})</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>总成本 (产品中)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allFillingMaterialsForDisplay.map((item) => (
                  <TableRow 
                    key={item.key}
                    onMouseEnter={() => setHighlightedSourceFilling(item.source)}
                    onMouseLeave={() => setHighlightedSourceFilling(null)}
                    sx={{
                      ...(item.source === highlightedSourceFilling && { backgroundColor: 'rgba(255,229,100,0.2)' }),
                      transition: 'background-color 0.1s ease-in-out',
                      opacity: (highlightedSourceFilling && item.source !== highlightedSourceFilling) ? 0.5 : 1,
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{item.name}</TableCell>
                    <TableCell sx={{ fontFamily: 'Inter, sans-serif' }}>{item.source}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>{item.productUsageQty.toFixed(2)}{item.displayUnit}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>¥{item.unitCost.toFixed(3)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 'bold' }}>¥{item.productTotalCost.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ '& td': { borderTop: '1px solid rgba(224, 224, 224, 1)', fontWeight: 'bold' } }}>
                  <TableCell colSpan={2} sx={{ fontFamily: 'Inter, sans-serif' }}>所有馅料物料总成本</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                    ¥{totalCostOfAllFillingMaterials.toFixed(2)}
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