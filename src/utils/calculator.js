import { ingredients } from "../data/ingredients";
import { doughRecipes } from "../data/doughRecipes";
import { fillingRecipes } from "../data/fillingRecipes";
import { breadTypes } from "../data/breadTypes";

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
export const findIngredientById = (id, recipeIngredients = null) => {
  // recipeIngredients 参数似乎并未按预期使用，且可能导致混淆，
  // 全局配料查找应该只基于全局 ingredients 列表。
  // 如果配方中有特定的价格覆盖，应在调用 findIngredientById 后单独处理。
  const globalIngredient = ingredients.find((ingredient) => ingredient.name === id);
  if (globalIngredient) {
    return { ...globalIngredient }; // 返回全局配料对象的副本
  }
  // console.warn(`全局配料中未找到名为 "${id}" 的配料。`); // Quieter for now
  return undefined; 
};

// 根据ID查找馅料配方
export const findFillingRecipeById = (id) => {
  const recipe = fillingRecipes.find((recipe) => recipe.id === id);
  // if (!recipe) console.warn(`馅料配方中未找到ID: "${id}"`); // Quieter
  return recipe;
};

// 根据ID查找面团配方
export const findDoughRecipeById = (id) => {
  const recipe = doughRecipes.find((recipe) => recipe.id === id);
  // if (!recipe) console.warn(`面团配方中未找到ID: "${id}"`); // Quieter
  return recipe;
};

// 计算面团配方的总成本 (BATCH COST)
export const calculateDoughCost = (doughRecipe) => {
  if (!doughRecipe || !doughRecipe.id) {
    const currentYield = doughRecipe?.yield;
    return { cost: 0, mainIngredientsCost: 0, preFermentsCost: 0, yield: (typeof currentYield === 'number' && Number.isFinite(currentYield) ? currentYield : 0) };
  }

  let mainIngredientsBatchCost = 0;
  doughRecipe.ingredients?.forEach((ingUsage) => {
    const ingData = findIngredientById(ingUsage.ingredientId);
    const ingId = ingUsage.ingredientId || 'unknown ingredient';

    if (!ingData) {
      console.warn(`面团 "${doughRecipe.name}" 配料 "${ingId}" 数据未找到。`);
      return;
    }
    if (typeof ingData.price !== 'number' || !Number.isFinite(ingData.price) || ingData.price < 0) {
      console.warn(`面团 "${doughRecipe.name}" 配料 "${ingId}" (${ingData.name}) 价格 (${ingData.price}) 无效。`);
      return;
    }
    if (typeof ingData.norms !== 'number' || !Number.isFinite(ingData.norms) || ingData.norms <= 0) {
      console.warn(`面团 "${doughRecipe.name}" 配料 "${ingId}" (${ingData.name}) 规格 (${ingData.norms}) 无效。`);
      return;
    }

    const pricePerMinUnit = ingData.price / ingData.norms;
    const quantity = Number(ingUsage.quantity);

    if (typeof ingUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
      console.warn(`面团 "${doughRecipe.name}" 配料 "${ingId}" (${ingData.name}) 用量 (${ingUsage.quantity}) 无效。`);
      return;
    }
    if (!Number.isFinite(pricePerMinUnit)) {
      console.warn(`面团 "${doughRecipe.name}" 配料 "${ingId}" (${ingData.name}) 单位成本计算无效 (PPU: ${pricePerMinUnit}).`);
      return;
    }
    mainIngredientsBatchCost += pricePerMinUnit * quantity;
  });

  let preFermentsBatchCost = 0;
  doughRecipe.preFerments?.forEach((pfUsage) => {
    const pfRecipe = findDoughRecipeById(pfUsage.id);
    const pfId = pfUsage.id || 'unknown pre-ferment';

    if (!pfRecipe || typeof pfRecipe.yield !== 'number' || !Number.isFinite(pfRecipe.yield) || pfRecipe.yield <= 0) {
      console.warn(`面团 "${doughRecipe.name}" 的预发酵种 "${pfId}" (name: ${pfRecipe?.name}) 配方未找到或产量 (${pfRecipe?.yield}) 无效。`);
      return;
    }
    
    const pfBatchCalc = calculateDoughCost(pfRecipe);
    if (pfBatchCalc == null || typeof pfBatchCalc.cost !== 'number' || !Number.isFinite(pfBatchCalc.cost)) {
        console.warn(`面团 "${doughRecipe.name}" 的预发酵种 "${pfId}" (${pfRecipe.name}) 批次成本计算无效 (cost: ${pfBatchCalc?.cost})。`);
        return; 
    }

    const costOfPfPerGram = pfBatchCalc.cost / pfRecipe.yield;
    const pfQuantity = Number(pfUsage.quantity);

    if (typeof pfUsage.quantity !== 'number' || !Number.isFinite(pfQuantity) || pfQuantity < 0) {
        console.warn(`面团 "${doughRecipe.name}" 的预发酵种 "${pfId}" (${pfRecipe.name}) 用量 (${pfUsage.quantity}) 无效。`);
        return;
    }
    if (!Number.isFinite(costOfPfPerGram)) {
        console.warn(`面团 "${doughRecipe.name}" 的预发酵种 "${pfId}" (${pfRecipe.name}) 每克成本计算无效 (Cost/g: ${costOfPfPerGram})。`);
        return;
    }
    preFermentsBatchCost += costOfPfPerGram * pfQuantity;
  });
  
  mainIngredientsBatchCost = Number.isFinite(mainIngredientsBatchCost) ? mainIngredientsBatchCost : 0;
  preFermentsBatchCost = Number.isFinite(preFermentsBatchCost) ? preFermentsBatchCost : 0;
  const totalCost = mainIngredientsBatchCost + preFermentsBatchCost;

  return {
    cost: Number.isFinite(totalCost) ? totalCost : 0,
    mainIngredientsCost: mainIngredientsBatchCost,
    preFermentsCost: preFermentsBatchCost,
    yield: (typeof doughRecipe.yield === 'number' && Number.isFinite(doughRecipe.yield) && doughRecipe.yield > 0 ? doughRecipe.yield : 0)
  };
};

