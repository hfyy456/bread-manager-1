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
} from "@mui/material";

const CostSummary = ({ costBreakdown }) => {
  if (!costBreakdown) {
    return null;
  }

  const formatCurrency = (value) =>
    `¥${(Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2)}`;
  const formatWeight = (value) =>
    `${(Number.isFinite(Number(value)) ? Number(value) : 0).toFixed(2)}g`;
  const formatUnitCost = (cost, weight) => {
    if (
      Number(weight) === 0 ||
      !Number.isFinite(Number(cost)) ||
      !Number.isFinite(Number(weight))
    ) {
      return "-";
    }
    return `¥${(Number(cost) / Number(weight)).toFixed(4)}/g`;
  };

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography
          variant="h5"
          component="h2"
          sx={{ mb: 3, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
        >
          成本汇总 (基于产品最终用量)
        </Typography>

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
              <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                >
                  面团
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: "Inter, sans-serif" }}
                >
                  {formatWeight(costBreakdown.dough?.weight)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: "Inter, sans-serif" }}
                >
                  {formatUnitCost(
                    costBreakdown.dough?.cost,
                    costBreakdown.dough?.weight
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                >
                  {formatCurrency(costBreakdown.dough?.cost)}
                </TableCell>
              </TableRow>
              {costBreakdown.dough?.mainIngredientsCost > 0 && (() => {
                const totalPreFermentWeight = costBreakdown.dough.preFermentsDetails?.reduce((sum, pf) => sum + (Number(pf.productQuantity) || 0), 0) || 0;
                const mainDoughOnlyWeight = (Number(costBreakdown.dough.weight) || 0) - totalPreFermentWeight;
                return (
                  <TableRow>
                    <TableCell sx={{ pl: 4, fontFamily: "Inter, sans-serif" }}>
                      主面团
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatWeight(mainDoughOnlyWeight)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatUnitCost(costBreakdown.dough.mainIngredientsCost, mainDoughOnlyWeight)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatCurrency(costBreakdown.dough.mainIngredientsCost)}
                    </TableCell>
                  </TableRow>
                );
              })()}
              {costBreakdown.dough?.preFermentsDetails?.map((pf, index) => (
                <TableRow key={`pf-${index}`}>
                  <TableCell
                    sx={{ pl: 4, fontFamily: "Inter, sans-serif" }}
                  >{`${pf.name}`}</TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {formatWeight(pf.productQuantity)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {formatUnitCost(pf.productCost, pf.productQuantity)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {formatCurrency(pf.productCost)}
                  </TableCell>
                </TableRow>
              ))}

              {/* Fillings Section */}
              {costBreakdown.fillings?.totalCost > 0 && (
                <>
                  <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      馅料
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatWeight(costBreakdown.fillings.totalWeight)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatUnitCost(
                        costBreakdown.fillings.totalCost,
                        costBreakdown.fillings.totalWeight
                      )}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      {formatCurrency(costBreakdown.fillings.totalCost)}
                    </TableCell>
                  </TableRow>
                  {costBreakdown.fillings.details?.map(
                    (fillingType, typeIndex) => (
                      <TableRow key={`fillingType-${typeIndex}-${fillingType.name}`}>
                        <TableCell sx={{ pl: 4, fontFamily: "Inter, sans-serif", fontWeight: 400 }}>
                          {fillingType.name}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatWeight(fillingType.weight)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatUnitCost(fillingType.cost, fillingType.weight)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{ fontFamily: "Inter, sans-serif" }}
                        >
                          {formatCurrency(fillingType.cost)}
                        </TableCell>
                      </TableRow>
                    )
                  )}
                </>
              )}

              {/* Decorations Section */}
              {costBreakdown.decorations?.totalCost > 0 && (
                <>
                  <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
                    <TableCell
                      component="th"
                      scope="row"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      装饰
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatWeight(costBreakdown.decorations.totalWeight)}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {formatUnitCost(
                        costBreakdown.decorations.totalCost,
                        costBreakdown.decorations.totalWeight
                      )}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                    >
                      {formatCurrency(costBreakdown.decorations.totalCost)}
                    </TableCell>
                  </TableRow>
                  {costBreakdown.decorations.details?.map((dec, index) => (
                    <TableRow key={`dec-${index}`}>
                      <TableCell
                        sx={{ pl: 4, fontFamily: "Inter, sans-serif" }}
                      >
                        {dec.name}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {formatWeight(dec.productQuantity)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {formatUnitCost(dec.productCost, dec.productQuantity)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {formatCurrency(dec.productCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              )}

              {/* Total Section */}
              <TableRow sx={{ backgroundColor: "rgba(0,0,0,0.08)" }}>
                <TableCell
                  component="th"
                  scope="row"
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                  }}
                >
                  总计
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                  }}
                >
                  {formatWeight(costBreakdown.totalWeight)}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                  }}
                >
                  {formatUnitCost(
                    costBreakdown.total,
                    costBreakdown.totalWeight
                  )}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    fontFamily: "Inter, sans-serif",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                  }}
                >
                  {formatCurrency(costBreakdown.total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>

        {/* All Raw Materials Summary Section */}
        {costBreakdown.allRawMaterialsSummary &&
          costBreakdown.allRawMaterialsSummary.length > 0 && (
            <Box sx={{ mt: 4 }}>
              <Typography
                variant="h6"
                component="h3"
                sx={{ mb: 2, fontFamily: "Inter, sans-serif", fontWeight: 600 }}
              >
                所有物料用量汇总
              </Typography>
              <TableContainer component={Paper}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell
                        sx={{
                          fontFamily: "Inter, sans-serif",
                          fontWeight: 600,
                        }}
                      >
                        物料名称
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
                    {costBreakdown.allRawMaterialsSummary.map(
                      (material, index) => (
                        <TableRow key={`${material.id}-${index}`}>
                          <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>
                            {material.name}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontFamily: "Inter, sans-serif" }}
                          >
                            {(
                              Number(material.totalProductQuantity) || 0
                            ).toFixed(2)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>
                            {material.unit}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                  <TableFooter>
                    <TableRow
                      sx={{
                        "& td, & th": {
                          fontWeight: "bold",
                          borderTop: "2px solid rgba(224, 224, 224, 1)",
                        },
                      }}
                    >
                      <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>
                        总计
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {costBreakdown.allRawMaterialsSummary
                          .reduce(
                            (sum, item) =>
                              sum + (Number(item.totalProductQuantity) || 0),
                            0
                          )
                          .toFixed(2)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: "Inter, sans-serif" }}>
                        {/* Blank for mixed units */}
                      </TableCell>
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
