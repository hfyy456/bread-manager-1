import { useState, useCallback, useContext, useEffect } from 'react';
import { DataContext } from '../../DataContext.jsx';
import { generateAggregatedRawMaterials, getBreadCostBreakdown } from '../../../utils/calculator';

export const useCalculatorLogic = () => {
  const { breadTypes, doughRecipesMap, fillingRecipesMap, ingredientsMap, ingredients, loading } = useContext(DataContext);
  
  // 核心状态
  const [quantities, setQuantities] = useState({});
  const [aggregatedMaterials, setAggregatedMaterials] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [costAnalysis, setCostAnalysis] = useState(null);
  const [materialMultiplier, setMaterialMultiplier] = useState(1.05);

  // 处理数量变更
  const handleQuantityChange = useCallback((breadId, quantity) => {
    const newQuantity = parseInt(quantity, 10);
    setQuantities(prevQuantities => ({
      ...prevQuantities,
      [breadId]: isNaN(newQuantity) || newQuantity < 0 ? '' : newQuantity
    }));
    setCostAnalysis(null);
    setShowResults(false);
  }, []);

  // 清除特定产品数量
  const handleClearSpecificQuantity = useCallback((breadId) => {
    setQuantities(prevQuantities => ({
      ...prevQuantities,
      [breadId]: ''
    }));
    setCostAnalysis(null);
    setShowResults(false);
  }, []);

  // 重置所有数量
  const handleResetQuantities = useCallback(() => {
    setQuantities({});
    setAggregatedMaterials([]);
    setCostAnalysis(null);
    setMaterialMultiplier(1.05);
    setShowResults(false);
  }, []);

  // 更新原料需求系数
  const handleMultiplierChange = useCallback((newMultiplier) => {
    setMaterialMultiplier(newMultiplier);
    setCostAnalysis(null);
    setShowResults(false);
  }, []);

  // 计算总原料需求
  const calculateTotalRawMaterials = useCallback((showLoader = true) => {
    if (loading) {
      console.warn('核心数据仍在加载中');
      return;
    }
    
    if (showLoader) setIsCalculating(true);

    const totalAggregated = {};
    const productCostAnalysis = [];
    let totalProductionCost = 0;
    let totalProductionValue = 0;

    // 遍历所有有数量的产品
    for (const breadId in quantities) {
      const quantity = quantities[breadId];
      if (quantity > 0) {
        const bread = breadTypes.find(b => b.id === breadId);
        if (bread) {
          // 计算单个产品的成本分解
          const breadCostBreakdown = getBreadCostBreakdown(bread, doughRecipesMap, fillingRecipesMap, ingredientsMap);
          const unitCost = breadCostBreakdown ? breadCostBreakdown.totalCost : 0;
          const totalCostForThisBread = unitCost * quantity;
          const totalValueForThisBread = (bread.price || 0) * quantity;
          
          totalProductionCost += totalCostForThisBread;
          totalProductionValue += totalValueForThisBread;

          productCostAnalysis.push({
            breadId: bread.id,
            breadName: bread.name,
            quantity: quantity,
            unitCost: unitCost,
            unitPrice: bread.price || 0,
            totalCost: totalCostForThisBread,
            totalValue: totalValueForThisBread,
            unitProfit: (bread.price || 0) - unitCost,
            totalProfit: totalValueForThisBread - totalCostForThisBread,
            profitMargin: totalValueForThisBread > 0 ? ((totalValueForThisBread - totalCostForThisBread) / totalValueForThisBread * 100) : 0,
            costBreakdown: breadCostBreakdown
          });

          // 生成原料需求
          const breadMaterials = generateAggregatedRawMaterials(
            bread,
            breadTypes,
            doughRecipesMap,
            fillingRecipesMap,
            ingredients,
            quantity
          );
          
          // 聚合原料需求
          breadMaterials.forEach(material => {
            const matCost = material.cost || 0;
            const matQty = (material.quantity || 0) * materialMultiplier;

            if (totalAggregated[material.id]) {
              totalAggregated[material.id].quantity += matQty;
              totalAggregated[material.id].cost += matCost;
            } else {
              totalAggregated[material.id] = { 
                ...material,
                quantity: matQty,
                cost: matCost
              };
            }
          });
        }
      }
    }

    // 设置成本分析数据
    setCostAnalysis({
      products: productCostAnalysis,
      totalProductionCost: totalProductionCost,
      totalProductionValue: totalProductionValue,
      totalProfit: totalProductionValue - totalProductionCost,
      overallProfitMargin: totalProductionValue > 0 ? ((totalProductionValue - totalProductionCost) / totalProductionValue * 100) : 0
    });

    // 处理最终原料数据
    const finalMaterials = Object.values(totalAggregated).map(material => {
      const ingredientDetails = ingredientsMap.get(material.name);
      
      if (!ingredientDetails) {
        return {
          ...material,
          currentStockInGrams: 0,
          purchaseSuggestion: material.quantity,
          purchaseUnit: 'N/A',
          unit: 'g',
          isDeficit: true,
          stockCoverage: 0
        };
      }
      
      const stockByPost = ingredientDetails.stockByPost || {};
      let totalStockByUnit = 0;
      if (typeof stockByPost === 'object' && stockByPost !== null) {
        totalStockByUnit = Object.values(stockByPost).reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
      }

      const norms = ingredientDetails.norms || 1;
      const currentStockInGrams = totalStockByUnit * norms;
      const requiredGrams = material.quantity;
      const deficitGrams = requiredGrams - currentStockInGrams;
      
      const purchaseSuggestion = deficitGrams > 0 ? Math.ceil(deficitGrams / norms) : 0;
      const stockCoverage = currentStockInGrams > 0 ? Math.min((currentStockInGrams / requiredGrams) * 100, 100) : 0;

      return {
        ...material,
        currentStockInGrams,
        purchaseSuggestion,
        purchaseUnit: ingredientDetails.unit,
        isDeficit: deficitGrams > 0,
        stockCoverage,
      };
    }).sort((a, b) => b.cost - a.cost);

    setAggregatedMaterials(finalMaterials);
    setShowResults(true);
    
    if (showLoader) {
      setTimeout(() => setIsCalculating(false), 500);
    }
  }, [quantities, breadTypes, doughRecipesMap, fillingRecipesMap, ingredients, ingredientsMap, loading, materialMultiplier]);

  // 当显示结果时，自动重新计算（用于数据更新）
  useEffect(() => {
    if (showResults) {
      calculateTotalRawMaterials(false);
    }
  }, [breadTypes, ingredients, showResults, calculateTotalRawMaterials]);

  return {
    quantities,
    setQuantities,
    aggregatedMaterials,
    costAnalysis,
    showResults,
    isCalculating,
    materialMultiplier,
    handleQuantityChange,
    handleClearSpecificQuantity,
    handleResetQuantities,
    calculateTotalRawMaterials,
    setMaterialMultiplier: handleMultiplierChange
  };
};