// calculateSubFillingCost is effectively integrated into calculateFillingCost
// No longer needed as a separate export if only used internally by calculateFillingCost logic for breakdown

// 计算馅料配方的总成本 (BATCH COST), 包括子馅料
export const calculateFillingCost = (fillingRecipe) => {
  if (!fillingRecipe || !fillingRecipe.id) {
    const currentYield = fillingRecipe?.yield;
    return { cost: 0, mainIngredientsCost: 0, subFillingsCost: 0, yield: (typeof currentYield === 'number' && Number.isFinite(currentYield) ? currentYield : 0) };
  }

  let mainIngredientsBatchCost = 0;
  fillingRecipe.ingredients?.forEach((ingUsage) => {
    const ingData = findIngredientById(ingUsage.ingredientId);
    const ingId = ingUsage.ingredientId || 'unknown ingredient';

    if (!ingData) {
      console.warn(`馅料 "${fillingRecipe.name}" 配料 "${ingId}" 数据未找到。`);
      return;
    }
    if (typeof ingData.price !== 'number' || !Number.isFinite(ingData.price) || ingData.price < 0) {
      console.warn(`馅料 "${fillingRecipe.name}" 配料 "${ingId}" (${ingData.name}) 价格 (${ingData.price}) 无效。`);
      return;
    }
    if (typeof ingData.norms !== 'number' || !Number.isFinite(ingData.norms) || ingData.norms <= 0) {
      console.warn(`馅料 "${fillingRecipe.name}" 配料 "${ingId}" (${ingData.name}) 规格 (${ingData.norms}) 无效。`);
      return;
    }

    const pricePerMinUnit = ingData.price / ingData.norms;
    const quantity = Number(ingUsage.quantity);

    if (typeof ingUsage.quantity !== 'number' || !Number.isFinite(quantity) || quantity < 0) {
      console.warn(`馅料 "${fillingRecipe.name}" 配料 "${ingId}" (${ingData.name}) 用量 (${ingUsage.quantity}) 无效。`);
      return;
    }
    if (!Number.isFinite(pricePerMinUnit)) {
      console.warn(`馅料 "${fillingRecipe.name}" 配料 "${ingId}" (${ingData.name}) 单位成本计算无效 (PPU: ${pricePerMinUnit})。`);
      return;
    }
    mainIngredientsBatchCost += pricePerMinUnit * quantity;
  });

  let subFillingsBatchCost = 0;
  fillingRecipe.subFillings?.forEach((sfUsage) => {
    const sfRecipe = findFillingRecipeById(sfUsage.recipeId);
    const sfId = sfUsage.recipeId || 'unknown sub-filling';

    if (!sfRecipe || typeof sfRecipe.yield !== 'number' || !Number.isFinite(sfRecipe.yield) || sfRecipe.yield <= 0) {
      console.warn(`馅料 "${fillingRecipe.name}" 的子馅料 "${sfId}" (name: ${sfRecipe?.name}) 配方未找到或产量 (${sfRecipe?.yield}) 无效。`);
      return;
    }

    const sfBatchCalc = calculateFillingCost(sfRecipe); // Recursive call
    if (sfBatchCalc == null || typeof sfBatchCalc.cost !== 'number' || !Number.isFinite(sfBatchCalc.cost)) {
      console.warn(`馅料 "${fillingRecipe.name}" 的子馅料 "${sfId}" (${sfRecipe.name}) 批次成本计算无效 (cost: ${sfBatchCalc?.cost})。`);
      return;
    }

    const costOfSfPerGram = sfBatchCalc.cost / sfRecipe.yield;
    const sfQuantity = Number(sfUsage.quantity);
    
    if (typeof sfUsage.quantity !== 'number' || !Number.isFinite(sfQuantity) || sfQuantity < 0) {
      console.warn(`馅料 "${fillingRecipe.name}" 的子馅料 "${sfId}" (${sfRecipe.name}) 用量 (${sfUsage.quantity}) 无效。`);
      return;
    }
    if (!Number.isFinite(costOfSfPerGram)) {
      console.warn(`馅料 "${fillingRecipe.name}" 的子馅料 "${sfId}" (${sfRecipe.name}) 每克成本计算无效 (Cost/g: ${costOfSfPerGram})。`);
      return;
    }
    subFillingsBatchCost += costOfSfPerGram * sfQuantity;
  });

  mainIngredientsBatchCost = Number.isFinite(mainIngredientsBatchCost) ? mainIngredientsBatchCost : 0;
  subFillingsBatchCost = Number.isFinite(subFillingsBatchCost) ? subFillingsBatchCost : 0;
  const totalCost = mainIngredientsBatchCost + subFillingsBatchCost;

  return {
    cost: Number.isFinite(totalCost) ? totalCost : 0,
    mainIngredientsCost: mainIngredientsBatchCost,
    subFillingsCost: subFillingsBatchCost,
    yield: (typeof fillingRecipe.yield === 'number' && Number.isFinite(fillingRecipe.yield) && fillingRecipe.yield > 0 ? fillingRecipe.yield : 0)
  };
};

