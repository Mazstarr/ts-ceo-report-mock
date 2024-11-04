const csvParser = require('csv-parser');
const path = require('path');
const QuickChart = require('quickchart-js');
const Handlebars = require('handlebars');
const pdf = require('html-pdf-node');


import { faker } from '@faker-js/faker';
import { createReadStream, writeFile } from 'fs';
import { PDFDocument, rgb } from 'pdf-lib';
import { format, parseISO, subYears, isBefore, subMonths, getMonth, subDays } from 'date-fns';
import * as fs from 'fs';
import { writeFileSync } from 'fs';



// Constants
const NUM_CUSTOMERS = 300;
const NUM_PAYMENTS = 5000;
const ITEMS: [string, number][] = [
    ["item #1 from storefront", 5000],
    ["item #2 from storefront", 40000],
    ["item #3 from storefront", 3000],
    ["service", 6000],
    ["physical goods", 40000]
];

const SUBS: [string, number][] = [
    ["subscription item #1 (monthly)", 7000],
    ["subscription item #2 (monthly)", 30000],
];
const CHANNELS = ["Card", "POS", "Bank", "USSD", "Direct Debit"];
const CHURN_RATE = 0.2;  // 20% churn rate
const DISPUTE_STATUS = ["Open", "Resolved"];
const GEOGRAPHIES = ["North America", "Europe", "Asia", "South America"];
const PAYMENT_STATUSES = ["Success", "Failed", "Reversed", "Abandoned", "Queued"];

// Customer interface
interface Customer {
    name: string;
    email: string;
    phone: string;
    added_on: Date;
    last_transaction: Date | null;
    active: boolean;
}

// Payments and disputes
interface Payment {
    customer_email: string;
    payment_date: Date;
    amount: number;
    channel: string;
    item: string;
    geography: string;
    status?: string;
}

interface Dispute {
    customer_email: string;
    date_created: Date;
    date_resolved?: Date | null;
    status: string;
}

// Customers
const customers: Customer[] = [];
for (let i = 0; i < NUM_CUSTOMERS; i++) {
    const addedOnDate = faker.date.past({ years: 3 });
    customers.push({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        added_on: addedOnDate,
        last_transaction: null,
        active: true
    });
}

