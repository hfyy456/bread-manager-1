import React, { useState, useContext, useMemo } from 'react';
import { Card, CardContent, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Tooltip, IconButton, Collapse } from '@mui/material';
import { ExpandMore, ExpandLess, InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { DataContext } from './DataContext.jsx';

const FillingInfo = ({ fillings, costBreakdown }) => {
  const { fillingRecipesMap, ingredientsMap, loading } = useContext(DataContext);
  const [expandedRows, setExpandedRows] = useState({});

  const hasFillings = useMemo(() => fillings && fillings.length > 0, [fillings]);

  if (loading) return null;

  if (!hasFillings) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>馅料信息</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>此面包没有馅料。</Typography>
        </CardContent>
      </Card>
    );
  }

  const handleExpandClick = (id) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, mr: 1 }}>馅料信息</Typography>
          <Tooltip title="查看馅料配方操作指南">
            <IconButton component={Link} to="/operation-guide#filling-recipes" size="small" sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Box>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          馅料在产品中总成本: <strong>¥{(costBreakdown?.fillingsCost || 0).toFixed(2)}</strong>
        </Typography>

        {fillings.map(fillingUsage => {
            const detail = costBreakdown.fillingsDetails?.find(d => d.id === fillingUsage.fillingId);
            if (!detail) return <Typography key={fillingUsage.fillingId} color="error">未找到馅料成本详情: {fillingUsage.fillingId}</Typography>;

            const recipe = detail.isDirectIngredient ? null : fillingRecipesMap.get(fillingUsage.fillingId);
            const ingredient = detail.isDirectIngredient ? ingredientsMap.get(fillingUsage.fillingId) : null;

            const name = recipe?.name || ingredient?.name || fillingUsage.fillingId;
            const isExpanded = expandedRows[fillingUsage.fillingId] || false;

            return (
                 <Paper key={fillingUsage.fillingId} sx={{ p: 2, mb: 2, borderLeft: '3px solid', borderColor: 'secondary.main' }} variant="outlined">
                    <Box onClick={() => recipe && handleExpandClick(fillingUsage.fillingId)} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: recipe ? "pointer" : "default" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {name} {ingredient ? '(直接原料)' : ''}
                        </Typography>
                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                            <Typography variant="body1" sx={{mr:1}}>
                                用量: {fillingUsage.quantity}g | 成本: ¥{detail.costInProduct.toFixed(2)}
                            </Typography>
                           {recipe && (
                            <IconButton size="small">
                                {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                           )}
                        </Box>
                    </Box>
                    {recipe && (
                        <Collapse in={isExpanded}>
                           <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1}}>
                                (配方批量: {recipe.yield}g, 批量成本: ¥{(detail.batchCalculation?.cost || 0).toFixed(2)})
                            </Typography>
                           <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                                   <TableCell sx={{fontWeight: 'bold'}}>配料</TableCell>
                                   <TableCell align="right" sx={{fontWeight: 'bold'}}>产品用量</TableCell>
                                   <TableCell align="right" sx={{fontWeight: 'bold'}}>产品成本</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                                 {Object.entries(detail.ingredientCostsInProduct || {}).map(([ingId, data]) => {
                                   const ing = ingredientsMap.get(ingId.trim());
                                   return (
                                     <TableRow key={ingId}>
                                       <TableCell>{ing?.name || ingId}</TableCell>
                                       <TableCell align="right">{data.quantity.toFixed(2)}g</TableCell>
                                       <TableCell align="right">¥{data.cost.toFixed(2)}</TableCell>
                  </TableRow>
                                   )
                                 })}
              </TableBody>
            </Table>
          </TableContainer>
                        </Collapse>
        )}
                 </Paper>
            )
        })}
      </CardContent>
    </Card>
  );
};

export default FillingInfo; 