// 计算装饰成本 (PRODUCT COST for all decorations)
export const calculateDecorationCost = (decorations) => { // decorations is an array from breadType
  if (!decorations || decorations.length === 0) {
    return { totalCost: 0, totalWeight: 0, details: [] };
  }

  let totalCost = 0;
  let totalWeight = 0;
  const details = decorations.map((decoUsage) => {
    const ingData = findIngredientById(decoUsage.ingredientId);
    let cost = 0;
    let name = decoUsage.ingredientId;
    let unit = decoUsage.unit || ingData?.min || 'g';
    let productQuantity = Number(decoUsage.quantity) || 0;

    if (ingData && typeof ingData.price === 'number' && typeof ingData.norms === 'number' && ingData.norms > 0) {
      const pricePerMinUnit = ingData.price / ingData.norms;
      cost = pricePerMinUnit * productQuantity;
      name = ingData.name;
    } else {
      console.warn(`装饰配料 "${decoUsage.ingredientId}" 数据不完整或 norms 无效, 无法计算其成本。`);
    }
    totalCost += cost;
    totalWeight += productQuantity; // Assuming decoUsage.quantity is weight
    return {
      name: name,
      productQuantity: productQuantity,
      productCost: cost,
      unit: unit,
    };
  });

  return { totalCost, totalWeight, details };
};

// calculateDoughCostPerGram and calculateFillingCostPerGram are implicitly handled by new structure

// calculateBreadCost is effectively replaced by getBreadCostBreakdown returning total cost

