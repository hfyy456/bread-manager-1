const DailyReport = require('../models/DailyReport');
const moment = require('moment'); // Using moment for easier date manipulations
const { getRawMaterialsForProduct, getRawMaterialsForDough, getRawMaterialsForFilling } = require('../utils/consumptionCalculator'); // 新增引入
const Ingredient = require('../models/Ingredient'); // Added Ingredient model

// Helper to calculate summary values from a list of reports
const calculateSummariesFromReports = (reports) => {
    let totalProductionValue = 0;
    let totalFinishedWasteValue = 0;
    const doughWasteMap = new Map(); // To sum quantities by unit
    const fillingWasteMap = new Map(); // To sum quantities by unit

    reports.forEach(report => {
        report.products.forEach(p => {
            const unitPrice = parseFloat(p.unitPrice) || 0;
            const produced = parseInt(p.quantityProduced, 10) || 0;
            const finishedWaste = parseInt(p.finishedWasteQuantity, 10) || 0;
            totalProductionValue += (produced - finishedWaste) * unitPrice;
            totalFinishedWasteValue += finishedWaste * unitPrice;
        });
        report.doughWastes.forEach(dw => {
            const qty = parseFloat(dw.quantity) || 0;
            const unit = dw.unit || 'g';
            doughWasteMap.set(unit, (doughWasteMap.get(unit) || 0) + qty);
        });
        report.fillingWastes.forEach(fw => {
            const qty = parseFloat(fw.quantity) || 0;
            const unit = fw.unit || 'g';
            fillingWasteMap.set(unit, (fillingWasteMap.get(unit) || 0) + qty);
        });
    });

    // For simplicity, this example just takes the first unit found or defaults. 
    // A more robust solution might convert units or handle multiple units in the response.
    const totalDoughWasteQuantity = doughWasteMap.size > 0 ? doughWasteMap.values().next().value : 0;
    const doughWasteUnit = doughWasteMap.size > 0 ? doughWasteMap.keys().next().value : 'g';
    const totalFillingWasteQuantity = fillingWasteMap.size > 0 ? fillingWasteMap.values().next().value : 0;
    const fillingWasteUnit = fillingWasteMap.size > 0 ? fillingWasteMap.keys().next().value : 'g';

    return {
        totalProductionValue: parseFloat(totalProductionValue.toFixed(2)),
        totalFinishedWasteValue: parseFloat(totalFinishedWasteValue.toFixed(2)),
        totalDoughWasteQuantity: parseFloat(totalDoughWasteQuantity.toFixed(2)),
        doughWasteUnit,
        totalFillingWasteQuantity: parseFloat(totalFillingWasteQuantity.toFixed(2)),
        fillingWasteUnit,
    };
};

// Helper to get date ranges, considering Beijing Time (UTC+8)
const getDateRange = (period, targetDateStr) => {
    // Parse the date string and treat it as a date in Beijing Time zone.
    const targetDateInBJT = moment(targetDateStr).utcOffset('+08:00');
    let startDate, endDate;

    if (period === 'daily') {
        // The start and end of the day in Beijing Time
        startDate = targetDateInBJT.clone().startOf('day');
        endDate = targetDateInBJT.clone().endOf('day');
    } else if (period === 'weekly') {
        // The start of the week is Monday in Beijing Time
        startDate = targetDateInBJT.clone().startOf('isoWeek');
        // The end of the week is Sunday in Beijing Time
        endDate = targetDateInBJT.clone().endOf('isoWeek');
    } else if (period === 'monthly') {
        // The start and end of the month in Beijing Time
        startDate = targetDateInBJT.clone().startOf('month');
        endDate = targetDateInBJT.clone().endOf('month');
    } else {
        throw new Error('Invalid period specified');
    }
    
    // .toDate() converts the moment object to a JavaScript Date object, preserving the point in time (in UTC).
    // MongoDB stores dates as UTC, so this is what we need for querying.
    return { startDate: startDate.toDate(), endDate: endDate.toDate() };
};

