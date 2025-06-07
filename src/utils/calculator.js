import { doughRecipes } from "../data/doughRecipes";
import { fillingRecipes } from "../data/fillingRecipes";
import { breadTypes } from "../data/breadTypes";

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
export const findIngredientById = (id, allIngredientsList) => {
  // console.log(`[findIngredientById] Searching for ingredient with ID (name): \"${id}\"`);
  
  if (!allIngredientsList || !Array.isArray(allIngredientsList)) {
    console.warn(`[findIngredientById] 提供的原料列表无效或缺失。无法查找原料: \"${id}\"`);
    return undefined;
  }

  const ingredient = allIngredientsList.find((ing) => ing.name === id);
  if (ingredient) {
    // console.log(`[findIngredientById] Found ingredient in list:`, ingredient);
    return { ...ingredient }; // 返回全局配料对象的副本
  }
  // console.warn(`[findIngredientById] 在提供的列表中未找到名为 \"${id}\" 的原料。`);
  return undefined; 
};

// 根据ID查找馅料配方
export const findFillingRecipeById = (id) => {
  // console.log(`[findFillingRecipeById] Searching for filling recipe with ID: \"${id}\"`);
  const recipe = fillingRecipes.find((recipe) => recipe.id === id);
  // if (!recipe) console.warn(`[findFillingRecipeById] 馅料配方中未找到ID: \"${id}\"`);
  // else console.log(`[findFillingRecipeById] Found filling recipe:`, recipe);
  return recipe;
};

// 根据ID查找面团配方
export const findDoughRecipeById = (id) => {
  // console.log(`[findDoughRecipeById] Searching for dough recipe with ID: \"${id}\"`);
  const recipe = doughRecipes.find((recipe) => recipe.id === id);
  // if (!recipe) console.warn(`[findDoughRecipeById] 面团配方中未找到ID: \"${id}\"`);
  // else console.log(`[findDoughRecipeById] Found dough recipe:`, recipe);
  return recipe;
};