// --- START: New Exportable Function for Aggregated Raw Materials ---
export const generateAggregatedRawMaterials = (breadType) => {
  if (!breadType || !breadType.id) {
    console.error("generateAggregatedRawMaterials: 无效或未提供面包类型。");
    return [];
  }
  const { doughId, doughWeight, fillings: fillingsUsageInProduct, decorations: decorationsUsageInProduct } = breadType;

  const aggregatedMaterials = {};

  const addMaterialToAggregation = (ingredientId, quantity, unitIfNotFromIngredient) => {
    if (!ingredientId || !Number.isFinite(Number(quantity)) || Number(quantity) <= 0) return;

    const ingData = findIngredientById(ingredientId);
    
    let originalName = ingData?.name || ingredientId;
    const normalizedName = ingredientNameNormalizationMap[originalName] || originalName;
    const name = normalizedName;
    
    let unit = 'g'; // Default unit
    if (ingData && typeof ingData.min === 'string' && ingData.min.trim() !== '') {
      unit = ingData.min;
    } else if (typeof unitIfNotFromIngredient === 'string' && unitIfNotFromIngredient.trim() !== '') {
      unit = unitIfNotFromIngredient;
    }

    if (aggregatedMaterials[name]) {
      aggregatedMaterials[name].totalProductQuantity += Number(quantity);
    } else {
      aggregatedMaterials[name] = {
        name: name,
        totalProductQuantity: Number(quantity),
        unit: unit,
        id: ingData?._id?.$oid || ingredientId // Ensure ID is captured
      };
    }
  };

  const collectIngredientsFromDoughRecursive = (currentDoughId, scaleFactorToProduct) => {
    if (!Number.isFinite(scaleFactorToProduct) || scaleFactorToProduct <= 0) return;
    const recipe = findDoughRecipeById(currentDoughId);
    if (!recipe || typeof recipe.yield !== 'number' || !Number.isFinite(recipe.yield) || recipe.yield <= 0) {
      console.warn(`generateAggregatedRawMaterials: Dough recipe "${currentDoughId}" not found or has invalid yield.`);
      return;
    }
    recipe.ingredients?.forEach(ingUsage => {
      addMaterialToAggregation(ingUsage.ingredientId, (Number(ingUsage.quantity) || 0) * scaleFactorToProduct, ingUsage.unit);
    });
    recipe.preFerments?.forEach(pfUsage => {
      const pfRecipe = findDoughRecipeById(pfUsage.id);
      if (pfRecipe && typeof pfRecipe.yield === 'number' && pfRecipe.yield > 0) {
        const scalePfToCurrentDough = (Number(pfUsage.quantity) || 0) / pfRecipe.yield;
        if (Number.isFinite(scalePfToCurrentDough)) {
          collectIngredientsFromDoughRecursive(pfUsage.id, scalePfToCurrentDough * scaleFactorToProduct);
        } else {
          console.warn(`generateAggregatedRawMaterials: Invalid scale factor for pre-ferment "${pfUsage.id}" in dough "${currentDoughId}".`);
        }
      } else {
        console.warn(`generateAggregatedRawMaterials: Pre-ferment recipe "${pfUsage.id}" in dough "${currentDoughId}" not found or has invalid yield.`);
      }
    });
  };

  const collectIngredientsFromFillingRecursive = (currentFillingId, scaleFactorToProduct) => {
    if (!Number.isFinite(scaleFactorToProduct) || scaleFactorToProduct <= 0) return;
    const recipe = findFillingRecipeById(currentFillingId);
    if (!recipe || typeof recipe.yield !== 'number' || !Number.isFinite(recipe.yield) || recipe.yield <= 0) {
      console.warn(`generateAggregatedRawMaterials: Filling recipe "${currentFillingId}" not found or has invalid yield.`);
      return;
    }
    recipe.ingredients?.forEach(ingUsage => {
      addMaterialToAggregation(ingUsage.ingredientId, (Number(ingUsage.quantity) || 0) * scaleFactorToProduct, ingUsage.unit);
    });
    recipe.subFillings?.forEach(sfUsage => {
      const sfRecipe = findFillingRecipeById(sfUsage.recipeId);
      if (sfRecipe && typeof sfRecipe.yield === 'number' && sfRecipe.yield > 0) {
        const scaleSfToCurrentFilling = (Number(sfUsage.quantity) || 0) / sfRecipe.yield;
        if (Number.isFinite(scaleSfToCurrentFilling)) {
          collectIngredientsFromFillingRecursive(sfUsage.recipeId, scaleSfToCurrentFilling * scaleFactorToProduct);
        } else {
           console.warn(`generateAggregatedRawMaterials: Invalid scale factor for sub-filling "${sfUsage.recipeId}" in filling "${currentFillingId}".`);
        }
      } else {
         console.warn(`generateAggregatedRawMaterials: Sub-filling recipe "${sfUsage.recipeId}" in filling "${currentFillingId}" not found or has invalid yield.`);
      }
    });
  };

  // 1. Collect from Main Dough and its Pre-ferments
  const mainDoughRecipeForAgg = findDoughRecipeById(doughId); // Renamed to avoid conflict if getBreadCostBreakdown also defines it
  if (mainDoughRecipeForAgg && typeof mainDoughRecipeForAgg.yield === 'number' && mainDoughRecipeForAgg.yield > 0) {
    const scaleMainDoughToProduct = (Number(doughWeight) || 0) / mainDoughRecipeForAgg.yield;
    if (Number.isFinite(scaleMainDoughToProduct)) {
      collectIngredientsFromDoughRecursive(doughId, scaleMainDoughToProduct);
    } else {
      console.warn(`generateAggregatedRawMaterials: Invalid scale factor for dough "${doughId}" to product.`);
    }
  } else {
    console.warn(`generateAggregatedRawMaterials: Main dough recipe "${doughId}" not found or has invalid yield.`);
  }

  // 2. Collect from Fillings and their Ingredients
  if (fillingsUsageInProduct && fillingsUsageInProduct.length > 0) {
    fillingsUsageInProduct.forEach((fillingUsage) => {
      const fillingRecipe = findFillingRecipeById(fillingUsage.fillingId);
      if (fillingRecipe && typeof fillingRecipe.yield === 'number' && fillingRecipe.yield > 0) {
        const scaleFillingToProduct = (Number(fillingUsage.quantity) || 0) / fillingRecipe.yield;
        if (Number.isFinite(scaleFillingToProduct)) {
          collectIngredientsFromFillingRecursive(fillingUsage.fillingId, scaleFillingToProduct);
        } else {
          console.warn(`generateAggregatedRawMaterials: Invalid scale factor for filling "${fillingUsage.fillingId}" to product.`);
        }
      } else {
        console.warn(`generateAggregatedRawMaterials: Filling recipe "${fillingUsage.fillingId}" not found or has invalid yield.`);
      }
    });
  }

  // 3. Collect from Decorations
  if (decorationsUsageInProduct && decorationsUsageInProduct.length > 0) {
    decorationsUsageInProduct.forEach((decoUsage) => {
      const quantity = Number(decoUsage.quantity) || 0;
      if (quantity > 0) { 
        addMaterialToAggregation(decoUsage.ingredientId, quantity, decoUsage.unit);
      } else if (quantity < 0) { 
          console.warn(`generateAggregatedRawMaterials: Negative quantity (${quantity}) for decoration "${decoUsage.ingredientId}". Not added.`);
      }
    });
  }

  // 4. Format output array
  const allRawMaterialsSummaryResult = [];
  for (const nameKey in aggregatedMaterials) { // Changed 'name' to 'nameKey' to avoid conflict
    const material = aggregatedMaterials[nameKey];
    allRawMaterialsSummaryResult.push({
      name: material.name,
      totalProductQuantity: material.totalProductQuantity,
      unit: material.unit,
      id: material.id 
    });
  }
  return allRawMaterialsSummaryResult;
};
// --- END: New Exportable Function for Aggregated Raw Materials ---

