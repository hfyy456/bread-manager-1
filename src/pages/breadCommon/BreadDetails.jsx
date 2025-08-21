import React, { useEffect, useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Container, Typography, CircularProgress, Paper, Button, Box, Tooltip, IconButton } from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { DataContext } from '@components/DataContext.jsx';
import { getBreadCostBreakdown, generateAggregatedRawMaterials } from '@utils/calculator';
import DoughInfo from './components/DoughInfo';
import FillingInfo from './components/FillingInfo';
import DecorationInfo from './components/DecorationInfo';
import AggregatedMaterials from './components/AggregatedMaterials';

const BreadDetails = () => {
  const { id } = useParams();
  const { 
    breadTypes, 
    loading, 
    doughRecipesMap, 
    fillingRecipesMap, 
    ingredientsMap 
  } = useContext(DataContext);

  const [bread, setBread] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [aggregatedMaterials, setAggregatedMaterials] = useState([]);
  const [loadingBread, setLoadingBread] = useState(true);

  useEffect(() => {
    // Wait for all data to be loaded from context
    if (!loading && breadTypes.length > 0 && ingredientsMap.size > 0 && doughRecipesMap.size > 0 && fillingRecipesMap.size > 0) {
    const breadData = breadTypes.find(b => b.id === id);
      setBread(breadData);

      if (breadData) {
        // All calculations now use Maps for efficiency and consistency
        const breakdown = getBreadCostBreakdown(breadData, doughRecipesMap, fillingRecipesMap, ingredientsMap);
      setCostBreakdown(breakdown);
        
        const aggregated = generateAggregatedRawMaterials(breadData, breadTypes, doughRecipesMap, fillingRecipesMap, ingredientsMap);
        setAggregatedMaterials(aggregated);
      }
      setLoadingBread(false); // Finished processing for this bread
    }
  }, [id, loading, breadTypes, doughRecipesMap, fillingRecipesMap, ingredientsMap]);

  if (loading || loadingBread) {
    return <CircularProgress />;
  }
  
  if (!bread) {
    return (
      <Container sx={{ textAlign: 'center', mt: 5 }}>
        <Typography variant="h4">未找到此面包配方</Typography>
      </Container>
    );
  }

  // We can render details as soon as costBreakdown is calculated.
  const canRenderDetails = !!costBreakdown;

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
            costBreakdown={costBreakdown}
      />
      
      <FillingInfo 
        fillings={bread.fillings}
            costBreakdown={costBreakdown}
      />
      
      <DecorationInfo 
        decorations={bread.decorations}
        costBreakdown={costBreakdown}
          />
          
          <AggregatedMaterials materials={aggregatedMaterials} />
        </>
      ) : (
        <Box sx={{ textAlign: 'center', my: 5 }}>
           <Typography variant="h6" color="text.secondary">
            正在计算成本和物料详情...
          </Typography>
        </Box>
      )}
    </Container>
  );
};

export default BreadDetails;
  