// 计算面团配方的总成本 (BATCH COST)
export const calculateDoughCost = (doughRecipe, allIngredientsList) => {
  console.log(`[calculateDoughCost] Calculating cost for dough: \"${doughRecipe?.name || 'Unknown Dough'}\" (ID: \"${doughRecipe?.id}\")`, doughRecipe);
  if (!doughRecipe || !doughRecipe.id) {
    const currentYield = doughRecipe?.yield;
    const result = { cost: 0, mainIngredientsCost: 0, preFermentsCost: 0, yield: (typeof currentYield === 'number' && Number.isFinite(currentYield) ? currentYield : 0) };
    console.log(`[calculateDoughCost] Invalid doughRecipe or ID. Returning default:`, result);
    return result;
  }

  let mainIngredientsBatchCost = 0;
  console.log(`[calculateDoughCost] --- Calculating Main Ingredients for \"${doughRecipe.name}\" ---`);
  doughRecipe.ingredients?.forEach((ingUsage) => {
    const ingId = ingUsage.ingredientId || 'unknown ingredient';
    console.log(`[calculateDoughCost] Processing ingredient: \"${ingId}\", quantity: ${ingUsage.quantity}`);
    const ingData = findIngredientById(ingUsage.ingredientId, allIngredientsList);

    if (!ingData) {
      console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" ingredient \"${ingId}\" data not found.`);
      return;
    }
    if (typeof ingData.price !== 'number' || !Number.isFinite(ingData.price) || ingData.price < 0) {
      console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) price (${ingData.price}) invalid.`);
      return;
    }
    if (typeof ingData.norms !== 'number' || !Number.isFinite(ingData.norms) || ingData.norms <= 0) {
      console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) norms (${ingData.norms}) invalid.`);
      return;
    }

    const pricePerMinUnit = ingData.price / ingData.norms;
    const quantity = Number(ingUsage.quantity);

    if (typeof ingUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
      console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) quantity (${ingUsage.quantity}) invalid.`);
      return;
    }
    if (!Number.isFinite(pricePerMinUnit)) {
      console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) unit cost calculation invalid (PPU: ${pricePerMinUnit}).`);
      return;
    }
    let ingredientCost = pricePerMinUnit * quantity;
    console.log(`[calculateDoughCost] Ingredient \"${ingId}\": PPU=${pricePerMinUnit.toFixed(4)}, Qty=${quantity}, Cost=${ingredientCost.toFixed(4)}`);
    mainIngredientsBatchCost += adjustCost(ingredientCost);
  });
  console.log(`[calculateDoughCost] Total Main Ingredients Batch Cost for \"${doughRecipe.name}\": ${mainIngredientsBatchCost.toFixed(2)}`);

  let preFermentsBatchCost = 0;
  console.log(`[calculateDoughCost] --- Calculating Pre-ferments for \"${doughRecipe.name}\" ---`);
  doughRecipe.preFerments?.forEach((pfUsage) => {
    const pfId = pfUsage.id || 'unknown pre-ferment';
    console.log(`[calculateDoughCost] Processing pre-ferment: \"${pfId}\", quantity: ${pfUsage.quantity}`);
    const pfRecipe = findDoughRecipeById(pfUsage.id);

    if (!pfRecipe || typeof pfRecipe.yield !== 'number' || !Number.isFinite(pfRecipe.yield) || pfRecipe.yield <= 0) {
      console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" pre-ferment \"${pfId}\" (name: ${pfRecipe?.name}) recipe not found or yield (${pfRecipe?.yield}) invalid.`);
      return;
    }
    
    console.log(`[calculateDoughCost] Calculating cost for sub-dough (pre-ferment): \"${pfRecipe.name}\"`);
    const pfBatchCalc = calculateDoughCost(pfRecipe, allIngredientsList); // Recursive call
    if (pfBatchCalc == null || typeof pfBatchCalc.cost !== 'number' || !Number.isFinite(pfBatchCalc.cost)) {
        console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" pre-ferment \"${pfId}\" (${pfRecipe.name}) batch cost calculation invalid (cost: ${pfBatchCalc?.cost}).`);
        return; 
    }
    console.log(`[calculateDoughCost] Pre-ferment \"${pfRecipe.name}\" calculated: Batch Cost=${pfBatchCalc.cost.toFixed(2)}, Batch Yield=${pfRecipe.yield}`);

    const costOfPfPerGram = pfBatchCalc.cost / pfRecipe.yield;
    const pfQuantity = Number(pfUsage.quantity);

    if (typeof pfUsage.quantity !== 'number' || !Number.isFinite(pfQuantity) || pfQuantity < 0) {
        console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" pre-ferment \"${pfId}\" (${pfRecipe.name}) quantity (${pfUsage.quantity}) invalid.`);
        return;
    }
    if (!Number.isFinite(costOfPfPerGram)) {
        console.warn(`[calculateDoughCost] Dough \"${doughRecipe.name}\" pre-ferment \"${pfId}\" (${pfRecipe.name}) cost per gram calculation invalid (Cost/g: ${costOfPfPerGram}).`);
        return;
    }
    let pfContributionCost = costOfPfPerGram * pfQuantity;
    console.log(`[calculateDoughCost] Pre-ferment \"${pfId}\": Cost/g=${costOfPfPerGram.toFixed(4)}, Qty=${pfQuantity}, ContributionCost=${pfContributionCost.toFixed(4)}`);
    preFermentsBatchCost += adjustCost(pfContributionCost);
  });
  console.log(`[calculateDoughCost] Total Pre-ferments Batch Cost for \"${doughRecipe.name}\": ${preFermentsBatchCost.toFixed(2)}`);
  
  mainIngredientsBatchCost = Number.isFinite(mainIngredientsBatchCost) ? mainIngredientsBatchCost : 0;
  preFermentsBatchCost = Number.isFinite(preFermentsBatchCost) ? preFermentsBatchCost : 0;
  const totalCost = mainIngredientsBatchCost + preFermentsBatchCost;
  const finalYield = (typeof doughRecipe.yield === 'number' && Number.isFinite(doughRecipe.yield) && doughRecipe.yield > 0 ? doughRecipe.yield : 0);

  const result = {
    cost: Number.isFinite(totalCost) ? totalCost : 0,
    mainIngredientsCost: mainIngredientsBatchCost,
    preFermentsCost: preFermentsBatchCost,
    yield: finalYield
  };
  console.log(`[calculateDoughCost] Finished calculation for dough \"${doughRecipe.name}\". Total Batch Cost: ${result.cost.toFixed(2)}, Batch Yield: ${result.yield}. Result:`, result);
  return result;
};

// calculateSubFillingCost is effectively integrated into calculateFillingCost
// No longer needed as a separate export if only used internally by calculateFillingCost logic for breakdown

