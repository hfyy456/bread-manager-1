import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip
} from '@mui/material';
import { ExpandMore as ExpandMoreIcon } from '@mui/icons-material';
import { useStore } from './StoreContext';

const InventoryDebugger = () => {
  const [rawData, setRawData] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentStore } = useStore();

  const fetchData = async () => {
    if (!currentStore) {
      setError('没有选择门店');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ingredients/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-current-store-id': currentStore._id,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setRawData(result.data);
        
        // 处理数据
        const processed = result.data.map(ing => {
          const mainStock = ing.mainWarehouseStock?.quantity || 0;
          let postStock = 0;
          
          if (ing.stockByPost && typeof ing.stockByPost === 'object') {
            Object.values(ing.stockByPost).forEach(stock => {
              if (stock && typeof stock.quantity === 'number' && stock.quantity > 0) {
                postStock += stock.quantity;
              }
            });
          }
          
          const currentStock = mainStock + postStock;
          const totalValue = currentStock * (ing.price || 0);
          
          return {
            ...ing,
            calculatedMainStock: mainStock,
            calculatedPostStock: postStock,
            calculatedCurrentStock: currentStock,
            calculatedTotalValue: totalValue
          };
        });
        
        setProcessedData(processed);
      } else {
        setError(result.message || '获取数据失败');
      }
    } catch (err) {
      setError(`请求失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentStore) {
      fetchData();
    }
  }, [currentStore]);

  const itemsWithStock = processedData ? processedData.filter(item => item.calculatedCurrentStock > 0) : [];
  const itemsWithMainStock = processedData ? processedData.filter(item => item.calculatedMainStock > 0) : [];
  const itemsWithPostStock = processedData ? processedData.filter(item => item.calculatedPostStock > 0) : [];

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">库存数据调试器</Typography>
          <Button variant="outlined" onClick={fetchData} disabled={loading || !currentStore}>
            {loading ? '加载中...' : '刷新数据'}
          </Button>
        </Box>

        {error && (
          <Box sx={{ color: 'error.main', mb: 2 }}>
            错误: {error}
          </Box>
        )}

        {processedData && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>统计概览</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip label={`总原料: ${processedData.length}`} />
              <Chip label={`有库存: ${itemsWithStock.length}`} color="success" />
              <Chip label={`有主仓库存: ${itemsWithMainStock.length}`} color="primary" />
              <Chip label={`有岗位库存: ${itemsWithPostStock.length}`} color="secondary" />
            </Box>
          </Box>
        )}

        {itemsWithStock.length > 0 && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>有库存的原料 ({itemsWithStock.length} 个)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {itemsWithStock.slice(0, 10).map((item, index) => (
                  <Box key={item._id} sx={{ mb: 2, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      {index + 1}. {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      主仓: {item.calculatedMainStock} {item.unit} | 
                      岗位: {item.calculatedPostStock} {item.unit} | 
                      总计: {item.calculatedCurrentStock} {item.unit}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      价格: ¥{item.price || 0} | 总价值: ¥{item.calculatedTotalValue.toFixed(2)}
                    </Typography>
                    <details>
                      <summary style={{ cursor: 'pointer', fontSize: '12px', color: '#666' }}>
                        查看原始数据
                      </summary>
                      <pre style={{ fontSize: '10px', background: '#f5f5f5', padding: '8px', marginTop: '4px' }}>
                        {JSON.stringify({
                          mainWarehouseStock: item.mainWarehouseStock,
                          stockByPost: item.stockByPost
                        }, null, 2)}
                      </pre>
                    </details>
                  </Box>
                ))}
                {itemsWithStock.length > 10 && (
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
                    ... 还有 {itemsWithStock.length - 10} 个有库存的原料
                  </Typography>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        )}

        {rawData && (
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>原始API数据 (前3个)</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '300px' }}>
                {JSON.stringify(rawData.slice(0, 3), null, 2)}
              </pre>
            </AccordionDetails>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
};

export default InventoryDebugger;