import { ingredients } from "../data/ingredients";
import { doughRecipes } from "../data/doughRecipes";
import { fillingRecipes } from "../data/fillingRecipes";
import { breadTypes } from "../data/breadTypes";

// 根据ID查找配料
export const findIngredientById = (id, recipeIngredients = null) => {
  // 优先从配方的配料中查找
  if (recipeIngredients) {
    const recipeIng = recipeIngredients.find(ing => ing.ingredientId === id);
    if (recipeIng) {
      // 返回配方中定义的配料（如果有价格）或全局配料
      return { 
        ...findIngredientById(id), 
        ...recipeIng 
      };
    }
  }
  
  // 回退到全局配料表
  return ingredients.find((ingredient) => ingredient.name === id);
};

// 根据ID查找馅料配方
export const findFillingRecipeById = (id) => {
  return fillingRecipes.find((recipe) => recipe.id === id);
};

// 根据ID查找面团配方
export const findDoughRecipeById = (id) => {
  return doughRecipes.find((recipe) => recipe.id === id);
};

// 计算预发酵种的总成本
export const calculatePreFermentCost = (preFerment, parentRecipe) => {
  // 检查预发酵种是否存在以及是否有配料列表
  if (!preFerment || !preFerment.ingredients) {
    console.error('预发酵种或其配料列表缺失:', preFerment);
    return 0;
  }
  
  return preFerment.ingredients.reduce((total, ingredient) => {
    const ing = findIngredientById(ingredient.ingredientId, parentRecipe?.ingredients);
    if (!ing) {
      console.error(`未找到配料ID: ${ingredient.ingredientId}`);
      return total;
    }
    const price = ingredient.pricePerUnit || ing.pricePerUnit;
    return total + price * ingredient.quantity;
  }, 0);
};

// 计算面团配方的总成本
export const calculateDoughCost = (doughRecipe) => {
  // 主面团配料成本
  const mainDoughCost = doughRecipe.ingredients?.reduce((total, ingredient) => {
    const ing = findIngredientById(ingredient.ingredientId, doughRecipe.ingredients);
    if (!ing) {
      console.error(`未找到配料ID: ${ingredient.ingredientId}`);
      return total;
    }
    const price = ingredient.pricePerUnit || ing.pricePerUnit;
    return total + price * ingredient.quantity;
  }, 0) || 0;

  // 预发酵种成本
  const preFermentsCost = doughRecipe.preFerments?.reduce((total, preFerment) => {
    return total + calculatePreFermentCost(preFerment, doughRecipe);
  }, 0) || 0;

  return mainDoughCost + preFermentsCost;
};

// 计算子馅料成本
export const calculateSubFillingCost = (subFilling, parentRecipe) => {
  const recipe = findFillingRecipeById(subFilling.recipeId);
  if (!recipe) {
    console.error(`未找到子馅料配方ID: ${subFilling.recipeId}`);
    return 0;
  }

  const costPerGram = calculateFillingCost(recipe) / recipe.yield;
  return costPerGram * subFilling.quantity;
};

// 计算馅料配方的总成本，包括子馅料
export const calculateFillingCost = (fillingRecipe) => {
  if (!fillingRecipe) return 0;

  // 计算主馅料配料成本 - 增加空值检查
  const mainCost = fillingRecipe.ingredients?.reduce((total, ingredient) => {
    const ing = findIngredientById(ingredient.ingredientId, fillingRecipe.ingredients);
    if (!ing) {
      console.error(`未找到配料ID: ${ingredient.ingredientId}`);
      return total;
    }
    // 使用配方中定义的价格或全局价格
    const price = ingredient.pricePerUnit || ing.pricePerUnit;
    return total + price * ingredient.quantity;
  }, 0) || 0;

  // 计算子馅料成本
  const subFillingsCost =
    fillingRecipe.subFillings?.reduce((total, subFilling) => {
      return total + calculateSubFillingCost(subFilling, fillingRecipe);
    }, 0) || 0;

  return mainCost + subFillingsCost;
};

// 计算装饰成本
export const calculateDecorationCost = (decorations) => {
  if (!decorations || decorations.length === 0) return 0;

  return decorations.reduce((total, decoration) => {
    const ing = findIngredientById(decoration.ingredientId);
    if (!ing) {
      console.error(`未找到装饰配料ID: ${decoration.ingredientId}`);
      return total;
    }
    return total + ing.pricePerUnit * decoration.quantity;
  }, 0);
};

// 计算面团每克成本
export const calculateDoughCostPerGram = (doughRecipe) => {
  const totalCost = calculateDoughCost(doughRecipe);
  return totalCost / doughRecipe.yield;
};

