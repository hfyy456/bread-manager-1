import React from "react";
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  TableFooter,
  Tooltip,
  IconButton,
} from "@mui/material";
import { adjustCost } from "../utils/calculator";
import { Link } from 'react-router-dom';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';

const CostSummary = ({ costBreakdown, bread, aggregatedMaterials }) => {
  if (!costBreakdown || !bread) {
    return null;
  }

  const formatCurrency = (value) => {
    let numValue = Number(value);
    if (!Number.isFinite(numValue)) {
      numValue = 0;
    }
    return `¥${adjustCost(numValue).toFixed(2)}`;
  };
  const formatWeight = (value) =>
    `${(Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2)}g`;
  
  const formatUnitCost = (cost, weight) => {
    const numCost = Number(cost);
    const numWeight = Number(weight);
    if (
      numWeight === 0 ||
      !Number.isFinite(numCost) ||
      !Number.isFinite(numWeight) ||
      numCost < 0 ||
      numWeight < 0
    ) {
      return "-";
    }
    return `¥${(numCost / numWeight).toFixed(4)}/g`;
  };

  const productDoughWeight = Number(bread.doughWeight) || 0;
  const productDoughCost = Number(costBreakdown.doughCost) || 0;
  const doughUnitCost = formatUnitCost(productDoughCost, productDoughWeight);

  const productFillingsCost = Number(costBreakdown.fillingsCost) || 0;
  let totalFillingsWeightInProduct = 0;
  costBreakdown.fillingsDetails?.forEach(fd => {
    totalFillingsWeightInProduct += (Number(fd.quantityInProduct) || 0);
  });
  const fillingsUnitCost = formatUnitCost(productFillingsCost, totalFillingsWeightInProduct);

  const productDecorationsCost = Number(costBreakdown.decorationsDetails?.totalCost) || 0;
  const totalDecorationsWeightInProduct = Number(costBreakdown.decorationsDetails?.totalWeight) || 0;
  const decorationsUnitCost = formatUnitCost(productDecorationsCost, totalDecorationsWeightInProduct);

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          component="h2"
            sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600, mr: 1 }}
        >
          成本汇总 (基于产品最终用量)
        </Typography>
          <Tooltip title="查看操作指南">
            <IconButton component={Link} to="/operation-guide#cost-summary" size="small" sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  项目
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  产品中用量
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  单位成本
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: 600 }}
                >
                  总成本 (产品中)
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Dough Section */}
              {productDoughCost > 0 && (
                <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                  <TableCell
                    component="th"
                    scope="row"
                    sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                  >
                    面团 ({costBreakdown.doughDetails?.recipeName || bread.doughId || 'N/A'})
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {formatWeight(productDoughWeight)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {doughUnitCost}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                  >
                    {formatCurrency(productDoughCost)}
                  </TableCell>
                </TableRow>
              )}
              {/* Further dough breakdown can be added here if doughDetails has more depth */}
              {/* For example, iterating over pre-ferments if structured in doughDetails */}


              {/* Fillings Section */}
              {productFillingsCost > 0 && (
                <>
                  <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      馅料 (汇总)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatWeight(totalFillingsWeightInProduct)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {fillingsUnitCost}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      {formatCurrency(productFillingsCost)}
                    </TableCell>
                  </TableRow>
                  {costBreakdown.fillingsDetails?.map(
                    (filling, index) => (
                      <TableRow key={`fillingType-${index}-${filling.id}`}>
                        <TableCell sx={{ pl: 4, fontFamily: "Inter, sans-serif", fontWeight: 400 }}>
                          {filling.recipeName || filling.id}
                          {filling.isDirectIngredient && " (直接原料)"}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatWeight(filling.quantityInProduct)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatUnitCost(filling.costInProduct, filling.quantityInProduct)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatCurrency(filling.costInProduct)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </>
              )}

              {/* Decorations Section */}
              {productDecorationsCost > 0 && (
                <>
                  <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      装饰 (汇总)
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatWeight(totalDecorationsWeightInProduct)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {decorationsUnitCost}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      {formatCurrency(productDecorationsCost)}
                    </TableCell>
                  </TableRow>
                  {costBreakdown.decorationsDetails?.details?.map(
                    (deco, index) => (
                      <TableRow key={`deco-${index}-${deco.ingredientId}`}>
                        <TableCell sx={{ pl: 4, fontFamily: "Inter, sans-serif" }}>
                          {deco.name || deco.ingredientId}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatWeight(deco.quantity)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                           {formatUnitCost(deco.cost, deco.quantity)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatCurrency(deco.cost)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </>
              )}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ backgroundColor: "grey.200" }}>
                <TableCell
                  colSpan={3}
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: "bold" }}
                >
                  产品总成本
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: "bold" }}
                >
                  {formatCurrency(costBreakdown.totalCost)}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
         {costBreakdown.errors && costBreakdown.errors.length > 0 && (
          <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'rgba(255, 0, 0, 0.05)', borderRadius: '4px' }}>
            <Typography variant="subtitle2" color="error.dark" sx={{fontWeight: 'bold', mb: 0.5}}>
              成本计算警告:
            </Typography>
            <ul style={{margin:0, paddingLeft: '20px', fontSize: '0.8rem'}}>
              {costBreakdown.errors.map((err, i) => (
                <li key={i}><Typography variant="caption" color="error.main">{err}</Typography></li>
              ))}
            </ul>
          </Box>
        )}

        {/* All Raw Materials Summary Section */}
        {aggregatedMaterials && aggregatedMaterials.length > 0 && (
          <Box sx={{ mt: 4 }}>
            <Typography
              variant="h6"
              component="h3"
              sx={{ mb: 2, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
            >
              产品物料用量汇总 (基础单位)
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      原料名称
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      总用量
                    </TableCell>
                    <TableCell
                      sx={{
                        fontFamily: "Inter, sans-serif",
                        fontWeight: 600,
                      }}
                    >
                      单位
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aggregatedMaterials.map((material, index) => (
                    <TableRow key={`${material.id}-${index}`}>
                      <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>
                        {material.id} {/* 'id' from generateAggregatedRawMaterials is the ingredient name */}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {(Number(material.quantity) || 0).toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>
                        {material.unit} {/* This is the base unit */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                 {/* Optional: Footer for total weight if meaningful (all same units or for reference) */}
                 <TableFooter>
                    <TableRow sx={{ "& td, & th": { fontWeight: "bold", borderTop: "2px solid rgba(224, 224, 224, 1)"} }}>
                        <TableCell>总计原料种类</TableCell>
                        <TableCell align="right">{aggregatedMaterials.length}</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                 </TableFooter>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CostSummary;
