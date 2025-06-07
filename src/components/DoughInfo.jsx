import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Typography,
  Tooltip,
} from "@mui/material";
import { ExpandMore, ExpandLess, InfoOutlined as InfoOutlinedIcon } from "@mui/icons-material";
import { Link } from 'react-router-dom';
import { doughRecipes } from "../data/doughRecipes";
import {
  findIngredientById,
  calculateDoughCost,
  findDoughRecipeById,
  adjustCost,
} from "../utils/calculator";

const DoughInfo = ({ doughId, doughWeight, costBreakdown, allIngredientsList }) => {
  const [expandedPreFerments, setExpandedPreFerments] = useState({});
  const [highlightedSourceDough, setHighlightedSourceDough] = useState(null);
  const doughRecipe = doughRecipes.find((r) => r.id === doughId);

  // Calculate parent dough to product scaling factor, ensures doughRecipe.yield is valid
  const parentToProductScale = (doughRecipe && typeof doughRecipe.yield === 'number' && Number.isFinite(doughRecipe.yield) && doughRecipe.yield > 0 && typeof doughWeight === 'number' && Number.isFinite(doughWeight)) 
    ? (doughWeight / doughRecipe.yield) 
    : 0;

  useEffect(() => {
    const preFermentState = {};
    if (
      doughRecipe &&
      doughRecipe.preFerments &&
      Array.isArray(doughRecipe.preFerments) &&
      doughRecipe.preFerments.length > 0
    ) {
      doughRecipe.preFerments.forEach((preFerment) => {
        preFermentState[preFerment.id] = false;
      });
    }
    setExpandedPreFerments(preFermentState);
  }, [doughRecipe]);

  const handlePreFermentToggle = (preFermentId) => {
    setExpandedPreFerments((prev) => ({
     ...prev,
      [preFermentId]:!prev[preFermentId],
    }));
  };

  const getFullPreFermentRecipe = (preFermentId) => {
    return findDoughRecipeById(preFermentId);
  };

  if (!doughRecipe) {
    return <Typography variant="body2">未找到面团配方 (ID: {doughId})</Typography>;
  }
  if (!allIngredientsList || allIngredientsList.length === 0) {
    return <Typography variant="body2" color="error">原料数据列表未提供给 DoughInfo 组件。</Typography>;
  }

  const hasValidPreFerments =
    doughRecipe.preFerments &&
    Array.isArray(doughRecipe.preFerments) &&
    doughRecipe.preFerments.length > 0;

  const getCostOfPreFermentUsage = (pfUsage) => {
    const pfRecipe = getFullPreFermentRecipe(pfUsage.id);
    if (!pfRecipe || typeof pfRecipe.yield !== 'number' || !Number.isFinite(pfRecipe.yield) || pfRecipe.yield <= 0) {
      console.error(`Pre-ferment recipe "${pfUsage.id}" (name: ${pfRecipe?.name}) not found or yield (${pfRecipe?.yield}) is invalid for cost calculation.`);
      return 0;
    }
    // Pass allIngredientsList to calculateDoughCost
    const batchCalcResult = calculateDoughCost(pfRecipe, allIngredientsList); 
    if (batchCalcResult == null || typeof batchCalcResult.cost !== 'number' || !Number.isFinite(batchCalcResult.cost)) {
        console.error(`Failed to calculate batch cost for pre-ferment "${pfRecipe.name}" (id: ${pfUsage.id}). Cost is ${batchCalcResult?.cost}`);
        return 0;
    }
    const costPerGram = batchCalcResult.cost / pfRecipe.yield;
    if (!Number.isFinite(costPerGram)) {
        console.error(`Calculated costPerGram for pre-ferment "${pfRecipe.name}" is not finite. Cost: ${batchCalcResult.cost}, Yield: ${pfRecipe.yield}`);
        return 0; 
    }
    const quantity = Number(pfUsage.quantity);
    if (typeof pfUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
        console.warn(`Invalid quantity (${pfUsage.quantity}) for pre-ferment usage of "${pfRecipe.name}". Defaulting quantity to 0 for cost calc.`);
        return 0;
    }
    return costPerGram * quantity;
  };
  
  const totalPreFermentsCostInRecipe = doughRecipe.preFerments?.reduce(
    (total, pf) => total + getCostOfPreFermentUsage(pf),
    0
  ) || 0;

  const mainIngredientsOnlyCost = doughRecipe.ingredients?.reduce((total, ingUsage) => {
    // Pass allIngredientsList to findIngredientById
    const ingData = findIngredientById(ingUsage.ingredientId, allIngredientsList);
    const ingId = ingUsage.ingredientId || 'unknown ingredient';
    if (!ingData) {
      console.warn(`[DoughInfo] Ingredient data for main ingredient "${ingId}" not found. Skipping cost contribution.`);
      return total;
    }
    if (typeof ingData.price !== 'number' || !Number.isFinite(ingData.price) || ingData.price < 0) {
      console.warn(`[DoughInfo] Invalid price (${ingData.price}) for main ingredient "${ingId}" (${ingData.name}). Skipping cost contribution.`);
      return total;
    }
    if (typeof ingData.norms !== 'number' || !Number.isFinite(ingData.norms) || ingData.norms <= 0) {
      console.warn(`[DoughInfo] Invalid norms (${ingData.norms}) for main ingredient "${ingId}" (${ingData.name}). Skipping cost contribution.`);
      return total;
    }
    const pricePerMinUnit = ingData.price / ingData.norms;
    if (!Number.isFinite(pricePerMinUnit)) {
        console.warn(`[DoughInfo] Calculated pricePerMinUnit for main ingredient "${ingId}" (${ingData.name}) is not finite. Price: ${ingData.price}, Norms: ${ingData.norms}. Skipping cost contribution.`);
        return total;
    }
    const quantity = Number(ingUsage.quantity);
    if (typeof ingUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
        console.warn(`[DoughInfo] Invalid quantity (${ingUsage.quantity}) for main ingredient "${ingId}" (${ingData.name}). Skipping cost contribution.`);
        return total;
    }
    return total + (pricePerMinUnit * quantity);
  }, 0) || 0;

  // --- START: New logic to build a flat list of all dough ingredients ---
  const allDoughIngredientsForDisplay = [];

  // 1. Add direct ingredients of the main dough
  doughRecipe.ingredients?.forEach((ingUsage, index) => {
    // Pass allIngredientsList to findIngredientById
    const ingredientData = findIngredientById(ingUsage.ingredientId, allIngredientsList);
    let pricePerMinUnit = 0;
    if (ingredientData && typeof ingredientData.price === 'number' && Number.isFinite(ingredientData.price) && typeof ingredientData.norms === 'number' && Number.isFinite(ingredientData.norms) && ingredientData.norms > 0) {
      pricePerMinUnit = ingredientData.price / ingredientData.norms;
    }
    if (!Number.isFinite(pricePerMinUnit)) pricePerMinUnit = 0;

    const productUsageQty = (Number(ingUsage.quantity) || 0) * parentToProductScale;
    
    allDoughIngredientsForDisplay.push({
      key: `direct-${ingUsage.ingredientId}-${index}`,
      name: ingredientData?.name || ingUsage.ingredientId,
      source: doughRecipe.name, // Main dough name
      productUsageQty: productUsageQty,
      displayUnit: ingUsage.unit || ingredientData?.min || 'g',
      unitCost: pricePerMinUnit,
      productTotalCost: adjustCost(productUsageQty * pricePerMinUnit),
    });
  });

  // 2. Add ingredients from pre-ferments
  doughRecipe.preFerments?.forEach((pfUsageInMainDough, pfIndex) => {
    const pfRecipe = getFullPreFermentRecipe(pfUsageInMainDough.id);
    if (pfRecipe && pfRecipe.ingredients) {
      const pfBatchQtyInMainDough = Number(pfUsageInMainDough.quantity) || 0;

      pfRecipe.ingredients.forEach((pfIngUsage, pfIngIndex) => {
        // Pass allIngredientsList to findIngredientById
        const ingredientData = findIngredientById(pfIngUsage.ingredientId, allIngredientsList);
        let pricePerMinUnit = 0;
        if (ingredientData && typeof ingredientData.price === 'number' && Number.isFinite(ingredientData.price) && typeof ingredientData.norms === 'number' && Number.isFinite(ingredientData.norms) && ingredientData.norms > 0) {
          pricePerMinUnit = ingredientData.price / ingredientData.norms;
        }
        if (!Number.isFinite(pricePerMinUnit)) pricePerMinUnit = 0;

        let productUsageQty = 0;
        if (typeof pfRecipe.yield === 'number' && Number.isFinite(pfRecipe.yield) && pfRecipe.yield > 0 && Number.isFinite(pfBatchQtyInMainDough) && Number.isFinite(parentToProductScale)) {
          productUsageQty = ( (Number(pfIngUsage.quantity) || 0) / pfRecipe.yield ) * pfBatchQtyInMainDough * parentToProductScale;
        }
        if(!Number.isFinite(productUsageQty)) productUsageQty = 0;

        allDoughIngredientsForDisplay.push({
          key: `pf-${pfUsageInMainDough.id}-${pfIngUsage.ingredientId}-${pfIngIndex}`,
          name: ingredientData?.name || pfIngUsage.ingredientId,
          source: pfRecipe.name,
          productUsageQty: productUsageQty,
          displayUnit: pfIngUsage.unit || ingredientData?.min || 'g',
          unitCost: pricePerMinUnit,
          productTotalCost: adjustCost(productUsageQty * pricePerMinUnit),
        });
      });
    }
  });
  // --- END: New logic --- 

  // This is the total cost for this dough in the final product, derived from the pre-calculated costBreakdown.
  const productDoughTotalCost = costBreakdown?.doughCostDetails?.totalCostInProduct ?? 0;

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h2"
            sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mr: 1 }}
        >
          面团信息: {doughRecipe.name}
        </Typography>
          <Tooltip title="查看面团配方操作指南">
            <IconButton component={Link} to="/operation-guide#dough-recipes" size="small" sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            产品中使用面团量: <strong>{doughWeight.toFixed(1)}g</strong>
          </Typography>
          <Typography variant="body1">
            此面团在产品中总成本: <strong>¥{adjustCost(productDoughTotalCost).toFixed(2)}</strong>
            {parentToProductScale > 0 && doughRecipe.yield > 0 && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1}}>
                    (面团配方批量: {doughRecipe.yield}g, 成本 ¥{adjustCost(costBreakdown?.doughCostDetails?.batchCost ?? 0).toFixed(2)})
                </Typography>
            )}
          </Typography>
        </Box>

        <Typography variant="h6" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mb: 2, mt: 3 }}>
          面团物料明细 (基于产品用量: {doughWeight}g)
        </Typography>
        <TableContainer component={Paper} sx={{ mb: hasValidPreFerments ? 3 : 0}}>
            <Table size="small">
              <TableHead>
                <TableRow>
                <TableCell sx={{ fontFamily: "Inter, sans-serif", fontWeight: 'bold' }}>配料名称</TableCell>
                <TableCell sx={{ fontFamily: "Inter, sans-serif", fontWeight: 'bold' }}>来源面团</TableCell>
                <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 'bold' }}>产品用量</TableCell>
                <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 'bold' }}>单位成本 (元/{allDoughIngredientsForDisplay[0]?.displayUnit || 'g'})</TableCell>
                <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 'bold' }}>总成本 (产品中)</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {allDoughIngredientsForDisplay.length > 0 ? (
                  allDoughIngredientsForDisplay.map((item) => (
                    <TableRow 
                      key={item.key}
                      onMouseEnter={() => setHighlightedSourceDough(item.source)}
                      onMouseLeave={() => setHighlightedSourceDough(null)}
                      sx={{
                      ...(item.source === highlightedSourceDough && { backgroundColor: 'rgba(255,229,100,0.2)' }), // Light yellow highlight
                        transition: 'background-color 0.1s ease-in-out',
                      opacity: (highlightedSourceDough && item.source !== highlightedSourceDough) ? 0.5 : 1,
                      }}
                    >
                      <TableCell component="th" scope="row" sx={{ fontFamily: "Inter, sans-serif" }}>
                        {item.name}
                      </TableCell>
                    <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>{item.source}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif" }}>{item.productUsageQty.toFixed(2)} {item.displayUnit}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif" }}>¥{item.unitCost.toFixed(3)}</TableCell>
                    <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 'bold' }}>¥{item.productTotalCost.toFixed(2)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                  <TableCell colSpan={5} align="center">
                    此面团没有直接配料。
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

        {hasValidPreFerments && (
          <Box>
          <Typography
              variant="h6"
              component="h3"
              sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mb: 2, mt:4 }}
          >
              预发酵面团 (波兰种、中种等)
            </Typography>
            {doughRecipe.preFerments.map((preFermentUsage) => {
              const pfRecipe = getFullPreFermentRecipe(preFermentUsage.id);
              if (!pfRecipe) return <Typography key={`missing-pf-${preFermentUsage.id}`}>未找到预发酵面团: {preFermentUsage.id}</Typography>; 
              
              const isExpanded = expandedPreFerments[preFermentUsage.id] || false;
              const preFermentCostInRecipe = getCostOfPreFermentUsage(preFermentUsage);
              const preFermentCostInProduct = preFermentCostInRecipe * parentToProductScale;

              return (
                <Paper key={preFermentUsage.id} sx={{ p: 2, mb: 2, borderLeft: '3px solid', borderColor: 'primary.main' }} variant="outlined">
                  <Box
                    onClick={() => handlePreFermentToggle(preFermentUsage.id)}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      cursor: "pointer",
                    }}
                  >
                    <Typography variant="subtitle1" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                      {pfRecipe.name} (用量: {preFermentUsage.quantity}g)
                    </Typography>
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                        <Typography variant="body2" color="text.secondary" sx={{mr:1}}>
                            产品中成本: ¥{adjustCost(preFermentCostInProduct).toFixed(2)}
          </Typography>
                        <IconButton size="small">
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </Box>
                  </Box>
                  <Collapse in={isExpanded}>
                    <Typography variant="body2" sx={{ mt: 1, mb: 1, fontStyle: 'italic', color: 'text.secondary'}}>
                         {pfRecipe.description || '无描述'}
          </Typography>
                    <TableContainer component={Paper} variant="outlined">
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{fontWeight: 'bold'}}>预发酵面团配料</TableCell>
                            <TableCell align="right" sx={{fontWeight: 'bold'}}>批量用量 ({pfRecipe.yield}g)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pfRecipe.ingredients.map((ing) => (
                            <TableRow key={ing.ingredientId}>
                              <TableCell>{findIngredientById(ing.ingredientId, allIngredientsList)?.name || ing.ingredientId}</TableCell>
                              <TableCell align="right">{ing.quantity}{ing.unit}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Paper>
              );
            })}
        </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DoughInfo;
