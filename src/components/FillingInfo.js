import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Collapse, IconButton, Typography } from '@mui/material';
import { ExpandMore, ExpandLess } from '@mui/icons-material';
import { fillingRecipes } from '../data/fillingRecipes';
import { findIngredientById, calculateSubFillingCost, calculateFillingCost ,findFillingRecipeById} from '../utils/calculator';

const FillingInfo = ({ fillings, costBreakdown }) => {
  const [expandedSubFillings, setExpandedSubFillings] = useState({});
  const fillingRecipesList = fillings?.map(filling => 
    fillingRecipes.find(r => r.id === filling.fillingId)
  ).filter(Boolean) || [];

  useEffect(() => {
    // 初始化子馅料展开状态
    const subFillingState = {};
    fillingRecipesList.forEach(filling => {
      if (filling.subFillings && filling.subFillings.length > 0) {
        filling.subFillings.forEach(subFilling => {
          subFillingState[subFilling.subFillingId] = false;
        });
      }
    });
    setExpandedSubFillings(subFillingState);
  }, [fillingRecipesList]);

  const handleSubFillingToggle = (subFillingId) => {
    setExpandedSubFillings(prev => ({
      ...prev,
      [subFillingId]: !prev[subFillingId]
    }));
  };

  if (!fillings || fillings.length === 0) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            馅料信息
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
            此面包没有馅料
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          馅料信息
        </Typography>
        
        <Box>
          {fillings.map((filling, index) => {
            const recipe = fillingRecipesList[index];
            if (!recipe) return null;
            
            return (
              <Box key={filling.fillingId} sx={{ mb: 4, pb: 4, borderBottom: index < fillings.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                <Typography variant="subtitle1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                  {recipe.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontFamily: 'Inter, sans-serif' }}>
                  使用量: {filling.quantity}{filling.unit}
                </Typography>
                
                {/* 子馅料信息 */}
                {recipe.subFillings && recipe.subFillings.length > 0 && (
                  <Box sx={{ mt: 3, border: '1px solid #e0e0e0', borderRadius: '4px', p: 2 }}>
                    <Typography variant="subtitle2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                      子馅料
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          const newState = {...expandedSubFillings};
                          recipe.subFillings.forEach(sub => {
                            newState[sub.subFillingId] = true;
                          });
                          setExpandedSubFillings(newState);
                        }}
                      >
                        <ExpandMore />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        onClick={() => {
                          const newState = {...expandedSubFillings};
                          recipe.subFillings.forEach(sub => {
                            newState[sub.subFillingId] = false;
                          });
                          setExpandedSubFillings(newState);
                        }}
                      >
                        <ExpandLess />
                      </IconButton>
                    </Typography>
                    {recipe.subFillings.map(subFilling => {
                      const subRecipe = findFillingRecipeById(subFilling.recipeId);
                      return (
                        <Box key={subFilling.subFillingId} sx={{ mt: 2, borderBottom: '1px solid #e0e0e0', pb: 2, '&:last-child': { borderBottom: 'none' } }}>
                          <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500, display: 'flex', alignItems: 'center' }}>
                            {subRecipe?.name || '未知子馅料'}
                            <IconButton 
                              size="small" 
                              onClick={() => handleSubFillingToggle(subFilling.subFillingId)}
                            >
                              {expandedSubFillings[subFilling.subFillingId] ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'Inter, sans-serif' }}>
                            使用量: {subFilling.quantity}{subFilling.unit}
                          </Typography>
                          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                            成本: ¥{calculateSubFillingCost(subFilling).toFixed(2)}
                          </Typography>
                          
                          <Collapse in={expandedSubFillings[subFilling.subFillingId]} timeout="auto" unmountOnExit>
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
                                  {subRecipe?.ingredients.map(ing => {
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
                                  }) || []}
                                  <TableRow>
                                    <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                      总计
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                      {subRecipe?.yield || 0}{subRecipe?.unit || 'g'}
                                    </TableCell>
                                    <TableCell align="right"></TableCell>
                                    <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                                      ¥{calculateFillingCost(subRecipe).toFixed(2)}
                                    </TableCell>
                                  </TableRow>
                                </TableBody>
                              </Table>
                            </TableContainer>
                          </Collapse>
                        </Box>
                      );
                    })}
                  </Box>
                )}
                
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
                      {recipe.ingredients.map(ing => {
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
                          馅料主体总计
                        </TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                          {recipe.yield}{recipe.unit || 'g'}
                        </TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                          ¥{(calculateFillingCost(recipe) - (recipe.subFillings?.reduce((total, sub) => 
                            total + calculateSubFillingCost(sub), 0) || 0)).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      {recipe.subFillings && recipe.subFillings.length > 0 && (
                        <TableRow>
                          <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                            子馅料总计
                          </TableCell>
                          <TableCell align="right"></TableCell>
                          <TableCell align="right"></TableCell>
                          <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                            ¥{(recipe.subFillings.reduce((total, sub) => 
                              total + calculateSubFillingCost(sub), 0)).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                          总馅料成本
                        </TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right"></TableCell>
                        <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                          ¥{calculateFillingCost(recipe).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Typography variant="body2" sx={{ mt: 2, fontFamily: 'Inter, sans-serif' }}>
                  馅料单位成本: ¥{(calculateFillingCost(recipe)/recipe.yield).toFixed(4)}/g
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  此面包使用成本: ¥{(costBreakdown?.fillings?.details[index]?.cost || 0).toFixed(2)}
                </Typography>
              </Box>
            );
          })}
          
          <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="subtitle1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
              所有馅料总成本
            </Typography>
            <Typography variant="body1" sx={{ fontFamily: 'Inter, sans-serif' }}>
              ¥{(costBreakdown?.fillings?.totalCost || 0).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default FillingInfo;
  