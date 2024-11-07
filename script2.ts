require('dotenv').config();
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
import axios from 'axios';
import { height, width } from 'pdfkit/js/page';
import { Customer, Dispute, Subscription, Transaction } from './types';
import { TABLES } from './constants';
import { databaseRepo } from './db_connection';



// Read data from csvt
var payments_df: Transaction[] = [];
var subscription_df: Subscription[] = [];
var customers_df: Customer[] = [];
var disputes_df: Dispute[] = [];



// function getMonthlyPayments(): Transaction[] {
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();
//     const currentMonth = currentDate.getMonth();

//     const monthlySales = payments_df.filter(payment => {
//         const paymentDate = new Date(payment.reporting_date);
//         return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
//     });

//     return monthlySales;
// }

function getMonthlyRecord<T>(data: T[], dateProperty: keyof T): T[] {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() - 1; //remember to remove -1 to get for current month

    return data.filter(record => {
        const recordDate = new Date(record[dateProperty] as unknown as string);
        return recordDate.getFullYear() === currentYear && recordDate.getMonth() === currentMonth;
        // return recordDate.getMonth() === currentMonth;
    });
}


// Function to analyze revenue and sales trends over the past year
function revenueAndSalesTrends() {
    const lastYear = subYears(new Date(), 1);

    const sortedPayments = payments_df.sort((a, b) =>
        a.reporting_date.getTime() - b.reporting_date.getTime()
    );
    const recentPayments = sortedPayments.filter(payment => payment.reporting_date >= lastYear);

    const revenueTrends = recentPayments.reduce((acc, payment) => {
        const paymentDate = format(payment.reporting_date, 'yyyy-MM');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_revenue: 0, total_transactions: 0 };
        }
        acc[paymentDate].total_revenue += parseFloat(payment.transaction_amount);
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
    const sortedCustomers = customers_df.sort((a, b) =>
        a.customer_created_at.getTime() - b.customer_created_at.getTime()
    );
    const customerGrowth = sortedCustomers.reduce((acc, customer) => {
        const addedOnMonth = format(customer.customer_created_at, 'yyyy-MM');
        if (!acc[addedOnMonth]) {
            acc[addedOnMonth] = 0;
        }
        acc[addedOnMonth]++;
        return acc;
    }, {})



    const startCustomers = customers_df.filter(customer => customer.customer_created_at <= oneYearAgo).length;
    const newCustomers = customers_df.filter(customer => customer.customer_created_at >= oneYearAgo).length;
    const endCustomers = customers_df.filter(customer => customer.datetime_created_at_local >= sixMonthsAgo).length;

    const retentionRate = startCustomers > 0 ? ((endCustomers - newCustomers) / startCustomers) * 100 : 0;

    console.log("\nCustomer Growth (New Customers per Month):");
    console.log(customerGrowth);
    console.log(`\nCustomer Retention Rate: ${retentionRate.toFixed(2)}%`);

    return {
        customers_gained_each_month: customerGrowth,
        retention_rate_over_last_year: retentionRate.toFixed(2),
    };
}


