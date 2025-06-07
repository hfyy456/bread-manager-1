const DailyReport = require('../models/DailyReport');
const moment = require('moment');

// Helper to get date ranges, considering Beijing Time (UTC+8)
const getDateRange = (period, targetDateStr) => {
    const targetDateInBJT = moment(targetDateStr).utcOffset('+08:00');
    let startDate, endDate;

    if (period === 'daily') {
        startDate = targetDateInBJT.clone().startOf('day');
        endDate = targetDateInBJT.clone().endOf('day');
    } else if (period === 'weekly') {
        startDate = targetDateInBJT.clone().startOf('isoWeek');
        endDate = targetDateInBJT.clone().endOf('isoWeek');
    } else if (period === 'monthly') {
        startDate = targetDateInBJT.clone().startOf('month');
        endDate = targetDateInBJT.clone().endOf('month');
    } else {
        throw new Error('Invalid period specified');
    }
    
    return { startDate: startDate.toDate(), endDate: endDate.toDate() };
};

const getDashboardSummary = async (req, res) => {
    try {
        const { periodType, date } = req.query; 
        if (!periodType || !['daily', 'weekly', 'monthly'].includes(periodType)) {
            return res.status(400).json({ success: false, message: '请提供有效的汇总周期 (daily, weekly, monthly)' });
        }
        if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
            return res.status(400).json({ success: false, message: '请提供有效的日期 (YYYY-MM-DD)' });
        }

        const summaryRange = getDateRange(periodType, date);
        
        const reports = await DailyReport.find({
            date: { $gte: summaryRange.startDate, $lte: summaryRange.endDate }
        }).lean();

        let trendStartDate, trendEndDate;
        const targetDateInBJT = moment(date).utcOffset('+08:00');

        if (periodType === 'daily') {
            trendStartDate = targetDateInBJT.clone().subtract(6, 'days').startOf('day');
            trendEndDate = targetDateInBJT.clone().endOf('day');
        } else if (periodType === 'weekly') {
            trendStartDate = targetDateInBJT.clone().startOf('isoWeek');
            trendEndDate = targetDateInBJT.clone().endOf('isoWeek');
        } else { // monthly
            trendStartDate = targetDateInBJT.clone().startOf('month');
            trendEndDate = targetDateInBJT.clone().endOf('month');
        }

        const reportsForTrend = await DailyReport.find({
            date: { $gte: trendStartDate.toDate(), $lte: trendEndDate.toDate() }
        }).sort({ date: 'asc' }).lean();

        res.json({
            success: true,
            data: {
                periodReports: reports,
                trendReports: reportsForTrend,
                currentDate: moment(date).format('YYYY-MM-DD')
            }
        });

    } catch (error) {
        console.error('Error fetching dashboard summary data:', error);
        res.status(500).json({ success: false, message: '服务器在获取看板数据时发生错误。' });
    }
};

module.exports = {
    getDashboardSummary,
}; 