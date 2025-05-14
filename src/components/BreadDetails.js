import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Typography } from '@mui/material';
import { breadTypes } from '../data/breadTypes';
import { getBreadCostBreakdown } from '../utils/calculator';
import DoughInfo from './DoughInfo';
import FillingInfo from './FillingInfo';
import DecorationInfo from './DecorationInfo';
import CostSummary from './CostSummary';

const BreadDetails = () => {
  const { id } = useParams();
  const [bread, setBread] = useState(null);
  const [costBreakdown, setCostBreakdown] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const breadData = breadTypes.find(b => b.id === id);
    if (breadData) {
      setBread(breadData);
      const breakdown = getBreadCostBreakdown(breadData);
      setCostBreakdown(breakdown);
    }
    setLoading(false);
  }, [id]);

  if (loading || !bread) {
    return (
      <Container>
        <Typography variant="h4" sx={{ mt: 4, fontFamily: 'Inter, sans-serif' }}>
          {loading ? '加载中...' : '未找到此面包配方'}
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl">
      <Typography variant="h3" component="h1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, mt: 4 }}>
        {bread.name}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mt: 2, fontFamily: 'Inter, sans-serif' }}>
        {bread.notes}
      </Typography>
      
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
      
      <CostSummary 
        costBreakdown={costBreakdown}
      />
    </Container>
  );
};

export default BreadDetails;
  