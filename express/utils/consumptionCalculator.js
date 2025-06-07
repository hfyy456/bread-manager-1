const path = require('path');
const { pathToFileURL } = require('url');

const dataPathPrefix = '../../src/data/';

// Module-level variables to store loaded data
let _breadTypes = null;
let _doughRecipes = null;
let _fillingRecipes = null;
let _dataLoaded = false;

// Asynchronously load data if not already loaded
async function _loadDataIfNeeded() {
  if (_dataLoaded) {
    return;
  }
  try {
    // Construct absolute paths and then convert to file URLs
    const breadTypesPath = path.resolve(__dirname, dataPathPrefix, 'breadTypes.js');
    const breadTypesURL = pathToFileURL(breadTypesPath).href;
    const breadTypesModule = await import(breadTypesURL);
    _breadTypes = breadTypesModule.breadTypes;

    const doughRecipesPath = path.resolve(__dirname, dataPathPrefix, 'doughRecipes.js');
    const doughRecipesURL = pathToFileURL(doughRecipesPath).href;
    const doughRecipesModule = await import(doughRecipesURL);
    _doughRecipes = doughRecipesModule.doughRecipes;

    const fillingRecipesPath = path.resolve(__dirname, dataPathPrefix, 'fillingRecipes.js');
    const fillingRecipesURL = pathToFileURL(fillingRecipesPath).href;
    const fillingRecipesModule = await import(fillingRecipesURL);
    _fillingRecipes = fillingRecipesModule.fillingRecipes;

    if (!_breadTypes || !_doughRecipes || !_fillingRecipes) {
        throw new Error("One or more data modules did not load correctly.");
    }
    _dataLoaded = true;
    // console.log("[ConsumptionCalculator] Recipe data loaded successfully.");
  } catch (error) {
    console.error("[ConsumptionCalculator] Error loading recipe data:", error);
    // Reset flag so it can try again, or handle error more gracefully
    _dataLoaded = false; 
    _breadTypes = []; // Default to empty arrays to prevent further errors downstream
    _doughRecipes = [];
    _fillingRecipes = [];
    // Rethrow or handle as critical error depending on application needs
    throw new Error("Failed to initialize consumption calculator due to data loading issues.");
  }
}

// Helper to find recipes by ID (name)
// These now rely on the dynamically loaded data
const findDoughRecipeById = (id) => _doughRecipes.find(recipe => recipe.id === id);
const findFillingRecipeById = (id) => _fillingRecipes.find(recipe => recipe.id === id);
const findBreadTypeByName = (name) => _breadTypes.find(bt => bt.name === name || bt.id === name);

// Simplified internal helper to add/update material in the aggregation map
// Assumes all quantities are in a consistent base unit (e.g., grams)
const _addMaterialToAggregation = (aggregatedMap, ingredientId, quantity, unit = '克') => {
  if (!ingredientId || typeof quantity !== 'number' || quantity <= 0) {
    // console.warn(`[Aggregator] Invalid material data for '${ingredientId}', quantity: ${quantity}. Skipping.`);
    return;
  }
  if (aggregatedMap[ingredientId]) {
    aggregatedMap[ingredientId].quantity += quantity;
  } else {
    aggregatedMap[ingredientId] = {
      name: ingredientId, // In our data, ingredientId is the name
      quantity: quantity,
      unit: unit, // Assuming '克' or a consistent unit from recipes
    };
  }
};

// Internal recursive helper to collect ingredients from dough recipes
const _collectIngredientsFromDoughRecursive = (doughId, scaleFactor, aggregatedMap) => {
  const doughRecipe = findDoughRecipeById(doughId);
  if (!doughRecipe) {
    // console.warn(`[Aggregator] Dough recipe not found for ID: '${doughId}'. Skipping.`);
    return;
  }

  (doughRecipe.ingredients || []).forEach(ingUsage => {
    const scaledQuantity = ingUsage.quantity * scaleFactor;
    _addMaterialToAggregation(aggregatedMap, ingUsage.ingredientId, scaledQuantity, ingUsage.unit);
  });

  (doughRecipe.preFerments || []).forEach(pfUsage => {
    const pfRecipe = findDoughRecipeById(pfUsage.id);
    if (!pfRecipe || !pfRecipe.yield || pfRecipe.yield <= 0) {
      // console.warn(`[Aggregator] Pre-ferment dough '${pfUsage.id}' in '${doughRecipe.name}' not found or has invalid yield. Skipping.`);
      return;
    }
    const newScaleFactor = (pfUsage.quantity / pfRecipe.yield) * scaleFactor;
    _collectIngredientsFromDoughRecursive(pfUsage.id, newScaleFactor, aggregatedMap);
  });
};

// Internal recursive helper to collect ingredients from filling recipes
const _collectIngredientsFromFillingRecursive = (fillingId, scaleFactor, aggregatedMap) => {
  const fillingRecipe = findFillingRecipeById(fillingId);
  if (!fillingRecipe) {
    // console.warn(`[Aggregator] Filling recipe not found for ID: '${fillingId}'. Skipping.`);
    return;
  }

  (fillingRecipe.ingredients || []).forEach(ingUsage => {
    const scaledQuantity = ingUsage.quantity * scaleFactor;
    _addMaterialToAggregation(aggregatedMap, ingUsage.ingredientId, scaledQuantity, ingUsage.unit);
  });

  (fillingRecipe.subFillings || []).forEach(sfUsage => {
    const sfRecipe = findFillingRecipeById(sfUsage.recipeId); // In fillingRecipes, subFilling reference is by recipeId
    if (!sfRecipe || !sfRecipe.yield || sfRecipe.yield <= 0) {
      // console.warn(`[Aggregator] Sub-filling '${sfUsage.recipeId}' in '${fillingRecipe.name}' not found or has invalid yield. Skipping.`);
      return;
    }
    const newScaleFactor = (sfUsage.quantity / sfRecipe.yield) * scaleFactor;
    _collectIngredientsFromFillingRecursive(sfUsage.recipeId, newScaleFactor, aggregatedMap);
  });
};

