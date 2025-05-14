import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton, Typography } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { doughRecipes } from '../data/doughRecipes';
import { findIngredientById, calculatePreFermentCost, calculateDoughCost } from '../utils/calculator'; // 新增导入

const DoughInfo = ({ doughId, doughWeight, costBreakdown }) => {
  const [expandedPreFerments, setExpandedPreFerments] = useState({});
  const doughRecipe = doughRecipes.find(r => r.id === doughId);

  useEffect(() => {
    // 初始化预发酵种展开状态
    const preFermentState = {};
    if (doughRecipe && doughRecipe.preFerments && doughRecipe.preFerments.length > 0) {
      doughRecipe.preFerments.forEach(preFerment => {
        preFermentState[preFerment.id] = false;
      });
    }
    setExpandedPreFerments(preFermentState);
  }, [doughRecipe]);

  const handlePreFermentToggle = (preFermentId) => {
    setExpandedPreFerments(prev => ({
      ...prev,
      [preFermentId]: !prev[preFermentId]
    }));
  };

  if (!doughRecipe) {
    return null;
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          面团信息
        </Typography>
        
        <Box>
          <Typography variant="subtitle1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
            {doughRecipe.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: 'Inter, sans-serif' }}>
            使用量: {doughWeight}g
          </Typography>
          
          {/* 预发酵种信息 */}
          {doughRecipe.preFerments && doughRecipe.preFerments.length > 0 && (
            <Box sx={{ mt: 3, border: '1px solid #e0e0e0', borderRadius: '4px', p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                预发酵种
                <IconButton 
                  size="small" 
                  onClick={() => setExpandedPreFerments(prev => 
                    Object.fromEntries(Object.entries(prev).map(([key]) => [key, true]))
                  )}
                >
                  <ExpandMore />
                </IconButton>
                <IconButton 
                  size="small" 
                  onClick={() => setExpandedPreFerments(prev => 
                    Object.fromEntries(Object.entries(prev).map(([key]) => [key, false]))
                  )}
                >
                  <ExpandLess />
                </IconButton>
              </Typography>
              {doughRecipe.preFerments.map(preFerment => (
                <Box key={preFerment.id} sx={{ mt: 2, borderBottom: '1px solid #e0e0e0', pb: 2, '&:last-child': { borderBottom: 'none' } }}>
                  <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                    {preFerment.name}
                    <IconButton 
                      size="small" 
                      onClick={() => handlePreFermentToggle(preFerment.id)}
                    >
                      {expandedPreFerments[preFerment.id] ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter, sans-serif' }}>
                    成本: ¥{calculatePreFermentCost(preFerment).toFixed(2)}
                  </Typography>
                  
                  <Collapse in={expandedPreFerments[preFerment.id]} timeout="auto" unmountOnExit>
                    <TableContainer component={Paper} sx={{ mt: 2 }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>配料</TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>用量</TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>单位成本</TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>总成本</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {preFerment.ingredients.map(ing => {
                            const ingredient = findIngredientById(ing.ingredientId);
                            const unitCost = ingredient?.pricePerUnit || 0;
                            const totalCost = unitCost * ing.quantity;
                            return (
                              <TableRow key={ing.ingredientId}>
                                <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ingredient?.name || '未知配料'}
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                  {ing.quantity}{ingredient?.unit || ''}
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                  ¥{unitCost.toFixed(4)}/{ingredient?.unit || ''}
                                </TableCell>
                                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                                  ¥{totalCost.toFixed(2)}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          <TableRow>
                            <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                              总计
                            </TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                              {preFerment.yield}{preFerment.unit || 'g'}
                            </TableCell>
                            <TableCell align="right"></TableCell>
                            <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                              ¥{calculatePreFermentCost(preFerment).toFixed(2)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Box>
              ))}
            </Box>
          )}
          
          {/* 主面团配料 */}
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>配料</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>用量</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>单位成本</TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>总成本</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {doughRecipe.ingredients.map(ing => {
                  const ingredient = findIngredientById(ing.ingredientId);
                  const unitCost = ingredient?.pricePerUnit || 0;
                  const totalCost = unitCost * ing.quantity;
                  return (
                    <TableRow key={ing.ingredientId}>
                      <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        {ingredient?.name || '未知配料'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        {ing.quantity}{ingredient?.unit || ''}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        ¥{unitCost.toFixed(4)}/{ingredient?.unit || ''}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        ¥{totalCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    主面团总计
                  </TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    {doughRecipe.yield}g
                  </TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    ¥{(calculateDoughCost(doughRecipe) - (doughRecipe.preFerments?.reduce((total, preFerment) => 
                      total + calculatePreFermentCost(preFerment), 0) || 0)).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
          
          <Typography variant="body2" sx={{ mt: 3, fontFamily: 'Inter, sans-serif' }}>
            面团单位成本: ¥{(calculateDoughCost(doughRecipe)/doughRecipe.yield).toFixed(4)}/g
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
            此面包面团成本: ¥{(costBreakdown?.dough?.cost || 0).toFixed(2)}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DoughInfo;
  