// Function to analyze disputes
function disputeAnalysis() {
    const disputesOpen = disputes_df.filter(dispute => dispute.dispute_status === "Open").length;
    const disputesResolvedLastMonth = disputes_df.filter(dispute =>
        dispute.dispute_status === "Resolved" &&
        dispute.dispute_created_at_date >= subMonths(new Date(), 1)
    ).length;

    const resolvedDisputes = disputes_df.filter(dispute => dispute.dispute_status === "Resolved");

    let meanTimeToResolution = 0;
    if (resolvedDisputes.length > 0) {
        const totalDays = resolvedDisputes.reduce((acc, dispute) => {
            const createdDate = new Date(dispute.dispute_created_at_date);
            const resolvedDate = new Date(dispute.dispute_resolved_at_date);


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

    const sortedPayments = subscription_df.sort((a, b) =>
        a.dw_modified.getTime() - b.dw_modified.getTime()
    );
    const subscriptionItems = getMonthlyRecord(subscription_df, 'dw_modified');

    const totalSubscriptions = subscriptionItems.length;
    const subscriptionVolume = subscriptionItems.reduce((sum, sale) => sum + sale.amount_subscription, 0);
    const uniqueSubscribers = new Set(subscriptionItems.map(payment => payment.dimcustomerid)).size;

    const subscriptionHistory = sortedPayments.reduce((acc, payment) => {

        const paymentDate = format(payment.dw_modified, 'yyyy-MM');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_subscriptions: 0, total_revenue: 0 };
        }
        acc[paymentDate].total_subscriptions += 1;
        acc[paymentDate].total_revenue += payment.amount_subscription;
        return acc;
    }, {});

    console.log(`\nTotal Subscriptions: ${totalSubscriptions}`);
    console.log(`Unique Subscribers: ${uniqueSubscribers}`);

    return {
        total_subscriptions: totalSubscriptions,
        subscription_volume: subscriptionVolume,
        unique_subscribers: uniqueSubscribers,
        subscription_history: subscriptionHistory,
    };
}

// Function for product performance analysis(need product name property on transactions table)
// function productPerformance() {
//     const productSalesHistory = payments_df.reduce((acc, payment) => {
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


// Function to analyze peak shopping times
function peakShoppingTimes() {
    const paymentHours = payments_df.map(payment => payment.reporting_date.getHours());
    const hourCounts = paymentHours.reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    console.log("Peak Shopping Times:", hourCounts);

    return {
        peak_shopping_times: hourCounts
    };
}

// Function to analyze sales this month(need product name property on transactions table)
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


// Function for customer segmentation
function customerSegmentation() {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), (today.getMonth()-1), 1); //remove -1 to get for current month
    const endOfMonth = new Date(today.getFullYear(), (today.getMonth()-1) + 1, 0); //remove -1 to get for current month

    // Identify new customers (added this month)
    const newCustomers = customers_df.filter(customer =>
        customer.customer_created_at && customer.customer_created_at >= startOfMonth && customer.customer_created_at <= endOfMonth
    );

    // Identify returning customers (added before this month and made a transaction this month)
    const returningCustomers = customers_df.filter(customer =>
        customer.customer_created_at && customer.customer_created_at < startOfMonth &&
        customer.datetime_created_at_local && customer.datetime_created_at_local >= startOfMonth && customer.datetime_created_at_local <= endOfMonth
    );

    // Identify non-returning customers (added before this month and made no transaction this month)
    const nonReturningCustomers = customers_df.filter(customer =>
        customer.customer_created_at && customer.customer_created_at < startOfMonth &&
        (!customer.datetime_created_at_local || customer.datetime_created_at_local < startOfMonth)
    );

    const totalCustomers = customers_df.length;

    // Calculations
    const percentageReturning = (returningCustomers.length / totalCustomers) * 100;
    const percentageNew = (newCustomers.length / totalCustomers) * 100;
    const percentageNonReturning = (nonReturningCustomers.length / totalCustomers) * 100;

    console.log("Customer Segmentation:", {
        new_customers: newCustomers.length,
        returning_customers: returningCustomers.length,
        non_returning_customers: nonReturningCustomers.length,
        total_customers: totalCustomers,
        percentage_returning: percentageReturning,
        percentage_new: percentageNew,
        percentage_non_returning: percentageNonReturning
    });

    return {
        new_customers: newCustomers.length,
        returning_customers: returningCustomers.length,
        non_returning_customers: nonReturningCustomers.length,
        total_customers: totalCustomers,

    }
}

