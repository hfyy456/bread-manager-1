import { useState, useCallback, useContext } from 'react';
import * as XLSX from 'xlsx';
import { DataContext } from '../../DataContext.jsx';

export const useExcelOperations = (quantities, setQuantities, aggregatedMaterials, costAnalysis, materialMultiplier, breadTypes) => {
  const { ingredientsMap } = useContext(DataContext);
  
  const [importReport, setImportReport] = useState(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // 处理文件上传
  const handleFileUpload = useCallback((event, showSnackbar) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 1) {
          showSnackbar('Excel 文件为空或格式不正确。', 'error');
          return;
        }
        
        const headerRow = jsonData[0];
        const productNameHeader = "产品名称";
        const quantityHeader = "数量";
        let productNameIndex = -1;
        let quantityIndex = -1;

        if (headerRow && Array.isArray(headerRow)) {
          productNameIndex = headerRow.findIndex(header => String(header).trim() === productNameHeader);
          quantityIndex = headerRow.findIndex(header => String(header).trim() === quantityHeader);
        }

        if (productNameIndex === -1 || quantityIndex === -1) {
          showSnackbar(`Excel表头必须包含 "${productNameHeader}" 和 "${quantityHeader}" 列。`, 'error');
          return;
        }

        const importedQuantities = { ...quantities };
        let importedCount = 0;
        let notFoundCount = 0;
        let invalidQuantityCount = 0;
        const reportResults = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;

          const productName = row[productNameIndex] ? String(row[productNameIndex]).trim() : null;
          const quantityStr = row[quantityIndex] ? String(row[quantityIndex]).trim() : '';
          
          if (!productName) continue;

          const breadType = breadTypes.find(bt => bt.name.trim() === productName);

          if (breadType) {
            const quantityNum = parseInt(quantityStr, 10);
            if (!isNaN(quantityNum) && quantityNum >= 0) {
              importedQuantities[breadType.id] = (importedQuantities[breadType.id] || 0) + quantityNum;
              importedCount++;
              reportResults.push({ 
                name: productName, 
                value: quantityStr, 
                status: 'success', 
                message: `成功导入数量: ${quantityNum}` 
              });
            } else {
              invalidQuantityCount++;
              reportResults.push({ 
                name: productName, 
                value: quantityStr, 
                status: 'invalid_quantity', 
                message: '数量值无效或非正整数。' 
              });
            }
          } else {
            notFoundCount++;
            reportResults.push({ 
              name: productName, 
              value: quantityStr, 
              status: 'not_found', 
              message: '在数据库中未找到该产品名称。' 
            });
          }
        }

        // 更新数量状态
        setQuantities(importedQuantities);
        
        const report = {
          summary: { success: importedCount, notFound: notFoundCount, invalid: invalidQuantityCount },
          results: reportResults,
        };
        setImportReport(report);
        setReportDialogOpen(true);

        if (importedCount > 0) {
          if (notFoundCount > 0 || invalidQuantityCount > 0) {
            showSnackbar(`导入完成，但存在一些问题。请查看报告详情。`, 'warning');
          } else {
            showSnackbar(`成功导入 ${importedCount} 项产品数量。`, 'success');
          }
        } else {
          showSnackbar(`导入失败，未找到任何有效数据。请查看报告详情。`, 'error');
        }

      } catch (error) {
        console.error("Excel 文件导入失败:", error);
        showSnackbar('Excel 文件处理失败，请检查文件格式或内容。', 'error');
      } finally {
        // 清空文件输入
        if (event.target) {
          event.target.value = '';
        }
      }
    };
    
    reader.onerror = (error) => {
      console.error("文件读取错误:", error);
      showSnackbar('无法读取文件。', 'error');
    };
    
    reader.readAsArrayBuffer(file);
  }, [quantities, breadTypes]);

  // 导出模板
  const handleExportTemplate = useCallback((showSnackbar) => {
    const templateData = breadTypes.map(bt => ({
      '产品名称': bt.name,
      '数量': ''
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '生产计划模板');
    XLSX.writeFile(workbook, '产品生产计划模板.xlsx');
    
    if (showSnackbar) {
      showSnackbar('导入模板已成功下载！', 'success');
    }
  }, [breadTypes]);

  // 导出Excel结果
  const handleExportExcel = useCallback((showSnackbar) => {
    if (aggregatedMaterials.length === 0) {
      if (showSnackbar) {
        showSnackbar('没有计算结果可导出。请先计算。', 'warning');
      }
      return;
    }
  
    const workbook = XLSX.utils.book_new();
    
    // 1. 成本分析工作表
    if (costAnalysis) {
      const costAnalysisData = [
        { '项目': '总生产成本', '金额(元)': costAnalysis.totalProductionCost.toFixed(2) },
        { '项目': '总销售价值', '金额(元)': costAnalysis.totalProductionValue.toFixed(2) },
        { '项目': '总利润', '金额(元)': costAnalysis.totalProfit.toFixed(2) },
        { '项目': '总利润率', '金额(元)': costAnalysis.overallProfitMargin.toFixed(1) + '%' },
        {},
        { 
          '产品名称': '产品名称', 
          '数量': '数量', 
          '单位成本(元)': '单位成本(元)', 
          '单位售价(元)': '单位售价(元)', 
          '总成本(元)': '总成本(元)', 
          '总价值(元)': '总价值(元)', 
          '利润(元)': '利润(元)', 
          '利润率(%)': '利润率(%)' 
        },
        ...costAnalysis.products.map(product => ({
          '产品名称': product.breadName,
          '数量': product.quantity,
          '单位成本(元)': product.unitCost.toFixed(2),
          '单位售价(元)': product.unitPrice.toFixed(2),
          '总成本(元)': product.totalCost.toFixed(2),
          '总价值(元)': product.totalValue.toFixed(2),
          '利润(元)': product.totalProfit.toFixed(2),
          '利润率(%)': product.profitMargin.toFixed(1)
        }))
      ];
      
      const costWorksheet = XLSX.utils.json_to_sheet(costAnalysisData);
      costWorksheet['!cols'] = [
        { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, 
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }
      ];
      XLSX.utils.book_append_sheet(workbook, costWorksheet, '成本分析');
    }

    // 2. 原料需求工作表
    let totalCostForExport = 0;
    const dataToExport = aggregatedMaterials.map(material => {
      const ingredientInfo = ingredientsMap.get(material.id?.trim());
      const norms = ingredientInfo?.norms || ingredientInfo?.unitSize || 1;
      
      const purchaseNeededInGrams = Math.max(0, material.quantity - (material.currentStockInGrams || 0));
      const purchaseNeededInUnits = purchaseNeededInGrams > 0 ? Math.ceil(purchaseNeededInGrams / norms) : 0;
      
      const rawPrice = ingredientInfo?.price || '0';
      const price = parseFloat(String(rawPrice).replace(/[^\d.-]/g, '')) || 0;
      const estimatedOrderCost = purchaseNeededInUnits * price;
      totalCostForExport += estimatedOrderCost;

      const unit = typeof (ingredientInfo?.unit) === 'object' 
        ? Object.values(ingredientInfo.unit)[0] || '' 
        : ingredientInfo?.unit || '';

      return {
        '原料名称': material.name,
        '规格': ingredientInfo?.specs || '',
        '需求总量(g)': material.quantity.toFixed(2),
        '当前库存(g)': (material.currentStockInGrams || 0).toFixed(2),
        '需采购量(g)': purchaseNeededInGrams > 0 ? purchaseNeededInGrams.toFixed(2) : 0,
        '建议采购数量': purchaseNeededInUnits > 0 ? purchaseNeededInUnits : '无需采购',
        '建议采购单位': purchaseNeededInUnits > 0 ? unit : '',
        '预估订货成本(元)': estimatedOrderCost > 0 ? estimatedOrderCost.toFixed(2) : 0,
      };
    });

    dataToExport.push({}); // 添加空行
    dataToExport.push({
      '原料名称': '采购总计',
      '预估订货成本(元)': totalCostForExport.toFixed(2)
    });
    
    if (materialMultiplier !== 1.0) {
      dataToExport.push({});
      dataToExport.push({
        '原料名称': '说明',
        '规格': `原料需求已应用 ${materialMultiplier}x 安全系数`
      });
    }

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    worksheet['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, 
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 }
    ];
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '原料需求汇总');
    
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `生产计划成本分析_${today}.xlsx`);
    
    if (showSnackbar) {
      showSnackbar('Excel 文件已成功导出！包含成本分析和原料需求两个工作表。', 'success');
    }
  }, [aggregatedMaterials, costAnalysis, materialMultiplier, ingredientsMap]);

  return {
    importReport,
    reportDialogOpen,
    setReportDialogOpen,
    handleFileUpload,
    handleExportTemplate,
    handleExportExcel
  };
};