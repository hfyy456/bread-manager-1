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

        if (!date) {
            return res.status(400).json({ success: false, message: '日期是必填项' });
        }

        const reportDate = normalizeDate(date); // Model setter also does this, but good for query

        const reportData = {
            date: reportDate,
            products,
            doughWastes,
            fillingWastes,
            generalRemarks,
            updatedAt: Date.now() // Explicitly set updatedAt for updates
        };

        const report = await DailyReport.findOneAndUpdate(
            { date: reportDate },
            { $set: reportData }, // Use $set to ensure only provided fields are updated and defaults are preserved
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
        if (!date) {
            return res.status(400).json({ success: false, message: '必须提供日期参数' });
        }

        const reportDate = normalizeDate(date);
        
        const report = await DailyReport.findOne({ date: reportDate });

        if (!report) {
            return res.status(404).json({ success: false, message: '未找到指定日期的报表' });
        }
        res.status(200).json({ success: true, data: report });
    } catch (error) {
        console.error('[DailyReportController] Error fetching report by date:', error);
        res.status(500).json({ success: false, message: '获取日报表时发生错误', error: error.message });
    }
};

exports.getAllDailyReports = async (req, res) => {
    try {
        // Basic find all, sorted by date descending. Pagination could be added later.
        const reports = await DailyReport.find().sort({ date: -1 });
        res.status(200).json({ success: true, count: reports.length, data: reports });
    } catch (error) {
        console.error('[DailyReportController] Error fetching all reports:', error);
        res.status(500).json({ success: false, message: '获取所有日报表时发生错误', error: error.message });
    }
}; 