const DailyReport = require('../models/DailyReport');
const { format, isValid, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } = require('date-fns');

// Helper to get date ranges, considering Beijing Time (UTC+8)
const getDateRange = (period, targetDateStr) => {
    const targetDate = new Date(targetDateStr);
    let startDate, endDate;

    if (period === 'daily') {
        startDate = startOfDay(targetDate);
        endDate = endOfDay(targetDate);
    } else if (period === 'weekly') {
        startDate = startOfWeek(targetDate, { weekStartsOn: 1 }); // ISO week starts on Monday
        endDate = endOfWeek(targetDate, { weekStartsOn: 1 });
    } else if (period === 'monthly') {
        startDate = startOfMonth(targetDate);
        endDate = endOfMonth(targetDate);
    } else {
        throw new Error('Invalid period specified');
    }
    
    return { startDate, endDate };
};

const getDashboardSummary = async (req, res) => {
    try {
        const { periodType, date } = req.query; 
        const { currentStoreId } = req.user; // 从中间件获取门店ID

        if (!currentStoreId) {
            return res.status(401).json({ success: false, message: '无法确定当前门店' });
        }
        if (!periodType || !['daily', 'weekly', 'monthly'].includes(periodType)) {
            return res.status(400).json({ success: false, message: '请提供有效的汇总周期 (daily, weekly, monthly)' });
        }
        if (!date || !isValid(new Date(date))) {
            return res.status(400).json({ success: false, message: '请提供有效的日期 (YYYY-MM-DD)' });
        }

        const summaryRange = getDateRange(periodType, date);
        
        // 查询条件加入 storeId
        const query = {
            storeId: currentStoreId,
            date: { $gte: summaryRange.startDate, $lte: summaryRange.endDate }
        };

        const reports = await DailyReport.find(query).lean();

        let trendStartDate, trendEndDate;
        const targetDate = new Date(date);

        if (periodType === 'daily') {
            trendStartDate = startOfDay(subDays(targetDate, 6));
            trendEndDate = endOfDay(targetDate);
        } else if (periodType === 'weekly') {
            trendStartDate = startOfWeek(targetDate, { weekStartsOn: 1 });
            trendEndDate = endOfWeek(targetDate, { weekStartsOn: 1 });
        } else { // monthly
            trendStartDate = startOfMonth(targetDate);
            trendEndDate = endOfMonth(targetDate);
        }

        // 趋势查询也加入 storeId
        const trendQuery = {
            storeId: currentStoreId,
            date: { $gte: trendStartDate, $lte: trendEndDate }
        };

        const reportsForTrend = await DailyReport.find(trendQuery).sort({ date: 'asc' }).lean();

        res.json({
            success: true,
            data: {
                periodReports: reports,
                trendReports: reportsForTrend,
                currentDate: format(new Date(date), 'yyyy-MM-dd')
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