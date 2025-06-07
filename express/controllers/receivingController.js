const Ingredient = require('../models/Ingredient');
const { createWorker } = require('tesseract.js');
const fs = require('fs');
const path = require('path');

// @desc    Submit a new receiving record and update stocks
// @route   POST /api/receiving/submit
// @access  Private (for now)
const handleSubmit = async (req, res) => {
    const { supplier, deliveryId, receivingDate, items } = req.body;

    if (!supplier || !deliveryId || !receivingDate || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: '请求数据不完整或格式错误。' });
    }

    const WAREHOUSE_POST_ID = '9'; // '小库房'

    const operations = items
        .filter(item => item.ingredient && item.ingredient._id && parseFloat(item.receivedQty) > 0)
        .map(async (item) => {
            const receivedQty = parseFloat(item.receivedQty);
            const ingredient = await Ingredient.findById(item.ingredient._id);
            if (!ingredient) {
                throw new Error(`未找到ID为 ${item.ingredient._id} 的原料 (${item.ingredient.name})。`);
            }

            // Get current stock for the warehouse post, or default to 0
            const existingStock = ingredient.stockByPost.get(WAREHOUSE_POST_ID)?.quantity || 0;
            const newStock = existingStock + receivedQty;

            ingredient.stockByPost.set(WAREHOUSE_POST_ID, {
                quantity: newStock,
                unit: ingredient.unit, // Use the main unit from ingredient
                lastUpdated: new Date(),
            });

            ingredient.markModified('stockByPost');
            return ingredient.save();
        });

    try {
        await Promise.all(operations);
        res.json({ success: true, message: `成功入库 ${operations.length} 项物料到"小库房"。` });
    } catch (error) {
        console.error('收货入库时发生错误:', error);
        res.status(500).json({ success: false, message: `处理入库时发生服务器错误: ${error.message}` });
    }
};

const parseDeliverySlip = async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: '没有上传文件。' });
    }

    const imagePath = path.resolve(req.file.path);
    const tessdataPath = path.resolve(__dirname, '..', 'tessdata');
    let worker;

    try {
        worker = await createWorker('chi_sim', 1, {
            langPath: tessdataPath,
            gzip: false,
            // logger: m => console.log(m), // Optional: for debugging
        });
        
        const { data: { text } } = await worker.recognize(imagePath);

        const allIngredients = await Ingredient.find({}, 'name unit');
        const lines = text.split('\n').filter(line => line.trim() !== '');
        const parsedItems = [];

        lines.forEach(line => {
            allIngredients.forEach(ing => {
                if (line.includes(ing.name)) {
                    const match = line.match(/(\d+(\.\d+)?)/);
                    if (match) {
                        const receivedQty = parseFloat(match[1]);
                        parsedItems.push({
                            id: `parsed-${Date.now()}-${ing._id}`,
                            ingredient: ing,
                            orderedQty: '', // OCR doesn't reliably get this
                            receivedQty: receivedQty,
                        });
                    }
                }
            });
        });
        
        const uniqueParsedItems = Array.from(new Map(parsedItems.map(item => [item.ingredient._id, item])).values());

        res.json({ success: true, items: uniqueParsedItems });

    } catch (error) {
        console.error('OCR解析失败:', error);
        res.status(500).json({ success: false, message: `图片识别失败: ${error.message}` });
    } finally {
        if (worker) {
            await worker.terminate();
        }
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error('删除临时上传文件失败:', err);
            }
        });
    }
};

module.exports = {
    handleSubmit,
    parseDeliverySlip,
}; 