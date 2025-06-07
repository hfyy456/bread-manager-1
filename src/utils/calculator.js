// No longer importing directly, these will be passed as arguments
// import { doughRecipes } from "../data/doughRecipes";
// import { fillingRecipes } from "../data/fillingRecipes";
// import { breadTypes } from "../data/breadTypes";

// --- START: New Cost Adjustment Function (Fen-based) ---
export const adjustCost = (cost) => {
  const numCost = Number(cost);
  if (!Number.isFinite(numCost) || numCost === 0) {
    // Handles NaN, Infinity, and 0 by returning 0
    return 0;
  }
  // Rounds up to the nearest 0.01 (fen)
  return Math.ceil(numCost * 100) / 100;
};
// --- END: New Cost Adjustment Function (Fen-based) ---

// --- START: Ingredient Name Normalization Map ---
const ingredientNameNormalizationMap = {
  "高筋粉": "高筋面粉",
  "低筋粉": "低筋面粉",
  "全麦粉": "全麦面粉",
  // Add more mappings here based on user input, for example:
  // "糖粉": "幼砂糖",
  // "幼沙糖": "幼砂糖", 
  // "黄油": "发酵黄油",
};
// --- END: Ingredient Name Normalization Map ---

// 根据ID查找配料
export const findIngredientById = (id, ingredients) => {
  if (!id || !Array.isArray(ingredients)) return null;
  return ingredients.find(
    (ing) => ing.name === id || (ing._id && ing._id.$oid === id)
  );
};

// 根据ID查找面团配方
export const findDoughRecipeById = (id, doughRecipesMap) => {
  if (!id || !(doughRecipesMap instanceof Map)) return null;
  const trimmedId = id.trim();
  const recipe = doughRecipesMap.get(trimmedId);
  console.log(`[LOOKUP_DOUGH] Trying to find dough with ID: "${id}" (trimmed: "${trimmedId}"). Found:`, recipe ? `"${recipe.name}"` : 'NOT FOUND');
  return recipe;
};

// 根据ID查找馅料配方
export const findFillingRecipeById = (id, fillingRecipesMap) => {
  if (!id || !(fillingRecipesMap instanceof Map)) return null;
  const trimmedId = id.trim();
  const recipe = fillingRecipesMap.get(trimmedId);
  console.log(`[LOOKUP_FILLING] Trying to find filling with ID: "${id}" (trimmed: "${trimmedId}"). Found:`, recipe ? `"${recipe.name}"` : 'NOT FOUND');
  return recipe;
};