// 计算馅料配方的总成本 (BATCH COST), 包括子馅料
export const calculateFillingCost = (fillingRecipe, allIngredientsList) => {
  console.log(`[calculateFillingCost] Calculating cost for filling: \"${fillingRecipe?.name || 'Unknown Filling'}\" (ID: \"${fillingRecipe?.id}\")`, fillingRecipe);
  if (!fillingRecipe || !fillingRecipe.id) {
    const currentYield = fillingRecipe?.yield;
    const result = { cost: 0, mainIngredientsCost: 0, subFillingsCost: 0, yield: (typeof currentYield === 'number' && Number.isFinite(currentYield) ? currentYield : 0) };
    console.log(`[calculateFillingCost] Invalid fillingRecipe or ID. Returning default:`, result);
    return result;
  }

  let mainIngredientsBatchCost = 0;
  console.log(`[calculateFillingCost] --- Calculating Main Ingredients for \"${fillingRecipe.name}\" ---`);
  fillingRecipe.ingredients?.forEach((ingUsage) => {
    const ingId = ingUsage.ingredientId || 'unknown ingredient';
    console.log(`[calculateFillingCost] Processing ingredient: \"${ingId}\", quantity: ${ingUsage.quantity}`);
    const ingData = findIngredientById(ingUsage.ingredientId, allIngredientsList);

    if (!ingData) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" ingredient \"${ingId}\" data not found.`);
      return;
    }
    if (typeof ingData.price !== 'number' || !Number.isFinite(ingData.price) || ingData.price < 0) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) price (${ingData.price}) invalid.`);
      return;
    }
    if (typeof ingData.norms !== 'number' || !Number.isFinite(ingData.norms) || ingData.norms <= 0) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) norms (${ingData.norms}) invalid.`);
      return;
    }

    const pricePerMinUnit = ingData.price / ingData.norms;
    const quantity = Number(ingUsage.quantity);

    if (typeof ingUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) quantity (${ingUsage.quantity}) invalid.`);
      return;
    }
    if (!Number.isFinite(pricePerMinUnit)) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" ingredient \"${ingId}\" (${ingData.name}) unit cost calculation invalid (PPU: ${pricePerMinUnit}).`);
      return;
    }
    let ingredientCost = pricePerMinUnit * quantity;
    console.log(`[calculateFillingCost] Ingredient \"${ingId}\": PPU=${pricePerMinUnit.toFixed(4)}, Qty=${quantity}, Cost=${ingredientCost.toFixed(4)}`);
    mainIngredientsBatchCost += adjustCost(ingredientCost);
  });
  console.log(`[calculateFillingCost] Total Main Ingredients Batch Cost for \"${fillingRecipe.name}\": ${mainIngredientsBatchCost.toFixed(2)}`);

  let subFillingsBatchCost = 0;
  console.log(`[calculateFillingCost] --- Calculating Sub-fillings for \"${fillingRecipe.name}\" ---`);
  fillingRecipe.subFillings?.forEach((sfUsage) => {
    const sfId = sfUsage.recipeId || 'unknown sub-filling';
    console.log(`[calculateFillingCost] Processing sub-filling: \"${sfId}\", quantity: ${sfUsage.quantity}`);
    const sfRecipe = findFillingRecipeById(sfUsage.recipeId);

    if (!sfRecipe || typeof sfRecipe.yield !== 'number' || !Number.isFinite(sfRecipe.yield) || sfRecipe.yield <= 0) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" sub-filling \"${sfId}\" (name: ${sfRecipe?.name}) recipe not found or yield (${sfRecipe?.yield}) invalid.`);
      return;
    }

    console.log(`[calculateFillingCost] Calculating cost for sub-filling: \"${sfRecipe.name}\"`);
    const sfBatchCalc = calculateFillingCost(sfRecipe, allIngredientsList); // Recursive call
    if (sfBatchCalc == null || typeof sfBatchCalc.cost !== 'number' || !Number.isFinite(sfBatchCalc.cost)) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" sub-filling \"${sfId}\" (${sfRecipe.name}) batch cost calculation invalid (cost: ${sfBatchCalc?.cost}).`);
      return;
    }
    console.log(`[calculateFillingCost] Sub-filling \"${sfRecipe.name}\" calculated: Batch Cost=${sfBatchCalc.cost.toFixed(2)}, Batch Yield=${sfRecipe.yield}`);


    const costOfSfPerGram = sfBatchCalc.cost / sfRecipe.yield;
    const sfQuantity = Number(sfUsage.quantity);
    
    if (typeof sfUsage.quantity !== 'number' || !Number.isFinite(sfQuantity) || sfQuantity < 0) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" sub-filling \"${sfId}\" (${sfRecipe.name}) quantity (${sfUsage.quantity}) invalid.`);
      return;
    }
    if (!Number.isFinite(costOfSfPerGram)) {
      console.warn(`[calculateFillingCost] Filling \"${fillingRecipe.name}\" sub-filling \"${sfId}\" (${sfRecipe.name}) cost per gram calculation invalid (Cost/g: ${costOfSfPerGram}).`);
      return;
    }
    let sfContributionCost = costOfSfPerGram * sfQuantity;
    console.log(`[calculateFillingCost] Sub-filling \"${sfId}\": Cost/g=${costOfSfPerGram.toFixed(4)}, Qty=${sfQuantity}, ContributionCost=${sfContributionCost.toFixed(4)}`);
    subFillingsBatchCost += adjustCost(sfContributionCost);
  });
  console.log(`[calculateFillingCost] Total Sub-fillings Batch Cost for \"${fillingRecipe.name}\": ${subFillingsBatchCost.toFixed(2)}`);

  mainIngredientsBatchCost = Number.isFinite(mainIngredientsBatchCost) ? mainIngredientsBatchCost : 0;
  subFillingsBatchCost = Number.isFinite(subFillingsBatchCost) ? subFillingsBatchCost : 0;
  const totalCost = mainIngredientsBatchCost + subFillingsBatchCost;
  const finalYield = (typeof fillingRecipe.yield === 'number' && Number.isFinite(fillingRecipe.yield) && fillingRecipe.yield > 0 ? fillingRecipe.yield : 0);

  const result = {
    cost: Number.isFinite(totalCost) ? totalCost : 0,
    mainIngredientsCost: mainIngredientsBatchCost,
    subFillingsCost: subFillingsBatchCost,
    yield: finalYield
  };
  console.log(`[calculateFillingCost] Finished calculation for filling \"${fillingRecipe.name}\". Total Batch Cost: ${result.cost.toFixed(2)}, Batch Yield: ${result.yield}. Result:`, result);
  return result;
};

