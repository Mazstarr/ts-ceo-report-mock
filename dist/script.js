"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const chart_js_1 = require("chart.js");
const fs_1 = require("fs");
const pdfkit_1 = __importDefault(require("pdfkit"));
const moment_1 = __importDefault(require("moment"));
const pandas = __importStar(require("pandas-js"));
const fs = __importStar(require("fs"));
// Constants
const NUM_CUSTOMERS = 300;
const NUM_PAYMENTS = 5000;
const ITEMS = [
    ["item #1 from storefront", 5000],
    ["item #2 from storefront", 40000],
    ["item #3 from storefront", 3000],
    ["service", 6000],
    ["physical goods", 40000]
];
const SUBS = [
    ["subscription item #1 (monthly)", 7000],
    ["subscription item #2 (monthly)", 30000],
];
const CHANNELS = ["Card", "POS", "Bank", "USSD", "Direct Debit"];
const CHURN_RATE = 0.2; // 20% churn rate
const DISPUTE_STATUS = ["Open", "Resolved"];
const GEOGRAPHIES = ["North America", "Europe", "Asia", "South America"];
const PAYMENT_STATUSES = ["Success", "Failed", "Reversed", "Abandoned", "Queued"];
// Customers
const customers = [];
for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const addedOnDate = faker_1.faker.date.past({ years: 3 });
    customers.push({
        name: faker_1.faker.name.fullName(),
        email: faker_1.faker.internet.email(),
        phone: faker_1.faker.phone.number(),
        added_on: addedOnDate,
        last_transaction: null,
        active: true
    });
}
// Payments and disputes
const payments = [];
const disputes = [];
customers.forEach(customer => {
    const customerAddedOn = customer.added_on;
    // Simulate subscriptions
    if (Math.random() > 0.5) {
        if (Math.random() > CHURN_RATE) {
            const subscription = SUBS[Math.floor(Math.random() * SUBS.length)];
            const subscriptionStartDate = new Date(customerAddedOn.getTime() + Math.floor(Math.random() * 31) * 24 * 60 * 60 * 1000);
            for (let month = 0; month < 12; month++) { // 1 year of monthly payments
                const paymentDate = new Date(subscriptionStartDate.getTime() + month * 30 * 24 * 60 * 60 * 1000);
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
    const numOneOffPurchases = Math.floor(Math.random() * 10) + 1;
    for (let j = 0; j < numOneOffPurchases; j++) {
        const item = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        const purchaseDate = faker_1.faker.date.between({ from: customerAddedOn, to: new Date() });
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
                const disputeCreated = purchaseDate;
                const disputeResolved = Math.random() < 0.8 ? new Date(disputeCreated.getTime() + Math.floor(Math.random() * (30 - 5 + 1) + 5) * 24 * 60 * 60 * 1000) : null;
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
const paymentsCsv = payments.map(payment => `${payment.customer_email},${payment.payment_date.toISOString()},${payment.amount},${payment.channel},${payment.item},${payment.geography},${payment.status || ''}`).join('\n');
const customersCsv = customers.map(customer => `${customer.name},${customer.email},${customer.phone},${customer.added_on.toISOString()},${customer.last_transaction ? customer.last_transaction.toISOString() : ''},${customer.active}`).join('\n');
const disputesCsv = disputes.map(dispute => `${dispute.customer_email},${dispute.date_created.toISOString()},${dispute.date_resolved ? dispute.date_resolved.toISOString() : ''},${dispute.status}`).join('\n');
// Save to CSV files
fs.writeFileSync('fake_customers_data.csv', customersCsv);
fs.writeFileSync('fake_disputes_data.csv', disputesCsv);
fs.writeFileSync('fake_payments_data.csv', paymentsCsv);
console.log("Customers:");
console.log(customers.slice(0, 5));
console.log("\nPayments:");
console.log(payments.slice(0, 5));
console.log("\nDisputes:");
console.log(disputes.slice(0, 5));
// Load data from CSV files
const payments_df = pandas.read_csv('fake_payments_data.csv');
const customers_df = pandas.read_csv('fake_customers_data.csv');
const disputes_df = pandas.read_csv('fake_disputes_data.csv');
payments_df['payment_date'] = payments_df['payment_date'].apply((date) => (0, moment_1.default)(date));
customers_df['added_on'] = customers_df['added_on'].apply((date) => (0, moment_1.default)(date));
customers_df['last_transaction'] = customers_df['last_transaction'].apply((date) => (0, moment_1.default)(date));
payments_df['timestamp'] = payments_df['payment_date'].apply((date) => date.format('HH:mm:ss'));
payments_df['month'] = payments_df['payment_date'].apply((date) => date.format('YYYY-MM'));
// Function to analyze revenue and sales trends over the past year
function revenueAndSalesTrends() {
    const lastYear = (0, moment_1.default)().subtract(1, 'years');
    const recentPayments = payments_df.query(`payment_date >= "${lastYear.format()}"`);
    const revenueTrends = recentPayments
        .groupby(['payment_date'])
        .agg({
        total_revenue: { amount: 'sum' },
        total_transactions: { amount: 'count' }
    });
    revenueTrends['payment_date'] = revenueTrends['payment_date'].apply((date) => date.toDate());
    console.log("\nRevenue and Sales Trends Over the Past Year:");
    console.log(revenueTrends);
    return {
        revenue_trends: revenueTrends
    };
}
// Function to analyze customer growth and retention rates
function customerGrowthAndRetention() {
    const customerGrowth = customers_df.groupby(['added_on']).size().reset_index({ name: 'new_customers' });
    const startCustomers = customers_df.query(`added_on <= "${(0, moment_1.default)().subtract(1, 'years').format()}"`).shape[0];
    const newCustomers = customers_df.query(`added_on >= "${(0, moment_1.default)().subtract(1, 'years').format()}"`).shape[0];
    const endCustomers = customers_df.query(`last_transaction >= "${(0, moment_1.default)().subtract(180, 'days').format()}"`).shape[0];
    const retentionRate = startCustomers > 0 ? ((endCustomers - newCustomers) / startCustomers) * 100 : 0;
    console.log("\nCustomer Growth (New Customers per Month):");
    console.log(customerGrowth);
    console.log(`\nCustomer Retention Rate: ${retentionRate.toFixed(2)}%`);
    return {
        customers_gained_each_month: customerGrowth,
        retention_rate_over_last_year: retentionRate,
    };
}
// Function to analyze disputes
function disputeAnalysis() {
    const disputesOpen = disputes_df.query(`status == "Open"`).shape[0];
    const disputesResolvedLastMonth = disputes_df.query(`status == "Resolved" && date_created >= "${(0, moment_1.default)().subtract(1, 'months').format()}"`).shape[0];
    const resolvedDisputes = disputes_df.query(`status == "Resolved"`);
    let meanTimeToResolution = 0;
    if (resolvedDisputes.shape[0] > 0) {
        meanTimeToResolution = resolvedDisputes['date_resolved'].apply((date) => (0, moment_1.default)(date)).subtract(resolvedDisputes['date_created'].apply((date) => (0, moment_1.default)(date))).mean();
    }
    console.log(`\nNumber of Open Disputes: ${disputesOpen}`);
    console.log(`Number of Disputes Resolved in Last Month: ${disputesResolvedLastMonth}`);
    console.log(`Mean Time to Resolution (Days): ${meanTimeToResolution.toFixed(2)}`);
    return {
        open_disputes: disputesOpen,
        resolved_last_month: disputesResolvedLastMonth,
        mean_time_to_resolution: meanTimeToResolution.toFixed(2),
    };
}
// Function to analyze subscription performance
function subscriptionPerformance() {
    const subscriptionItems = payments_df.query(`item.includes("subscription")`);
    const totalSubscriptions = subscriptionItems.shape[0];
    const uniqueSubscribers = subscriptionItems['customer_email'].nunique();
    const subscriptionHistory = subscriptionItems.groupby(['payment_date'])
        .agg({
        total_subscriptions: { amount: 'count' },
        total_revenue: { amount: 'sum' }
    });
    subscriptionHistory['payment_date'] = subscriptionHistory['payment_date'].apply((date) => date.toDate());
    console.log("\nSubscription Performance:");
    console.log(subscriptionHistory);
    console.log(`Total Subscriptions: ${totalSubscriptions}, Unique Subscribers: ${uniqueSubscribers}`);
    return {
        subscription_history: subscriptionHistory,
        total_subscriptions: totalSubscriptions,
        num_subscribers: uniqueSubscribers
    };
}
// Function for product performance analysis
function productPerformance() {
    const productSalesHistory = payments_df.groupby(['item']).agg({
        total_sales: { amount: 'sum' },
        total_transactions: { amount: 'count' },
        average_sale_value: { amount: 'mean' }
    });
    console.log("\nProduct Performance Analysis:");
    console.log(productSalesHistory);
    return {
        product_sales_history: productSalesHistory,
    };
}
// Calling the functions
revenueAndSalesTrends();
customerGrowthAndRetention();
disputeAnalysis();
subscriptionPerformance();
productPerformance();
chart_js_1.Chart.register(...chart_js_1.registerables);
function peakShoppingTimes() {
    const peakTimes = Array(24).fill(0); // Array to hold counts for each hour
    // Count transactions per hour
    payments.forEach(payment => {
        const hour = payment.payment_date.getHours();
        peakTimes[hour]++;
    });
    // Create a bar chart using Chart.js
    const ctx = document.getElementById('peakShoppingTimes');
    new chart_js_1.Chart(ctx, {
        type: 'bar',
        data: {
            labels: Array.from({ length: 24 }, (_, i) => i.toString()),
            datasets: [{
                    label: 'Number of Transactions',
                    data: peakTimes,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
    return {
        peak_shopping_times: peakTimes
    };
}
function salesAnalysisThisMonth() {
    const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
    const monthlySales = payments.filter(payment => {
        const paymentMonth = payment.payment_date.toISOString().slice(0, 7); // Format: YYYY-MM
        return paymentMonth === currentMonth;
    });
    const productRevenue = monthlySales.reduce((acc, curr) => {
        acc[curr.item] = (acc[curr.item] || 0) + curr.amount;
        return acc;
    }, {});
    const topProducts = Object.entries(productRevenue)
        .map(([item, total_revenue]) => ({ item, total_revenue }))
        .sort((a, b) => b.total_revenue - a.total_revenue)
        .slice(0, 5);
    return {
        top_products_this_month: topProducts,
        monthly_sales: monthlySales
    };
}
function customerSegmentation() {
    const newCustomers = customers.filter(customer => customer.last_transaction && (new Date().getTime() - new Date(customer.last_transaction).getTime()) / (1000 * 3600 * 24) < 30);
    const totalCustomers = customers.length;
    const returningCustomersCount = totalCustomers - newCustomers.length;
    return {
        new_customers: newCustomers.length,
        returning_customers: returningCustomersCount,
        total_customers: totalCustomers,
        percentage_returning: (returningCustomersCount / totalCustomers) * 100,
        percentage_new: (newCustomers.length / totalCustomers) * 100
    };
}
function performanceComparison() {
    const currentMonth = new Date().toISOString().slice(0, 7); // Format: YYYY-MM
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7); // Format: YYYY-MM
    const currentMonthSales = payments
        .filter(payment => payment.payment_date.toISOString().slice(0, 7) === currentMonth)
        .reduce((acc, curr) => acc + curr.amount, 0);
    const lastMonthSales = payments
        .filter(payment => payment.payment_date.toISOString().slice(0, 7) === lastMonth)
        .reduce((acc, curr) => acc + curr.amount, 0);
    return {
        current_month_sales: currentMonthSales,
        last_month_sales: lastMonthSales
    };
}
function calculateSuccessRate() {
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(payment => payment.status === 'Success').length;
    const failedPayments = payments.filter(payment => payment.status === 'Failure').length;
    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;
    return {
        total_payments: totalPayments,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
        success_rate: successRate
    };
}
// Call functions as needed
salesAnalysisThisMonth();
// Assuming peakTimes is an array of objects with hour and counts properties
function plotCustomerGrowth(customerGrowth) {
    const ctx = document.getElementById('customerGrowthChart');
    const chartData = {
        labels: customerGrowth.map(item => item.added_on),
        datasets: [{
                label: 'New Customers',
                data: customerGrowth.map(item => item.new_customers),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
    };
    new chart_js_1.Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
function plotRevenueAndSales(revenueTrends) {
    const ctx = document.getElementById('revenueSalesChart');
    const totalRevenue = revenueTrends.map(item => item.total_revenue);
    const totalTransactions = revenueTrends.map(item => item.total_transactions);
    const labels = revenueTrends.map(item => item.payment_date);
    new chart_js_1.Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Total Revenue',
                    data: totalRevenue,
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                },
                {
                    label: 'Total Transactions',
                    data: totalTransactions,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
function plotSubscriptionPerformance(subscriptionHistory) {
    const ctx = document.getElementById('subscriptionPerformanceChart');
    const chartData = {
        labels: subscriptionHistory.map(item => item.payment_date),
        datasets: [{
                label: 'Total Subscriptions',
                data: subscriptionHistory.map(item => item.total_subscriptions),
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
    };
    new chart_js_1.Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
function plotProductPerformance(productSalesHistory) {
    productSalesHistory.sort((a, b) => a.total_sales - b.total_sales); // Sorting for better visualization
    const ctx = document.getElementById('productPerformanceChart');
    const chartData = {
        labels: productSalesHistory.map(item => item.item),
        datasets: [{
                label: 'Total Sales Amount',
                data: productSalesHistory.map(item => item.total_sales),
                backgroundColor: 'rgba(255, 206, 86, 0.6)',
                borderColor: 'rgba(255, 206, 86, 1)',
                borderWidth: 1
            }]
    };
    new chart_js_1.Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
function plotTopProducts(topProducts) {
    topProducts.sort((a, b) => a.total_revenue - b.total_revenue); // Sorting for better visualization
    const ctx = document.getElementById('topProductsChart');
    const chartData = {
        labels: topProducts.map(item => item.item),
        datasets: [{
                label: 'Total Revenue',
                data: topProducts.map(item => item.total_revenue),
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
    };
    new chart_js_1.Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
function plotPeakShoppingTimes(peakTimes) {
    const ctx = document.getElementById('peakShoppingTimesChart');
    const chartData = {
        labels: peakTimes.map(item => item.hour.toString()),
        datasets: [{
                label: 'Number of Transactions',
                data: peakTimes.map(item => item.counts),
                backgroundColor: 'rgba(153, 102, 255, 0.6)',
                borderColor: 'rgba(153, 102, 255, 1)',
                borderWidth: 1
            }]
    };
    new chart_js_1.Chart(ctx, {
        type: 'bar',
        data: chartData,
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}
// Define colors
const navy = '#001F3F';
const lightcyan = '#E0FFFF';
const blue = '#007BFF';
const black = '#000000';
// Function to create the PDF report
function createPdfReport(sr, da, satm, revenueTrendsImage, peakTimesImage) {
    const doc = new pdfkit_1.default({ size: 'LETTER' }); // Use PDFDocument instead of pdfkit
    const writeStream = (0, fs_1.createWriteStream)('business_report3.pdf');
    doc.pipe(writeStream);
    doc.fontSize(24)
        .fillColor(navy)
        .text("Your Month with Paystack", { align: 'left' });
    doc.moveDown(2);
    doc.fillColor(black)
        .fontSize(16)
        .text("Revenue Insights", { align: 'left' });
    doc.fontSize(12);
    doc.fillColor(blue)
        .text(`Processed ${sr.total_payments} transactions with a total volume of X!`);
    doc.fillColor(black)
        .text("Successful transactions:");
    doc.fillColor(blue)
        .text(`${sr.successful_payments}`, { continued: true })
        .moveDown(0.5);
    doc.fillColor(black)
        .text("Success Rate:");
    doc.fillColor(blue)
        .text(`${sr.success_rate.toFixed(2)}%`, { continued: true })
        .moveDown(2);
    // Insert Revenue Trend Plot
    doc.image(revenueTrendsImage, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    // Insert Peak Times Plot
    doc.image(peakTimesImage, { fit: [500, 300], align: 'center' });
    doc.moveDown(1);
    doc.fillColor(black)
        .fontSize(16)
        .text("Dispute Insights", { align: 'left' });
    doc.fontSize(12);
    doc.fillColor(blue)
        .text(`You had a total of ${da.open_disputes} open disputes.`);
    if (da.resolved_last_month > 0) {
        const text = `${da.resolved_last_month} were settled in less than ${da.mean_time_to_resolution} days.`;
        const textXPosition = doc.x + doc.widthOfString("You had a total of") * 0.06 * 72;
        doc.text(text, textXPosition, doc.y);
    }
    const bestProduct = satm.top_products_this_month[0].item;
    const bestProductRevenue = satm.top_products_this_month[0].total_revenue;
    doc.fillColor(black)
        .fontSize(16)
        .text("Best Performing Products", { align: 'left' });
    doc.fontSize(12)
        .fillColor(black)
        .text("Most popular product:");
    const bestProductTextXPosition = doc.x + doc.widthOfString("Most popular product:") * 0.06 * 72;
    doc.fillColor(blue)
        .text(`${bestProduct} with revenue of $${bestProductRevenue.toFixed(2)}.`, bestProductTextXPosition, doc.y);
    doc.fontSize(16)
        .text("Quick Insights", { align: 'left' });
    // Finalize the PDF document
    doc.end();
    writeStream.on('finish', () => {
        console.log("PDF report generated successfully!");
    });
}
// Assuming these functions return the necessary data
const rst = revenueAndSalesTrends();
const cgr = customerGrowthAndRetention();
const da = disputeAnalysis();
const sp = subscriptionPerformance();
const pp = productPerformance();
const psp = peakShoppingTimes();
const satm = salesAnalysisThisMonth();
const csg = customerSegmentation();
const pc = performanceComparison();
const sr = calculateSuccessRate();
// Plotting functions called as before
plotCustomerGrowth(cgr.customers_gained_each_month);
plotRevenueAndSales(rst.revenue_trends);
plotSubscriptionPerformance(sp.subscription_history);
plotProductPerformance(pp.product_sales_history);
plotTopProducts(satm.top_products_this_month);
plotPeakShoppingTimes(psp.peak_shopping_times);
// Create PDF report
createPdfReport(sr, da, satm, "monthly_revenue_trends.png", "peak_shopping_times.png");
