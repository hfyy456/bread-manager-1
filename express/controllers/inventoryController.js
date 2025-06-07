const Ingredient = require('../models/Ingredient');

// @desc    提交指定岗位的物料盘点数据
// @route   POST /api/inventory/submit
// @access  Private (需要权限验证，例如确认是组长)
const submitStockByPost = async (req, res) => {
  const { postId, stocks } = req.body; // stocks is an array: [{ ingredientId, quantity, unit }, ...]

  if (!postId || !POSTNAME[postId]) {
    return res.status(400).json({ success: false, message: '无效的岗位ID。' });
  }

  if (!Array.isArray(stocks) || stocks.length === 0) {
    return res.status(400).json({ success: false, message: '盘点数据不能为空。' });
  }

  const operations = [];
  const errors = [];
  let successCount = 0;

  for (const item of stocks) {
    if (!item.ingredientId || typeof item.quantity !== 'number' || item.quantity < 0 || !item.unit) {
      errors.push(`物料 ${item.ingredientName || item.ingredientId} 的盘点数据无效 (数量或单位缺失/错误)。`);
      continue;
    }

    operations.push(
      Ingredient.findById(item.ingredientId).then(ingredient => {
        if (!ingredient) {
          errors.push(`未找到物料: ${item.ingredientName || item.ingredientId} (ID: ${item.ingredientId})。`);
          return null;
        }
        
        // 更新或设置该岗位的库存信息
        ingredient.stockByPost.set(String(postId), {
          quantity: item.quantity,
          unit: item.unit, // 使用提交上来的单位，这应该是该物料的采购单位
          lastUpdated: new Date(),
        });
        
        // The logic to calculate and set `currentStock` is now removed.
        // The total stock will be calculated on-the-fly whenever needed.

        ingredient.markModified('stockByPost'); // 必须标记，因为 stockByPost 是 Mixed type (Map)
        return ingredient.save();
      })
      .then(savedDoc => {
        if (savedDoc) successCount++;
      })
      .catch(err => {
        console.error(`处理物料 ${item.ingredientId} 盘点时出错: `, err);
        errors.push(`物料 ${item.ingredientName || item.ingredientId} 更新失败: ${err.message}`);
      })
    );
  }

  try {
    await Promise.all(operations);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `部分物料盘点处理失败。成功 ${successCount} 项。请查看错误详情。`,
        errors,
      });
    }

    res.json({ success: true, message: `岗位 ${POSTNAME[postId]} 的 ${successCount} 项物料盘点数据已成功提交。` });

  } catch (globalError) { // Should not happen if individual errors are caught
    console.error('提交盘点数据时发生意外全局错误:', globalError);
    res.status(500).json({ success: false, message: '服务器在处理盘点提交时发生意外错误。' });
  }
};

// For POSTNAME, it should ideally be shared or fetched from a config if used here for validation/logging
const POSTNAME = {
    1: "搅拌",
    2: "丹麦",
    3: "整形",
    4: "烤炉",
    5: "冷加工",
    6: "收银打包",
    7: '水吧',
    8: "馅料",
    9: "小库房"
  };

module.exports = {
  submitStockByPost,
}; 