// 计算馅料每克成本
export const calculateFillingCostPerGram = (fillingRecipe) => {
  if (!fillingRecipe) return 0;
  const totalCost = calculateFillingCost(fillingRecipe);
  return totalCost / fillingRecipe.yield;
};

// 计算单个面包的总成本
export const calculateBreadCost = (breadType) => {
  const doughRecipe = doughRecipes.find(
    (recipe) => recipe.id === breadType.doughId
  );
  if (!doughRecipe) {
    console.error(`未找到面团配方ID: ${breadType.doughId}`);
    return 0;
  }
  const doughCostPerGram = calculateDoughCostPerGram(doughRecipe);
  const doughCost = doughCostPerGram * breadType.doughWeight;

  let fillingCost = 0;
  if (breadType.fillings && breadType.fillings.length > 0) {
    breadType.fillings.forEach((filling) => {
      const fillingRecipe = findFillingRecipeById(filling.fillingId);
      if (!fillingRecipe) {
        console.error(`未找到馅料配方ID: ${filling.fillingId}`);
      } else {
        const fillingCostPerGram = calculateFillingCostPerGram(fillingRecipe);
        fillingCost += fillingCostPerGram * filling.quantity;
      }
    });
  }

  const decorationCost = calculateDecorationCost(breadType.decorations);

  return doughCost + fillingCost + decorationCost;
};

// 获取面包的详细成本分解
export const getBreadCostBreakdown = (breadType) => {
  const doughRecipe = doughRecipes.find(
    (recipe) => recipe.id === breadType.doughId
  );
  if (!doughRecipe) {
    console.error(`未找到面团配方ID: ${breadType.doughId}`);
    return {
      dough: null,
      fillings: [],
      decorations: [],
      total: 0,
    };
  }

  const doughCostPerGram = calculateDoughCostPerGram(doughRecipe);
  const doughCost = doughCostPerGram * breadType.doughWeight;

  let fillingsCost = 0;
  const fillingsDetails = [];

  if (breadType.fillings && breadType.fillings.length > 0) {
    breadType.fillings.forEach((filling) => {
      const fillingRecipe = findFillingRecipeById(filling.fillingId);
      if (!fillingRecipe) {
        console.error(`未找到馅料配方ID: ${filling.fillingId}`);
      } else {
        const fillingCostPerGram = calculateFillingCostPerGram(fillingRecipe);
        const fillingTotalCost = fillingCostPerGram * filling.quantity;
        fillingsCost += fillingTotalCost;

        // 获取馅料中的子馅料信息
        const subFillingsDetails =
          fillingRecipe.subFillings?.map((subFilling) => {
            const subRecipe = findFillingRecipeById(subFilling.recipeId);
            const subCost = calculateSubFillingCost(subFilling, fillingRecipe);
            return {
              name: subRecipe?.name || "未知子馅料",
              quantity: subFilling.quantity,
              unit: subFilling.unit,
              cost: subCost,
            };
          }) || [];

        fillingsDetails.push({
          name: fillingRecipe.name,
          weight: filling.quantity,
          unit: filling.unit,
          cost: fillingTotalCost,
          subFillings: subFillingsDetails,
          subFillingsCost: subFillingsDetails.reduce(
            (total, sub) => total + sub.cost,
            0
          ),
        });
      }
    });
  }

  const decorationCost = calculateDecorationCost(breadType.decorations);
  const decorationDetails =
    breadType.decorations?.map((decoration) => {
      const ingredient = findIngredientById(decoration.ingredientId);
      return {
        ...decoration,
        ingredientName: ingredient?.name || "未知配料",
        unitCost: ingredient?.pricePerUnit || 0,
        totalCost: (ingredient?.pricePerUnit || 0) * decoration.quantity,
      };
    }) || [];

  return {
    dough: {
      name: doughRecipe.name,
      weight: breadType.doughWeight,
      cost: doughCost,
      preFerments:
        doughRecipe.preFerments?.map((preFerment) => ({
          name: preFerment.name,
          cost: calculatePreFermentCost(preFerment, doughRecipe),
        })) || [],
    },
    fillings: {
      totalCost: fillingsCost,
      details: fillingsDetails,
    },
    decorations: {
      totalCost: decorationCost,
      details: decorationDetails,
    },
    total: doughCost + fillingsCost + decorationCost,
    totalWeight:
      breadType.doughWeight +
      fillingsDetails.reduce((total, filling) => total + filling.weight, 0),
  };
};