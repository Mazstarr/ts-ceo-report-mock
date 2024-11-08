"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
var csvParser = require('csv-parser');
var path = require('path');
var QuickChart = require('quickchart-js');
var Handlebars = require('handlebars');
var pdf = require('html-pdf-node');
var date_fns_1 = require("date-fns");
var fs = require("fs");
var fs_1 = require("fs");
var axios_1 = require("axios");
var constants_1 = require("./constants");
var db_connection_1 = require("./db_connection");
var merchant_id = 100043;
// Function to analyze revenue and sales trends over the past year
var revenueAndSalesTrends = function () { return __awaiter(void 0, void 0, void 0, function () {
    var today, startOfLastYear, recentPayments, revenueTrends;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                today = new Date();
                startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.CUSTOMERS, { merchant_id: merchant_id }, undefined, 'datetime_created_at_local', undefined, 'datetime_created_at_local >= ? AND successful = ?', [startOfLastYear, true])];
            case 1:
                recentPayments = _a.sent();
                revenueTrends = recentPayments.reduce(function (acc, payment) {
                    var paymentDate = (0, date_fns_1.format)(payment.datetime_created_at_local, 'yyyy-MM');
                    if (!acc[paymentDate]) {
                        acc[paymentDate] = { total_revenue: 0, total_transactions: 0 };
                    }
                    acc[paymentDate].total_revenue += parseFloat(payment.amount_transaction);
                    acc[paymentDate].total_transactions += 1;
                    return acc;
                }, {});
                console.log("\nRevenue and Sales Trends Over the Past Year:");
                console.log(revenueTrends);
                return [2 /*return*/, {
                        revenue_trends: revenueTrends
                    }];
        }
    });
}); };
// Function to analyze customer growth and retention rates
var customerGrowthAndRetention = function () { return __awaiter(void 0, void 0, void 0, function () {
    var today, startOfLastYear, startOfSixMonthsAgo, rawQuery, params, recentCustomers, customerGrowth, newCustomers, endCustomers, retentionRate;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                today = new Date();
                startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
                startOfSixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
                rawQuery = "\n        WITH ranked_customers AS (\n            SELECT *, \n                ROW_NUMBER() OVER (PARTITION BY dimcustomerid ORDER BY customer_created_at DESC) AS row_num\n            FROM ??\n            WHERE ?? = ? AND customer_created_at >= ?\n        )\n        SELECT *\n        FROM ranked_customers\n        WHERE row_num = 1\n    ";
                params = [constants_1.TABLES.CUSTOMERS, 'merchant_id', merchant_id, startOfLastYear.toISOString()];
                return [4 /*yield*/, db_connection_1.databaseRepo.executeRawQuery(rawQuery, params)];
            case 1:
                recentCustomers = _a.sent();
                customerGrowth = recentCustomers.reduce(function (acc, customer) {
                    var addedOnMonth = (0, date_fns_1.format)(customer.customer_created_at, 'yyyy-MM');
                    if (!acc[addedOnMonth]) {
                        acc[addedOnMonth] = 0;
                    }
                    acc[addedOnMonth]++;
                    return acc;
                }, {});
                newCustomers = recentCustomers.length;
                endCustomers = recentCustomers.filter(function (customer) { return customer.customer_created_at >= startOfSixMonthsAgo; }).length;
                retentionRate = newCustomers > 0 ? ((endCustomers) / newCustomers) * 100 : 0;
                console.log("\nCustomer Growth (New Customers per Month):");
                console.log(customerGrowth);
                console.log("\nCustomer Retention Rate: ".concat(retentionRate.toFixed(2), "%"));
                return [2 /*return*/, {
                        customers_gained_each_month: customerGrowth,
                        retention_rate_over_last_year: retentionRate.toFixed(2),
                    }];
        }
    });
}); };
// Function to analyze disputes
var disputeAnalysis = function () { return __awaiter(void 0, void 0, void 0, function () {
    var lastMonth, lastMonthISOString, openDisputes, disputesOpen, resolvedDisputesLastMonth, disputesResolvedLastMonth, resolvedDisputes, meanTimeToResolution, totalDays;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                lastMonth = (0, date_fns_1.subMonths)(new Date(), 1);
                lastMonthISOString = lastMonth.toISOString();
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.DISPUTES, undefined, undefined, undefined, { dispute_status: 'Resolved' })];
            case 1:
                openDisputes = _a.sent();
                disputesOpen = openDisputes.length;
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.DISPUTES, { dispute_status: 'Resolved' }, undefined, undefined, undefined, 'dispute_resolved_at_date >= ?', [lastMonthISOString])];
            case 2:
                resolvedDisputesLastMonth = _a.sent();
                disputesResolvedLastMonth = resolvedDisputesLastMonth.length;
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.DISPUTES, { dispute_status: 'Resolved' })];
            case 3:
                resolvedDisputes = _a.sent();
                meanTimeToResolution = 0;
                if (resolvedDisputes.length > 0) {
                    totalDays = resolvedDisputes.reduce(function (acc, dispute) {
                        var createdDate = dispute.dispute_created_at_date ? new Date(dispute.dispute_created_at_date) : null;
                        var resolvedDate = dispute.dispute_resolved_at_date ? new Date(dispute.dispute_resolved_at_date) : null;
                        if (!createdDate || isNaN(createdDate.getTime()) || !resolvedDate || isNaN(resolvedDate.getTime())) {
                            return acc;
                        }
                        if (resolvedDate < createdDate) {
                            return acc;
                        }
                        return acc + ((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)); // Convert ms to days
                    }, 0);
                    meanTimeToResolution = totalDays / resolvedDisputes.length;
                }
                console.log("\nNumber of Open Disputes: ".concat(disputesOpen));
                console.log("Number of Disputes Resolved in Last Month: ".concat(disputesResolvedLastMonth));
                console.log("Mean Time to Resolution (Days): ".concat(meanTimeToResolution.toFixed(2)));
                return [2 /*return*/, {
                        open_disputes: disputesOpen,
                        resolved_last_month: disputesResolvedLastMonth,
                        mean_time_to_resolution: meanTimeToResolution.toFixed(2),
                    }];
        }
    });
}); };
// Function to analyze subscription performance
var subscriptionPerformance = function () { return __awaiter(void 0, void 0, void 0, function () {
    var lastMonth, lastMonthISOString, subscriptionDataLastMonth, totalSubscriptions, subscriptionVolume, uniqueSubscribers, today, startOfLastYear, subscriptionDataLastYear, subscriptionHistory;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                lastMonth = (0, date_fns_1.subMonths)(new Date(), 1);
                lastMonthISOString = lastMonth.toISOString();
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.SUBSCRIPTIONS, { merchant_id: merchant_id }, undefined, 'dw_modified', undefined, 'dw_modified >= ? AND dw_modified < ?', [lastMonthISOString, new Date().toISOString()])];
            case 1:
                subscriptionDataLastMonth = _a.sent();
                totalSubscriptions = subscriptionDataLastMonth.length;
                subscriptionVolume = subscriptionDataLastMonth.reduce(function (sum, sale) { return sum + sale.amount_subscription; }, 0);
                uniqueSubscribers = new Set(subscriptionDataLastMonth.map(function (payment) { return payment.dimcustomerid; })).size;
                today = new Date();
                startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.SUBSCRIPTIONS, { merchant_id: merchant_id }, undefined, 'dw_modified', undefined, 'dw_modified >= ? AND dw_modified < ?', [startOfLastYear, new Date().toISOString()])];
            case 2:
                subscriptionDataLastYear = _a.sent();
                subscriptionHistory = subscriptionDataLastYear.reduce(function (acc, payment) {
                    var paymentDate = (0, date_fns_1.format)(payment.dw_modified, 'yyyy-MM');
                    if (!acc[paymentDate]) {
                        acc[paymentDate] = { total_subscriptions: 0, total_revenue: 0 };
                    }
                    acc[paymentDate].total_subscriptions += 1;
                    acc[paymentDate].total_revenue += payment.amount_subscription;
                    return acc;
                }, {});
                console.log("\nTotal Subscriptions for Last Month: ".concat(totalSubscriptions));
                console.log("Unique Subscribers for Last Month: ".concat(uniqueSubscribers));
                console.log("Subscription History for Last Year:");
                console.log(subscriptionHistory);
                return [2 /*return*/, {
                        total_subscriptions: totalSubscriptions,
                        subscription_volume: subscriptionVolume,
                        unique_subscribers: uniqueSubscribers,
                        subscription_history: subscriptionHistory,
                    }];
        }
    });
}); };
// Function to analyze peak shopping times
var peakShoppingTimes = function () { return __awaiter(void 0, void 0, void 0, function () {
    var today, startOfLastYear, recentPayments, paymentHours, hourCounts, formattedHourCounts;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                today = new Date();
                startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.CUSTOMERS, { merchant_id: merchant_id }, undefined, 'datetime_created_at_local', undefined, 'datetime_created_at_local >= ?', [startOfLastYear])];
            case 1:
                recentPayments = _a.sent();
                paymentHours = recentPayments.map(function (payment) { return payment.datetime_created_at_local.getHours(); });
                hourCounts = paymentHours.reduce(function (acc, hour) {
                    acc[hour] = (acc[hour] || 0) + 1;
                    return acc;
                }, {});
                formattedHourCounts = Object.keys(hourCounts).reduce(function (acc, hour) {
                    var hourNum = parseInt(hour);
                    var timeRange = formatTimeRange(hourNum); // Convert to time range format
                    acc[timeRange] = hourCounts[hour];
                    return acc;
                }, {});
                console.log("Peak Shopping Times:", formattedHourCounts);
                return [2 /*return*/, {
                        peak_shopping_times: formattedHourCounts
                    }];
        }
    });
}); };
// Function to format hour in time range format (e.g., "12 AM - 1 AM")
function formatTimeRange(hour) {
    var startHour = hour;
    var endHour = (hour + 1) % 24;
    var startPeriod = startHour >= 12 ? 'PM' : 'AM';
    var endPeriod = endHour >= 12 ? 'PM' : 'AM';
    var startFormatted = formatHourIn12HourFormat(startHour, startPeriod);
    var endFormatted = formatHourIn12HourFormat(endHour, endPeriod);
    return "".concat(startFormatted, " - ").concat(endFormatted);
}
// Helper function to format hour in 12-hour format
function formatHourIn12HourFormat(hour, period) {
    var formattedHour = hour % 12 || 12; // Convert hour to 12-hour format
    return "".concat(formattedHour, " ").concat(period);
}
// Function for customer segmentation
var customerSegmentation = function () { return __awaiter(void 0, void 0, void 0, function () {
    var today, startOfYear, startOfMonth, endOfMonth, startOfThreeMonthsAgo, endOfThreeMonthsAgo, rawQuery, params, activeCustomersData, newCustomers, returningCustomers, nonReturningCustomers, totalActiveCustomers, percentageReturning, percentageNew, percentageNonReturning;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                today = new Date();
                startOfYear = new Date(today.getFullYear(), 0, 1);
                startOfMonth = new Date(today.getFullYear(), (today.getMonth() - 1), 1);
                endOfMonth = new Date(today.getFullYear(), (today.getMonth() - 1) + 1, 0);
                startOfThreeMonthsAgo = new Date(today.getFullYear(), (today.getMonth() - 1) - 3, 1);
                endOfThreeMonthsAgo = new Date(today.getFullYear(), (today.getMonth() - 1) - 2, 0);
                rawQuery = "\n    WITH ranked_customers AS (\n        SELECT *, \n            ROW_NUMBER() OVER (PARTITION BY dimcustomerid ORDER BY customer_created_at DESC) AS row_num\n        FROM ??\n        WHERE ?? = ? AND datetime_created_at_local >= ?\n    )\n    SELECT *\n    FROM ranked_customers\n    WHERE row_num = 1\n";
                params = [constants_1.TABLES.CUSTOMERS, 'merchant_id', merchant_id, startOfYear.toISOString()];
                return [4 /*yield*/, db_connection_1.databaseRepo.executeRawQuery(rawQuery, params)];
            case 1:
                activeCustomersData = _a.sent();
                newCustomers = activeCustomersData.filter(function (customer) {
                    return customer.customer_created_at && customer.customer_created_at >= startOfMonth && customer.customer_created_at <= endOfMonth;
                });
                returningCustomers = activeCustomersData.filter(function (customer) {
                    return customer.customer_created_at && customer.customer_created_at < startOfThreeMonthsAgo &&
                        customer.datetime_created_at_local && customer.datetime_created_at_local >= startOfThreeMonthsAgo && customer.datetime_created_at_local <= endOfThreeMonthsAgo;
                });
                nonReturningCustomers = activeCustomersData.filter(function (customer) {
                    return customer.customer_created_at && customer.customer_created_at < startOfThreeMonthsAgo &&
                        (!customer.datetime_created_at_local || customer.datetime_created_at_local < startOfThreeMonthsAgo);
                });
                totalActiveCustomers = activeCustomersData.length;
                percentageReturning = (returningCustomers.length / totalActiveCustomers) * 100;
                percentageNew = (newCustomers.length / totalActiveCustomers) * 100;
                percentageNonReturning = (nonReturningCustomers.length / totalActiveCustomers) * 100;
                console.log("Customer Segmentation:", {
                    new_customers: newCustomers.length,
                    returning_customers: returningCustomers.length,
                    non_returning_customers: nonReturningCustomers.length,
                    total_customers: totalActiveCustomers,
                    percentage_returning: percentageReturning,
                    percentage_new: percentageNew,
                    percentage_non_returning: percentageNonReturning
                });
                return [2 /*return*/, {
                        new_customers: newCustomers.length,
                        returning_customers: returningCustomers.length,
                        non_returning_customers: nonReturningCustomers.length,
                        total_customers: totalActiveCustomers,
                        percentage_returning: percentageReturning,
                        percentage_new: percentageNew,
                        percentage_non_returning: percentageNonReturning
                    }];
        }
    });
}); };
// // Function to compare performance between current and last month
var performanceComparison = function () { return __awaiter(void 0, void 0, void 0, function () {
    var currentDate, currentYear, currentMonth, lastMonth, lastYear, startOfCurrentMonth, endOfCurrentMonth, startOfLastMonth, endOfLastMonth, currentMonthSalesData, lastMonthSalesData, currentMonthSales, lastMonthSales;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                currentDate = new Date();
                currentYear = currentDate.getFullYear();
                currentMonth = currentDate.getMonth() - 1;
                lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
                lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;
                startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
                endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);
                startOfLastMonth = new Date(lastYear, lastMonth, 1);
                endOfLastMonth = new Date(lastYear, lastMonth + 1, 0);
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.CUSTOMERS, { merchant_id: merchant_id }, undefined, 'datetime_created_at_local', undefined, 'datetime_created_at_local >= ? AND datetime_created_at_local <= ? AND successful = ?', [startOfCurrentMonth.toISOString(), endOfCurrentMonth.toISOString(), true])];
            case 1:
                currentMonthSalesData = _a.sent();
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.CUSTOMERS, { merchant_id: merchant_id }, undefined, 'datetime_created_at_local', undefined, 'datetime_created_at_local >= ? AND datetime_created_at_local <= ? AND successful = ?', [startOfLastMonth.toISOString(), endOfLastMonth.toISOString(), true])];
            case 2:
                lastMonthSalesData = _a.sent();
                currentMonthSales = currentMonthSalesData.reduce(function (sum, payment) { return sum + parseFloat(payment.amount_transaction); }, 0);
                lastMonthSales = lastMonthSalesData.reduce(function (sum, payment) { return sum + parseFloat(payment.amount_transaction); }, 0);
                console.log("Performance Comparison:", {
                    current_month_sales: currentMonthSales,
                    last_month_sales: lastMonthSales
                });
                return [2 /*return*/, {
                        current_month_sales: currentMonthSales,
                        last_month_sales: lastMonthSales
                    }];
        }
    });
}); };
// // Function to calculate success rate
var calculateSuccessRate = function () { return __awaiter(void 0, void 0, void 0, function () {
    var today, startOfLastMonth, endOfLastMonth, transactions, totalPayments, totalVolume, successfulPayments, failedPayments, successRate;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                today = new Date();
                startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
                return [4 /*yield*/, db_connection_1.databaseRepo.getWhere(constants_1.TABLES.CUSTOMERS, { merchant_id: merchant_id }, undefined, 'datetime_created_at_local', undefined, 'datetime_created_at_local >= ? AND datetime_created_at_local <= ?', [startOfLastMonth.toISOString(), endOfLastMonth.toISOString()])];
            case 1:
                transactions = _a.sent();
                totalPayments = transactions.length;
                totalVolume = transactions.reduce(function (sum, payment) { return sum + parseFloat(payment.amount_transaction); }, 0);
                successfulPayments = transactions.filter(function (payment) { return Boolean(payment.successful); }).length;
                failedPayments = transactions.filter(function (payment) { return !Boolean(payment.successful); }).length;
                successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
                console.log("Success Rate Calculation:", {
                    total_payments: totalPayments,
                    successful_payments: successfulPayments,
                    total_volume: totalVolume,
                    failed_payments: failedPayments,
                    success_rate: successRate
                });
                return [2 /*return*/, {
                        total_payments: totalPayments,
                        total_volume: totalVolume,
                        successful_payments: successfulPayments,
                        failed_payments: failedPayments,
                        success_rate: successRate
                    }];
        }
    });
}); };
// // Function to analyze sales this month
// function salesAnalysisThisMonth() {
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();
//     const currentMonth = currentDate.getMonth();
//     const monthlySales = getMonthlyPayments();
//     const productRevenue = monthlySales.reduce((acc, payment) => {
//         acc[payment.item] = (acc[payment.item] || 0) + payment.amount;
//         return acc;
//     }, {} as Record<string, number>);
//     const topProducts = Object.entries(productRevenue)
//         .sort((a, b) => b[1] - a[1])
//         .slice(0, 5);
//     console.log("Top Products This Month:", topProducts, topProducts[0][0]);
//     return {
//         top_products_this_month: topProducts,
//         monthly_sales: monthlySales
//     };
// }
// // Function for product performance analysis
// function productPerformance() {
//     const productSalesHistory = payments_df.data.reduce((acc, payment) => {
//         if (!acc[payment.item]) {
//             acc[payment.item] = { total_sales: 0, total_transactions: 0, average_sale_value: 0 };
//         }
//         acc[payment.item].total_sales += payment.amount;
//         acc[payment.item].total_transactions += 1;
//         return acc;
//     }, {});
//     // Calculate average sale value
//     Object.keys(productSalesHistory).forEach(item => {
//         const product = productSalesHistory[item];
//         product.average_sale_value = product.total_sales / product.total_transactions;
//     });
//     console.log("\nProduct Performance Analysis:");
//     console.log(productSalesHistory);
//     return {
//         product_sales_history: productSalesHistory,
//     };
// }
function saveChartImage(chart, fileName) {
    return __awaiter(this, void 0, void 0, function () {
        var imageUrl, response, buffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, chart.getShortUrl()];
                case 1:
                    imageUrl = _a.sent();
                    console.log("url", fileName, imageUrl);
                    return [4 /*yield*/, fetch(imageUrl)];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.arrayBuffer()];
                case 3:
                    buffer = _a.sent();
                    (0, fs_1.writeFileSync)(path.join(__dirname, fileName), Buffer.from(buffer));
                    return [2 /*return*/];
            }
        });
    });
}
function plotCustomerGrowth(customerGrowth) {
    return __awaiter(this, void 0, void 0, function () {
        var customerGrowthArray, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    customerGrowthArray = Object.entries(customerGrowth).map(function (_a) {
                        var added_on = _a[0], new_customers = _a[1];
                        return ({
                            added_on: added_on,
                            new_customers: new_customers,
                        });
                    });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'bar',
                        data: {
                            labels: customerGrowthArray.map(function (entry) { return entry.added_on; }),
                            datasets: [{
                                    label: 'New Customers',
                                    data: customerGrowthArray.map(function (entry) { return entry.new_customers; }),
                                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                                }]
                        },
                        options: {
                            plugins: {
                                title: { display: true, text: 'Customer Growth (New Customers per Month)' },
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'customer_growth.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotCustomerSegmentationPie(segmentationData) {
    return __awaiter(this, void 0, void 0, function () {
        var chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'pie',
                        data: {
                            labels: ['New Customers', 'Returning Customers', 'Non-Returning Customers'],
                            datasets: [{
                                    data: [
                                        segmentationData.new_customers,
                                        segmentationData.returning_customers,
                                        segmentationData.non_returning_customers
                                    ],
                                    backgroundColor: [
                                        'rgba(54, 162, 235, 0.6)',
                                        'rgba(255, 99, 132, 0.6)',
                                        'rgba(153, 102, 255, 0.6)'
                                    ],
                                }]
                        },
                        options: {
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Customer Segmentation (New vs. Returning vs. Non-Returning)'
                                }
                            }
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'customer_segmentation_pie.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotRevenueAndSales(revenueTrends) {
    return __awaiter(this, void 0, void 0, function () {
        var revenueTrendsArray, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    revenueTrendsArray = Object.entries(revenueTrends).map(function (_a) {
                        var payment_date = _a[0], _b = _a[1], total_revenue = _b.total_revenue, total_transactions = _b.total_transactions;
                        return ({
                            payment_date: payment_date,
                            total_revenue: total_revenue,
                            total_transactions: total_transactions,
                        });
                    });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'line',
                        data: {
                            labels: revenueTrendsArray.map(function (entry) { return entry.payment_date; }),
                            datasets: [
                                {
                                    label: 'Total Revenue',
                                    data: revenueTrendsArray.map(function (entry) { return entry.total_revenue; }),
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    fill: false,
                                },
                                {
                                    label: 'Total Transactions',
                                    data: revenueTrendsArray.map(function (entry) { return entry.total_transactions; }),
                                    borderColor: 'rgba(153, 102, 255, 1)',
                                    fill: false,
                                }
                            ]
                        },
                        options: {
                            plugins: {
                                title: { display: true, text: 'Revenue and Sales Trends Over the Past Year' },
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'revenue_and_sales_trends.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotRevenue(revenueTrends) {
    return __awaiter(this, void 0, void 0, function () {
        var revenueTrendsArray, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    revenueTrendsArray = Object.entries(revenueTrends).map(function (_a) {
                        var payment_date = _a[0], total_revenue = _a[1].total_revenue;
                        return ({
                            payment_date: payment_date,
                            total_revenue: total_revenue,
                        });
                    });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'line',
                        data: {
                            labels: revenueTrendsArray.map(function (entry) { return entry.payment_date; }),
                            datasets: [
                                {
                                    label: 'Total Revenue',
                                    data: revenueTrendsArray.map(function (entry) { return entry.total_revenue; }),
                                    borderColor: 'rgba(75, 192, 192, 1)',
                                    fill: false,
                                }
                            ]
                        },
                        options: {
                            plugins: {
                                title: { display: true, text: 'Total Revenue Over the Past Year' },
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'total_revenue_trends.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotTransactions(revenueTrends) {
    return __awaiter(this, void 0, void 0, function () {
        var revenueTrendsArray, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    revenueTrendsArray = Object.entries(revenueTrends).map(function (_a) {
                        var payment_date = _a[0], total_transactions = _a[1].total_transactions;
                        return ({
                            payment_date: payment_date,
                            total_transactions: total_transactions,
                        });
                    });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'line',
                        data: {
                            labels: revenueTrendsArray.map(function (entry) { return entry.payment_date; }),
                            datasets: [
                                {
                                    label: 'Total Transactions',
                                    data: revenueTrendsArray.map(function (entry) { return entry.total_transactions; }),
                                    borderColor: 'rgba(153, 102, 255, 1)',
                                    fill: false,
                                }
                            ]
                        },
                        options: {
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Total Transactions Over the Past Year'
                                },
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'total_transaction_trends.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotSubscriptionPerformance(subscriptionHistory) {
    return __awaiter(this, void 0, void 0, function () {
        var subscriptionArray, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    subscriptionArray = Object.entries(subscriptionHistory).map(function (_a) {
                        var payment_date = _a[0], total_subscriptions = _a[1].total_subscriptions;
                        return ({
                            payment_date: payment_date,
                            total_subscriptions: total_subscriptions,
                        });
                    });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'bar',
                        data: {
                            labels: subscriptionArray.map(function (entry) { return entry.payment_date; }), // Extracting payment_date for labels
                            datasets: [{
                                    label: 'Total Subscriptions',
                                    data: subscriptionArray.map(function (entry) { return entry.total_subscriptions; }), // Extracting total_subscriptions for data
                                    backgroundColor: 'rgba(128, 0, 128, 0.6)',
                                }]
                        },
                        options: {
                            plugins: {
                                title: { display: true, text: 'Subscription Performance Over Time' },
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'subscription_performance.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotProductPerformance(productSalesHistory) {
    return __awaiter(this, void 0, void 0, function () {
        var productSalesArray, sortedData, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    productSalesArray = Object.entries(productSalesHistory).map(function (_a) {
                        var item = _a[0], _b = _a[1], total_sales = _b.total_sales, total_transactions = _b.total_transactions, average_sale_value = _b.average_sale_value;
                        return ({
                            item: item,
                            total_sales: total_sales,
                            total_transactions: total_transactions,
                            average_sale_value: average_sale_value,
                        });
                    });
                    sortedData = productSalesArray.sort(function (a, b) { return a.total_sales - b.total_sales; });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'bar',
                        data: {
                            labels: sortedData.map(function (entry) { return entry.item; }),
                            datasets: [{
                                    label: 'Total Sales',
                                    data: sortedData.map(function (entry) { return entry.total_sales; }),
                                    backgroundColor: 'rgba(255, 99, 132, 0.6)',
                                }]
                        },
                        options: {
                            plugins: {
                                title: { display: true, text: 'Product Performance Analysis' },
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'product_performance.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotTopProducts(topProducts) {
    return __awaiter(this, void 0, void 0, function () {
        var chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'bar',
                        data: {
                            labels: topProducts.map(function (entry) { return entry[0]; }),
                            datasets: [{
                                    label: 'Total Revenue',
                                    data: topProducts.map(function (entry) { return entry[1]; }),
                                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                                }]
                        },
                        options: {
                            plugins: {
                                title: { display: true, text: 'Top Products This Month' },
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'top_products_this_month.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function plotPeakShoppingTimes(peakTimes) {
    return __awaiter(this, void 0, void 0, function () {
        var hours, counts, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    hours = Object.keys(peakTimes).map(String);
                    counts = hours.map(function (hour) { return peakTimes[hour]; });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'bar',
                        data: {
                            labels: hours.map(function (hour) { return hour.toString(); }),
                            datasets: [{
                                    label: 'Transaction Counts',
                                    data: counts,
                                    backgroundColor: 'rgba(0, 255, 127, 0.6)',
                                }]
                        },
                        options: {
                            plugins: {
                                title: {
                                    display: true,
                                    text: 'Peak Shopping Times'
                                }
                            },
                            scales: { y: { beginAtZero: true } },
                        }
                    });
                    return [4 /*yield*/, saveChartImage(chart, 'peak_shopping_times.png')];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function getImageUrl(imgPath) {
    var imgData = fs.readFileSync(imgPath).toString('base64');
    var imgSrc = "data:image/png;base64,".concat(imgData);
    return imgSrc;
}
function createPdfReport(sr, da, satm, sp, cgr, csg, result) {
    return __awaiter(this, void 0, void 0, function () {
        var templateHtml, template, templateData, htmlContent, options, file, pdfBuffer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    templateHtml = fs.readFileSync('reportTemplate.html', 'utf-8');
                    template = Handlebars.compile(templateHtml);
                    templateData = {
                        total_payments: sr.total_payments.toLocaleString(),
                        total_volume: sr.total_volume.toLocaleString() || 'X',
                        successful_payments: sr.successful_payments.toLocaleString(),
                        success_rate: sr.success_rate.toFixed(2),
                        peak_times_image: getImageUrl('./peak_shopping_times.png'),
                        revenue_sales_trend: getImageUrl('./revenue_and_sales_trends.png'),
                        revenue_trend_image: getImageUrl('./total_revenue_trends.png'),
                        transaction_trend_image: getImageUrl('./total_transaction_trends.png'),
                        top_products_image: getImageUrl('./top_products_this_month.png'),
                        subscription_performance_image: getImageUrl('./subscription_performance.png'),
                        customer_growth_image: getImageUrl('./customer_growth.png'),
                        customer_segmentation_image: getImageUrl('./customer_segmentation_pie.png'),
                        total_subscriptions: sp.total_subscriptions,
                        subscription_volume: sp.subscription_volume.toLocaleString(),
                        new_customers: csg.new_customers,
                        retention_rate_over_last_year: cgr.retention_rate_over_last_year,
                        open_disputes: da.open_disputes,
                        resolved_last_month: da.resolved_last_month,
                        mean_time_to_resolution: da.mean_time_to_resolution,
                        best_product: satm.top_products_this_month[0][0],
                        best_product_revenue: satm.top_products_this_month[0][1].toLocaleString(),
                        responses_to_key_questions: result.responses_to_key_questions,
                        action_plan: result.action_plan,
                        ceo_summary_paragraphs_title: result.ceo_summary_paragraphs_title,
                        ceo_summary_paragraphs: result.ceo_summary_paragraphs
                    };
                    htmlContent = template(templateData);
                    options = { format: 'A4' };
                    file = { content: htmlContent };
                    return [4 /*yield*/, pdf.generatePdf(file, options)];
                case 1:
                    pdfBuffer = _a.sent();
                    fs.writeFileSync('business_report.pdf', pdfBuffer);
                    console.log("PDF report generated successfully.");
                    return [2 /*return*/];
            }
        });
    });
}
function getChatCompletion(messages, response_format) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, endpoint, response, error_1;
        var _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    apiKey = process.env.OPENAI_API_KEY;
                    endpoint = 'https://api.openai.com/v1/chat/completions';
                    return [4 /*yield*/, axios_1.default.post(endpoint, {
                            model: 'gpt-4o',
                            messages: messages,
                            response_format: response_format,
                        }, {
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': "Bearer ".concat(apiKey),
                            },
                        })];
                case 1:
                    response = _c.sent();
                    return [2 /*return*/, response.data];
                case 2:
                    error_1 = _c.sent();
                    if (axios_1.default.isAxiosError(error_1)) {
                        console.error('Error response:', (_a = error_1.response) === null || _a === void 0 ? void 0 : _a.data);
                        console.error('Error headers:', (_b = error_1.response) === null || _b === void 0 ? void 0 : _b.headers);
                    }
                    else {
                        console.error('Unexpected error:', error_1);
                    }
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function generateReport(rst, cgr, da, sp, pp, psp, satm, csg, pc, sr) {
    return __awaiter(this, void 0, void 0, function () {
        var messages, response_format, data, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    messages = [
                        {
                            role: "user",
                            content: "\n                    You are a helpful data analyst for Paystack. Your goal is to generate accurate and useful CEO-level insights from all the processed payment data we will be feeding you.\n                "
                        },
                        {
                            role: "user",
                            content: "\n                    This is the gathered data from business XYZ, what do you make of it? Try to think of questions that can be answered to grow/help their business. Things they need to cut or pay more attention to.\n\n                    i.e. Should I move off this modality? What is the best play for my business right now? \n\n                    This is the data. Start with using thinking tags and generating all possible questions that could be reasoned from the data. Then, analyse the data and filter down to the most relevant ones. \n\n                    Next, try to answer ALL these questions while citing the relevant data provided.\n                    \n                    Next, re-evaluate your answers strictly, and extract the most important ones, then you can create your answer in a response tag.\n\n                    After all of this, I want you to craft an action plan for the CEO in a more friendly and encouraging tone, and then 1 or 2 paragraphs about the general state of their businesses and what they should be thinking of long term. \n\n                    Please and please, ensure not to state things as obvious, give grounding to any statement you're making, it must be backed by data, principles and information, be sure to cite them like [1] and mention under your response if formulas or principles. Do not be condescending or too formal in your CEO response. Provide real value.\n\n                    When you cite something, do not let it be a vague rendition, let it be the real thing you are citing, in FULL.\n                    \n                    {{\n                        revenue_and_sales_trends : ".concat(rst, ",\n                        customer_growth_and_retention : ").concat(cgr, ",\n                        dispute_analysis : ").concat(da, ",\n                        subscription_performance : ").concat(sp, ",\n                        product_performance : ").concat(pp, ",\n                        peak_shopping_times : ").concat(psp, ",\n                        sales_analysis_this_month : ").concat(satm['top_products_this_month'], ",\n                        customer_segmentation: ").concat(csg, ", \n                        performance_comparison: ").concat(pc, ",\n                        calculate_success_rate: ").concat(sr, ",\n                    }}\n                ")
                        }
                    ];
                    response_format = {
                        type: "json_schema",
                        json_schema: {
                            name: "CEO_Summary",
                            schema: {
                                type: "object",
                                properties: {
                                    thinking: { type: "array", items: { type: "string" } },
                                    analysis_and_filtering: { type: "array", items: { type: "string" } },
                                    responses_to_key_questions: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                question: { type: "string" },
                                                answer: { type: "string" }
                                            },
                                            required: ["question", "answer"],
                                            additionalProperties: false
                                        }
                                    },
                                    action_plan_intro: { type: "string" },
                                    action_plan: {
                                        type: "array",
                                        items: {
                                            type: "object",
                                            properties: {
                                                action_title: { type: "string" },
                                                reason_what: { type: "string" },
                                                reason_why_relevance: { type: "string" },
                                                reason_why_gains: { type: "string" },
                                                steps_to_start: {
                                                    type: "array",
                                                    items: { type: "string" }
                                                }
                                            },
                                            required: ["action_title", "reason_what", "reason_why_relevance", "reason_why_gains", "steps_to_start"],
                                            additionalProperties: false
                                        }
                                    },
                                    ceo_summary_paragraphs_title: { type: "string" },
                                    ceo_summary_paragraphs: { type: "string" },
                                    references: { type: "array", items: { type: "string" } }
                                },
                                required: [
                                    "thinking", "analysis_and_filtering", "responses_to_key_questions",
                                    "action_plan_intro", "action_plan", "ceo_summary_paragraphs_title",
                                    "ceo_summary_paragraphs", "references"
                                ],
                                additionalProperties: false
                            },
                            strict: true
                        }
                    };
                    return [4 /*yield*/, getChatCompletion(messages, response_format)];
                case 1:
                    data = _a.sent();
                    return [2 /*return*/, data.choices[0].message.content];
                case 2:
                    error_2 = _a.sent();
                    console.error("error occured while genrating report", error_2);
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var sr, cgr, da, sp, rst, csg, pc, psp, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 16, , 17]);
                    return [4 /*yield*/, calculateSuccessRate()];
                case 1:
                    sr = _a.sent();
                    return [4 /*yield*/, customerGrowthAndRetention()];
                case 2:
                    cgr = _a.sent();
                    return [4 /*yield*/, disputeAnalysis()];
                case 3:
                    da = _a.sent();
                    return [4 /*yield*/, subscriptionPerformance()];
                case 4:
                    sp = _a.sent();
                    return [4 /*yield*/, revenueAndSalesTrends()];
                case 5:
                    rst = _a.sent();
                    return [4 /*yield*/, customerSegmentation()];
                case 6:
                    csg = _a.sent();
                    return [4 /*yield*/, performanceComparison()];
                case 7:
                    pc = _a.sent();
                    return [4 /*yield*/, peakShoppingTimes()
                        // const satm = await salesAnalysisThisMonth();
                        // const pp = await productPerformance();
                    ];
                case 8:
                    psp = _a.sent();
                    // const satm = await salesAnalysisThisMonth();
                    // const pp = await productPerformance();
                    return [4 /*yield*/, plotCustomerSegmentationPie(csg)];
                case 9:
                    // const satm = await salesAnalysisThisMonth();
                    // const pp = await productPerformance();
                    _a.sent();
                    return [4 /*yield*/, plotCustomerGrowth(cgr.customers_gained_each_month)];
                case 10:
                    _a.sent();
                    return [4 /*yield*/, plotRevenueAndSales(rst.revenue_trends)];
                case 11:
                    _a.sent();
                    return [4 /*yield*/, plotRevenue(rst.revenue_trends)];
                case 12:
                    _a.sent();
                    return [4 /*yield*/, plotTransactions(rst.revenue_trends)];
                case 13:
                    _a.sent();
                    return [4 /*yield*/, plotSubscriptionPerformance(sp.subscription_history)];
                case 14:
                    _a.sent();
                    return [4 /*yield*/, plotPeakShoppingTimes(psp.peak_shopping_times)];
                case 15:
                    _a.sent();
                    return [3 /*break*/, 17];
                case 16:
                    error_3 = _a.sent();
                    console.error("Error in analysis functions:", error_3);
                    return [3 /*break*/, 17];
                case 17: return [2 /*return*/];
            }
        });
    });
}
main();