// 计算装饰成本 (PRODUCT COST for all decorations)
export const calculateDecorationCost = (decorations, allIngredientsList) => {
  console.log(`[calculateDecorationCost] Calculating cost for decorations:`, decorations);
  let totalDecorationsCost = 0;
  let totalWeight = 0;
  const calculatedDetails = [];
  const errors = [];

  decorations?.forEach(decoUsage => {
    const ingId = decoUsage.ingredientId || 'unknown decoration ingredient';
    console.log(`[calculateDecorationCost] Processing decoration: \"${ingId}\", quantity: ${decoUsage.quantity}`);
    const ingData = findIngredientById(decoUsage.ingredientId, allIngredientsList);

    if (!ingData) {
      const errorMsg = `Decoration ingredient \"${ingId}\" data not found.`;
      console.warn(`[calculateDecorationCost] ${errorMsg}`);
      errors.push(errorMsg);
      calculatedDetails.push({
        ingredientId: ingId,
        name: ingId, // Fallback name
        quantity: Number(decoUsage.quantity) || 0,
        unit: decoUsage.unit || 'g',
        cost: 0,
        error: errorMsg,
      });
      return;
    }

    if (typeof ingData.price !== 'number' || !Number.isFinite(ingData.price) || ingData.price < 0 ||
        typeof ingData.norms !== 'number' || !Number.isFinite(ingData.norms) || ingData.norms <= 0) {
      const errorMsg = `Decoration ingredient \"${ingId}\" (${ingData.name}) price (${ingData.price}) or norms (${ingData.norms}) invalid.`;
      console.warn(`[calculateDecorationCost] ${errorMsg}`);
      errors.push(errorMsg);
      calculatedDetails.push({
        ingredientId: ingId,
        name: ingData.name || ingId,
        quantity: Number(decoUsage.quantity) || 0,
        unit: decoUsage.unit || ingData.min || 'g',
        cost: 0,
        error: errorMsg,
      });
      return;
    }

      const pricePerMinUnit = ingData.price / ingData.norms;
    const quantity = Number(decoUsage.quantity);

    if (typeof decoUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
        const errorMsg = `Decoration ingredient \"${ingId}\" (${ingData.name}) quantity (${decoUsage.quantity}) invalid.`;
        console.warn(`[calculateDecorationCost] ${errorMsg}`);
        errors.push(errorMsg);
        calculatedDetails.push({
            ingredientId: ingId,
            name: ingData.name || ingId,
            quantity: 0, // Or Number(decoUsage.quantity) if you want to keep original invalid?
            unit: decoUsage.unit || ingData.min || 'g',
            cost: 0,
            error: errorMsg,
        });
        return;
    }
    if(!Number.isFinite(pricePerMinUnit)){
        const errorMsg = `Decoration ingredient \"${ingId}\" (${ingData.name}) unit cost calculation invalid (PPU: ${pricePerMinUnit}).`;
        console.warn(`[calculateDecorationCost] ${errorMsg}`);
        errors.push(errorMsg);
        calculatedDetails.push({
            ingredientId: ingId,
            name: ingData.name || ingId,
            quantity: quantity,
            unit: decoUsage.unit || ingData.min || 'g',
            cost: 0,
            error: errorMsg,
        });
        return;
    }

    let costForThisDeco = pricePerMinUnit * quantity;
    console.log(`[calculateDecorationCost] Decoration \"${ingId}\": PPU=${pricePerMinUnit.toFixed(4)}, Qty=${quantity}, Cost=${costForThisDeco.toFixed(4)}`);
    costForThisDeco = adjustCost(costForThisDeco);
    totalDecorationsCost += costForThisDeco;
    totalWeight += quantity; // Assuming quantity is always in a weight unit like grams for totalWeight summing

    calculatedDetails.push({
      ingredientId: decoUsage.ingredientId, // Keep original ID
      name: ingData.name, // Use the name from ingredient data for display
      quantity: quantity,
      unit: decoUsage.unit || ingData.min,
      cost: costForThisDeco,
      pricePerMinUnit: pricePerMinUnit, // For reference
    });
  });

  totalDecorationsCost = adjustCost(totalDecorationsCost);
  console.log(`[calculateDecorationCost] Finished. Total Decorations Cost: ${totalDecorationsCost.toFixed(2)}, Total Weight: ${totalWeight.toFixed(2)}`);
  return { totalCost: totalDecorationsCost, totalWeight: totalWeight, details: calculatedDetails, errors: errors.length > 0 ? errors : undefined };
};