// 计算面团配方的总成本 (BATCH COST) - 使用 Map
export const calculateDoughCost = (doughRecipeId, doughRecipesMap, ingredientsMap) => {
  const recipe = doughRecipesMap.get((doughRecipeId || '').trim());
  if (!recipe) {
    return { cost: 0, yield: 0, ingredientCosts: {}, preFermentCosts: {} };
  }

  let mainIngredientsBatchCost = 0;
  const ingredientCosts = {};
  const preFermentCosts = {};

  recipe.ingredients?.forEach((ingUsage) => {
    const ingData = ingredientsMap.get((ingUsage.ingredientId || '').trim());
    if (!ingData || typeof ingData.price !== 'number' || typeof ingData.norms !== 'number' || ingData.norms <= 0) {
      return; // Skip if ingredient data is invalid
    }
    const pricePerMinUnit = ingData.price / ingData.norms;
    const quantity = Number(ingUsage.quantity);
    if (Number.isFinite(pricePerMinUnit) && Number.isFinite(quantity) && quantity >= 0) {
      const ingredientCost = adjustCost(pricePerMinUnit * quantity);
      mainIngredientsBatchCost += ingredientCost;
      ingredientCosts[ingUsage.ingredientId] = {
        cost: ingredientCost,
        quantity: quantity,
        unitCost: pricePerMinUnit
      };
    }
  });

  let preFermentsBatchCost = 0;
  recipe.preFerments?.forEach((pfUsage) => {
    const pfRecipe = doughRecipesMap.get((pfUsage.id || '').trim());
    const recipeYield = pfRecipe ? Number(pfRecipe.yield) : 0;
    if (!pfRecipe || recipeYield <= 0) {
      return; // Skip if pre-ferment recipe is invalid
    }
    
    const pfBatchCalc = calculateDoughCost(pfUsage.id, doughRecipesMap, ingredientsMap); // Recursive call
    if (pfBatchCalc && typeof pfBatchCalc.cost === 'number') {
      const costOfPfPerGram = pfBatchCalc.cost / recipeYield;
    const pfQuantity = Number(pfUsage.quantity);
      if (Number.isFinite(costOfPfPerGram) && Number.isFinite(pfQuantity) && pfQuantity >= 0) {
        const costForUsage = adjustCost(costOfPfPerGram * pfQuantity);
        preFermentsBatchCost += costForUsage;

        // Store cost details for this specific pre-ferment
        preFermentCosts[pfUsage.id] = {
          cost: costForUsage,
          quantity: pfQuantity,
          batchCost: pfBatchCalc.cost,
          batchYield: pfRecipe.yield,
          name: pfRecipe.name,
        };

        // Aggregate ingredient costs from pre-ferment
        const scale = pfQuantity / recipeYield;
        for (const [ingId, pfIngCost] of Object.entries(pfBatchCalc.ingredientCosts)) {
            const scaledCost = pfIngCost.cost * scale;
            const scaledQuantity = pfIngCost.quantity * scale;
            if (ingredientCosts[ingId]) {
                ingredientCosts[ingId].cost += scaledCost;
                ingredientCosts[ingId].quantity += scaledQuantity;
            } else {
                ingredientCosts[ingId] = {
                    cost: scaledCost,
                    quantity: scaledQuantity,
                    unitCost: pfIngCost.unitCost
                };
            }
        }
      }
    }
  });

  const totalCost = mainIngredientsBatchCost + preFermentsBatchCost;
  // Round all aggregated costs
  for (const ingId in ingredientCosts) {
    ingredientCosts[ingId].cost = adjustCost(ingredientCosts[ingId].cost);
  }

  return {
    cost: totalCost,
    yield: recipe.yield || 0,
    ingredientCosts: ingredientCosts, // Detailed breakdown of costs
    preFermentCosts: preFermentCosts,  // Detailed breakdown of pre-ferment costs
  };
};

// calculateSubFillingCost is effectively integrated into calculateFillingCost
// No longer needed as a separate export if only used internally by calculateFillingCost logic for breakdown

// 计算馅料配方的总成本 (BATCH COST) - 使用 Map
export const calculateFillingCost = (fillingRecipeId, fillingRecipesMap, ingredientsMap) => {
  const recipe = fillingRecipesMap.get((fillingRecipeId || '').trim());
  if (!recipe) {
    return { cost: 0, yield: 0, ingredientCosts: {} };
  }

  let mainIngredientsBatchCost = 0;
  const ingredientCosts = {};

  recipe.ingredients?.forEach((ingUsage) => {
    const ingData = ingredientsMap.get((ingUsage.ingredientId || '').trim());
    if (!ingData || typeof ingData.price !== 'number' || typeof ingData.norms !== 'number' || ingData.norms <= 0) {
      return;
    }
    const pricePerMinUnit = ingData.price / ingData.norms;
    const quantity = Number(ingUsage.quantity);
    if (Number.isFinite(pricePerMinUnit) && Number.isFinite(quantity) && quantity >= 0) {
      const ingredientCost = adjustCost(pricePerMinUnit * quantity);
      mainIngredientsBatchCost += ingredientCost;
      ingredientCosts[ingUsage.ingredientId] = {
        cost: ingredientCost,
        quantity: quantity,
        unitCost: pricePerMinUnit
      };
    }
  });

  let subFillingsBatchCost = 0;
  recipe.subFillings?.forEach((sfUsage) => {
    const sfRecipe = fillingRecipesMap.get((sfUsage.subFillingId || '').trim());
    const recipeYield = sfRecipe ? Number(sfRecipe.yield) : 0;
    if (!sfRecipe || recipeYield <= 0) {
      return;
    }

    // Recursive call for sub-filling
    const sfBatchCalc = calculateFillingCost(sfUsage.subFillingId, fillingRecipesMap, ingredientsMap);
    if (sfBatchCalc && typeof sfBatchCalc.cost === 'number') {
      const costOfSfPerGram = sfBatchCalc.cost / recipeYield;
    const sfQuantity = Number(sfUsage.quantity);
      if (Number.isFinite(costOfSfPerGram) && Number.isFinite(sfQuantity) && sfQuantity >= 0) {
        const costForUsage = adjustCost(costOfSfPerGram * sfQuantity);
        subFillingsBatchCost += costForUsage;

        // Aggregate ingredient costs from sub-filling
        const scale = sfQuantity / recipeYield;
        for (const [ingId, sfIngCost] of Object.entries(sfBatchCalc.ingredientCosts)) {
          const scaledCost = sfIngCost.cost * scale;
          const scaledQuantity = sfIngCost.quantity * scale;
          if (ingredientCosts[ingId]) {
            ingredientCosts[ingId].cost += scaledCost;
            ingredientCosts[ingId].quantity += scaledQuantity;
          } else {
            ingredientCosts[ingId] = {
              cost: scaledCost,
              quantity: scaledQuantity,
              unitCost: sfIngCost.unitCost
            };
          }
        }
      }
    }
  });

  const totalCost = mainIngredientsBatchCost + subFillingsBatchCost;
  // Round all aggregated costs
  for (const ingId in ingredientCosts) {
    ingredientCosts[ingId].cost = adjustCost(ingredientCosts[ingId].cost);
  }

  return {
    cost: totalCost,
    yield: recipe.yield || 0,
    ingredientCosts: ingredientCosts
  };
};

