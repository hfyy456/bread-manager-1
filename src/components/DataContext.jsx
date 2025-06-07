import React, { createContext, useState, useEffect } from 'react';

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

  useEffect(() => {
    const fetchData = async () => {
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
        const a_ingredients = ingredientsData.data || [];

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
    };

    fetchData();
  }, []);

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
        error
      }}>
      {children}
    </DataContext.Provider>
  );
}; 