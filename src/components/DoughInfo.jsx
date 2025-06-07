import React, { useState, useEffect, useContext } from "react";
import {
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Collapse,
  IconButton,
  Typography,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { ExpandMore, ExpandLess, InfoOutlined as InfoOutlinedIcon } from "@mui/icons-material";
import { Link } from 'react-router-dom';
import { DataContext } from './DataContext.jsx';
import { adjustCost } from "../utils/calculator";

const DoughInfo = ({ doughId, doughWeight, costBreakdown }) => {
  const { doughRecipesMap, ingredientsMap, loading } = useContext(DataContext);
  const [expandedPreFerments, setExpandedPreFerments] = useState({});

  if (loading || !doughRecipesMap.size || !ingredientsMap.size) {
    return <CircularProgress />;
  }

  const doughRecipe = doughRecipesMap.get(doughId);
  if (!doughRecipe) {
    return <Typography color="error">Dough recipe with ID "{doughId}" not found.</Typography>;
  }
  
  const doughDetails = costBreakdown?.doughDetails;
  const productDoughTotalCost = doughDetails?.costInProduct ?? 0;
  const ingredientCostsInProduct = doughDetails?.ingredientCostsInProduct || {};

  useEffect(() => {
    const preFermentState = {};
    doughRecipe.preFerments?.forEach((preFerment) => {
        preFermentState[preFerment.id] = false;
      });
    setExpandedPreFerments(preFermentState);
  }, [doughRecipe]);

  const handlePreFermentToggle = (preFermentId) => {
    setExpandedPreFerments((prev) => ({...prev, [preFermentId]: !prev[preFermentId]}));
  };

  const hasValidPreFerments = doughRecipe.preFerments && doughRecipe.preFerments.length > 0;

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        {/* Header */}
        <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mr: 1 }}>
          面团信息: {doughRecipe.name}
        </Typography>
          <Tooltip title="查看面团配方操作指南">
            <IconButton component={Link} to="/operation-guide#dough-recipes" size="small" sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Cost Summary for this Dough */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="body1" gutterBottom>
            产品中使用面团量: <strong>{doughWeight.toFixed(1)}g</strong>
          </Typography>
          <Typography variant="body1">
            此面团在产品中总成本: <strong>¥{adjustCost(productDoughTotalCost).toFixed(2)}</strong>
            {doughRecipe.yield > 0 && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ ml: 1}}>
                    (面团配方批量: {doughRecipe.yield}g, 批量成本 ¥{adjustCost(doughDetails?.cost ?? 0).toFixed(2)})
                </Typography>
            )}
          </Typography>
        </Box>

        {/* Main Ingredients Table */}
        <Typography variant="h6" sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mb: 2, mt: 3 }}>
          物料明细 (基于产品最终用量)
        </Typography>
        <TableContainer component={Paper} sx={{ mb: hasValidPreFerments ? 3 : 0}}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>配料名称</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>产品用量</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>产品成本</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(ingredientCostsInProduct).map(([ingId, data]) => {
                    const ingredient = ingredientsMap.get(ingId.trim());
                    return (
                        <TableRow key={ingId}>
                            <TableCell>{ingredient?.name || ingId}</TableCell>
                            <TableCell align="right">{data.quantity.toFixed(2)}g</TableCell>
                            <TableCell align="right">¥{data.cost.toFixed(2)}</TableCell>
                    </TableRow>
                    );
                })}
              </TableBody>
            </Table>
          </TableContainer>

        {/* Pre-ferments section */}
        {hasValidPreFerments && (
          <Box>
            <Typography variant="h6" component="h3" sx={{ fontWeight: 600, mb: 2, mt:4 }}>
              预发酵面团 (酵种、烫种等)
            </Typography>
            {doughRecipe.preFerments.map((preFermentUsage) => {
              const pfRecipe = doughRecipesMap.get((preFermentUsage.id || '').trim());
              if (!pfRecipe) return <Typography key={`missing-pf-${preFermentUsage.id}`}>未找到预发酵面团: {preFermentUsage.id}</Typography>; 
              
              const isExpanded = expandedPreFerments[preFermentUsage.id] || false;
              const pfCostInProduct = doughDetails?.preFermentCostsInProduct?.[preFermentUsage.id];

              return (
                <Paper key={preFermentUsage.id} sx={{ p: 2, mb: 2, borderLeft: '3px solid', borderColor: 'primary.main' }} variant="outlined">
                  <Box onClick={() => handlePreFermentToggle(preFermentUsage.id)} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                      {pfRecipe.name}
                    </Typography>
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                      {pfCostInProduct && (
                        <Typography variant="body1" sx={{mr:1}}>
                            用量: {pfCostInProduct.quantity.toFixed(1)}g | 成本: ¥{pfCostInProduct.cost.toFixed(2)}
          </Typography>
                      )}
                        <IconButton size="small">
                        {isExpanded ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                    </Box>
                  </Box>
                  <Collapse in={isExpanded}>
                     <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 1}}>
                        (配方批量: {pfRecipe.yield}g, 批量用量: {preFermentUsage.quantity}g)
          </Typography>
                    <TableContainer component={Paper} variant="outlined" sx={{mt: 1}}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{fontWeight: 'bold'}}>配料</TableCell>
                            <TableCell align="right" sx={{fontWeight: 'bold'}}>批量用量 ({pfRecipe.yield}g)</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {pfRecipe.ingredients.map((ing) => {
                            const ingredient = ingredientsMap.get((ing.ingredientId || '').trim());
                            return (
                            <TableRow key={ing.ingredientId}>
                                <TableCell>{ingredient?.name || ing.ingredientId}</TableCell>
                                <TableCell align="right">{ing.quantity}{ing.unit || 'g'}</TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </Collapse>
                </Paper>
              );
            })}
        </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default DoughInfo;