// Function to compare performance between current and last month
function performanceComparison() {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1; // December if current is January
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear; // Previous year if current is January


    const currentMonthSales = payments_df
        .filter(payment => {
            const paymentDate = new Date(payment.reporting_date);
            return paymentDate.getFullYear() === currentYear && paymentDate.getMonth() === currentMonth;
        })
        .reduce((sum, payment) => sum + parseFloat(payment.transaction_amount), 0);


    const lastMonthSales = payments_df
        .filter(payment => {
            const paymentDate = new Date(payment.reporting_date);
            return paymentDate.getFullYear() === lastYear && paymentDate.getMonth() === lastMonth;
        })
        .reduce((sum, payment) => sum + parseFloat(payment.transaction_amount), 0);

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


    const monthlySales = getMonthlyRecord(payments_df, 'reporting_date');

    const totalPayments = monthlySales.length;
    const totalVolume = monthlySales.reduce((sum, sale) => sum + parseFloat(sale.transaction_amount), 0);
    const successfulPayments = monthlySales.filter(payment => Boolean(payment.is_successful)).length;
    const failedPayments = monthlySales.filter(payment => !Boolean(payment.is_successful)).length;

    const successRate = totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    console.log("Success Rate Calculation:", {
        total_payments: totalPayments,
        successful_payments: successfulPayments,
        total_volume: totalVolume,
        failed_payments: failedPayments,
        success_rate: successRate
    });

    return {
        total_payments: totalPayments,
        total_volume: totalVolume,
        successful_payments: successfulPayments,
        failed_payments: failedPayments,
        success_rate: successRate
    };
}


// async function saveChartImage(chart: InstanceType<typeof QuickChart>, fileName: string) {
//     const imageUrl = await chart.getShortUrl();
//     console.log("url", fileName, imageUrl);

//     const response = await fetch(imageUrl);
//     const buffer = await response.arrayBuffer();

//     writeFileSync(path.join(__dirname, fileName), Buffer.from(buffer));
// }


// async function plotCustomerGrowth(customerGrowth: Record<string, number>) {
//     // Transform the object into an array
//     const customerGrowthArray = Object.entries(customerGrowth).map(([added_on, new_customers]) => ({
//         added_on,
//         new_customers,
//     }));

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'bar',
//         data: {
//             labels: customerGrowthArray.map(entry => entry.added_on),
//             datasets: [{
//                 label: 'New Customers',
//                 data: customerGrowthArray.map(entry => entry.new_customers),
//                 backgroundColor: 'rgba(54, 162, 235, 0.6)',
//             }]
//         },
//         options: {
//             plugins: {
//                 title: { display: true, text: 'Customer Growth (New Customers per Month)' },
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });

//     await saveChartImage(chart, 'customer_growth.png');
// }

// async function plotCustomerSegmentationPie(segmentationData: { new_customers: number; returning_customers: number; non_returning_customers: number }) {
//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'pie',
//         data: {
//             labels: ['New Customers', 'Returning Customers', 'Non-Returning Customers'],
//             datasets: [{
//                 data: [
//                     segmentationData.new_customers, 
//                     segmentationData.returning_customers, 
//                     segmentationData.non_returning_customers
//                 ],
//                 backgroundColor: [
//                     'rgba(54, 162, 235, 0.6)',  
//                     'rgba(255, 99, 132, 0.6)',  
//                     'rgba(153, 102, 255, 0.6)' 
//                 ],
//             }]
//         },
//         options: {
//             plugins: {
//                 title: {
//                     display: true,
//                     text: 'Customer Segmentation (New vs. Returning vs. Non-Returning)'
//                 }
//             }
//         }
//     });

//     await saveChartImage(chart, 'customer_segmentation_pie.png');
// }



// async function plotRevenueAndSales(revenueTrends: Record<string, { total_revenue: number; total_transactions: number; }>) {