// --- Exportable Functions ---

/**
 * Calculates total raw materials for one unit of a given bread product.
 * @param {string} breadName - The name (or ID) of the bread product.
 * @returns {Promise<Object>} A map of aggregated raw materials: { ingredientName: { name, quantity, unit } }
 */
const getRawMaterialsForProduct = async (breadName) => {
  await _loadDataIfNeeded();
  const breadType = findBreadTypeByName(breadName);
  if (!breadType) {
    // console.warn(`[Aggregator] Bread type '${breadName}' not found.`);
    return {};
  }

  const aggregatedMaterials = {};

  // 1. Process Dough
  if (breadType.doughId && typeof breadType.doughWeight === 'number' && breadType.doughWeight > 0) {
    const mainDoughRecipe = findDoughRecipeById(breadType.doughId);
    if (mainDoughRecipe && mainDoughRecipe.yield > 0) {
      const doughScaleFactor = breadType.doughWeight / mainDoughRecipe.yield;
      _collectIngredientsFromDoughRecursive(breadType.doughId, doughScaleFactor, aggregatedMaterials);
    } else {
      // console.warn(`[Aggregator] Main dough recipe '${breadType.doughId}' for '${breadType.name}' not found or has invalid yield.`);
    }
  }

  // 2. Process Fillings
  (breadType.fillings || []).forEach(fillingUsage => {
    if (fillingUsage.fillingId && typeof fillingUsage.quantity === 'number' && fillingUsage.quantity > 0) {
      const mainFillingRecipe = findFillingRecipeById(fillingUsage.fillingId);
      if (mainFillingRecipe && mainFillingRecipe.yield > 0) {
        const fillingScaleFactor = fillingUsage.quantity / mainFillingRecipe.yield;
        _collectIngredientsFromFillingRecursive(fillingUsage.fillingId, fillingScaleFactor, aggregatedMaterials);
      } else {
        // console.warn(`[Aggregator] Main filling recipe '${fillingUsage.fillingId}' for '${breadType.name}' not found or has invalid yield.`);
      }
    }
  });

  // 3. Process Decorations (Direct Ingredients)
  (breadType.decorations || []).forEach(decoUsage => {
    if (decoUsage.ingredientId && typeof decoUsage.quantity === 'number' && decoUsage.quantity > 0) {
      _addMaterialToAggregation(aggregatedMaterials, decoUsage.ingredientId, decoUsage.quantity, decoUsage.unit);
    }
  });
  
  return aggregatedMaterials;
};

/**
 * Calculates total raw materials for a given weight of a specific dough.
 * @param {string} doughName - The name (or ID) of the dough.
 * @param {number} requiredWeight - The total weight of the dough needed.
 * @returns {Promise<Object>} A map of aggregated raw materials: { ingredientName: { name, quantity, unit } }
 */
const getRawMaterialsForDough = async (doughName, requiredWeight) => {
  await _loadDataIfNeeded();
  const doughRecipe = findDoughRecipeById(doughName);
  if (!doughRecipe) {
    // console.warn(`[Aggregator] Dough recipe '${doughName}' not found for direct calculation.`);
    return {};
  }
  if (typeof requiredWeight !== 'number' || requiredWeight <= 0) {
    // console.warn(`[Aggregator] Invalid requiredWeight for dough '${doughName}': ${requiredWeight}`);
    return {};
  }
  if (!doughRecipe.yield || doughRecipe.yield <= 0) {
    // console.warn(`[Aggregator] Dough recipe '${doughName}' has invalid yield: ${doughRecipe.yield}`);
    return {};
  }

  const aggregatedMaterials = {};
  const scaleFactor = requiredWeight / doughRecipe.yield;
  _collectIngredientsFromDoughRecursive(doughRecipe.id, scaleFactor, aggregatedMaterials);
  
  return aggregatedMaterials;
};

/**
 * Calculates total raw materials for a given weight of a specific filling.
 * @param {string} fillingName - The name (or ID) of the filling.
 * @param {number} requiredWeight - The total weight of the filling needed.
 * @returns {Promise<Object>} A map of aggregated raw materials: { ingredientName: { name, quantity, unit } }
 */
const getRawMaterialsForFilling = async (fillingName, requiredWeight) => {
  await _loadDataIfNeeded();
  const fillingRecipe = findFillingRecipeById(fillingName);
  if (!fillingRecipe) {
    // console.warn(`[Aggregator] Filling recipe '${fillingName}' not found for direct calculation.`);
    return {};
  }
   if (typeof requiredWeight !== 'number' || requiredWeight <= 0) {
    // console.warn(`[Aggregator] Invalid requiredWeight for filling '${fillingName}': ${requiredWeight}`);
    return {};
  }
  if (!fillingRecipe.yield || fillingRecipe.yield <= 0) {
    // console.warn(`[Aggregator] Filling recipe '${fillingName}' has invalid yield: ${fillingRecipe.yield}`);
    return {};
  }

  const aggregatedMaterials = {};
  const scaleFactor = requiredWeight / fillingRecipe.yield;
  _collectIngredientsFromFillingRecursive(fillingRecipe.id, scaleFactor, aggregatedMaterials);

  return aggregatedMaterials;
};

module.exports = {
  getRawMaterialsForProduct,
  getRawMaterialsForDough,
  getRawMaterialsForFilling,
};