const getDashboardSummary = async (req, res) => {
    try {
        const { periodType, date } = req.query; // periodType: 'daily', 'weekly', 'monthly'
        if (!periodType || !['daily', 'weekly', 'monthly'].includes(periodType)) {
            return res.status(400).json({ success: false, message: '请提供有效的汇总周期 (daily, weekly, monthly)' });
        }
        if (!date || !moment(date, 'YYYY-MM-DD', true).isValid()) {
            return res.status(400).json({ success: false, message: '请提供有效的日期 (YYYY-MM-DD)' });
        }

        // Use BJT for all date calculations
        const targetDateInBJT = moment(date).utcOffset('+08:00');

        // 1. Calculate Summary for the selected period (day, week, or month)
        const summaryRange = getDateRange(periodType, date);
        const reportsForSummary = await DailyReport.find({
            date: { $gte: summaryRange.startDate, $lte: summaryRange.endDate }
        }).lean();
        const periodSummary = calculateSummariesFromReports(reportsForSummary);

        // DEBUG: Log if reportsForSummary is empty
        if (!reportsForSummary || reportsForSummary.length === 0) {
            console.log(`[DashboardController DEBUG] No reports found for summary period: ${summaryRange.startDate.toISOString()} to ${summaryRange.endDate.toISOString()}`);
        }

        // 2. Prepare Production/Waste Trend Chart Data
        let trendStartDate, trendEndDate;
        let trendDataPoints = {};

        if (periodType === 'daily') {
            trendStartDate = targetDateInBJT.clone().subtract(6, 'days').startOf('day');
            trendEndDate = targetDateInBJT.clone().endOf('day');
            const reportsForTrend = await DailyReport.find({ date: { $gte: trendStartDate.toDate(), $lte: trendEndDate.toDate() } }).sort({ date: 'asc' }).lean();
            
            // Group reports by day for the trend
            const dailyDataMap = new Map();
            for (let d = 0; d < 7; d++) {
                const day = trendStartDate.clone().add(d, 'days');
                dailyDataMap.set(day.format('YYYY-MM-DD'), { date: day.format('YYYY-MM-DD'), productionValue: 0, wasteValue: 0 });
            }
            reportsForTrend.forEach(r => {
                // Convert DB date (UTC) to BJT to get the correct day key
                const dayKey = moment(r.date).utcOffset('+08:00').format('YYYY-MM-DD');
                if (dailyDataMap.has(dayKey)) {
                    const sums = calculateSummariesFromReports([r]); // Calculate for this single report
                    const existing = dailyDataMap.get(dayKey);
                    existing.productionValue += sums.totalProductionValue;
                    existing.wasteValue += sums.totalFinishedWasteValue; // Assuming wasteValue here means finished product waste value for the trend
                }
            });
            trendDataPoints = Array.from(dailyDataMap.values());

        } else if (periodType === 'weekly') {
            trendStartDate = targetDateInBJT.clone().startOf('isoWeek');
            trendEndDate = targetDateInBJT.clone().endOf('isoWeek');
            const reportsForWeekTrend = await DailyReport.find({ date: { $gte: trendStartDate.toDate(), $lte: trendEndDate.toDate() } }).sort({date: 'asc'}).lean();
            const weeklyDataMap = new Map();
             for (let d = 0; d < 7; d++) {
                const day = trendStartDate.clone().add(d, 'days');
                weeklyDataMap.set(day.format('YYYY-MM-DD'), { date: day.format('MM-DD'), productionValue: 0, wasteValue: 0 });
            }
            reportsForWeekTrend.forEach(r => {
                const dayKey = moment(r.date).utcOffset('+08:00').format('YYYY-MM-DD');
                 if (weeklyDataMap.has(dayKey)) {
                    const sums = calculateSummariesFromReports([r]);
                    const existing = weeklyDataMap.get(dayKey);
                    existing.productionValue += sums.totalProductionValue;
                    existing.wasteValue += sums.totalFinishedWasteValue;
                }
            });
            trendDataPoints = Array.from(weeklyDataMap.values());

        } else if (periodType === 'monthly') {
            trendStartDate = targetDateInBJT.clone().startOf('month');
            trendEndDate = targetDateInBJT.clone().endOf('month');
            const reportsForMonthTrend = await DailyReport.find({ date: { $gte: trendStartDate.toDate(), $lte: trendEndDate.toDate() } }).sort({date: 'asc'}).lean();
            const monthlyDataMap = new Map();
            const daysInMonth = trendEndDate.date();
            for (let d = 1; d <= daysInMonth; d++) {
                const day = trendStartDate.clone().date(d);
                monthlyDataMap.set(day.format('YYYY-MM-DD'), { date: day.format('MM-DD'), productionValue: 0, wasteValue: 0 });
            }
             reportsForMonthTrend.forEach(r => {
                const dayKey = moment(r.date).utcOffset('+08:00').format('YYYY-MM-DD');
                if (monthlyDataMap.has(dayKey)) {
                    const sums = calculateSummariesFromReports([r]);
                    const existing = monthlyDataMap.get(dayKey);
                    existing.productionValue += sums.totalProductionValue;
                    existing.wasteValue += sums.totalFinishedWasteValue;
                }
            });
            trendDataPoints = Array.from(monthlyDataMap.values());
        }

        // 3. Prepare Waste Composition Chart Data (based on reportsForSummary)
        const wasteComposition = {
            finishedProducts: periodSummary.totalFinishedWasteValue,
            dough: periodSummary.totalDoughWasteQuantity,
            filling: periodSummary.totalFillingWasteQuantity,
        };

        // --- START: New Material Consumption Logic ---
        const aggregatedRawMaterialConsumption = {};

        const aggregateMaterials = (materialsObject) => {
            for (const ingName in materialsObject) {
                const material = materialsObject[ingName];
                if (aggregatedRawMaterialConsumption[ingName]) {
                    aggregatedRawMaterialConsumption[ingName].quantity += material.quantity;
                } else {
                    aggregatedRawMaterialConsumption[ingName] = { ...material };
                }
            }
        };

        console.log(`[DashboardController DEBUG] Starting material consumption calculation. Number of reports: ${reportsForSummary.length}`);
        for (const report of reportsForSummary) {
            console.log(`[DashboardController DEBUG] Processing report for date: ${report.date}`);
            for (const p of report.products) {
                // Log both productId and productName for clarity
                console.log(`[DashboardController DEBUG] Processing product - ID: ${p.productId}, Name: ${p.productName}, Produced: ${p.quantityProduced}, Wasted: ${p.finishedWasteQuantity}`);
                
                // Use p.productId for lookup, assuming it matches the ID in breadTypes.js
                const lookupKey = p.productId; 

                if (p.quantityProduced > 0) {
                    const materialsForProduced = await getRawMaterialsForProduct(lookupKey);
                    console.log(`[DashboardController DEBUG] Materials for PRODUCED ${lookupKey} (x${p.quantityProduced}):`, JSON.stringify(materialsForProduced, null, 2));
                    const scaledMaterialsProduced = {};
                    for (const ingName in materialsForProduced) {
                        scaledMaterialsProduced[ingName] = {
                            ...materialsForProduced[ingName],
                            quantity: materialsForProduced[ingName].quantity * p.quantityProduced
                        };
                    }
                    aggregateMaterials(scaledMaterialsProduced);
                }
                if (p.finishedWasteQuantity > 0) {
                    const materialsForWasted = await getRawMaterialsForProduct(lookupKey);
                    console.log(`[DashboardController DEBUG] Materials for WASTED ${lookupKey} (x${p.finishedWasteQuantity}):`, JSON.stringify(materialsForWasted, null, 2));
                    const scaledMaterialsWasted = {};
                    for (const ingName in materialsForWasted) {
                        scaledMaterialsWasted[ingName] = {
                            ...materialsForWasted[ingName],
                            quantity: materialsForWasted[ingName].quantity * p.finishedWasteQuantity
                        };
                    }
                    aggregateMaterials(scaledMaterialsWasted); 
                }
            }

            for (const dw of report.doughWastes) {
                // Assuming dw.doughId is the correct key for getRawMaterialsForDough
                console.log(`[DashboardController DEBUG] Processing dough waste - ID: ${dw.doughId}, Name: ${dw.doughName}, Quantity: ${dw.quantity}`);
                if (dw.quantity > 0) {
                    const materialsForDoughWaste = await getRawMaterialsForDough(dw.doughId, dw.quantity);
                    console.log(`[DashboardController DEBUG] Materials for DOUGH WASTE ${dw.doughId} (x${dw.quantity}):`, JSON.stringify(materialsForDoughWaste, null, 2));
                    aggregateMaterials(materialsForDoughWaste);
                }
            }

            for (const fw of report.fillingWastes) {
                // Assuming fw.fillingId is the correct key for getRawMaterialsForFilling
                console.log(`[DashboardController DEBUG] Processing filling waste - ID: ${fw.fillingId}, Name: ${fw.fillingName}, Quantity: ${fw.quantity}`);
                if (fw.quantity > 0) {
                    const materialsForFillingWaste = await getRawMaterialsForFilling(fw.fillingId, fw.quantity);
                    console.log(`[DashboardController DEBUG] Materials for FILLING WASTE ${fw.fillingId} (x${fw.quantity}):`, JSON.stringify(materialsForFillingWaste, null, 2));
                    aggregateMaterials(materialsForFillingWaste);
                }
            }
        }
        // --- END: New Material Consumption Logic ---

        // --- START: Augment Material Consumption with Base Units and Norms ---
        const finalAggregatedRawMaterialConsumption = {};
        if (aggregatedRawMaterialConsumption && Object.keys(aggregatedRawMaterialConsumption).length > 0) {
            const ingredientNames = Object.keys(aggregatedRawMaterialConsumption);
            const ingredientDetailsFromDB = await Ingredient.find({ name: { $in: ingredientNames } }).lean();
            const ingredientMap = ingredientDetailsFromDB.reduce((map, ing) => {
                map[ing.name] = ing;
                return map;
            }, {});

            for (const ingName in aggregatedRawMaterialConsumption) {
                const consumedMaterial = aggregatedRawMaterialConsumption[ingName];
                const dbIngredient = ingredientMap[ingName];

                if (dbIngredient) {
                    const norms = typeof dbIngredient.norms === 'number' && dbIngredient.norms > 0 ? dbIngredient.norms : 1;
                    const quantityInPurchaseUnit = consumedMaterial.quantity / norms;
                    
                    // 动态计算总库存 - use Object.values() for plain objects
                    let totalStockInPurchaseUnit = 0;
                    if (dbIngredient.stockByPost && typeof dbIngredient.stockByPost === 'object' && Object.keys(dbIngredient.stockByPost).length > 0) {
                      for (const stock of Object.values(dbIngredient.stockByPost)) {
                        totalStockInPurchaseUnit += stock.quantity || 0;
                      }
                    }

                    finalAggregatedRawMaterialConsumption[ingName] = {
                        name: consumedMaterial.name,
                        quantity: quantityInPurchaseUnit, // Send the converted quantity
                        unit: dbIngredient.unit,         // Send the purchase unit name
                        currentStock: totalStockInPurchaseUnit, // Add dynamically calculated total stock
                    };
                } else {
                    // Ingredient from consumption not found in DB, or missing baseUnit/norms
                    console.warn(`[DashboardController] Ingredient '${ingName}' from consumption not found in DB or missing norms. Displaying in base unit.`);
                    finalAggregatedRawMaterialConsumption[ingName] = {
                        name: consumedMaterial.name,
                        quantity: consumedMaterial.quantity, // a quantity in base units
                        unit: consumedMaterial.unit, // the base unit name
                        currentStock: 0, // Cannot determine stock
                    };
                }
            }
        }
        // --- END: Augment Material Consumption ---

        reportsForSummary.forEach(report => {
            const reportDateStr = moment(report.date).format('YYYY-MM-DD');
            if (!trendDataPoints[reportDateStr]) {
                trendDataPoints[reportDateStr] = { productionValue: 0, wasteValue: 0 };
            }

            report.products.forEach(p => {
                const producedValue = p.price * p.quantityProduced;
                const wastedValue = p.price * p.finishedWasteQuantity;
                trendDataPoints[reportDateStr].productionValue += producedValue;
                trendDataPoints[reportDateStr].wasteValue += wastedValue;
                wasteComposition.finishedProducts += wastedValue;
            });

            report.doughWastes.forEach(dw => {
                // Assuming dw.value is pre-calculated or we focus on quantity
                // For now, focusing on quantity for waste composition and consumption
                trendDataPoints[reportDateStr].wasteValue += dw.quantity; // dw.quantity is weight in grams
            });

            report.fillingWastes.forEach(fw => {
                trendDataPoints[reportDateStr].wasteValue += fw.quantity; // fw.quantity is weight in grams
            });
        });

        // Finalize trend data for the chart
        let trendChartData = [];
        const dayFormat = periodType === 'monthly' ? 'DD' : 'YYYY-MM-DD'; 

        if (periodType === 'daily') {
            // For daily, show 7 days: 3 before, selected, 3 after
            for (let i = -3; i <= 3; i++) {
                const currentDay = moment(date).add(i, 'days');
                const dayStr = currentDay.format('YYYY-MM-DD');
                const dataPoint = trendDataPoints[dayStr] || { productionValue: 0, wasteValue: 0 };
                trendChartData.push({
                    date: currentDay.format(dayFormat), // For daily, can show short date or day name
                    productionValue: parseFloat(dataPoint.productionValue.toFixed(2)),
                    wasteValue: parseFloat(dataPoint.wasteValue.toFixed(2)),
                });
            }
        } else if (periodType === 'weekly') {
            for (let i = 0; i < 7; i++) {
                const currentDay = moment(summaryRange.startDate).add(i, 'days');
                const dayStr = currentDay.format('YYYY-MM-DD');
                const dataPoint = trendDataPoints[dayStr] || { productionValue: 0, wasteValue: 0 };
                trendChartData.push({
                    date: currentDay.format('ddd'), // Day of week e.g. Mon
                    productionValue: parseFloat(dataPoint.productionValue.toFixed(2)),
                    wasteValue: parseFloat(dataPoint.wasteValue.toFixed(2)),
                });
            }
        } else if (periodType === 'monthly') {
            const daysInMonth = moment(date).daysInMonth();
            for (let i = 1; i <= daysInMonth; i++) {
                const currentDay = moment(summaryRange.startDate).date(i);
                const dayStr = currentDay.format('YYYY-MM-DD');
                const dataPoint = trendDataPoints[dayStr] || { productionValue: 0, wasteValue: 0 };
                trendChartData.push({
                    date: currentDay.format(dayFormat), // Day of month e.g. 01, 02
                    productionValue: parseFloat(dataPoint.productionValue.toFixed(2)),
                    wasteValue: parseFloat(dataPoint.wasteValue.toFixed(2)),
                });
            }
        }

        // Finalize waste composition data (values for now)
        // If you want dough/filling waste values, they need to be calculated based on their raw material cost
        // For now, wasteComposition sums finished product waste value.
        // The new `aggregatedRawMaterialConsumption` provides quantity breakdown.
        const wasteCompositionChartData = [
            { name: '成品报废价值', value: parseFloat(wasteComposition.finishedProducts.toFixed(2)) },
            { name: '面团报废量(g)', value: wasteComposition.dough },
            { name: '馅料报废量(g)', value: wasteComposition.filling },
        ];

        // 4. Format date range string for response
        let currentDateRange = '';
        if (periodType === 'weekly') {
            const startStr = targetDateInBJT.clone().startOf('isoWeek').format('YYYY-MM-DD');
            const endStr = targetDateInBJT.clone().endOf('isoWeek').format('YYYY-MM-DD');
            currentDateRange = `${startStr} - ${endStr}`;
        } else if (periodType === 'monthly') {
            currentDateRange = targetDateInBJT.format('YYYY-MM');
        }

        // DEBUG: Log the material consumption data before sending response
        console.log('[DashboardController DEBUG] Material Consumption to be sent:', JSON.stringify(finalAggregatedRawMaterialConsumption, null, 2));

        res.json({
            success: true,
            data: {
                currentDate: targetDateInBJT.format('YYYY-MM-DD'),
                currentDateRange: currentDateRange, // Add the formatted date range
                period: periodType,
                summary: periodSummary,
                charts: {
                    productionWasteTrend: trendChartData,
                    wasteComposition: wasteCompositionChartData,
                },
                rawMaterialConsumption: finalAggregatedRawMaterialConsumption,
                wasteComposition: Object.entries(wasteComposition).map(([key, value]) => ({ name: key, value })),
            }
        });

    } catch (error) {
        console.error('Error in getDashboardSummary:', error);
        res.status(500).json({ success: false, message: '获取看板数据失败: ' + error.message });
    }
};

module.exports = { getDashboardSummary }; 