// 计算装饰的总成本 (PRODUCT COST) - 使用 Map
export const calculateDecorationCost = (decorations, ingredientsMap) => {
  let totalCost = 0;
  const details = {};

  if (!Array.isArray(decorations)) {
    return { totalCost: 0, details: {} };
  }

  decorations.forEach(deco => {
    const ingredientId = (deco.ingredientId || '').trim();
    if (!ingredientId) return;

    const ingredient = ingredientsMap.get(ingredientId);
    if (ingredient && typeof ingredient.price === 'number' && typeof ingredient.norms === 'number' && ingredient.norms > 0) {
      const unitCost = ingredient.price / ingredient.norms;
      const quantity = Number(deco.quantity);
      if (Number.isFinite(unitCost) && Number.isFinite(quantity) && quantity >= 0) {
        const cost = adjustCost(unitCost * quantity);
        totalCost += cost;
        details[ingredientId] = {
          unitCost: unitCost,
          cost: cost,
          quantity: quantity
        };
      }
    }
  });

  return { totalCost, details };
};

// calculateDoughCostPerGram and calculateFillingCostPerGram are implicitly handled by new structure

// calculateBreadCost is effectively replaced by getBreadCostBreakdown returning total cost

// --- START: New Exportable Function for Aggregated Raw Materials ---
export const generateAggregatedRawMaterials = (productionPlan, breadTypes, doughRecipesMap, fillingRecipesMap, allIngredientsList, productionQuantity = 1) => {
  console.log(`[generateAggregatedRawMaterials] Aggregating raw materials for bread: \"${productionPlan.name}\" (ID: \"${productionPlan.id}\"), Quantity: ${productionQuantity}`, productionPlan);
  const aggregated = {};

  // Helper to add/update material in the aggregation map
  const addMaterialToAggregation = (ingredientId, quantity, unitFromRecipe) => {
    // unitFromRecipe is the unit specified in the recipe (dough, filling, decoration)
    console.log(`[generateAggregatedRawMaterials.addMaterial] Attempting to add: ID=\"${ingredientId}\", Qty=${quantity}, Unit from recipe=\"${unitFromRecipe}\". Using allIngredientsList:`, allIngredientsList ? `Length ${allIngredientsList.length}` : 'Not provided');
    if (!ingredientId || typeof quantity !== 'number' || quantity <= 0) {
      console.warn(`[generateAggregatedRawMaterials.addMaterial] Invalid material data for \"${ingredientId}\", quantity: ${quantity}. Skipping.`);
      return;
    }

    const ingData = findIngredientById(ingredientId, allIngredientsList); // Get full ingredient data for its base unit (min)
    let baseDisplayUnit = ingData ? (ingData.baseUnit || ingData.min) : unitFromRecipe || 'g'; // Prefer ingredient.baseUnit (or min) as the true base unit

    // Convert ml to g for aggregation and display (example logic, adjust if needed for other conversions)
    if (baseDisplayUnit && typeof baseDisplayUnit === 'string' && baseDisplayUnit.toLowerCase() === 'ml') {
      baseDisplayUnit = 'g';
      console.log(`[generateAggregatedRawMaterials.addMaterial] Converted unit from ml to g for \"${ingredientId}\"`);
    }

    if (aggregated[ingredientId]) {
      aggregated[ingredientId].quantity += quantity;
      console.log(`[generateAggregatedRawMaterials.addMaterial] Updated \"${ingredientId}\": New Qty=${aggregated[ingredientId].quantity}, Unit=${aggregated[ingredientId].unit}`);
    } else {
      aggregated[ingredientId] = { 
        id: ingredientId, 
        name: ingData ? ingData.name : ingredientId, // Store name for easier display
        quantity: quantity, 
        unit: baseDisplayUnit, // Store the (potentially converted) baseDisplayUnit
        specs: ingData ? ingData.specs : null, // Add specs
        price: ingData ? ingData.price : null, // Add price
        purchaseUnit: ingData ? ingData.unit : null // Add purchase unit
      };
      console.log(`[generateAggregatedRawMaterials.addMaterial] Added new \"${ingredientId}\": Qty=${quantity}, Unit=${baseDisplayUnit}`);
    }
  };

  // Recursive helper to collect ingredients from dough recipes
  const collectIngredientsFromDoughRecursive = (currentDoughId, scaleFactorToProduct) => {
    console.log(`[generateAggregatedRawMaterials.collectDough] Processing dough ID: \"${currentDoughId}\", Scale Factor: ${scaleFactorToProduct}`);
    const doughRecipe = findDoughRecipeById(currentDoughId, doughRecipesMap);
    if (!doughRecipe) {
      console.warn(`[generateAggregatedRawMaterials.collectDough] Dough recipe not found for ID: \"${currentDoughId}\". Skipping.`);
      return;
    }
    console.log(`[generateAggregatedRawMaterials.collectDough] Found dough recipe: \"${doughRecipe.name}\"`, doughRecipe);

    // Collect direct ingredients
    doughRecipe.ingredients?.forEach(ingUsage => {
      const scaledQuantity = ingUsage.quantity * scaleFactorToProduct * productionQuantity;
      console.log(`[generateAggregatedRawMaterials.collectDough] Ingredient \"${ingUsage.ingredientId}\" from \"${doughRecipe.name}\": Original Qty=${ingUsage.quantity}, Scaled Qty=${scaledQuantity}`);
      addMaterialToAggregation(ingUsage.ingredientId, scaledQuantity, ingUsage.unit);
    });

    // Collect from pre-ferments (which are also doughs)
    doughRecipe.preFerments?.forEach(pfUsage => {
      const pfRecipe = findDoughRecipeById(pfUsage.id, doughRecipesMap);
      if (!pfRecipe || pfRecipe.yield <= 0) {
        console.warn(`[generateAggregatedRawMaterials.collectDough] Pre-ferment dough \"${pfUsage.id}\" in \"${doughRecipe.name}\" not found or has invalid yield. Skipping.`);
        return;
      }
      const newScaleFactor = (pfUsage.quantity / pfRecipe.yield) * scaleFactorToProduct;
      console.log(`[generateAggregatedRawMaterials.collectDough] Pre-ferment \"${pfUsage.id}\" in \"${doughRecipe.name}\": Used Qty=${pfUsage.quantity}, Yield=${pfRecipe.yield}, New Scale Factor=${newScaleFactor}`);
      collectIngredientsFromDoughRecursive(pfUsage.id, newScaleFactor);
    });
  };

  // Recursive helper to collect ingredients from filling recipes
  const collectIngredientsFromFillingRecursive = (currentFillingId, scaleFactorToProduct) => {
    console.log(`[generateAggregatedRawMaterials.collectFilling] Processing filling ID: \"${currentFillingId}\", Scale Factor: ${scaleFactorToProduct}`);
    const fillingRecipe = findFillingRecipeById(currentFillingId, fillingRecipesMap);
    if (!fillingRecipe) {
      console.warn(`[generateAggregatedRawMaterials.collectFilling] Filling recipe not found for ID: \"${currentFillingId}\". Skipping.`);
      return;
    }
    console.log(`[generateAggregatedRawMaterials.collectFilling] Found filling recipe: \"${fillingRecipe.name}\"`, fillingRecipe);

    // Collect direct ingredients
    fillingRecipe.ingredients?.forEach(ingUsage => {
      const scaledQuantity = ingUsage.quantity * scaleFactorToProduct * productionQuantity;
      console.log(`[generateAggregatedRawMaterials.collectFilling] Ingredient \"${ingUsage.ingredientId}\" from \"${fillingRecipe.name}\": Original Qty=${ingUsage.quantity}, Scaled Qty=${scaledQuantity}`);
      addMaterialToAggregation(ingUsage.ingredientId, scaledQuantity, ingUsage.unit);
    });

    // Collect from sub-fillings
    fillingRecipe.subFillings?.forEach(sfUsage => {
      const sfRecipe = findFillingRecipeById(sfUsage.subFillingId, fillingRecipesMap);
      if (!sfRecipe || sfRecipe.yield <= 0) {
        console.warn(`[generateAggregatedRawMaterials.collectFilling] Sub-filling \"${sfUsage.subFillingId}\" in \"${fillingRecipe.name}\" not found or has invalid yield. Skipping.`);
        return;
      }
      const newScaleFactor = (sfUsage.quantity / sfRecipe.yield) * scaleFactorToProduct;
      console.log(`[generateAggregatedRawMaterials.collectFilling] Sub-filling \"${sfUsage.subFillingId}\" in \"${fillingRecipe.name}\": Used Qty=${sfUsage.quantity}, Yield=${sfRecipe.yield}, New Scale Factor=${newScaleFactor}`);
      collectIngredientsFromFillingRecursive(sfUsage.subFillingId, newScaleFactor);
    });
  };


  // 1. Process Dough
  console.log(`[generateAggregatedRawMaterials] --- Processing Dough for \"${productionPlan.name}\" ---`);
  if (productionPlan.doughId && productionPlan.doughWeight > 0) {
    const mainDoughRecipe = findDoughRecipeById(productionPlan.doughId, doughRecipesMap);
    if (mainDoughRecipe && mainDoughRecipe.yield > 0) {
      const doughScaleFactor = productionPlan.doughWeight / mainDoughRecipe.yield;
      console.log(`[generateAggregatedRawMaterials] Main dough \"${mainDoughRecipe.name}\": Weight in product=${productionPlan.doughWeight}, Batch Yield=${mainDoughRecipe.yield}, Scale Factor=${doughScaleFactor}`);
      collectIngredientsFromDoughRecursive(productionPlan.doughId, doughScaleFactor);
    } else {
      console.warn(`[generateAggregatedRawMaterials] Main dough recipe \"${productionPlan.doughId}\" for \"${productionPlan.name}\" not found or has invalid yield. Raw materials from dough might be incomplete.`);
    }
  } else {
    console.log(`[generateAggregatedRawMaterials] Bread \"${productionPlan.name}\" has no dough or doughWeight is 0.`);
  }

  // 2. Process Fillings
  console.log(`[generateAggregatedRawMaterials] --- Processing Fillings for \"${productionPlan.name}\" ---`);
  productionPlan.fillings?.forEach(fillingUsage => {
    if (fillingUsage.fillingId && fillingUsage.quantity > 0) {
      const mainFillingRecipe = findFillingRecipeById(fillingUsage.fillingId, fillingRecipesMap);
      if (mainFillingRecipe && mainFillingRecipe.yield > 0) {
        const fillingScaleFactor = fillingUsage.quantity / mainFillingRecipe.yield;
        console.log(`[generateAggregatedRawMaterials] Main filling \"${mainFillingRecipe.name}\": Quantity in product=${fillingUsage.quantity}, Batch Yield=${mainFillingRecipe.yield}, Scale Factor=${fillingScaleFactor}`);
        collectIngredientsFromFillingRecursive(fillingUsage.fillingId, fillingScaleFactor);
      } else {
        // If it's a direct ingredient acting as a filling (no recipe)
        // This case should ideally not happen if fillingId always refers to a recipe.
        // If fillingId can be a direct ingredient name, this needs adjustment.
        // For now, assume fillingId refers to a recipe.
        console.warn(`[generateAggregatedRawMaterials] Main filling recipe \"${fillingUsage.fillingId}\" for \"${productionPlan.name}\" not found or has invalid yield. Raw materials from this filling might be incomplete.`);
        // Fallback: if a fillingId in breadType.fillings doesn't have a recipe, but is a raw material itself.
        // This is unlikely given the structure, but as a safeguard:
        // const ingData = findIngredientById(fillingUsage.fillingId);
        // if (ingData) {
        //   console.log(`[generateAggregatedRawMaterials] Treating filling \"${fillingUsage.fillingId}\" as a direct ingredient.`);
        //   addMaterialToAggregation(fillingUsage.fillingId, fillingUsage.quantity, fillingUsage.unit);
        // }
      }
    } else {
       console.log(`[generateAggregatedRawMaterials] Filling item has no ID or quantity for \"${productionPlan.name}\":`, fillingUsage);
      }
    });

  // 3. Process Decorations (Direct Ingredients)
  console.log(`[generateAggregatedRawMaterials] --- Processing Decorations for \"${productionPlan.name}\" ---`);
  productionPlan.decorations?.forEach(decoUsage => {
    if (decoUsage.ingredientId && decoUsage.quantity > 0) {
      const scaledQuantity = decoUsage.quantity * productionQuantity;
      console.log(`[generateAggregatedRawMaterials] Decoration \"${decoUsage.ingredientId}\": Original Qty=${decoUsage.quantity}, Scaled Qty=${scaledQuantity}`);
      addMaterialToAggregation(decoUsage.ingredientId, scaledQuantity, decoUsage.unit);
    } else {
      console.log(`[generateAggregatedRawMaterials] Decoration item has no ID or quantity for \"${productionPlan.name}\":`, decoUsage);
    }
  });

  const resultArray = Object.values(aggregated);
  console.log(`[generateAggregatedRawMaterials] Finished aggregation for \"${productionPlan.name}\". Result:`, resultArray);
  return resultArray;
};
// --- END: New Exportable Function for Aggregated Raw Materials ---