//     const revenueTrendsArray = Object.entries(revenueTrends).map(([payment_date, { total_revenue, total_transactions }]) => ({
//         payment_date,
//         total_revenue,
//         total_transactions,
//     }));

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'line',
//         data: {
//             labels: revenueTrendsArray.map(entry => entry.payment_date),
//             datasets: [
//                 {
//                     label: 'Total Revenue',
//                     data: revenueTrendsArray.map(entry => entry.total_revenue),
//                     borderColor: 'rgba(75, 192, 192, 1)',
//                     fill: false,
//                 },
//                 {
//                     label: 'Total Transactions',
//                     data: revenueTrendsArray.map(entry => entry.total_transactions),
//                     borderColor: 'rgba(153, 102, 255, 1)',
//                     fill: false,
//                 }
//             ]
//         },
//         options: {
//             plugins: {
//                 title: { display: true, text: 'Revenue and Sales Trends Over the Past Year' },
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });

//     await saveChartImage(chart, 'revenue_and_sales_trends.png');
// }

// async function plotRevenue(revenueTrends: Record<string, { total_revenue: number }>) {

//     const revenueTrendsArray = Object.entries(revenueTrends).map(([payment_date, { total_revenue }]) => ({
//         payment_date,
//         total_revenue,
//     }));

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'line',
//         data: {
//             labels: revenueTrendsArray.map(entry => entry.payment_date),
//             datasets: [
//                 {
//                     label: 'Total Revenue',
//                     data: revenueTrendsArray.map(entry => entry.total_revenue),
//                     borderColor: 'rgba(75, 192, 192, 1)',
//                     fill: false,
//                 }
//             ]
//         },
//         options: {
//             plugins: {
//                 title: { display: true, text: 'Total Revenue Over the Past Year' },
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });

//     await saveChartImage(chart, 'total_revenue_trends.png');
// }


// async function plotTransactions(revenueTrends: Record<string, { total_transactions: number; }>) {

//     const revenueTrendsArray = Object.entries(revenueTrends).map(([payment_date, { total_transactions }]) => ({
//         payment_date,
//         total_transactions,
//     }));

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'line',
//         data: {
//             labels: revenueTrendsArray.map(entry => entry.payment_date),
//             datasets: [
//                 {
//                     label: 'Total Transactions',
//                     data: revenueTrendsArray.map(entry => entry.total_transactions),
//                     borderColor: 'rgba(153, 102, 255, 1)',
//                     fill: false,
//                 }
//             ]
//         },
//         options: {
//             plugins: {
//                 title: {
//                     display: true,
//                     text: 'Total Transactions Over the Past Year'
//                 },
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });

//     await saveChartImage(chart, 'total_transaction_trends.png');
// }


// async function plotSubscriptionPerformance(subscriptionHistory: Record<string, { total_subscriptions: number; total_revenue: number; }>) {
//     // Transform the subscriptionHistory object into an array
//     const subscriptionArray = Object.entries(subscriptionHistory).map(([payment_date, { total_subscriptions }]) => ({
//         payment_date,
//         total_subscriptions,
//     }));

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'bar',
//         data: {
//             labels: subscriptionArray.map(entry => entry.payment_date), // Extracting payment_date for labels
//             datasets: [{
//                 label: 'Total Subscriptions',
//                 data: subscriptionArray.map(entry => entry.total_subscriptions), // Extracting total_subscriptions for data
//                 backgroundColor: 'rgba(128, 0, 128, 0.6)',
//             }]
//         },
//         options: {
//             plugins: {
//                 title: { display: true, text: 'Subscription Performance Over Time' },
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });

//     await saveChartImage(chart, 'subscription_performance.png');
// }


// async function plotProductPerformance(productSalesHistory: Record<string, { total_sales: number; total_transactions: number; average_sale_value: number; }>) {

//     const productSalesArray = Object.entries(productSalesHistory).map(([item, { total_sales, total_transactions, average_sale_value }]) => ({
//         item,
//         total_sales,
//         total_transactions,
//         average_sale_value,
//     }));

//     // Sort the array based on total_sales
//     const sortedData = productSalesArray.sort((a, b) => a.total_sales - b.total_sales);

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'bar',
//         data: {
//             labels: sortedData.map(entry => entry.item),
//             datasets: [{
//                 label: 'Total Sales',
//                 data: sortedData.map(entry => entry.total_sales),
//                 backgroundColor: 'rgba(255, 99, 132, 0.6)',
//             }]
//         },
//         options: {
//             plugins: {
//                 title: { display: true, text: 'Product Performance Analysis' },
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });

