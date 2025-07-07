import React, { createContext, useState, useEffect, useCallback } from 'react';

export const DataContext = createContext();

const arrayToMap = (array, keyField = 'id') => {
  if (!Array.isArray(array)) return new Map();
  return new Map(array.map(item => {
    const key = item[keyField];
    return [typeof key === 'string' ? key.trim() : key, item];
  }));
};

export const DataProvider = ({ children }) => {
  const [breadTypes, setBreadTypes] = useState([]);
  const [fillingRecipes, setFillingRecipes] = useState([]);
  const [doughRecipes, setDoughRecipes] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  
  const [breadsMap, setBreadsMap] = useState(new Map());
  const [fillingRecipesMap, setFillingRecipesMap] = useState(new Map());
  const [doughRecipesMap, setDoughRecipesMap] = useState(new Map());
  const [ingredientsMap, setIngredientsMap] = useState(new Map());

  const [dataLoaded, setDataLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        fetch('/api/bread-types/list', { method: 'POST' }),
        fetch('/api/filling-recipes/list', { method: 'POST' }),
        fetch('/api/dough-recipes/list', { method: 'POST' }),
        fetch('/api/ingredients/list', { method: 'POST' })
      ]);

      const successfulResults = [];
      const failedReasons = [];

      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value.ok) {
          successfulResults[index] = result.value.json();
        } else {
          const reason = result.reason || `HTTP error! status: ${result.value?.status}`;
          failedReasons.push(`API call ${index + 1} failed: ${reason}`);
        }
      });
      
      if (failedReasons.length > 0) {
        throw new Error(failedReasons.join('; '));
      }

      const [breadTypesData, fillingRecipesData, doughRecipesData, ingredientsData] = await Promise.all(successfulResults);

      const a_breadTypes = breadTypesData.data || [];
      const a_fillingRecipes = fillingRecipesData.data || [];
      const a_doughRecipes = doughRecipesData.data || [];
      let a_ingredients = ingredientsData.data || [];

      // Fetch inventory state separately
      try {
          const inventoryRes = await fetch('/api/inventory/state');
          const inventoryResult = await inventoryRes.json();
          if (inventoryRes.ok && inventoryResult.success) {
              const inventoryMap = new Map(inventoryResult.data.map(item => [item.ingredientId, item.stockByPost]));
              
              // Merge inventory data into ingredients list
              a_ingredients = a_ingredients.map(ing => {
                  if (inventoryMap.has(ing.name)) {
                      return { ...ing, stockByPost: inventoryMap.get(ing.name) };
                  }
                  return ing;
              });
          } else {
              console.warn("Could not fetch inventory state:", inventoryResult.message);
          }
      } catch (invErr) {
          console.error("Error fetching inventory state:", invErr);
          // Decide if this should be a critical error. For now, we'll just log it.
      }

      setBreadTypes(a_breadTypes);
      setFillingRecipes(a_fillingRecipes);
      setDoughRecipes(a_doughRecipes);
      setIngredients(a_ingredients);
      
      setBreadsMap(arrayToMap(a_breadTypes, 'id'));
      setFillingRecipesMap(arrayToMap(a_fillingRecipes, 'name'));
      setDoughRecipesMap(arrayToMap(a_doughRecipes, 'name'));
      setIngredientsMap(arrayToMap(a_ingredients, 'name'));
      
      setDataLoaded(true);

    } catch (err) {
      console.error("Failed to fetch initial data:", err);
      setError(err.message);
      setDataLoaded(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const updateIngredientStock = useCallback(async (updates) => {
    // updates should be an array of objects: [{ ingredientName, location, quantity, unit }]
    
    // There should only be one location/postId for a given receiving transaction
    if (!updates || updates.length === 0) {
      return { success: true }; // Nothing to update
    }
    const postId = updates[0].location; 
    
    const stocks = updates.map(update => {
      const ingredient = ingredientsMap.get(update.ingredientName);
      if (!ingredient) {
        // This case should ideally be handled before calling, but as a safeguard:
        console.error(`Ingredient not found in map: ${update.ingredientName}`);
        return null;
      }
      return {
        ingredientId: ingredient._id,
        quantity: parseFloat(update.quantity) || 0,
        unit: update.unit,
        ingredientName: update.ingredientName // for error reporting
      };
    }).filter(Boolean); // Filter out any nulls from not found ingredients

    if (stocks.length === 0) {
      return { success: false, message: "没有有效的原料可供更新。" };
    }

    const body = { postId, stocks };

    try {
      const response = await fetch('/api/inventory/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        // The backend might return specific errors in an 'errors' array
        const errorMessage = result.errors ? result.errors.join(', ') : result.message;
        throw new Error(errorMessage || 'Failed to update inventory on the server.');
      }
      
      // Optimistically update local state
      setIngredients(prevIngredients => {
        const newIngredients = [...prevIngredients];
        const newIngredientsMap = new Map(ingredientsMap);

        updates.forEach(update => {
          const ingredientToUpdate = newIngredientsMap.get(update.ingredientName);
          if (ingredientToUpdate) {
            const newStockByPost = { ...(ingredientToUpdate.stockByPost || {}) };
            
            // Backend overwrites the stock for the post, so we do the same for optimistic update
              newStockByPost[update.location] = {
                quantity: parseFloat(update.quantity),
                unit: update.unit,
              lastUpdated: new Date().toISOString(),
              };

            const updatedIngredient = { ...ingredientToUpdate, stockByPost: newStockByPost };
            
            // update the map
            newIngredientsMap.set(update.ingredientName, updatedIngredient);

            // update the array
            const indexInArray = newIngredients.findIndex(ing => ing.name === update.ingredientName);
            if (indexInArray !== -1) {
              newIngredients[indexInArray] = updatedIngredient;
            }
          }
        });
        
        // Update the state that will trigger re-render
        setIngredientsMap(newIngredientsMap);
        return newIngredients;
      });

      return { success: true, message: result.message };
    } catch (error) {
      console.error("Failed to update ingredient stock:", error);
      return { success: false, message: error.message };
    }
  }, [ingredientsMap]);

  return (
    <DataContext.Provider value={{ 
        breadTypes, 
        fillingRecipes, 
        doughRecipes, 
        ingredients,
        breadsMap,
        fillingRecipesMap,
        doughRecipesMap,
        ingredientsMap,
        dataLoaded,
        loading,
        error,
        updateIngredientStock,
        refreshData: fetchData
      }}>
      {children}
    </DataContext.Provider>
  );
}; 