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
var csvParser = require('csv-parser');
var path = require('path');
var QuickChart = require('quickchart-js');
var faker_1 = require("@faker-js/faker");
var fs_1 = require("fs");
var pdf_lib_1 = require("pdf-lib"); // Replace pdfkit with pdf-lib
var date_fns_1 = require("date-fns"); // Replace moment with date-fns
var fs = require("fs");
var fs_2 = require("fs");
// Constants
var NUM_CUSTOMERS = 300;
var NUM_PAYMENTS = 5000;
var ITEMS = [
    ["item #1 from storefront", 5000],
    ["item #2 from storefront", 40000],
    ["item #3 from storefront", 3000],
    ["service", 6000],
    ["physical goods", 40000]
];
var SUBS = [
    ["subscription item #1 (monthly)", 7000],
    ["subscription item #2 (monthly)", 30000],
];
var CHANNELS = ["Card", "POS", "Bank", "USSD", "Direct Debit"];
var CHURN_RATE = 0.2; // 20% churn rate
var DISPUTE_STATUS = ["Open", "Resolved"];
var GEOGRAPHIES = ["North America", "Europe", "Asia", "South America"];
var PAYMENT_STATUSES = ["Success", "Failed", "Reversed", "Abandoned", "Queued"];
// Customers
var customers = [];
for (var i = 0; i < NUM_CUSTOMERS; i++) {
    var addedOnDate = faker_1.faker.date.past({ years: 3 });
    customers.push({
        name: faker_1.faker.person.fullName(),
        email: faker_1.faker.internet.email(),
        phone: faker_1.faker.phone.number(),
        added_on: addedOnDate,
        last_transaction: null,
        active: true
    });
}
// Payments and disputes
var payments = [];
var disputes = [];
customers.forEach(function (customer) {
    var customerAddedOn = customer.added_on;
    // Simulate subscriptions
    if (Math.random() > 0.5) {
        if (Math.random() > CHURN_RATE) {
            var subscription = SUBS[Math.floor(Math.random() * SUBS.length)];
            var subscriptionStartDate = new Date(customerAddedOn.getTime() + Math.floor(Math.random() * 31) * 24 * 60 * 60 * 1000);
            for (var month = 0; month < 12; month++) { // 1 year of monthly payments
                var paymentDate = new Date(subscriptionStartDate.getTime() + month * 30 * 24 * 60 * 60 * 1000);
                if (paymentDate <= new Date()) {
                    payments.push({
                        customer_email: customer.email,
                        payment_date: paymentDate,
                        amount: subscription[1],
                        channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
                        item: subscription[0],
                        geography: GEOGRAPHIES[Math.floor(Math.random() * GEOGRAPHIES.length)]
                    });
                    customer.last_transaction = paymentDate;
                }
            }
        }
    }
    // Simulate one-off purchases for active customers
    var numOneOffPurchases = Math.floor(Math.random() * 10) + 1;
    for (var j = 0; j < numOneOffPurchases; j++) {
        var item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        var purchaseDate = faker_1.faker.date.between({ from: customerAddedOn, to: new Date() });
        if (purchaseDate <= new Date()) {
            payments.push({
                customer_email: customer.email,
                payment_date: purchaseDate,
                amount: item[1],
                channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
                item: item[0],
                geography: GEOGRAPHIES[Math.floor(Math.random() * GEOGRAPHIES.length)],
                status: PAYMENT_STATUSES[Math.floor(Math.random() * PAYMENT_STATUSES.length)]
            });
            customer.last_transaction = purchaseDate;
            // Randomly create disputes for some transactions
            if (Math.random() < 0.1 && Math.random() < 0.1) { // 1% chance of dispute
                var disputeCreated = purchaseDate;
                var disputeResolved = Math.random() < 0.8 ? new Date(disputeCreated.getTime() + Math.floor(Math.random() * (30 - 5 + 1) + 5) * 24 * 60 * 60 * 1000) : null;
                disputes.push({
                    customer_email: customer.email,
                    date_created: disputeCreated,
                    date_resolved: disputeResolved,
                    status: disputeResolved ? 'Resolved' : 'Open'
                });
            }
        }
    }
});
// Convert payments and customers data to CSV format
var paymentsCsv = payments.map(function (payment) { return "".concat(payment.customer_email, ",").concat(payment.payment_date.toISOString(), ",").concat(payment.amount, ",").concat(payment.channel, ",").concat(payment.item, ",").concat(payment.geography, ",").concat(payment.status || ''); }).join('\n');
var customersCsv = customers.map(function (customer) { return "".concat(customer.name, ",").concat(customer.email, ",").concat(customer.phone, ",").concat(customer.added_on.toISOString(), ",").concat(customer.last_transaction ? customer.last_transaction.toISOString() : '', ",").concat(customer.active); }).join('\n');
var disputesCsv = disputes.map(function (dispute) { return "".concat(dispute.customer_email, ",").concat(dispute.date_created.toISOString(), ",").concat(dispute.date_resolved ? dispute.date_resolved.toISOString() : '', ",").concat(dispute.status); }).join('\n');
// Save to CSV files
// fs.writeFileSync('fake_customers_data.csv', customersCsv);
// fs.writeFileSync('fake_disputes_data.csv', disputesCsv);
// fs.writeFileSync('fake_payments_data.csv', paymentsCsv);
console.log("Customers:");
console.log(customers.slice(0, 5));
console.log("\nPayments:");
console.log(payments.slice(0, 5));
console.log("\nDisputes:");
console.log(disputes.slice(0, 5));
function createDataFrame(data) {
    return {
        data: data,
        head: function (n) {
            return this.data.slice(0, n);
        },
    };
}
function addDataToDataFrame(dataFrame, newData) {
    dataFrame.data.push(newData);
}
// Read data from csvt
var payments_df = createDataFrame([]);
var customers_df = createDataFrame([]);
var disputes_df = createDataFrame([]);
var customersHeaders = ['name', 'email', 'phone', 'added_on', 'last_transaction', 'active'];
var paymentsHeaders = [
    'customer_email',
    'payment_date',
    'amount',
    'channel',
    'item',
    'geography',
    'status'
];
var disputesHeaders = [
    'customer_email',
    'date_created',
    'date_resolved',
    'status'
];
function loadPaymentsData() {
    return new Promise(function (resolve, reject) {
        (0, fs_1.createReadStream)('fake_payments_data.csv')
            .pipe(csvParser({ headers: paymentsHeaders }))
            .on('data', function (row) {
            addDataToDataFrame(payments_df, {
                customer_email: row.customer_email,
                payment_date: new Date(row.payment_date),
                amount: parseFloat(row.amount),
                channel: row.channel,
                item: row.item,
                geography: row.geography,
                status: row.status || undefined
            });
        })
            .on('end', function () {
            console.log("Payments data loaded.");
            resolve();
        })
            .on('error', reject);
    });
}
function loadCustomersData() {
    return new Promise(function (resolve, reject) {
        (0, fs_1.createReadStream)('fake_customers_data.csv')
            .pipe(csvParser({ headers: customersHeaders }))
            .on('data', function (row) {
            addDataToDataFrame(customers_df, {
                name: row.name,
                email: row.email,
                phone: row.phone,
                added_on: new Date(row.added_on),
                last_transaction: row.last_transaction ? new Date(row.last_transaction) : null,
                active: row.active === 'true'
            });
        })
            .on('end', function () {
            console.log("Customers data loaded.");
            resolve();
        })
            .on('error', reject);
    });
}
function loadDisputesData() {
    return new Promise(function (resolve, reject) {
        (0, fs_1.createReadStream)('fake_disputes_data.csv')
            .pipe(csvParser({ headers: disputesHeaders }))
            .on('data', function (row) {
            addDataToDataFrame(disputes_df, {
                customer_email: row.customer_email,
                date_created: new Date(row.date_created),
                date_resolved: row.date_resolved ? new Date(row.date_resolved) : null,
                status: row.status
            });
        })
            .on('end', function () {
            console.log("Disputes data loaded.");
            resolve();
        })
            .on('error', reject);
    });
}
// Function to analyze revenue and sales trends over the past year
function revenueAndSalesTrends() {
    var lastYear = (0, date_fns_1.subYears)(new Date(), 1);
    var recentPayments = payments_df.data.filter(function (payment) { return payment.payment_date >= lastYear; });
    var revenueTrends = recentPayments.reduce(function (acc, payment) {
        var paymentDate = (0, date_fns_1.format)(payment.payment_date, 'yyyy-MM-dd');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_revenue: 0, total_transactions: 0 };
        }
        acc[paymentDate].total_revenue += payment.amount;
        acc[paymentDate].total_transactions += 1;
        return acc;
    }, {});
    // console.log("\nRevenue and Sales Trends Over the Past Year:");
    // console.log(revenueTrends);
    return {
        revenue_trends: revenueTrends
    };
}
// Function to analyze customer growth and retention rates
function customerGrowthAndRetention() {
    var oneYearAgo = (0, date_fns_1.subYears)(new Date(), 1);
    var customerGrowth = customers_df.data.reduce(function (acc, customer) {
        var addedOnDate = (0, date_fns_1.format)(customer.added_on, 'yyyy-MM-dd');
        if (!acc[addedOnDate]) {
            acc[addedOnDate] = 0;
        }
        acc[addedOnDate]++;
        return acc;
    }, {});
    var startCustomers = customers_df.data.filter(function (customer) { return customer.added_on <= oneYearAgo; }).length;
    var newCustomers = customers_df.data.filter(function (customer) { return customer.added_on >= oneYearAgo; }).length;
    var endCustomers = customers_df.data.filter(function (customer) { return customer.last_transaction >= oneYearAgo; }).length;
    var retentionRate = startCustomers > 0 ? ((endCustomers - newCustomers) / startCustomers) * 100 : 0;
    // console.log("\nCustomer Growth (New Customers per Month):");
    // console.log(customerGrowth);
    console.log("\nCustomer Retention Rate: ".concat(retentionRate.toFixed(2), "%"));
    return {
        customers_gained_each_month: customerGrowth,
        retention_rate_over_last_year: retentionRate,
    };
}
// Function to analyze disputes
function disputeAnalysis() {
    var disputesOpen = disputes_df.data.filter(function (dispute) { return dispute.status === "Open"; }).length;
    var disputesResolvedLastMonth = disputes_df.data.filter(function (dispute) {
        return dispute.status === "Resolved" &&
            dispute.date_created >= (0, date_fns_1.subMonths)(new Date(), 1);
    }).length;
    var resolvedDisputes = disputes_df.data.filter(function (dispute) { return dispute.status === "Resolved"; });
    var meanTimeToResolution = 0;
    if (resolvedDisputes.length > 0) {
        var totalDays = resolvedDisputes.reduce(function (acc, dispute) {
            var createdDate = (0, date_fns_1.parseISO)(dispute.date_created.toDateString());
            var resolvedDate = (0, date_fns_1.parseISO)(dispute.date_resolved.toDateString()); // Use non-null assertion
            return acc + ((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)); // Convert ms to days
        }, 0);
        meanTimeToResolution = totalDays / resolvedDisputes.length;
    }
    console.log("\nNumber of Open Disputes: ".concat(disputesOpen));
    console.log("Number of Disputes Resolved in Last Month: ".concat(disputesResolvedLastMonth));
    console.log("Mean Time to Resolution (Days): ".concat(meanTimeToResolution.toFixed(2)));
    return {
        open_disputes: disputesOpen,
        resolved_last_month: disputesResolvedLastMonth,
        mean_time_to_resolution: meanTimeToResolution.toFixed(2),
    };
}
// Function to analyze subscription performance
function subscriptionPerformance() {
    var subscriptionItems = payments_df.data.filter(function (payment) { return payment.item.includes("subscription"); });
    var totalSubscriptions = subscriptionItems.length;
    var uniqueSubscribers = new Set(subscriptionItems.map(function (payment) { return payment.customer_email; })).size;
    var subscriptionHistory = subscriptionItems.reduce(function (acc, payment) {
        var paymentDate = (0, date_fns_1.format)(payment.payment_date, 'yyyy-MM-dd');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_subscriptions: 0, total_revenue: 0 };
        }
        acc[paymentDate].total_subscriptions += 1;
        acc[paymentDate].total_revenue += payment.amount;
        return acc;
    }, {});
    console.log("\nTotal Subscriptions: ".concat(totalSubscriptions));
    console.log("Unique Subscribers: ".concat(uniqueSubscribers));
    return {
        total_subscriptions: totalSubscriptions,
        unique_subscribers: uniqueSubscribers,
        subscription_history: subscriptionHistory,
    };
}
// Function for product performance analysis
function productPerformance() {
    var productSalesHistory = payments_df.data.reduce(function (acc, payment) {
        if (!acc[payment.item]) {
            acc[payment.item] = { total_sales: 0, total_transactions: 0, average_sale_value: 0 };
        }
        acc[payment.item].total_sales += payment.amount;
        acc[payment.item].total_transactions += 1;
        return acc;
    }, {});
    // Calculate average sale value
    Object.keys(productSalesHistory).forEach(function (item) {
        var product = productSalesHistory[item];
        product.average_sale_value = product.total_sales / product.total_transactions;
    });
    console.log("\nProduct Performance Analysis:");
    console.log(productSalesHistory);
    return {
        product_sales_history: productSalesHistory,
    };
}
// Function to analyze peak shopping times
function peakShoppingTimes() {
    var paymentHours = payments_df.data.map(function (payment) { return payment.payment_date.getHours(); });
    var hourCounts = paymentHours.reduce(function (acc, hour) {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {});
    console.log("Peak Shopping Times:", hourCounts);
    // Visualization placeholder (since actual visualization is out of scope in pure TypeScript)
    // Use a charting library such as Chart.js in a real application
    return {
        peak_shopping_times: hourCounts
    };
}
// Function to analyze sales this month
function salesAnalysisThisMonth() {
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    var currentMonth = currentDate.getMonth();
    var monthlySales = payments_df.data.filter(function (payment) {
        var paymentDate = new Date(payment.payment_date);
        return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
    });
    var productRevenue = monthlySales.reduce(function (acc, payment) {
        acc[payment.item] = (acc[payment.item] || 0) + payment.amount;
        return acc;
    }, {});
    var topProducts = Object.entries(productRevenue)
        .sort(function (a, b) { return b[1] - a[1]; })
        .slice(0, 5);
    console.log("Top Products This Month:", topProducts);
    return {
        top_products_this_month: topProducts,
        monthly_sales: monthlySales
    };
}
// Function for customer segmentation
function customerSegmentation() {
    var oneMonthAgo = (0, date_fns_1.subMonths)(new Date(), 1);
    var newCustomers = customers_df.data.filter(function (customer) { return customer.last_transaction && customer.last_transaction >= oneMonthAgo; });
    var totalCustomers = customers_df.data.length;
    var returningCustomersCount = totalCustomers - newCustomers.length;
    var percentageReturning = (returningCustomersCount / totalCustomers) * 100;
    var percentageNew = (newCustomers.length / totalCustomers) * 100;
    console.log("Customer Segmentation:", {
        new_customers: newCustomers.length,
        returning_customers: returningCustomersCount,
        total_customers: totalCustomers,
        percentage_returning: percentageReturning,
        percentage_new: percentageNew
    });
    return {
        new_customers: newCustomers.length,
        returning_customers: returningCustomersCount,
        total_customers: totalCustomers,
        percentage_returning: percentageReturning,
        percentage_new: percentageNew
    };
}
// Function to compare performance between current and last month
function performanceComparison() {
    var currentDate = new Date();
    var currentYear = currentDate.getFullYear();
    var currentMonth = currentDate.getMonth();
    // Determine last month and year
    var lastMonth = currentMonth === 0 ? 11 : currentMonth - 1; // December if current is January
    var lastYear = currentMonth === 0 ? currentYear - 1 : currentYear; // Previous year if current is January
    var currentMonthSales = payments_df.data
        .filter(function (payment) {
        var paymentDate = new Date(payment.payment_date);
        return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
    })
        .reduce(function (sum, payment) { return sum + payment.amount; }, 0);
    var lastMonthSales = payments_df.data
        .filter(function (payment) {
        var paymentDate = new Date(payment.payment_date);
        return paymentDate.getFullYear() === lastYear && paymentDate.getMonth() === lastMonth;
    })
        .reduce(function (sum, payment) { return sum + payment.amount; }, 0);
    console.log("Performance Comparison:", {
        current_month_sales: currentMonthSales,
        last_month_sales: lastMonthSales
    });
    return {
        current_month_sales: currentMonthSales,
        last_month_sales: lastMonthSales
    };
}
// Function to calculate success rate
function calculateSuccessRate() {
    var totalPayments = payments_df.data.length;
    var successfulPayments = payments_df.data.filter(function (payment) { return payment.status === 'Success'; }).length;
    var failedPayments = payments_df.data.filter(function (payment) { return payment.status === 'Failure'; }).length;
    var successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
    console.log("Success Rate Calculation:", {
        total_payments: totalPayments,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
        success_rate: successRate
    });
    return {
        total_payments: totalPayments,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
        success_rate: successRate
    };
}
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
                    (0, fs_2.writeFileSync)(path.join(__dirname, fileName), Buffer.from(buffer));
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
                    }).slice(0, 100);
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
                    }).slice(0, 100);
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
                    }).slice(0, 100);
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
        var sortedData, chart;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sortedData = topProducts.sort(function (a, b) { return a[1] - b[1]; });
                    chart = new QuickChart();
                    chart.setConfig({
                        type: 'bar',
                        data: {
                            labels: sortedData.map(function (entry) { return entry[0]; }),
                            datasets: [{
                                    label: 'Total Revenue',
                                    data: sortedData.map(function (entry) { return entry[1]; }),
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
                    hours = Object.keys(peakTimes).map(Number);
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
function createPdfReport(sr, da, satm) {
    return __awaiter(this, void 0, void 0, function () {
        var pdfDoc, page, navy, lightcyan, blue, black, _a, _b, _c, _d, _e, _f, peakTimesImage, _g, _h, _j, textXPosition, bestProduct, bestProductRevenue, _k, _l, _m, productTextXPosition, _o, _p, _q, pdfBytes;
        var _r, _s, _t, _u, _v;
        return __generator(this, function (_w) {
            switch (_w.label) {
                case 0: return [4 /*yield*/, pdf_lib_1.PDFDocument.create()];
                case 1:
                    pdfDoc = _w.sent();
                    page = pdfDoc.addPage([612, 792]);
                    navy = (0, pdf_lib_1.rgb)(0, 31 / 255, 63 / 255);
                    lightcyan = (0, pdf_lib_1.rgb)(224 / 255, 255 / 255, 255 / 255);
                    blue = (0, pdf_lib_1.rgb)(0, 123 / 255, 255 / 255);
                    black = (0, pdf_lib_1.rgb)(0, 0, 0);
                    // Title
                    _b = (_a = page).drawText;
                    _c = ['Your Month with Paystack'];
                    _r = {
                        x: 72, // 1 inch from the left
                        y: 720, // 10 inches from the bottom
                        size: 24,
                        color: navy
                    };
                    return [4 /*yield*/, pdfDoc.embedFont('Helvetica-Bold')];
                case 2:
                    // Title
                    _b.apply(_a, _c.concat([(_r.font = _w.sent(),
                            _r)]));
                    // Revenue Section
                    _e = (_d = page).drawText;
                    _f = ['Revenue Insights'];
                    _s = {
                        x: 72,
                        y: 680,
                        size: 16,
                        color: black
                    };
                    return [4 /*yield*/, pdfDoc.embedFont('Helvetica-Bold')];
                case 3:
                    // Revenue Section
                    _e.apply(_d, _f.concat([(_s.font = _w.sent(),
                            _s)]));
                    page.drawText("Processed ".concat(sr['total_payments'], " transactions with a total volume of X!"), {
                        x: 72,
                        y: 660,
                        size: 12,
                        color: blue,
                    });
                    page.drawText('Successful transactions:', {
                        x: 72,
                        y: 640,
                        size: 12,
                        color: black,
                    });
                    page.drawText("".concat(sr['successful_payments']), {
                        x: 272,
                        y: 640,
                        size: 12,
                        color: blue,
                    });
                    page.drawText('Success Rate:', {
                        x: 72,
                        y: 620,
                        size: 12,
                        color: black,
                    });
                    page.drawText("".concat(sr['success_rate'].toFixed(2), "%"), {
                        x: 272,
                        y: 620,
                        size: 12,
                        color: blue,
                    });
                    return [4 /*yield*/, pdfDoc.embedPng(fs.readFileSync(path.join(__dirname, 'peak_shopping_times.png')))];
                case 4:
                    peakTimesImage = _w.sent();
                    page.drawImage(peakTimesImage, {
                        x: 72,
                        y: 300,
                        width: 360,
                        height: 180,
                    });
                    // Dispute Section
                    _h = (_g = page).drawText;
                    _j = ['Dispute Insights'];
                    _t = {
                        x: 72,
                        y: 260,
                        size: 16,
                        color: black
                    };
                    return [4 /*yield*/, pdfDoc.embedFont('Helvetica-Bold')];
                case 5:
                    // Dispute Section
                    _h.apply(_g, _j.concat([(_t.font = _w.sent(),
                            _t)]));
                    page.drawText("You had a total of ".concat(da['open_disputes'], " open disputes."), {
                        x: 72,
                        y: 240,
                        size: 12,
                        color: blue,
                    });
                    if (da['resolved_last_month'] > 0) {
                        textXPosition = 72 + (2 * 72) + ("You had a total of".length * 6 / 100 * 72);
                        page.drawText("".concat(da['resolved_last_month'], " were settled in less than ").concat(da['mean_time_to_resolution'], " days."), {
                            x: textXPosition,
                            y: 240,
                            size: 12,
                            color: black,
                        });
                    }
                    bestProduct = satm['top_products_this_month'][0][0];
                    bestProductRevenue = satm['top_products_this_month'][0][1];
                    _l = (_k = page).drawText;
                    _m = ['Best Performing Products'];
                    _u = {
                        x: 72,
                        y: 200,
                        size: 16,
                        color: black
                    };
                    return [4 /*yield*/, pdfDoc.embedFont('Helvetica-Bold')];
                case 6:
                    _l.apply(_k, _m.concat([(_u.font = _w.sent(),
                            _u)]));
                    page.drawText('Most popular product:', {
                        x: 72,
                        y: 180,
                        size: 12,
                        color: black,
                    });
                    productTextXPosition = 72 + (2 * 72) + ('Most popular product:'.length * 6 / 100 * 72);
                    page.drawText("".concat(bestProduct, " with revenue of $").concat(bestProductRevenue.toFixed(2).toLocaleString(), "."), {
                        x: productTextXPosition,
                        y: 180,
                        size: 12,
                        color: blue,
                    });
                    // Quick Insights Section
                    _p = (_o = page).drawText;
                    _q = ['Quick Insights'];
                    _v = {
                        x: 72,
                        y: 160,
                        size: 16,
                        color: black
                    };
                    return [4 /*yield*/, pdfDoc.embedFont('Helvetica-Bold')];
                case 7:
                    // Quick Insights Section
                    _p.apply(_o, _q.concat([(_v.font = _w.sent(),
                            _v)]));
                    return [4 /*yield*/, pdfDoc.save()];
                case 8:
                    pdfBytes = _w.sent();
                    fs.writeFileSync('business_report.pdf', pdfBytes);
                    return [2 /*return*/];
            }
        });
    });
}
function loadData() {
    var _this = this;
    return Promise.all([
        loadPaymentsData(),
        loadCustomersData(),
        loadDisputesData()
    ])
        .then(function () { return __awaiter(_this, void 0, void 0, function () {
        var sr, cgr, da, sp, pp, psp, satm, rst, csg, pc;
        return __generator(this, function (_a) {
            sr = calculateSuccessRate();
            cgr = customerGrowthAndRetention();
            da = disputeAnalysis();
            sp = subscriptionPerformance();
            pp = productPerformance();
            psp = peakShoppingTimes();
            satm = salesAnalysisThisMonth();
            rst = revenueAndSalesTrends();
            csg = customerSegmentation();
            pc = performanceComparison();
            // await plotCustomerGrowth(cgr.customers_gained_each_month);
            // await plotRevenueAndSales(rst.revenue_trends);
            // await plotSubscriptionPerformance(sp.subscription_history);
            // await plotProductPerformance(pp.product_sales_history);
            // await plotPeakShoppingTimes(psp.peak_shopping_times);
            // await plotTopProducts(satm.top_products_this_month);
            createPdfReport(sr, da, satm);
            return [2 /*return*/];
        });
    }); })
        .catch(function (error) {
        console.error("Error loading data:", error);
    });
}
loadData();