//     await saveChartImage(chart, 'product_performance.png');
// }


// async function plotTopProducts(topProducts: [string, number][]) {

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'bar',
//         data: {
//             labels: topProducts.map(entry => entry[0]),
//             datasets: [{
//                 label: 'Total Revenue',
//                 data: topProducts.map(entry => entry[1]),
//                 backgroundColor: 'rgba(255, 159, 64, 0.6)',
//             }]
//         },
//         options: {
//             plugins: {
//                 title: { display: true, text: 'Top Products This Month' },
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });
//     await saveChartImage(chart, 'top_products_this_month.png');
// }

// async function plotPeakShoppingTimes(peakTimes: Record<number, number>) {
//     const hours = Object.keys(peakTimes).map(Number);
//     const counts = hours.map(hour => peakTimes[hour]);

//     const chart = new QuickChart();
//     chart.setConfig({
//         type: 'bar',

//         data: {
//             labels: hours.map(hour => hour.toString()),
//             datasets: [{
//                 label: 'Transaction Counts',
//                 data: counts,
//                 backgroundColor: 'rgba(0, 255, 127, 0.6)',
//             }]
//         },
//         options: {
//             plugins: {
//                 title: {
//                     display: true,
//                     text: 'Peak Shopping Times'
//                 }
//             },
//             scales: { y: { beginAtZero: true } },
//         }
//     });
//     await saveChartImage(chart, 'peak_shopping_times.png');
// }

// function getImageUrl(imgPath: string) {
//     const imgData = fs.readFileSync(imgPath).toString('base64');
//     const imgSrc = `data:image/png;base64,${imgData}`;
//     return imgSrc;
// }
// async function createPdfReport(sr: any, da: any, satm: any, sp: any, cgr: any, csg: any, result: any) {
//     const templateHtml = fs.readFileSync('reportTemplate.html', 'utf-8');
//     const template = Handlebars.compile(templateHtml);
//     const templateData = {
//         total_payments: sr.total_payments.toLocaleString(),
//         total_volume: sr.total_volume.toLocaleString() || 'X',
//         successful_payments: sr.successful_payments.toLocaleString(),
//         success_rate: sr.success_rate.toFixed(2),
//         peak_times_image: getImageUrl('./peak_shopping_times.png'),
//         revenue_sales_trend: getImageUrl('./revenue_and_sales_trends.png'),
//         revenue_trend_image: getImageUrl('./total_revenue_trends.png'),
//         transaction_trend_image: getImageUrl('./total_transaction_trends.png'),
//         top_products_image: getImageUrl('./top_products_this_month.png'),
//         subscription_performance_image: getImageUrl('./subscription_performance.png'),
//         customer_growth_image: getImageUrl('./customer_growth.png'),
//         customer_segmentation_image: getImageUrl('./customer_segmentation_pie.png'),
//         total_subscriptions: sp.total_subscriptions,
//         subscription_volume: sp.subscription_volume.toLocaleString(),
//         new_customers: csg.new_customers,
//         retention_rate_over_last_year: cgr.retention_rate_over_last_year,
//         open_disputes: da.open_disputes,
//         resolved_last_month: da.resolved_last_month,
//         mean_time_to_resolution: da.mean_time_to_resolution,
//         best_product: satm.top_products_this_month[0][0],
//         best_product_revenue: satm.top_products_this_month[0][1].toLocaleString(),
//         responses_to_key_questions: result.responses_to_key_questions,
//         action_plan: result.action_plan,
//         ceo_summary_paragraphs_title: result.ceo_summary_paragraphs_title,
//         ceo_summary_paragraphs: result.ceo_summary_paragraphs
//     };

