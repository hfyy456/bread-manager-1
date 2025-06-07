import React from 'react';
import { Container, Typography, Paper, Box, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const guideSections = [
  {
    id: 'dashboard',
    title: '数据看板 (DashboardPage.jsx)',
    content: '数据看板页面提供关键业务指标的图形化汇总，帮助您快速了解生产、报废和库存的整体情况。\n\n- **时间维度切换**: 您可以通过顶部的标签页选择"按日"、"按周"或"按月"查看数据。\n- **关键指标卡片**: 页面会显示选定时间范围内的核心数据，例如总出品价值、总报废价值、当前库存总价值等。\n- **趋势图表**: 通过折线图或柱状图展示出品与报废价值随时间的变化趋势。\n- **构成图表**: 通过饼图或环形图展示各类报废（成品、面团、馅料）的占比情况。\n- **数据同步**: 看板数据来源于您在"生产与报废登记"等模块录入的信息。请确保数据及时准确录入，以便看板展示最新情况。\n- **后续功能**: 未来可能会根据需求增加更多维度的分析和图表。',
  },
  {
    id: 'ingredient-management',
    title: '物料管理 (IngredientList.jsx)',
    content: '物料管理页面用于添加、编辑和查看所有烘焙原料的基本信息，如名称、采购单位、价格、规格等。\n\n- **查看列表**: 默认显示所有原料。可使用顶部的筛选框按名称搜索原料。列表支持按列标题排序。\n- **添加新原料**: 点击"新增原料"按钮，填写表单并保存。\n- **编辑原料**: 点击每行末尾的编辑图标，修改后保存。\n- **删除原料**: 点击每行末尾的删除图标，确认后删除。\n- **数据刷新**: 最近更新时间显示在列表上方，可手动刷新数据。',
  },
  {
    id: 'inventory-overview',
    title: '库存总览 (IngredientsPage.jsx)',
    content: '库存总览页面展示所有原料在各个岗位的合计库存数量及总价值。数据是只读的，反映的是"库存盘点"页面更新的结果。\n\n- **查看库存**: 列表显示原料名称、负责岗位、采购单位、规格、单价、当前总库存和库存总价值。\n- **排序**: 可以点击列标题对数据进行排序。\n- **总价值**: 页面顶部会显示当前所有原料的库存总价值。\n- **提示**: 要更新库存，请前往"库存盘点"页面。',
  },
  {
    id: 'inventory-check',
    title: '库存盘点 (InventoryCheckPage.jsx)',
    content: '库存盘点页面用于记录和更新各个岗位特定原料的实际库存数量。\n\n- **选择岗位**:首先从下拉菜单中选择要盘点的操作岗位。\n- **查看/更新库存**: 选择岗位后，会列出该岗位负责的所有原料。可以直接在"当前库存"列的输入框中修改数量。\n- **保存更改**: 修改库存后，需要点击"更新库存"按钮将数据保存到服务器。系统会提示成功或失败信息。\n- **数据来源**: 原料列表和其负责岗位信息来源于"物料管理"页面的配置。',
  },
  {
    id: 'raw-material-calculator',
    title: '原料计算器 (RawMaterialCalculator.jsx)',
    content: '原料计算器用于根据产品配方和计划生产数量，计算所需原料的总量。\n\n- **选择产品**: 从下拉菜单选择要计算的产品。\n- **输入产量**: 输入计划生产的数量。\n- **查看结果**: 计算器会列出所需各种原料的名称、单位、单个产品用量、总需求量以及参考成本。\n- **导出**: 可以将计算结果导出为Excel文件。',
  },
  {
    id: 'dough-recipes',
    title: '面团配方管理 (DoughRecipeList.jsx / DoughInfo.jsx)',
    content: '面团配方管理模块用于创建和维护各种面团的配方。\n\n- **查看列表**: `DoughRecipeList.jsx` 显示所有已存的面团配方，包括名称、总成本等。\n- **新增/编辑**: 可在此页面进行新增或选择某个面团进入 `DoughInfo.jsx` 进行编辑。\n- **配方详情 (`DoughInfo.jsx`)**: 用户可以详细定义面团的原料组成、各原料百分比、制作步骤等。系统会自动计算总百分比和成本。',
  },
  {
    id: 'filling-recipes',
    title: '馅料配方管理 (FillingRecipeList.jsx / FillingInfo.jsx)',
    content: '馅料配方管理模块与面团配方类似，用于创建和维护各种馅料的配方。\n\n- **查看列表**: `FillingRecipeList.jsx` 显示所有馅料配方。\n- **新增/编辑**: 可新增或编辑馅料。\n- **配方详情 (`FillingInfo.jsx`)**: 定义馅料的原料、百分比、步骤，并计算成本。',
  },
   {
    id: 'bread-products',
    title: '面包产品管理 (BreadList.jsx / BreadDetails.jsx)',
    content: '面包产品管理模块用于定义最终产品的信息。\n\n- **查看列表 (`BreadList.jsx`)**: 显示所有面包产品，可以进行添加、编辑、删除操作。\n- **产品详情 (`BreadDetails.jsx`)**: 定义产品的名称、描述、售价，并关联所需的各种面团、馅料以及其他辅料。系统会根据关联的配方汇总成本。',
  },
  {
    id: 'cost-summary',
    title: '成本总结 (CostSummary.jsx)',
    content: '成本总结页面提供了一个集中的视图，用于分析各个产品（面包、面团、馅料）的成本构成。\n\n- **查看成本**: 详细列出每个产品的原料成本、人工成本（如果系统支持）、总成本以及建议售价（基于利润率）。\n- **筛选与分析**: 可能提供筛选功能，帮助用户分析特定类别产品的盈利能力。',
  },
  {
    id: 'production-waste',
    title: '生产与报废登记 (ProductionWastePage.jsx)',
    content: '生产与报废登记页面用于每日记录产品的生产数量、成品报废数量，以及面团和馅料的报废情况。\n\n- **选择日期**: 首先选择需要登记的报告日期。\n- **产品出品与报废**: 逐条填写每种产品的出品数量和成品报废数量，以及相关备注。系统会自动带出产品单价。\n- **面团报废登记**: 添加并填写报废的面团名称、数量、单位和报废原因。\n- **馅料报废登记**: 添加并填写报废的馅料名称、数量、单位和报废原因。\n- **总体备注**: 可以填写当日生产或报废相关的总体情况说明。\n- **汇总信息**: 页面顶部会实时显示总出品价值、总成品报废价值，以及总的面团和馅料报废数量。\n- **保存**: 点击"保存日报表"按钮提交数据。\n- **数据依赖**: 产品列表来源于面包产品管理，面团和馅料列表来源于各自的配方管理。单价用于计算价值。',
  },
  {
    id: 'daily-report-preview',
    title: '日报预览 (DailyReportPreviewPage.jsx)',
    content: '日报预览页面用于查看历史上所有已提交的生产与报废日报的汇总信息。\n\n- **查看列表**: 默认按日期降序（最新在前）显示所有日报。\n- **主要信息**: 每条日报会展示：日期、总出品价值、总成品报废价值、总面团报废数量及单位、总馅料报废数量及单位，以及总体备注（鼠标悬浮可看完整备注）。\n- **数据来源**: 数据来源于"生产与报废登记"页面提交的日报表。\n- **用途**: 方便快速回顾每日的生产和损耗情况，进行趋势分析或数据核对。',
  },
  // Add more sections as needed
];

const OperationGuidePage = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ textAlign: 'center', mb: 4 }}>
        操作指南
      </Typography>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
        {guideSections.map((section, index) => (
          <Accordion key={section.id} defaultExpanded={index === 0} sx={{ mb: index === guideSections.length - 1 ? 0 : 1.5 }}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls={`${section.id}-content`}
              id={`${section.id}-header`}
              sx={{ backgroundColor: 'grey.100' }}
            >
              <Typography variant="h6" component="h2">{section.title}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 2, whiteSpace: 'pre-line', lineHeight: 1.8 }}>
              <Typography component="div">
                {section.content || '详细内容待补充...'}
              </Typography>
            </AccordionDetails>
          </Accordion>
        ))}
        {guideSections.length === 0 && (
          <Typography sx={{textAlign: 'center', color: 'text.secondary', p:3}}>暂无操作指南内容。</Typography>
        )}
      </Paper>
    </Container>
  );
};

export default OperationGuidePage; 