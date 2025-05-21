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
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { doughRecipes } from "../data/doughRecipes";
import {
  findIngredientById,
  calculateDoughCost,
  findDoughRecipeById,
} from "../utils/calculator";

const DoughInfo = ({ doughId, doughWeight, costBreakdown }) => {
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
    return <Typography variant="body2">未找到面团配方</Typography>;
  }

  const hasValidPreFerments =
    doughRecipe.preFerments &&
    Array.isArray(doughRecipe.preFerments) &&
    doughRecipe.preFerments.length > 0;

  const getCostOfPreFermentUsage = (pfUsage) => {
    const pfRecipe = getFullPreFermentRecipe(pfUsage.id);

    // Stronger check for yield
    if (!pfRecipe || typeof pfRecipe.yield !== 'number' || !Number.isFinite(pfRecipe.yield) || pfRecipe.yield <= 0) {
      console.error(`Pre-ferment recipe "${pfUsage.id}" (name: ${pfRecipe?.name}) not found or yield (${pfRecipe?.yield}) is invalid for cost calculation.`);
      return 0;
    }

    const batchCalcResult = calculateDoughCost(pfRecipe); 

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
    const ingData = findIngredientById(ingUsage.ingredientId);
    const ingId = ingUsage.ingredientId || 'unknown ingredient';

    if (!ingData) {
      console.warn(`Ingredient data for main ingredient "${ingId}" not found. Skipping cost contribution.`);
      return total;
    }
    if (typeof ingData.price !== 'number' || !Number.isFinite(ingData.price) || ingData.price < 0) {
      console.warn(`Invalid price (${ingData.price}) for main ingredient "${ingId}" (${ingData.name}). Skipping cost contribution.`);
      return total;
    }
    if (typeof ingData.norms !== 'number' || !Number.isFinite(ingData.norms) || ingData.norms <= 0) {
      console.warn(`Invalid norms (${ingData.norms}) for main ingredient "${ingId}" (${ingData.name}). Skipping cost contribution.`);
      return total;
    }

    const pricePerMinUnit = ingData.price / ingData.norms;
    if (!Number.isFinite(pricePerMinUnit)) {
        console.warn(`Calculated pricePerMinUnit for main ingredient "${ingId}" (${ingData.name}) is not finite. Price: ${ingData.price}, Norms: ${ingData.norms}. Skipping cost contribution.`);
        return total;
    }

    const quantity = Number(ingUsage.quantity);
    if (typeof ingUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
        console.warn(`Invalid quantity (${ingUsage.quantity}) for main ingredient "${ingId}" (${ingData.name}). Skipping cost contribution.`);
        return total;
    }
    return total + (pricePerMinUnit * quantity);
  }, 0) || 0;

  // --- START: New logic to build a flat list of all dough ingredients ---
  const allDoughIngredientsForDisplay = [];

  // 1. Add direct ingredients of the main dough
  doughRecipe.ingredients?.forEach((ingUsage, index) => {
    const ingredientData = findIngredientById(ingUsage.ingredientId);
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
      productTotalCost: productUsageQty * pricePerMinUnit,
    });
  });

  // 2. Add ingredients from pre-ferments
  doughRecipe.preFerments?.forEach((pfUsageInMainDough, pfIndex) => {
    const pfRecipe = getFullPreFermentRecipe(pfUsageInMainDough.id);
    if (pfRecipe && pfRecipe.ingredients) {
      const pfBatchQtyInMainDough = Number(pfUsageInMainDough.quantity) || 0;

      pfRecipe.ingredients.forEach((pfIngUsage, pfIngIndex) => {
        const ingredientData = findIngredientById(pfIngUsage.ingredientId);
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
          productTotalCost: productUsageQty * pricePerMinUnit,
        });
      });
    }
  });
  // --- END: New logic --- 

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography
          variant="h5"
          component="h2"
          sx={{ mb: 3, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
        >
          面团信息
        </Typography>

        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
          >
            {doughRecipe.name}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1, fontFamily: "Inter, sans-serif" }}
          >
            使用量: {doughWeight}g
          </Typography>

          {/* 主面团配料 - THIS TABLE WILL BE MODIFIED */}
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>配料名称</TableCell>
                  <TableCell sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>来源</TableCell>
                  <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>产品用量</TableCell>
                  <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>单位成本</TableCell>
                  <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>总成本 (产品中)</TableCell>
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
                        ...(item.source === highlightedSourceDough && { backgroundColor: 'rgba(0,0,0,0.04)' }),
                        transition: 'background-color 0.1s ease-in-out',
                      }}
                    >
                      <TableCell component="th" scope="row" sx={{ fontFamily: "Inter, sans-serif" }}>
                        {item.name}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>
                        {item.source}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif" }}>
                        {item.productUsageQty.toFixed(1)}{item.displayUnit}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif" }}>
                        ¥{item.unitCost.toFixed(6)}/{item.displayUnit}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif" }}>
                        ¥{item.productTotalCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      无配料信息
                    </TableCell>
                  </TableRow>
                )}
                {/* REMOVE OLD TOTALS ROWS FOR MAIN INGREDIENTS AND OVERALL DOUGH FROM HERE */}
                {/* New totals rows will need to be calculated from allDoughIngredientsForDisplay if desired */}
                 <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }} colSpan={2}>
                    面团总计 (所有来源)
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                    {/* Sum of item.productUsageQty */}
                    {allDoughIngredientsForDisplay.reduce((sum, item) => sum + item.productUsageQty, 0).toFixed(1)}g
                  </TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}>
                    {/* Sum of item.productTotalCost */}
                    ¥{allDoughIngredientsForDisplay.reduce((sum, item) => sum + item.productTotalCost, 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          <Typography
            variant="body2"
            sx={{ mt: 3, fontFamily: "Inter, sans-serif" }}
          >
            面团单位成本 (含预发酵种): ¥
            {(() => {
              let unitDoughCostVal = 0;
              const overallDoughBatchCostResult = calculateDoughCost(doughRecipe);
              if (doughRecipe && 
                  typeof doughRecipe.yield === 'number' && 
                  Number.isFinite(doughRecipe.yield) && 
                  doughRecipe.yield > 0 &&
                  overallDoughBatchCostResult && 
                  typeof overallDoughBatchCostResult.cost === 'number' && 
                  Number.isFinite(overallDoughBatchCostResult.cost)) {
                  unitDoughCostVal = overallDoughBatchCostResult.cost / doughRecipe.yield;
              } else {
                  console.warn(`Cannot calculate unit dough cost. Dough ID: ${doughRecipe?.id}, Dough yield: ${doughRecipe?.yield}, Dough batch cost: ${overallDoughBatchCostResult?.cost}`);
              }
              return unitDoughCostVal.toFixed(6);
            })()}
            /g
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: "Inter, sans-serif" }}>
            此面包中面团总成本: ¥{(costBreakdown?.dough?.cost || 0).toFixed(2)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DoughInfo;