//     const htmlContent = template(templateData);
//     const options = { format: 'A4' };
//     const file = { content: htmlContent };
//     const pdfBuffer = await pdf.generatePdf(file, options);
//     fs.writeFileSync('business_report.pdf', pdfBuffer);
//     console.log("PDF report generated successfully.");
// }

// async function getChatCompletion(messages: any[], response_format: any) {
//     try {
//         const apiKey = process.env.OPENAI_API_KEY;
//         const endpoint = 'https://api.openai.com/v1/chat/completions';
//         const response = await axios.post(
//             endpoint,
//             {
//                 model: 'gpt-4o',
//                 messages: messages,
//                 response_format: response_format,
//             },
//             {
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'Authorization': `Bearer ${apiKey}`,
//                 },
//             }
//         );

//         return response.data;
//     } catch (error) {
//         if (axios.isAxiosError(error)) {
//             console.error('Error response:', error.response?.data);
//             console.error('Error headers:', error.response?.headers);
//         } else {
//             console.error('Unexpected error:', error);
//         }
//     }

// }

// async function generateReport(rst: any, cgr: any, da: any, sp: any, pp: any, psp: any, satm: any, csg: any, pc: any, sr: any) {

//     try {
//         const messages = [
//             {
//                 role: "user",
//                 content: `
//                     You are a helpful data analyst for Paystack. Your goal is to generate accurate and useful CEO-level insights from all the processed payment data we will be feeding you.
//                 `
//             },
//             {
//                 role: "user",
//                 content: `
//                     This is the gathered data from business XYZ, what do you make of it? Try to think of questions that can be answered to grow/help their business. Things they need to cut or pay more attention to.

//                     i.e. Should I move off this modality? What is the best play for my business right now? 

//                     This is the data. Start with using thinking tags and generating all possible questions that could be reasoned from the data. Then, analyse the data and filter down to the most relevant ones. 

//                     Next, try to answer ALL these questions while citing the relevant data provided.

//                     Next, re-evaluate your answers strictly, and extract the most important ones, then you can create your answer in a response tag.

//                     After all of this, I want you to craft an action plan for the CEO in a more friendly and encouraging tone, and then 1 or 2 paragraphs about the general state of their businesses and what they should be thinking of long term. 

//                     Please and please, ensure not to state things as obvious, give grounding to any statement you're making, it must be backed by data, principles and information, be sure to cite them like [1] and mention under your response if formulas or principles. Do not be condescending or too formal in your CEO response. Provide real value.

//                     When you cite something, do not let it be a vague rendition, let it be the real thing you are citing, in FULL.

//                     {{
//                         revenue_and_sales_trends : ${rst},
//                         customer_growth_and_retention : ${cgr},
//                         dispute_analysis : ${da},
//                         subscription_performance : ${sp},
//                         product_performance : ${pp},
//                         peak_shopping_times : ${psp},
//                         sales_analysis_this_month : ${satm['top_products_this_month']},
//                         customer_segmentation: ${csg}, 
//                         performance_comparison: ${pc},
//                         calculate_success_rate: ${sr},
//                     }}
//                 `
//             }
//         ];
//         const response_format = {
//             type: "json_schema",
//             json_schema: {
//                 name: "CEO_Summary",
//                 schema: {
//                     type: "object",
//                     properties: {
//                         thinking: { type: "array", items: { type: "string" } },
//                         analysis_and_filtering: { type: "array", items: { type: "string" } },
//                         responses_to_key_questions: {
//                             type: "array",
//                             items: {
//                                 type: "object",
//                                 properties: {
//                                     question: { type: "string" },
//                                     answer: { type: "string" }
//                                 },
//                                 required: ["question", "answer"],
//                                 additionalProperties: false
//                             }
//                         },
//                         action_plan_intro: { type: "string" },
//                         action_plan: {
//                             type: "array",
//                             items: {
//                                 type: "object",
//                                 properties: {
//                                     action_title: { type: "string" },
//                                     reason_what: { type: "string" },
//                                     reason_why_relevance: { type: "string" },
//                                     reason_why_gains: { type: "string" },
//                                     steps_to_start: {
//                                         type: "array",
//                                         items: { type: "string" }
//                                     }
//                                 },
//                                 required: ["action_title", "reason_what", "reason_why_relevance", "reason_why_gains", "steps_to_start"],
//                                 additionalProperties: false
//                             }
//                         },
//                         ceo_summary_paragraphs_title: { type: "string" },
//                         ceo_summary_paragraphs: { type: "string" },
//                         references: { type: "array", items: { type: "string" } }
//                     },
//                     required: [
//                         "thinking", "analysis_and_filtering", "responses_to_key_questions",
//                         "action_plan_intro", "action_plan", "ceo_summary_paragraphs_title",
//                         "ceo_summary_paragraphs", "references"
//                     ],
//                     additionalProperties: false
//                 },
//                 strict: true
//             }
//         }