// calculateDoughCostPerGram and calculateFillingCostPerGram are implicitly handled by new structure

// calculateBreadCost is effectively replaced by getBreadCostBreakdown returning total cost

// --- START: New Exportable Function for Aggregated Raw Materials ---
export const generateAggregatedRawMaterials = (breadType, allIngredientsList) => {
  console.log(`[generateAggregatedRawMaterials] Aggregating raw materials for bread: \"${breadType.name}\" (ID: \"${breadType.id}\")`, breadType);
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
    const doughRecipe = findDoughRecipeById(currentDoughId);
    if (!doughRecipe) {
      console.warn(`[generateAggregatedRawMaterials.collectDough] Dough recipe not found for ID: \"${currentDoughId}\". Skipping.`);
      return;
    }
    console.log(`[generateAggregatedRawMaterials.collectDough] Found dough recipe: \"${doughRecipe.name}\"`, doughRecipe);

    // Collect direct ingredients
    doughRecipe.ingredients?.forEach(ingUsage => {
      const scaledQuantity = ingUsage.quantity * scaleFactorToProduct;
      console.log(`[generateAggregatedRawMaterials.collectDough] Ingredient \"${ingUsage.ingredientId}\" from \"${doughRecipe.name}\": Original Qty=${ingUsage.quantity}, Scaled Qty=${scaledQuantity}`);
      addMaterialToAggregation(ingUsage.ingredientId, scaledQuantity, ingUsage.unit);
    });

    // Collect from pre-ferments (which are also doughs)
    doughRecipe.preFerments?.forEach(pfUsage => {
      const pfRecipe = findDoughRecipeById(pfUsage.id);
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
    const fillingRecipe = findFillingRecipeById(currentFillingId);
    if (!fillingRecipe) {
      console.warn(`[generateAggregatedRawMaterials.collectFilling] Filling recipe not found for ID: \"${currentFillingId}\". Skipping.`);
      return;
    }
    console.log(`[generateAggregatedRawMaterials.collectFilling] Found filling recipe: \"${fillingRecipe.name}\"`, fillingRecipe);

    // Collect direct ingredients
    fillingRecipe.ingredients?.forEach(ingUsage => {
      const scaledQuantity = ingUsage.quantity * scaleFactorToProduct;
      console.log(`[generateAggregatedRawMaterials.collectFilling] Ingredient \"${ingUsage.ingredientId}\" from \"${fillingRecipe.name}\": Original Qty=${ingUsage.quantity}, Scaled Qty=${scaledQuantity}`);
      addMaterialToAggregation(ingUsage.ingredientId, scaledQuantity, ingUsage.unit);
    });

    // Collect from sub-fillings
    fillingRecipe.subFillings?.forEach(sfUsage => {
      const sfRecipe = findFillingRecipeById(sfUsage.recipeId);
      if (!sfRecipe || sfRecipe.yield <= 0) {
        console.warn(`[generateAggregatedRawMaterials.collectFilling] Sub-filling \"${sfUsage.recipeId}\" in \"${fillingRecipe.name}\" not found or has invalid yield. Skipping.`);
        return;
      }
      const newScaleFactor = (sfUsage.quantity / sfRecipe.yield) * scaleFactorToProduct;
      console.log(`[generateAggregatedRawMaterials.collectFilling] Sub-filling \"${sfUsage.recipeId}\" in \"${fillingRecipe.name}\": Used Qty=${sfUsage.quantity}, Yield=${sfRecipe.yield}, New Scale Factor=${newScaleFactor}`);
      collectIngredientsFromFillingRecursive(sfUsage.recipeId, newScaleFactor);
    });
  };


  // 1. Process Dough
  console.log(`[generateAggregatedRawMaterials] --- Processing Dough for \"${breadType.name}\" ---`);
  if (breadType.doughId && breadType.doughWeight > 0) {
    const mainDoughRecipe = findDoughRecipeById(breadType.doughId);
    if (mainDoughRecipe && mainDoughRecipe.yield > 0) {
      const doughScaleFactor = breadType.doughWeight / mainDoughRecipe.yield;
      console.log(`[generateAggregatedRawMaterials] Main dough \"${mainDoughRecipe.name}\": Weight in product=${breadType.doughWeight}, Batch Yield=${mainDoughRecipe.yield}, Scale Factor=${doughScaleFactor}`);
      collectIngredientsFromDoughRecursive(breadType.doughId, doughScaleFactor);
    } else {
      console.warn(`[generateAggregatedRawMaterials] Main dough recipe \"${breadType.doughId}\" for \"${breadType.name}\" not found or has invalid yield. Raw materials from dough might be incomplete.`);
    }
  } else {
    console.log(`[generateAggregatedRawMaterials] Bread \"${breadType.name}\" has no dough or doughWeight is 0.`);
  }

  // 2. Process Fillings
  console.log(`[generateAggregatedRawMaterials] --- Processing Fillings for \"${breadType.name}\" ---`);
  breadType.fillings?.forEach(fillingUsage => {
    if (fillingUsage.fillingId && fillingUsage.quantity > 0) {
      const mainFillingRecipe = findFillingRecipeById(fillingUsage.fillingId);
      if (mainFillingRecipe && mainFillingRecipe.yield > 0) {
        const fillingScaleFactor = fillingUsage.quantity / mainFillingRecipe.yield;
        console.log(`[generateAggregatedRawMaterials] Main filling \"${mainFillingRecipe.name}\": Quantity in product=${fillingUsage.quantity}, Batch Yield=${mainFillingRecipe.yield}, Scale Factor=${fillingScaleFactor}`);
        collectIngredientsFromFillingRecursive(fillingUsage.fillingId, fillingScaleFactor);
      } else {
        // If it's a direct ingredient acting as a filling (no recipe)
        // This case should ideally not happen if fillingId always refers to a recipe.
        // If fillingId can be a direct ingredient name, this needs adjustment.
        // For now, assume fillingId refers to a recipe.
        console.warn(`[generateAggregatedRawMaterials] Main filling recipe \"${fillingUsage.fillingId}\" for \"${breadType.name}\" not found or has invalid yield. Raw materials from this filling might be incomplete.`);
        // Fallback: if a fillingId in breadType.fillings doesn't have a recipe, but is a raw material itself.
        // This is unlikely given the structure, but as a safeguard:
        // const ingData = findIngredientById(fillingUsage.fillingId);
        // if (ingData) {
        //   console.log(`[generateAggregatedRawMaterials] Treating filling \"${fillingUsage.fillingId}\" as a direct ingredient.`);
        //   addMaterialToAggregation(fillingUsage.fillingId, fillingUsage.quantity, fillingUsage.unit);
        // }
      }
    } else {
       console.log(`[generateAggregatedRawMaterials] Filling item has no ID or quantity for \"${breadType.name}\":`, fillingUsage);
      }
    });

  // 3. Process Decorations (Direct Ingredients)
  console.log(`[generateAggregatedRawMaterials] --- Processing Decorations for \"${breadType.name}\" ---`);
  breadType.decorations?.forEach(decoUsage => {
    if (decoUsage.ingredientId && decoUsage.quantity > 0) {
      console.log(`[generateAggregatedRawMaterials] Decoration \"${decoUsage.ingredientId}\": Quantity=${decoUsage.quantity}`);
      addMaterialToAggregation(decoUsage.ingredientId, decoUsage.quantity, decoUsage.unit);
    } else {
      console.log(`[generateAggregatedRawMaterials] Decoration item has no ID or quantity for \"${breadType.name}\":`, decoUsage);
    }
  });

  const resultArray = Object.values(aggregated);
  console.log(`[generateAggregatedRawMaterials] Finished aggregation for \"${breadType.name}\". Result:`, resultArray);
  return resultArray;
};
// --- END: New Exportable Function for Aggregated Raw Materials ---

// 获取面包的详细成本分解 (PRODUCT COST)
export const getBreadCostBreakdown = (breadType, allIngredientsList) => {
  console.log(`[getBreadCostBreakdown] Calculating cost breakdown for bread: \"${breadType.name}\" (ID: \"${breadType.id}\") using allIngredientsList:`, allIngredientsList ? `Length ${allIngredientsList.length}` : 'Not provided', breadType);

  if (!breadType || !breadType.id) {
    console.warn(`[getBreadCostBreakdown] Invalid breadType object provided.`);
    return {
      totalCost: 0,
      doughCost: 0,
      fillingsCost: 0,
      decorationsCost: 0,
      doughDetails: {},
      fillingsDetails: [],
      decorationsDetails: { totalCost: 0, totalWeight: 0, details: [] },
      errors: ['Invalid breadType object'],
    };
  }

  let totalProductCost = 0;
  const errors = [];

  // 1. Dough Cost
  console.log(`[getBreadCostBreakdown] --- Calculating Dough Cost for \"${breadType.name}\" ---`);
  let doughCostForProduct = 0;
  let doughCalculationDetails = {};
  const mainDoughRecipe = findDoughRecipeById(breadType.doughId);

  if (mainDoughRecipe) {
    console.log(`[getBreadCostBreakdown] Found main dough recipe: \"${mainDoughRecipe.name}\"`);
    const doughBatchCalc = calculateDoughCost(mainDoughRecipe, allIngredientsList); // Gets total cost & yield for a batch of this dough
    doughCalculationDetails = { ...doughBatchCalc, recipeName: mainDoughRecipe.name, recipeId: mainDoughRecipe.id };
    
    if (doughBatchCalc && typeof doughBatchCalc.cost === 'number' && mainDoughRecipe.yield > 0) {
      const costOfDoughPerGram = doughBatchCalc.cost / mainDoughRecipe.yield;
      doughCostForProduct = costOfDoughPerGram * breadType.doughWeight;
      totalProductCost += doughCostForProduct;
      console.log(`[getBreadCostBreakdown] Dough \"${mainDoughRecipe.name}\": Batch Cost=${doughBatchCalc.cost.toFixed(2)}, Batch Yield=${mainDoughRecipe.yield}, Cost/g=${costOfDoughPerGram.toFixed(4)}, Product Dough Weight=${breadType.doughWeight}, Dough Cost for Product=${doughCostForProduct.toFixed(2)}`);
      doughCalculationDetails.costPerGram = costOfDoughPerGram;
      doughCalculationDetails.costInProduct = doughCostForProduct;
    } else {
      const errorMsg = `Dough \"${breadType.doughId}\" batch calculation invalid or yield is zero. Cost: ${doughBatchCalc?.cost}, Yield: ${mainDoughRecipe.yield}.`;
      console.warn(`[getBreadCostBreakdown] ${errorMsg}`);
      errors.push(errorMsg);
      doughCalculationDetails.error = errorMsg;
    }
  } else if (breadType.doughId) { // Only if a doughId was specified but not found
    const errorMsg = `Dough recipe \"${breadType.doughId}\" not found.`;
    console.warn(`[getBreadCostBreakdown] ${errorMsg}`);
    errors.push(errorMsg);
    doughCalculationDetails.error = errorMsg;
  } else {
    console.log(`[getBreadCostBreakdown] No doughId specified for \"${breadType.name}\".`);
  }
  doughCostForProduct = adjustCost(doughCostForProduct);
  console.log(`[getBreadCostBreakdown] Total Dough Cost for \"${breadType.name}\" (adjusted): ${doughCostForProduct.toFixed(2)}`);

  // 2. Fillings Cost
  console.log(`[getBreadCostBreakdown] --- Calculating Fillings Cost for \"${breadType.name}\" ---`);
  let totalFillingsCostForProduct = 0;
  const fillingsCalculationDetails = [];
  breadType.fillings?.forEach((fillingUsage) => {
    console.log(`[getBreadCostBreakdown] Processing filling usage: \"${fillingUsage.fillingId}\", quantity: ${fillingUsage.quantity}`);
    const fillingDetail = {
      id: fillingUsage.fillingId,
      quantityInProduct: fillingUsage.quantity,
      unit: fillingUsage.unit,
      costInProduct: 0,
    };

      const fillingRecipe = findFillingRecipeById(fillingUsage.fillingId);
    if (fillingRecipe) {
      console.log(`[getBreadCostBreakdown] Found filling recipe: \"${fillingRecipe.name}\"`);
      const fillingBatchCalc = calculateFillingCost(fillingRecipe, allIngredientsList); // Gets total cost & yield for a batch
      fillingDetail.recipeName = fillingRecipe.name;
      fillingDetail.batchCalculation = { ...fillingBatchCalc };

      if (fillingBatchCalc && typeof fillingBatchCalc.cost === 'number' && fillingRecipe.yield > 0) {
        const costOfFillingPerGram = fillingBatchCalc.cost / fillingRecipe.yield;
        const fillingCostInProduct = costOfFillingPerGram * fillingUsage.quantity;
        totalFillingsCostForProduct += fillingCostInProduct;
        console.log(`[getBreadCostBreakdown] Filling \"${fillingRecipe.name}\": Batch Cost=${fillingBatchCalc.cost.toFixed(2)}, Batch Yield=${fillingRecipe.yield}, Cost/g=${costOfFillingPerGram.toFixed(4)}, Product Filling Qty=${fillingUsage.quantity}, Filling Cost for Product=${fillingCostInProduct.toFixed(2)}`);
        fillingDetail.costPerGram = costOfFillingPerGram;
        fillingDetail.costInProduct = adjustCost(fillingCostInProduct);
                    } else {
        const errorMsg = `Filling \"${fillingUsage.fillingId}\" batch calculation invalid or yield is zero. Cost: ${fillingBatchCalc?.cost}, Yield: ${fillingRecipe.yield}.`;
        console.warn(`[getBreadCostBreakdown] ${errorMsg}`);
        errors.push(errorMsg);
        fillingDetail.error = errorMsg;
                    }
                } else {
        // This attempts to treat a fillingId as a direct ingredient if no recipe is found.
        // This might be desired if some "fillings" are just raw ingredients without a sub-recipe.
        const directIngredient = findIngredientById(fillingUsage.fillingId, allIngredientsList);
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
  console.log(`[getBreadCostBreakdown] Total Fillings Cost for \"${breadType.name}\" (adjusted): ${totalFillingsCostForProduct.toFixed(2)}`);

  // 3. Decorations Cost
  console.log(`[getBreadCostBreakdown] --- Calculating Decorations Cost for \"${breadType.name}\" ---`);
  const decorationsCalculation = calculateDecorationCost(breadType.decorations, allIngredientsList); // This is already product-level
  let decorationsCostForProduct = decorationsCalculation.totalCost;
  totalProductCost += decorationsCostForProduct;
  // decorationsCostForProduct is already adjusted by calculateDecorationCost
  console.log(`[getBreadCostBreakdown] Total Decorations Cost for \"${breadType.name}\": ${decorationsCostForProduct.toFixed(2)}`);


  totalProductCost = adjustCost(totalProductCost);
  const breakdownResult = {
    totalCost: totalProductCost,
    doughCost: doughCostForProduct,
    fillingsCost: totalFillingsCostForProduct,
    decorationsCost: decorationsCostForProduct,
    doughDetails: doughCalculationDetails,
    fillingsDetails: fillingsCalculationDetails,
    decorationsDetails: decorationsCalculation, // Contains .totalCost, .totalWeight, .details array
    errors: errors.length > 0 ? errors : undefined,
  };
  console.log(`[getBreadCostBreakdown] Finished cost breakdown for \"${breadType.name}\". Total Product Cost: ${breakdownResult.totalCost.toFixed(2)}. Full Breakdown:`, breakdownResult);
  return breakdownResult;
};