// Payments and disputes
const payments: Payment[] = [];
const disputes: Dispute[] = [];
customers.forEach(customer => {
    const customerAddedOn = customer.added_on;

    // Simulate subscriptions
    if (Math.random() > 0.5) {
        if (Math.random() > CHURN_RATE) {
            const subscription = SUBS[Math.floor(Math.random() * SUBS.length)];
            const subscriptionStartDate = new Date(customerAddedOn.getTime() + Math.floor(Math.random() * 31) * 24 * 60 * 60 * 1000);
            for (let month = 0; month < 12; month++) {  // 1 year of monthly payments
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
        const purchaseDate = faker.date.between({ from: customerAddedOn, to: new Date() });
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
            if (Math.random() < 0.1 && Math.random() < 0.1) {  // 1% chance of dispute
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

function createDataFrame<T>(data: T[]): { data: T[]; head: (n: number) => T[] } {
    return {
        data,
        head(n: number) {
            return this.data.slice(0, n);
        },
    };
}


function addDataToDataFrame<T>(dataFrame: { data: T[] }, newData: T) {
    dataFrame.data.push(newData);
}

// Read data from csvt
const payments_df = createDataFrame<Payment>([]);
const customers_df = createDataFrame<Customer>([]);
const disputes_df = createDataFrame<Dispute>([]);

const customersHeaders = ['name', 'email', 'phone', 'added_on', 'last_transaction', 'active'];
const paymentsHeaders = [
    'customer_email',
    'payment_date',
    'amount',
    'channel',
    'item',
    'geography',
    'status'
];

const disputesHeaders = [
    'customer_email',
    'date_created',
    'date_resolved',
    'status'
];

function loadPaymentsData(): Promise<void> {
    return new Promise((resolve, reject) => {
        createReadStream('fake_payments_data.csv')
            .pipe(csvParser({ headers: paymentsHeaders }))
            .on('data', (row) => {
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
            .on('end', () => {
                console.log("Payments data loaded.");
                resolve();
            })
            .on('error', reject);
    });
}

function loadCustomersData(): Promise<void> {
    return new Promise((resolve, reject) => {
        createReadStream('fake_customers_data.csv')
            .pipe(csvParser({ headers: customersHeaders }))
            .on('data', (row) => {
                addDataToDataFrame(customers_df, {
                    name: row.name,
                    email: row.email,
                    phone: row.phone,
                    added_on: new Date(row.added_on),
                    last_transaction: row.last_transaction ? new Date(row.last_transaction) : null,
                    active: row.active === 'true'
                });
            })
            .on('end', () => {
                console.log("Customers data loaded.");
                resolve();
            })
            .on('error', reject);
    });
}

function loadDisputesData(): Promise<void> {
    return new Promise((resolve, reject) => {
        createReadStream('fake_disputes_data.csv')
            .pipe(csvParser({ headers: disputesHeaders }))
            .on('data', (row) => {
                addDataToDataFrame(disputes_df, {
                    customer_email: row.customer_email,
                    date_created: new Date(row.date_created),
                    date_resolved: row.date_resolved ? new Date(row.date_resolved) : null,
                    status: row.status
                });
            })
            .on('end', () => {
                console.log("Disputes data loaded.");
                resolve();
            })
            .on('error', reject);
    });
}



// Function to analyze revenue and sales trends over the past year
function revenueAndSalesTrends() {
    const lastYear = subYears(new Date(), 1);

    const sortedPayments = payments_df.data.sort((a, b) =>
        a.payment_date.getTime() - b.payment_date.getTime()
    );
    const recentPayments = sortedPayments.filter(payment => payment.payment_date >= lastYear);

    const revenueTrends = recentPayments.reduce((acc, payment) => {
        const paymentDate = format(payment.payment_date, 'yyyy-MM');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_revenue: 0, total_transactions: 0 };
        }
        acc[paymentDate].total_revenue += payment.amount;
        acc[paymentDate].total_transactions += 1;
        return acc;
    }, {});

    console.log("\nRevenue and Sales Trends Over the Past Year:");
    console.log(revenueTrends);

    return {
        revenue_trends: revenueTrends
    };
}

// Function to analyze customer growth and retention rates
function customerGrowthAndRetention() {
    const oneYearAgo = subYears(new Date(), 1);
    const sixMonthsAgo = subDays(new Date(), 180);
    const sortedCustomers = customers_df.data.sort((a, b) =>
        a.added_on.getTime() - b.added_on.getTime()
    );
    const customerGrowth = sortedCustomers.reduce((acc, customer) => {
        const addedOnMonth = format(customer.added_on, 'yyyy-MM');
        if (!acc[addedOnMonth]) {
            acc[addedOnMonth] = 0;
        }
        acc[addedOnMonth]++;
        return acc;
    }, {});


    const startCustomers = customers_df.data.filter(customer => customer.added_on <= oneYearAgo).length;
    const newCustomers = customers_df.data.filter(customer => customer.added_on >= oneYearAgo).length;
    const endCustomers = customers_df.data.filter(customer => customer.last_transaction >= sixMonthsAgo).length;

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
    const disputesOpen = disputes_df.data.filter(dispute => dispute.status === "Open").length;
    const disputesResolvedLastMonth = disputes_df.data.filter(dispute =>
        dispute.status === "Resolved" &&
        dispute.date_created >= subMonths(new Date(), 1)
    ).length;

    const resolvedDisputes = disputes_df.data.filter(dispute => dispute.status === "Resolved");

    let meanTimeToResolution = 0;
    if (resolvedDisputes.length > 0) {
        const totalDays = resolvedDisputes.reduce((acc, dispute) => {
            const createdDate = new Date(dispute.date_created);
            const resolvedDate = new Date(dispute.date_resolved);

            
            if (!isNaN(createdDate.getTime()) && !isNaN(resolvedDate.getTime())) {
                return acc + ((resolvedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24)); // Convert ms to days
            } else {
                return acc; 
            }
        }, 0);
        
        meanTimeToResolution = totalDays / resolvedDisputes.length;
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

    const sortedPayments = payments_df.data.sort((a, b) =>
        a.payment_date.getTime() - b.payment_date.getTime()
    );
    const subscriptionItems = sortedPayments.filter(payment => payment.item.includes("subscription"));

    const totalSubscriptions = subscriptionItems.length;
    const uniqueSubscribers = new Set(subscriptionItems.map(payment => payment.customer_email)).size;

    const subscriptionHistory = subscriptionItems.reduce((acc, payment) => {

        const paymentDate = format(payment.payment_date, 'yyyy-MM');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_subscriptions: 0, total_revenue: 0 };
        }
        acc[paymentDate].total_subscriptions += 1;
        acc[paymentDate].total_revenue += payment.amount;
        return acc;
    }, {});

    console.log(`\nTotal Subscriptions: ${totalSubscriptions}`);
    console.log(`Unique Subscribers: ${uniqueSubscribers}`);

    return {
        total_subscriptions: totalSubscriptions,
        unique_subscribers: uniqueSubscribers,
        subscription_history: subscriptionHistory,
    };
}

// Function for product performance analysis
function productPerformance() {
    const productSalesHistory = payments_df.data.reduce((acc, payment) => {
        if (!acc[payment.item]) {
            acc[payment.item] = { total_sales: 0, total_transactions: 0, average_sale_value: 0 };
        }
        acc[payment.item].total_sales += payment.amount;
        acc[payment.item].total_transactions += 1;
        return acc;
    }, {});

    // Calculate average sale value
    Object.keys(productSalesHistory).forEach(item => {
        const product = productSalesHistory[item];
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
    const paymentHours = payments_df.data.map(payment => payment.payment_date.getHours());
    const hourCounts = paymentHours.reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    console.log("Peak Shopping Times:", hourCounts);

    // Visualization placeholder (since actual visualization is out of scope in pure TypeScript)
    // Use a charting library such as Chart.js in a real application

    return {
        peak_shopping_times: hourCounts
    };
}

// Function to analyze sales this month
function salesAnalysisThisMonth() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const monthlySales = payments_df.data.filter(payment => {
        const paymentDate = new Date(payment.payment_date);
        return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
    });

    const productRevenue = monthlySales.reduce((acc, payment) => {
        acc[payment.item] = (acc[payment.item] || 0) + payment.amount;
        return acc;
    }, {} as Record<string, number>);


    const topProducts = Object.entries(productRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    console.log("Top Products This Month:", topProducts);

    return {
        top_products_this_month: topProducts,
        monthly_sales: monthlySales
    };
}


// Function for customer segmentation
function customerSegmentation() {
    const oneMonthAgo = subMonths(new Date(), 1);
    const newCustomers = customers_df.data.filter(customer => customer.last_transaction && customer.last_transaction >= oneMonthAgo);
    const totalCustomers = customers_df.data.length;
    const returningCustomersCount = totalCustomers - newCustomers.length;

    const percentageReturning = (returningCustomersCount / totalCustomers) * 100;
    const percentageNew = (newCustomers.length / totalCustomers) * 100;

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
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1; // December if current is January
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear; // Previous year if current is January


    const currentMonthSales = payments_df.data
        .filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
        })
        .reduce((sum, payment) => sum + payment.amount, 0);


    const lastMonthSales = payments_df.data
        .filter(payment => {
            const paymentDate = new Date(payment.payment_date);
            return paymentDate.getFullYear() === lastYear && paymentDate.getMonth() === lastMonth;
        })
        .reduce((sum, payment) => sum + payment.amount, 0);

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
    const totalPayments = payments_df.data.length;
    const successfulPayments = payments_df.data.filter(payment => payment.status === 'Success').length;
    const failedPayments = payments_df.data.filter(payment => payment.status === 'Failure').length;

    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

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


async function saveChartImage(chart: InstanceType<typeof QuickChart>, fileName: string) {
    const imageUrl = await chart.getShortUrl();
    console.log("url", fileName, imageUrl);

    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    writeFileSync(path.join(__dirname, fileName), Buffer.from(buffer));
}


async function plotCustomerGrowth(customerGrowth: Record<string, number>) {
    // Transform the object into an array
    const customerGrowthArray = Object.entries(customerGrowth).map(([added_on, new_customers]) => ({
        added_on,
        new_customers,
    }));

    const chart = new QuickChart();
    chart.setConfig({
        type: 'bar',
        data: {
            labels: customerGrowthArray.map(entry => entry.added_on),
            datasets: [{
                label: 'New Customers',
                data: customerGrowthArray.map(entry => entry.new_customers),
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

    await saveChartImage(chart, 'customer_growth.png');
}


async function plotRevenueAndSales(revenueTrends: Record<string, { total_revenue: number; total_transactions: number; }>) {

    const revenueTrendsArray = Object.entries(revenueTrends).map(([payment_date, { total_revenue, total_transactions }]) => ({
        payment_date,
        total_revenue,
        total_transactions,
    }));

    const chart = new QuickChart();
    chart.setConfig({
        type: 'line',
        data: {
            labels: revenueTrendsArray.map(entry => entry.payment_date),
            datasets: [
                {
                    label: 'Total Revenue',
                    data: revenueTrendsArray.map(entry => entry.total_revenue),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    fill: false,
                },
                {
                    label: 'Total Transactions',
                    data: revenueTrendsArray.map(entry => entry.total_transactions),
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

    await saveChartImage(chart, 'revenue_and_sales_trends.png');
}


async function plotSubscriptionPerformance(subscriptionHistory: Record<string, { total_subscriptions: number; total_revenue: number; }>) {
    // Transform the subscriptionHistory object into an array
    const subscriptionArray = Object.entries(subscriptionHistory).map(([payment_date, { total_subscriptions }]) => ({
        payment_date,
        total_subscriptions,
    }));

    const chart = new QuickChart();
    chart.setConfig({
        type: 'bar',
        data: {
            labels: subscriptionArray.map(entry => entry.payment_date), // Extracting payment_date for labels
            datasets: [{
                label: 'Total Subscriptions',
                data: subscriptionArray.map(entry => entry.total_subscriptions), // Extracting total_subscriptions for data
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

    await saveChartImage(chart, 'subscription_performance.png');
}


async function plotProductPerformance(productSalesHistory: Record<string, { total_sales: number; total_transactions: number; average_sale_value: number; }>) {

    const productSalesArray = Object.entries(productSalesHistory).map(([item, { total_sales, total_transactions, average_sale_value }]) => ({
        item,
        total_sales,
        total_transactions,
        average_sale_value,
    }));

    // Sort the array based on total_sales
    const sortedData = productSalesArray.sort((a, b) => a.total_sales - b.total_sales);

    const chart = new QuickChart();
    chart.setConfig({
        type: 'bar',
        data: {
            labels: sortedData.map(entry => entry.item),
            datasets: [{
                label: 'Total Sales',
                data: sortedData.map(entry => entry.total_sales),
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

    await saveChartImage(chart, 'product_performance.png');
}


async function plotTopProducts(topProducts: [string, number][]) {
    const sortedData = topProducts.sort((a, b) => a[1] - b[1]);
    const chart = new QuickChart();
    chart.setConfig({
        type: 'bar',
        data: {
            labels: sortedData.map(entry => entry[0]),
            datasets: [{
                label: 'Total Revenue',
                data: sortedData.map(entry => entry[1]),
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
    await saveChartImage(chart, 'top_products_this_month.png');
}

async function plotPeakShoppingTimes(peakTimes: Record<number, number>) {
    const hours = Object.keys(peakTimes).map(Number);
    const counts = hours.map(hour => peakTimes[hour]);

    const chart = new QuickChart();
    chart.setConfig({
        type: 'bar',

        data: {
            labels: hours.map(hour => hour.toString()),
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
    await saveChartImage(chart, 'peak_shopping_times.png');
}


async function createPdfReport(sr: any, da: any, satm: any) {
    const templateHtml = fs.readFileSync('reportTemplate.html', 'utf-8');
    const template = Handlebars.compile(templateHtml);

    const ptImgData = fs.readFileSync('./peak_shopping_times.png').toString('base64');
    const peekTimesImgSrc = `data:image/png;base64,${ptImgData}`;

    const rsImgData = fs.readFileSync('./revenue_and_sales_trends.png').toString('base64');
    const rsImgSrc = `data:image/png;base64,${rsImgData}`;

    const templateData = {
        total_payments: sr.total_payments.toLocaleString(),
        total_volume: sr.total_volume || 'X',
        successful_payments: sr.successful_payments.toLocaleString(),
        success_rate: sr.success_rate.toFixed(2),
        peak_times_image: peekTimesImgSrc,
        revenue_sales_trend: rsImgSrc,
        open_disputes: da.open_disputes,
        resolved_last_month: da.resolved_last_month,
        mean_time_to_resolution: da.mean_time_to_resolution,
        best_product: satm.top_products_this_month[0][0],
        best_product_revenue: satm.top_products_this_month[0][1].toLocaleString(),
    };

    const htmlContent = template(templateData);
    const options = { format: 'A4' };
    const file = { content: htmlContent };
    const pdfBuffer = await pdf.generatePdf(file, options);
    fs.writeFileSync('business_report.pdf', pdfBuffer);
    console.log("PDF report generated successfully.");
}



function loadData() {
    return Promise.all([
        loadPaymentsData(),
        loadCustomersData(),
        loadDisputesData()
    ])
        .then(async () => {
            const sr = calculateSuccessRate();
            const cgr = customerGrowthAndRetention();
            const da = disputeAnalysis();
            const sp = subscriptionPerformance();
            const pp = productPerformance();
            const psp = peakShoppingTimes()
            const satm = salesAnalysisThisMonth();
            const rst = revenueAndSalesTrends()
            const csg = customerSegmentation()
            const pc = performanceComparison()
            // await plotCustomerGrowth(cgr.customers_gained_each_month);
            // await plotRevenueAndSales(rst.revenue_trends);
            // await plotSubscriptionPerformance(sp.subscription_history);
            // await plotProductPerformance(pp.product_sales_history);
            // await plotPeakShoppingTimes(psp.peak_shopping_times);
            // await plotTopProducts(satm.top_products_this_month);
            createPdfReport(sr, da, satm);
        })
        .catch((error) => {
            console.error("Error loading data:", error);
        });
}

loadData();