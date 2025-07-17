const DailyReport = require('../models/DailyReport');

// Helper function to normalize date string to UTC Midnight Date object
const normalizeDate = (dateString) => {
    const date = new Date(dateString);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

exports.createOrUpdateDailyReport = async (req, res) => {
    try {
        const { date, products, doughWastes, fillingWastes, generalRemarks } = req.body;
        const { currentStoreId } = req.user; // 从中间件获取门店ID

        if (!date) {
            return res.status(400).json({ success: false, message: '日期是必填项' });
        }
        if (!currentStoreId) {
            return res.status(401).json({ success: false, message: '无法确定当前门店' });
        }

        const reportDate = normalizeDate(date);

        const reportData = {
            storeId: currentStoreId, // 关联门店ID
            date: reportDate,
            products,
            doughWastes,
            fillingWastes,
            generalRemarks,
        };

        // 查询条件现在包含门店ID
        const query = { storeId: currentStoreId, date: reportDate };

        const report = await DailyReport.findOneAndUpdate(
            query,
            { $set: reportData },
            { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ success: true, message: '日报表已成功保存', data: report });
    } catch (error) {
        console.error('[DailyReportController] Error saving report:', error);
        if (error.code === 11000) {
             // Should be caught by findOneAndUpdate, but as a fallback
            return res.status(409).json({ success: false, message: '此日期的报告已存在 (E11000)', error: error.message });
        }
        res.status(500).json({ success: false, message: '保存日报表时发生错误', error: error.message });
    }
};

exports.getDailyReportByDate = async (req, res) => {
    try {
        const { date } = req.query;
        const { currentStoreId } = req.user;

        if (!date) {
            return res.status(400).json({ success: false, message: '必须提供日期参数' });
        }
        if (!currentStoreId) {
            return res.status(401).json({ success: false, message: '无法确定当前门店' });
        }

        const reportDate = normalizeDate(date);
        
        // 查询条件现在包含门店ID
        const report = await DailyReport.findOne({ storeId: currentStoreId, date: reportDate });

        if (!report) {
            return res.status(404).json({ success: false, message: '未找到当前门店指定日期的报表' });
        }
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error('[DailyReportController] Error fetching report by date:', error);
        res.status(500).json({ success: false, message: '获取日报表时发生错误', error: error.message });
    }
};

exports.getAllDailyReports = async (req, res) => {
    const { currentStoreId } = req.user;
    if (!currentStoreId) {
        return res.status(401).json({ success: false, message: '无法确定当前门店' });
    }
    try {
        // 只查询当前门店的报表
        const reports = await DailyReport.find({ storeId: currentStoreId }).sort({ date: -1 });
        res.status(200).json({ success: true, count: reports.length, data: reports });
    } catch (error) {
        console.error('[DailyReportController] Error fetching all reports:', error);
        res.status(500).json({ success: false, message: '获取所有日报表时发生错误', error: error.message });
    }
}; 