// 获取面包的详细成本分解 (PRODUCT COST)
export const getBreadCostBreakdown = (bread, doughRecipesMap, fillingRecipesMap, ingredients) => {
  console.log(`[getBreadCostBreakdown START] ===== Calculating cost for bread: "${bread.name}" =====`, bread);
  
  if (!bread || !bread.id || !doughRecipesMap || !fillingRecipesMap || !ingredients) {
    console.error('[getBreadCostBreakdown] ABORTING: Invalid arguments received.', { bread, doughRecipesMap, fillingRecipesMap, ingredients });
    return null;
  }

  let totalProductCost = 0;
  const errors = [];

  // 1. Dough Cost
  console.log(`[getBreadCostBreakdown] --- Calculating Dough Cost for \"${bread.name}\" ---`);
  let doughCostForProduct = 0;
  let doughCalculationDetails = {};
  console.log(`[getBreadCostBreakdown] Main dough ID from bread object: "${bread.doughId}"`);
  const mainDoughRecipe = findDoughRecipeById(bread.doughId, doughRecipesMap);

  if (mainDoughRecipe) {
    console.log(`[getBreadCostBreakdown] Found main dough recipe: \"${mainDoughRecipe.name}\"`);
    const doughBatchCalc = calculateDoughCost(bread.doughId, doughRecipesMap, ingredients); // Gets total cost & yield for a batch of this dough
    
    if (doughBatchCalc && typeof doughBatchCalc.cost === 'number' && mainDoughRecipe.yield > 0) {
      const scale = bread.doughWeight / mainDoughRecipe.yield;
      doughCostForProduct = doughBatchCalc.cost * scale;
      totalProductCost += doughCostForProduct;

      // Create scaled ingredient costs for the final product
      const ingredientCostsInProduct = {};
      for (const [ingId, batchCost] of Object.entries(doughBatchCalc.ingredientCosts)) {
        ingredientCostsInProduct[ingId] = {
          cost: adjustCost(batchCost.cost * scale),
          quantity: batchCost.quantity * scale,
          unitCost: batchCost.unitCost
        };
      }
      
      // Create scaled pre-ferment costs for the final product
      const preFermentCostsInProduct = {};
      if (doughBatchCalc.preFermentCosts) {
        for (const [pfId, batchCost] of Object.entries(doughBatchCalc.preFermentCosts)) {
          preFermentCostsInProduct[pfId] = {
            cost: adjustCost(batchCost.cost * scale),
            quantity: batchCost.quantity * scale,
            name: batchCost.name,
          };
        }
      }
      
      doughCalculationDetails = { 
        ...doughBatchCalc,
        recipeName: mainDoughRecipe.name, 
        recipeId: mainDoughRecipe.id,
        costPerGram: doughBatchCalc.cost / mainDoughRecipe.yield,
        costInProduct: doughCostForProduct,
        ingredientCostsInProduct: ingredientCostsInProduct,
        preFermentCostsInProduct: preFermentCostsInProduct,
      };
      
      console.log(`[getBreadCostBreakdown] Dough \"${mainDoughRecipe.name}\": Batch Cost=${doughBatchCalc.cost.toFixed(2)}, Batch Yield=${mainDoughRecipe.yield}, Cost/g=${doughCalculationDetails.costPerGram.toFixed(4)}, Product Dough Weight=${bread.doughWeight}, Dough Cost for Product=${doughCostForProduct.toFixed(2)}`);
    } else {
      const errorMsg = `Dough \"${bread.doughId}\" batch calculation invalid or yield is zero. Cost: ${doughBatchCalc?.cost}, Yield: ${mainDoughRecipe.yield}.`;
      console.warn(`[getBreadCostBreakdown] ${errorMsg}`);
      errors.push(errorMsg);
      doughCalculationDetails.error = errorMsg;
    }
  } else if (bread.doughId) { // Only if a doughId was specified but not found
    const errorMsg = `Dough recipe \"${bread.doughId}\" not found.`;
    console.warn(`[getBreadCostBreakdown] ${errorMsg}`);
    errors.push(errorMsg);
    doughCalculationDetails.error = errorMsg;
  } else {
    console.log(`[getBreadCostBreakdown] No doughId specified for \"${bread.name}\".`);
  }
  doughCostForProduct = adjustCost(doughCostForProduct);
  console.log(`[getBreadCostBreakdown] Dough calculation finished. Details:`, doughCalculationDetails);

  // 2. Fillings Cost
  console.log(`[getBreadCostBreakdown] --- Calculating Fillings Cost for \"${bread.name}\" ---`);
  let totalFillingsCostForProduct = 0;
  const fillingsCalculationDetails = [];
  bread.fillings?.forEach((fillingUsage) => {
    console.log('[getBreadCostBreakdown] Processing filling usage object:', fillingUsage);
    console.log(`[getBreadCostBreakdown] Filling ID from bread object: \"${fillingUsage.fillingId}\"`);
    const fillingDetail = {
      id: fillingUsage.fillingId,
      quantityInProduct: fillingUsage.quantity,
      unit: fillingUsage.unit,
      costInProduct: 0,
    };

      const fillingRecipe = findFillingRecipeById(fillingUsage.fillingId, fillingRecipesMap);
    if (fillingRecipe) {
      console.log(`[getBreadCostBreakdown] Found filling recipe: \"${fillingRecipe.name}\"`);
      const fillingBatchCalc = calculateFillingCost(fillingUsage.fillingId, fillingRecipesMap, ingredients); // Gets total cost & yield for a batch
      fillingDetail.recipeName = fillingRecipe.name;
      fillingDetail.batchCalculation = { ...fillingBatchCalc };

      if (fillingBatchCalc && typeof fillingBatchCalc.cost === 'number' && fillingRecipe.yield > 0) {
        const scale = fillingUsage.quantity / fillingRecipe.yield;
        const fillingCostInProduct = fillingBatchCalc.cost * scale;
        totalFillingsCostForProduct += fillingCostInProduct;
        
        // Create scaled ingredient costs for the final product
        const ingredientCostsInProduct = {};
        for (const [ingId, batchCost] of Object.entries(fillingBatchCalc.ingredientCosts)) {
          ingredientCostsInProduct[ingId] = {
            cost: adjustCost(batchCost.cost * scale),
            quantity: batchCost.quantity * scale,
            unitCost: batchCost.unitCost
          };
        }

        fillingDetail.costPerGram = fillingBatchCalc.cost / fillingRecipe.yield;
        fillingDetail.costInProduct = adjustCost(fillingCostInProduct);
        fillingDetail.ingredientCostsInProduct = ingredientCostsInProduct;
        
        console.log(`[getBreadCostBreakdown] Filling \"${fillingRecipe.name}\": Batch Cost=${fillingBatchCalc.cost.toFixed(2)}, Batch Yield=${fillingRecipe.yield}, Cost/g=${fillingDetail.costPerGram.toFixed(4)}, Product Filling Qty=${fillingUsage.quantity}, Filling Cost for Product=${fillingCostInProduct.toFixed(2)}`);
                    } else {
        const errorMsg = `Filling \"${fillingUsage.fillingId}\" batch calculation invalid or yield is zero. Cost: ${fillingBatchCalc?.cost}, Yield: ${fillingRecipe.yield}.`;
        console.warn(`[getBreadCostBreakdown] ${errorMsg}`);
        errors.push(errorMsg);
        fillingDetail.error = errorMsg;
                    }
                } else {
        // This attempts to treat a fillingId as a direct ingredient if no recipe is found.
        // This might be desired if some "fillings" are just raw ingredients without a sub-recipe.
        const directIngredient = findIngredientById(fillingUsage.fillingId, ingredients);
        if (directIngredient && directIngredient.price && directIngredient.norms > 0) {
            const pricePerMinUnit = directIngredient.price / directIngredient.norms;
            const directFillingCost = pricePerMinUnit * fillingUsage.quantity;
            totalFillingsCostForProduct += directFillingCost;
            console.log(`[getBreadCostBreakdown] Filling \"${fillingUsage.fillingId}\" (treated as direct ingredient): PPU=${pricePerMinUnit.toFixed(4)}, Qty=${fillingUsage.quantity}, Cost=${directFillingCost.toFixed(2)}`);
            fillingDetail.name = directIngredient.name;
            fillingDetail.isDirectIngredient = true;
            fillingDetail.costInProduct = adjustCost(directFillingCost);
            fillingDetail.pricePerUnit = pricePerMinUnit;
        } else {
            const errorMsg = `Filling recipe/ingredient \"${fillingUsage.fillingId}\" not found or data invalid.`;
            console.warn(`[getBreadCostBreakdown] ${errorMsg}`);
            errors.push(errorMsg);
            fillingDetail.error = errorMsg;
        }
    }
    fillingsCalculationDetails.push(fillingDetail);
  });
  totalFillingsCostForProduct = adjustCost(totalFillingsCostForProduct);
  totalProductCost += totalFillingsCostForProduct;
  console.log(`[getBreadCostBreakdown] Fillings calculation finished. Total Cost: ${totalFillingsCostForProduct}, Details:`, fillingsCalculationDetails);

  // 3. Decorations Cost
  console.log(`[getBreadCostBreakdown] --- Calculating Decorations Cost for \"${bread.name}\" ---`);
  const decorationCostResult = calculateDecorationCost(bread.decorations, ingredients); // This is already product-level
  let decorationsCostForProduct = decorationCostResult.totalCost;
  totalProductCost += decorationsCostForProduct;
  // decorationsCostForProduct is already adjusted by calculateDecorationCost
  console.log(`[getBreadCostBreakdown] Decorations calculation finished. Details:`, decorationCostResult);


  totalProductCost = adjustCost(totalProductCost);
  const breakdownResult = {
    totalCost: totalProductCost,
    doughCost: doughCostForProduct,
    fillingsCost: totalFillingsCostForProduct,
    decorationsCost: decorationsCostForProduct,
    doughDetails: doughCalculationDetails,
    fillingsDetails: fillingsCalculationDetails,
    decorationsDetails: decorationCostResult, // Contains .totalCost, .totalWeight, .details array
    errors: errors.length > 0 ? errors : undefined,
  };
  console.log(`[getBreadCostBreakdown] FINAL RESULT for \"${bread.name}\". Breakdown:`, breakdownResult);
  return breakdownResult;
};