import React from 'react';
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
  Tooltip,
  IconButton,
} from '@mui/material';
import { InfoOutlined as InfoOutlinedIcon } from '@mui/icons-material';
import { Link } from 'react-router-dom';

const AggregatedMaterials = ({ materials }) => {
  if (!materials || materials.length === 0) {
    return (
      <Card sx={{ mt: 4 }}>
        <CardContent>
          <Typography variant="h5" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>物料需求汇总</Typography>
          <Typography variant="body2" sx={{ mt: 2 }}>无法计算物料需求。</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 4 }}>
      <CardContent>
        <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
          <Typography variant="h5" component="h2" sx={{ fontFamily: 'Inter, sans-serif', fontWeight: 600, mr: 1 }}>
            物料需求汇总
          </Typography>
          <Tooltip title="这是根据当前面包产品的配方，计算出的所有基础原材料的总需求量。可用于备料参考。">
            <IconButton size="small" sx={{ color: 'primary.main' }}>
              <InfoOutlinedIcon fontSize="small"/>
            </IconButton>
          </Tooltip>
        </Box>

        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>原料名称</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>总需求量</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {materials.map((item) => (
                <TableRow key={item.id}>
                  <TableCell component="th" scope="row">
                    {item.name}
                  </TableCell>
                  <TableCell align="right">
                    {item.quantity.toFixed(2)} {item.unit}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default AggregatedMaterials; 