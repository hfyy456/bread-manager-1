import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Typography, CircularProgress, Paper, Button, Box, Tooltip, IconButton } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { breadTypes } from '../data/breadTypes';
import { getBreadCostBreakdown, generateAggregatedRawMaterials } from '../utils/calculator';
import DoughInfo from './DoughInfo';
import FillingInfo from './FillingInfo';
import DecorationInfo from './DecorationInfo';
import CostSummary from './CostSummary';

const BreadDetails = () => {
  const { id } = useParams();
  const [bread, setBread] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [aggregatedMaterials, setAggregatedMaterials] = useState([]);
  const [loadingBread, setLoadingBread] = useState(true);

  const [allIngredientsData, setAllIngredientsData] = useState([]);
  const [loadingIngredients, setLoadingIngredients] = useState(true);
  const [errorIngredients, setErrorIngredients] = useState(null);

  useEffect(() => {
    const fetchIngredients = async () => {
      setLoadingIngredients(true);
      setErrorIngredients(null);
      try {
        const response = await fetch('/api/ingredients/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const result = await response.json();
        if (result.success && Array.isArray(result.data)) {
          setAllIngredientsData(result.data);
        } else {
          throw new Error(result.message || 'Failed to load ingredients or data format is incorrect.');
        }
      } catch (err) {
        console.error("Error fetching ingredients for BreadDetails:", err);
        setErrorIngredients(err.message);
        setAllIngredientsData([]);
      } finally {
        setLoadingIngredients(false);
      }
    };
    fetchIngredients();
  }, []);

  useEffect(() => {
    setLoadingBread(true);
    const breadData = breadTypes.find(b => b.id === id);
    
    if (breadData && !loadingIngredients && allIngredientsData.length > 0) {
      setBread(breadData);
      try {
        const breakdown = getBreadCostBreakdown(breadData, allIngredientsData);
      setCostBreakdown(breakdown);
        const aggMaterials = generateAggregatedRawMaterials(breadData, allIngredientsData);
      setAggregatedMaterials(aggMaterials);
      } catch (calcError) {
        console.error("Error during cost calculation in BreadDetails:", calcError);
        setErrorIngredients(prevError => prevError ? `${prevError}\nCalculation error: ${calcError.message}` : `Calculation error: ${calcError.message}`); // Append to existing ingredient error or set new
        setCostBreakdown(null);
        setAggregatedMaterials([]);
      }
    } else if (breadData && (loadingIngredients || allIngredientsData.length === 0)){
      // Ingredients are still loading or empty after loading, set bread but wait for ingredients for calculations
      setBread(breadData);
      setCostBreakdown(null); // Clear previous breakdown if any
      setAggregatedMaterials([]); // Clear previous materials if any
    } else {
      setBread(null);
      setCostBreakdown(null);
      setAggregatedMaterials([]);
    }
    setLoadingBread(false);
  }, [id, loadingIngredients, allIngredientsData]); // Rerun when id changes or ingredients are loaded

  if (loadingBread || loadingIngredients) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {loadingIngredients ? '正在加载原料数据...' : (loadingBread ? '正在加载面包详情...' : '准备中...')}
        </Typography>
      </Container>
    );
  }

  if (errorIngredients) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3, textAlign: 'center', backgroundColor: 'error.light' }}>
          <Typography variant="h5" color="error.contrastText">加载面包详情时出错</Typography>
          <Typography color="error.contrastText" sx={{ mt: 1, whiteSpace: 'pre-line' }}>
            {errorIngredients}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()} sx={{mt: 2}}>
            刷新页面
          </Button>
        </Paper>
      </Container>
    );
  }
  
  if (!bread) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h4">未找到此面包配方</Typography>
      </Container>
    );
  }

  // Only render children if all data is available and calculations likely succeeded (costBreakdown is not null)
  const canRenderDetails = bread && !loadingBread && !loadingIngredients && !errorIngredients && costBreakdown && allIngredientsData.length > 0;

  return (
    <Container maxWidth="xl">
      <Box display="flex" alignItems="center" sx={{ mt: 4 }}>
        <Typography variant="h3" component="h1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, mr: 1 }}>
        {bread.name}
      </Typography>
        <Tooltip title="查看面包产品操作指南">
          <IconButton component={Link} to="/operation-guide#bread-products" size="medium" sx={{ color: 'primary.main' }}>
            <InfoOutlinedIcon fontSize="large"/>
          </IconButton>
        </Tooltip>
      </Box>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, mb: 3, fontFamily: 'Inter, sans-serif' }}>
        {bread.notes || '暂无详细描述。'}
      </Typography>
      
      {canRenderDetails ? (
        <>
      <DoughInfo 
        doughId={bread.doughId}
        doughWeight={bread.doughWeight}
            costBreakdown={costBreakdown} // This should now be calculated with allIngredientsData
            allIngredientsList={allIngredientsData}
      />
      
      <FillingInfo 
        fillings={bread.fillings}
            costBreakdown={costBreakdown} // This should now be calculated with allIngredientsData
            allIngredientsList={allIngredientsData}
      />
      
      <DecorationInfo 
        decorations={bread.decorations}
            costBreakdown={costBreakdown} // This should now be calculated with allIngredientsData
            allIngredientsList={allIngredientsData}
      />
      
      <CostSummary 
        bread={bread}
        costBreakdown={costBreakdown}
        aggregatedMaterials={aggregatedMaterials}
            allIngredientsList={allIngredientsData} // Pass for consistency or if it needs direct access
          />
        </>
      ) : (
        <Box sx={{ textAlign: 'center', my: 5 }}>
           <Typography variant="h6" color="text.secondary">
            {!costBreakdown && !errorIngredients ? '正在计算成本和物料详情...' : '无法显示面包详情，可能缺少原料数据或计算出错。'}
          </Typography>
         {/* If costBreakdown is null but no explicit errorIngredients, it implies calculations are pending or failed silently (though we try to catch it) */} 
        </Box>
      )}
    </Container>
  );
};

export default BreadDetails;
  