//         const data = await getChatCompletion(messages, response_format)
//         return data.choices[0].message.content;

//     }
//     catch (error: any) {
//         console.error("error occured while genrating report", error)
//     }

// }


function loadData() {
    let customers: Customer[] = [];
    let payments: Customer[] = []
    const merchant_id = 100043;

    const rawQuery = `
    WITH ranked_customers AS (
        SELECT *, 
               ROW_NUMBER() OVER (PARTITION BY dimcustomerid ORDER BY customer_created_at DESC) AS row_num
        FROM ?? 
        WHERE ?? = ?
    )
    SELECT *
    FROM ranked_customers
    WHERE row_num = 1
  `;

    return Promise.all([

        databaseRepo.getWhere<Transaction>(TABLES.TRANSACTIONS, { merchant_id: merchant_id }).then((data) => {
            payments_df = data;
        }),

        
        databaseRepo.getWhere<Customer>(
            TABLES.CUSTOMERS,
            { merchant_id: merchant_id },
            undefined,
            undefined,
            undefined,
            rawQuery,
            [TABLES.CUSTOMERS, 'merchant_id', merchant_id]
        ).then((data) => {
            customers_df = data;
        }),

       
        databaseRepo.getWhere<Subscription>(TABLES.SUBSCRIPTIONS, { merchant_id: merchant_id }, undefined, 'datetime_created_at')
            .then((data) => {
                subscription_df = data;
            }),

        databaseRepo.getWhere<Dispute>(
            TABLES.DISPUTES,
            { merchant_id: merchant_id },
            undefined,
            'dispute_created_at_date'
        ).then((data) => {
            disputes_df = data;
        }),

        
    ]).then(async () => {

        // console.log("c", customers_df);
        // console.log("p", payments_df);
        // console.log("s", subscription_df);
        // console.log("d", disputes_df);

        // resolved
        const da = disputeAnalysis();
        const sp = subscriptionPerformance();
        const psp = peakShoppingTimes() //no timestamp in data being returned from redshift
        const rst = revenueAndSalesTrends()
        const pc = performanceComparison()
        const sr = calculateSuccessRate();
        const cgr = customerGrowthAndRetention();
        const csg = customerSegmentation()

        // unresolved
        // const pp = productPerformance();
        // const satm = salesAnalysisThisMonth();
        
        // await plotCustomerSegmentationPie(csg)
        // await plotCustomerGrowth(cgr.customers_gained_each_month);
        // await plotRevenueAndSales(rst.revenue_trends);
        // await plotRevenue(rst.revenue_trends);
        // await plotTransactions(rst.revenue_trends)
        // await plotSubscriptionPerformance(sp.subscription_history);
        // await plotProductPerformance(pp.product_sales_history);
        // await plotPeakShoppingTimes(psp.peak_shopping_times);
        // await plotTopProducts(satm.top_products_this_month);
        // const result = await generateReport(rst, cgr, da, sp, pp, psp, satm, csg, pc, sr);
        // await createPdfReport(sr, da, satm, sp, cgr,  csg, JSON.parse(result));

    })
        .catch((error) => {
            console.error("Error loading data:", error);
        });
}

loadData();