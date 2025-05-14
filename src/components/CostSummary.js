import React from 'react';
import { Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';

const CostSummary = ({ costBreakdown }) => {
  if (!costBreakdown) {
    return null;
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          成本汇总
        </Typography>
        
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>项目</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>重量</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>单位成本</TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>总成本</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                  面团
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  {costBreakdown?.dough?.weight || 0}g
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  {costBreakdown?.dough?.cost ? `¥${(costBreakdown.dough.cost/costBreakdown.dough.weight).toFixed(4)}/g` : '-'}
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  ¥{(costBreakdown?.dough?.cost || 0).toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                  馅料
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  {costBreakdown?.fillings?.details.reduce((total, filling) => total + filling.weight, 0) || 0}g
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  -
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  ¥{(costBreakdown?.fillings?.totalCost || 0).toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
                  装饰
                </TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                  ¥{(costBreakdown?.decorations?.totalCost || 0).toFixed(2)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '1.1rem' }}>
                  总计
                </TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                  {costBreakdown?.totalWeight || 0}g
                </TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, fontSize: '1.1rem' }}>
                  ¥{(costBreakdown?.total || 0).toFixed(2)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default CostSummary;
  