import React, { useContext } from 'react';
import { Card, CardContent, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography } from '@mui/material';
import { DataContext } from './DataContext.jsx';

const DecorationInfo = ({ decorations, costBreakdown }) => {
  const { ingredientsMap } = useContext(DataContext);
  const decorationDetails = costBreakdown?.decorationsDetails;

  if (!decorations || decorations.length === 0) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
            装饰信息
          </Typography>
          <Typography variant="body2" sx={{ fontFamily: 'Inter, sans-serif' }}>
            此面包没有额外装饰
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Typography variant="h5" component="h2" sx={{ mb: 3, fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
          装饰信息
        </Typography>
        
        <Box>
          <Typography variant="subtitle1" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 500 }}>
            装饰配料
          </Typography>
          
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
                {decorations.map(decoration => {
                  const ingredient = ingredientsMap.get((decoration.ingredientId || '').trim());
                  const costDetails = decorationDetails?.details?.[decoration.ingredientId];
                  const unitCost = costDetails?.unitCost || 0;
                  const totalCost = costDetails?.cost || 0;

                  return (
                    <TableRow key={decoration.ingredientId}>
                      <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        {ingredient?.name || decoration.ingredientId}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        {decoration.quantity}{decoration.unit || ingredient?.min || 'g'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        ¥{unitCost.toFixed(4)}/{decoration.unit || ingredient?.min || 'g'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif' }}>
                        ¥{totalCost.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow>
                  <TableCell component="th" scope="row" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    装饰总计
                  </TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right"></TableCell>
                  <TableCell align="right" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>
                    ¥{(decorationDetails?.totalCost || 0).toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DecorationInfo;
  