// 获取面包的详细成本分解 (PRODUCT COST)
export const getBreadCostBreakdown = (breadType) => {
  if (!breadType || !breadType.id) {
    console.error("getBreadCostBreakdown: 无效或未提供面包类型。");
    return {
      dough: { name: '', weight: 0, cost: 0, mainIngredientsCost: 0, preFermentsDetails: [], unit: 'g' },
      fillings: { totalCost: 0, totalWeight: 0, details: [] },
      decorations: { totalCost: 0, totalWeight: 0, details: [] },
      total: 0,
      totalWeight: 0,
      breadName: '未知面包',
      allRawMaterialsSummary: []
    };
  }

  const { doughId, doughWeight, fillings: fillingsUsageInProduct, decorations: decorationsUsageInProduct, name: breadName } = breadType;

  // --- 面团成本 (Dough Cost) ---
  const mainDoughRecipe = findDoughRecipeById(doughId);
  let doughDetailsForProduct = {
    name: mainDoughRecipe?.name || doughId,
    weight: Number(doughWeight) || 0,
    cost: 0,
    mainIngredientsCost: 0,
    preFermentsDetails: [],
    unit: mainDoughRecipe?.unit || 'g'
  };

  if (mainDoughRecipe && typeof mainDoughRecipe.yield === 'number' && mainDoughRecipe.yield > 0) {
    const mainDoughBatchCalc = calculateDoughCost(mainDoughRecipe);
    const scaleParentDoughToProduct = (Number(doughWeight) || 0) / mainDoughRecipe.yield;

    if (Number.isFinite(scaleParentDoughToProduct)) {
        doughDetailsForProduct.cost = mainDoughBatchCalc.cost * scaleParentDoughToProduct;
        doughDetailsForProduct.mainIngredientsCost = mainDoughBatchCalc.mainIngredientsCost * scaleParentDoughToProduct;

        doughDetailsForProduct.preFermentsDetails = mainDoughRecipe.preFerments?.map(pfUsageInParent => {
            const pfRecipe = findDoughRecipeById(pfUsageInParent.id);
            let pfProductQuantity = 0;
            let pfProductCost = 0;
            let pfName = pfUsageInParent.id;
            let pfUnit = pfUsageInParent.unit || pfRecipe?.unit || 'g';

            if (pfRecipe && typeof pfRecipe.yield === 'number' && pfRecipe.yield > 0) {
                const pfBatchCalcInternal = calculateDoughCost(pfRecipe); // Renamed to avoid conflict
                const costOfPfPerGram = pfBatchCalcInternal.cost / pfRecipe.yield;
                
                pfName = pfRecipe.name;
                if (Number.isFinite(costOfPfPerGram)) {
                    pfProductQuantity = (pfUsageInParent.quantity || 0) * scaleParentDoughToProduct;
                    pfProductCost = costOfPfPerGram * pfProductQuantity;
                } else {
                    console.warn(`面包 "${breadName}" 的面团 "${mainDoughRecipe.name}" 的预发酵种 "${pfRecipe.name}" 每克成本计算无效。`);
                }
            } else {
                console.warn(`面包 "${breadName}" 的面团 "${mainDoughRecipe.name}" 的预发酵种 "${pfUsageInParent.id}" 配方未找到或产量无效。`);
            }
            return { name: pfName, productQuantity: pfProductQuantity, productCost: pfProductCost, unit: pfUnit };
        }) || [];
    } else {
        console.warn(`面包 "${breadName}" 的面团 "${mainDoughRecipe.name}" 的缩放因子计算无效 (产品用量: ${doughDetailsForProduct.weight}, 面团批次产量: ${mainDoughRecipe.yield})。`);
    }

  } else {
    console.warn(`面包 "${breadName}" 的主面团配方 "${doughId}" 未找到或产量无效。`);
     doughDetailsForProduct = { // Default if main dough recipe fails
        name: doughId,
        weight: Number(doughWeight) || 0,
        cost: 0,
        mainIngredientsCost: 0,
        preFermentsDetails: [],
        unit: 'g'
    };
  }

  // --- 馅料成本 (Fillings Cost) ---
  let totalFillingsProductCost = 0;
  let totalFillingsProductWeight = 0;
  const fillingsDetailsBreakdown = [];

  if (fillingsUsageInProduct && fillingsUsageInProduct.length > 0) {
    fillingsUsageInProduct.forEach((fillingUsage) => { 
      const fillingRecipe = findFillingRecipeById(fillingUsage.fillingId);
      const fillingProductWeight = Number(fillingUsage.quantity) || 0;
      totalFillingsProductWeight += fillingProductWeight;
      
      let currentFillingProductCost = 0;
      let currentFillingDirectIngredientsProductCost = 0;
      let currentFillingSubFillingsDetails = [];
      let fillingName = fillingUsage.fillingId;
      let fillingUnit = fillingUsage.unit || fillingRecipe?.unit || 'g';

      if (fillingRecipe && typeof fillingRecipe.yield === 'number' && fillingRecipe.yield > 0) {
        fillingName = fillingRecipe.name;
        const fillingBatchCalc = calculateFillingCost(fillingRecipe);
        const scaleFillingToProduct = fillingProductWeight / fillingRecipe.yield;

        if (Number.isFinite(scaleFillingToProduct)){
            currentFillingProductCost = fillingBatchCalc.cost * scaleFillingToProduct;
            currentFillingDirectIngredientsProductCost = fillingBatchCalc.mainIngredientsCost * scaleFillingToProduct;

            currentFillingSubFillingsDetails = fillingRecipe.subFillings?.map(sfUsageInParent => {
                const sfRecipe = findFillingRecipeById(sfUsageInParent.recipeId);
                let sfProductQuantity = 0;
                let sfProductCost = 0;
                let sfName = sfUsageInParent.recipeId;
                let sfUnit = sfUsageInParent.unit || sfRecipe?.unit || 'g';

                if (sfRecipe && typeof sfRecipe.yield === 'number' && sfRecipe.yield > 0) {
                    const sfBatchCalcInternal = calculateFillingCost(sfRecipe); 
                    const costOfSfPerGram = sfBatchCalcInternal.cost / sfRecipe.yield;
                    
                    sfName = sfRecipe.name;
                    if (Number.isFinite(costOfSfPerGram)) {
                        sfProductQuantity = (sfUsageInParent.quantity || 0) * scaleFillingToProduct;
                        sfProductCost = costOfSfPerGram * sfProductQuantity;
                    } else {
                         console.warn(`面包 "${breadName}" 的馅料 "${fillingRecipe.name}" 的子馅料 "${sfRecipe.name}" 每克成本计算无效。`);
                    }
                } else {
                  console.warn(`面包 "${breadName}" 的馅料 "${fillingRecipe.name}" 的子馅料 "${sfUsageInParent.recipeId}" 配方未找到或产量无效。`);
                }
                return { name: sfName, productQuantity: sfProductQuantity, productCost: sfProductCost, unit: sfUnit };
            }) || [];
        } else {
             console.warn(`面包 "${breadName}" 的馅料 "${fillingRecipe.name}" 的缩放因子计算无效 (产品用量: ${fillingProductWeight}, 馅料批次产量: ${fillingRecipe.yield})。`);
        }
      } else {
        console.warn(`面包 "${breadName}" 的馅料 "${fillingUsage.fillingId}" 配方未找到或产量无效。`);
      }
      
      totalFillingsProductCost += currentFillingProductCost;
      fillingsDetailsBreakdown.push({
        name: fillingName,
        type: fillingUsage.type || 'unknown',
        weight: fillingProductWeight,
        cost: currentFillingProductCost,
        directIngredientsCost: currentFillingDirectIngredientsProductCost,
        subFillingsDetails: currentFillingSubFillingsDetails,
        unit: fillingUnit
      });
    });
  }

  // --- 装饰成本 (Decorations Cost) ---
  const decorationsProductCalc = calculateDecorationCost(decorationsUsageInProduct);

  // --- 总计 (Totals) ---
  const finalTotalProductCost = (doughDetailsForProduct.cost || 0) + totalFillingsProductCost + decorationsProductCalc.totalCost;
  const finalTotalProductWeight = (doughDetailsForProduct.weight || 0) + totalFillingsProductWeight + decorationsProductCalc.totalWeight;

  // --- Generate Aggregated Raw Materials Summary by calling the new function ---
  const allRawMaterialsSummary = generateAggregatedRawMaterials(breadType);

  return {
    dough: {
      name: doughDetailsForProduct.name,
      weight: doughDetailsForProduct.weight,
      cost: doughDetailsForProduct.cost,
      mainIngredientsCost: doughDetailsForProduct.mainIngredientsCost,
      preFermentsDetails: doughDetailsForProduct.preFermentsDetails,
      unit: doughDetailsForProduct.unit
    },
    fillings: {
      totalCost: totalFillingsProductCost,
      totalWeight: totalFillingsProductWeight,
      details: fillingsDetailsBreakdown
    },
    decorations: {
      totalCost: decorationsProductCalc.totalCost,
      totalWeight: decorationsProductCalc.totalWeight,
      details: decorationsProductCalc.details
    },
    total: finalTotalProductCost,
    totalWeight: finalTotalProductWeight,
    breadName: breadName,
    allRawMaterialsSummary: allRawMaterialsSummary
  };
};