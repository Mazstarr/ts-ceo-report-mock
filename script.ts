require('dotenv').config();
const csvParser = require('csv-parser');
const path = require('path');
const QuickChart = require('quickchart-js');
const Handlebars = require('handlebars');
const pdf = require('html-pdf-node');


import { format, parseISO, subYears, isBefore, subMonths, getMonth, subDays } from 'date-fns';
import * as fs from 'fs';
import { writeFileSync } from 'fs';
import axios from 'axios';
import { TABLES } from './constants';
import { databaseRepo } from './db_connection';
import { Customer, Dispute, Order, Subscription, Transaction } from './types';




const merchant_id = 100043;


// Function to analyze revenue and sales trends over the past year
const revenueAndSalesTrends = async () => {
    const today = new Date();
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const recentPayments = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND successful = ?',
        [startOfLastYear, true]
    );


    const revenueTrends = recentPayments.reduce((acc, payment) => {
        const paymentDate = format(payment.datetime_created_at_local, 'yyyy-MM');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_revenue: 0, total_transactions: 0 };
        }
        acc[paymentDate].total_revenue += parseFloat(payment.amount_transaction);
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
const customerGrowthAndRetention = async () => {
    const today = new Date();
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const startOfSixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);

    const rawQuery = `
        WITH ranked_customers AS (
            SELECT *, 
                ROW_NUMBER() OVER (PARTITION BY dimcustomerid ORDER BY customer_created_at DESC) AS row_num
            FROM ??
            WHERE ?? = ? AND customer_created_at >= ?
        )
        SELECT *
        FROM ranked_customers
        WHERE row_num = 1
    `;
    const params = [TABLES.CUSTOMERS, 'merchant_id', merchant_id, startOfLastYear.toISOString()];

    // Fetch the most recent customers created within the last year 
    const recentCustomers = await databaseRepo.executeRawQuery<Customer>(rawQuery, params);

    const customerGrowth = recentCustomers.reduce((acc, customer) => {
        const addedOnMonth = format(customer.customer_created_at, 'yyyy-MM');
        if (!acc[addedOnMonth]) {
            acc[addedOnMonth] = 0;
        }
        acc[addedOnMonth]++;
        return acc;
    }, {});

    const newCustomers = recentCustomers.length;
    const endCustomers = recentCustomers.filter(customer => customer.customer_created_at >= startOfSixMonthsAgo).length;

    const retentionRate = newCustomers > 0 ? ((endCustomers) / newCustomers) * 100 : 0;

    console.log("\nCustomer Growth (New Customers per Month):");
    console.log(customerGrowth);
    console.log(`\nCustomer Retention Rate: ${retentionRate.toFixed(2)}%`);

    return {
        customers_gained_each_month: customerGrowth,
        retention_rate_over_last_year: retentionRate.toFixed(2),
    };
}


// Function to analyze disputes
const disputeAnalysis = async () => {

    const lastMonth = subMonths(new Date(), 1);
    const lastMonthISOString = lastMonth.toISOString();

    const openDisputes = await databaseRepo.getWhere<Dispute>(
        TABLES.DISPUTES,
        { merchant_id: merchant_id },
        undefined,
        undefined,
        { dispute_status: 'Resolved' }
    );
    const disputesOpen = openDisputes.length;


    const resolvedDisputesLastMonth = await databaseRepo.getWhere<Dispute>(
        TABLES.DISPUTES,
        { merchant_id: merchant_id, dispute_status: 'Resolved' },
        undefined,
        undefined,
        undefined,
        'dispute_resolved_at_date >= ?',
        [lastMonthISOString]
    );
    const disputesResolvedLastMonth = resolvedDisputesLastMonth.length;


    const resolvedDisputes = await databaseRepo.getWhere<Dispute>(
        TABLES.DISPUTES,
        { merchant_id: merchant_id, dispute_status: 'Resolved' }
    );

    // Calculate Mean Time to Resolution
    let meanTimeToResolution = 0;
    if (resolvedDisputes.length > 0) {
        const totalDays = resolvedDisputes.reduce((acc, dispute) => {
            const createdDate = dispute.dispute_created_at_date ? new Date(dispute.dispute_created_at_date) : null;
            const resolvedDate = dispute.dispute_resolved_at_date ? new Date(dispute.dispute_resolved_at_date) : null;

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
const subscriptionPerformance = async () => {
    const lastMonth = subMonths(new Date(), 1);
    const lastMonthISOString = lastMonth.toISOString();


    const subscriptionDataLastMonth = await databaseRepo.getWhere<Subscription>(
        TABLES.SUBSCRIPTIONS,
        { merchant_id: merchant_id },
        undefined,
        'dw_modified',
        undefined,
        'dw_modified >= ? AND dw_modified < ?',
        [lastMonthISOString, new Date().toISOString()]
    );

    const totalSubscriptions = subscriptionDataLastMonth.length;
    const subscriptionVolume = subscriptionDataLastMonth.reduce((sum, sale) => sum + sale.amount_subscription, 0);
    const uniqueSubscribers = new Set(subscriptionDataLastMonth.map(payment => payment.dimcustomerid)).size;


    const today = new Date();
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);

    const subscriptionDataLastYear = await databaseRepo.getWhere<Subscription>(
        TABLES.SUBSCRIPTIONS,
        { merchant_id: merchant_id },
        undefined,
        'dw_modified',
        undefined,
        'dw_modified >= ? AND dw_modified < ?',
        [startOfLastYear, new Date().toISOString()]
    );

    const subscriptionHistory = subscriptionDataLastYear.reduce((acc, payment) => {
        const paymentDate = format(payment.dw_modified, 'yyyy-MM');
        if (!acc[paymentDate]) {
            acc[paymentDate] = { total_subscriptions: 0, total_revenue: 0 };
        }
        acc[paymentDate].total_subscriptions += 1;
        acc[paymentDate].total_revenue += payment.amount_subscription;
        return acc;
    }, {});

    console.log(`\nTotal Subscriptions for Last Month: ${totalSubscriptions}`);
    console.log(`Unique Subscribers for Last Month: ${uniqueSubscribers}`);
    console.log(`Subscription History for Last Year:`);
    console.log(subscriptionHistory);

    return {
        total_subscriptions: totalSubscriptions,
        subscription_volume: subscriptionVolume,
        unique_subscribers: uniqueSubscribers,
        subscription_history: subscriptionHistory,
    };
}


// Function to analyze peak shopping times
const peakShoppingTimes = async () => {
    const today = new Date();
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const recentPayments = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ?',
        [startOfLastYear]
    );

    const paymentHours = recentPayments.map(payment => payment.datetime_created_at_local.getHours());
    const hourCounts = paymentHours.reduce((acc, hour) => {
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
    }, {} as Record<number, number>);

    // Convert numeric hours to time range format (e.g., "12 AM - 1 AM")
    const formattedHourCounts = Object.keys(hourCounts).reduce((acc, hour) => {
        const hourNum = parseInt(hour);
        const timeRange = formatTimeRange(hourNum);  // Convert to time range format
        acc[timeRange] = hourCounts[hour];
        return acc;
    }, {} as Record<string, number>);

    console.log("Peak Shopping Times:", formattedHourCounts);

    return {
        peak_shopping_times: formattedHourCounts
    };
};

// Function to format hour in time range format (e.g., "12 AM - 1 AM")
const formatTimeRange = (hour: number): string => {
    const startHour = hour;
    const endHour = (hour + 1) % 24;

    const startPeriod = startHour >= 12 ? 'PM' : 'AM';
    const endPeriod = endHour >= 12 ? 'PM' : 'AM';

    const startFormatted = formatHourIn12HourFormat(startHour, startPeriod);
    const endFormatted = formatHourIn12HourFormat(endHour, endPeriod);

    return `${startFormatted} - ${endFormatted}`;
}

// Helper function to format hour in 12-hour format
const formatHourIn12HourFormat = (hour: number, period: string): string => {
    const formattedHour = hour % 12 || 12;  // Convert hour to 12-hour format
    return `${formattedHour} ${period}`;
}


// Function for customer segmentation
const customerSegmentation = async () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfMonth = new Date(today.getFullYear(), (today.getMonth() - 1), 1); //remember to remove -1 to get for current month and not last month
    const endOfMonth = new Date(today.getFullYear(), (today.getMonth() - 1) + 1, 0); //remember to remove -1 to get for current month and not last month
    const startOfThreeMonthsAgo = new Date(today.getFullYear(), (today.getMonth() - 1) - 3, 1); //remember to remove -1 to get for current month and not last month
    const endOfThreeMonthsAgo = new Date(today.getFullYear(), (today.getMonth() - 1) - 2, 0); //remember to remove -1 to get for current month and not last month

    const rawQuery = `
    WITH ranked_customers AS (
        SELECT *, 
            ROW_NUMBER() OVER (PARTITION BY dimcustomerid ORDER BY customer_created_at DESC) AS row_num
        FROM ??
        WHERE ?? = ? AND datetime_created_at_local >= ?
    )
    SELECT *
    FROM ranked_customers
    WHERE row_num = 1
`;
    const params = [TABLES.CUSTOMERS, 'merchant_id', merchant_id, startOfYear.toISOString()];

    // Fetch active customers within the year 
    const activeCustomersData = await databaseRepo.executeRawQuery<Customer>(rawQuery, params);

    const newCustomers = activeCustomersData.filter(customer =>
        customer.customer_created_at && customer.customer_created_at >= startOfMonth && customer.customer_created_at <= endOfMonth
    );

    const returningCustomers = activeCustomersData.filter(customer =>
        customer.customer_created_at && customer.customer_created_at < startOfThreeMonthsAgo &&
        customer.datetime_created_at_local && customer.datetime_created_at_local >= startOfThreeMonthsAgo && customer.datetime_created_at_local <= endOfThreeMonthsAgo
    );

    const nonReturningCustomers = activeCustomersData.filter(customer =>
        customer.customer_created_at && customer.customer_created_at < startOfThreeMonthsAgo &&
        (!customer.datetime_created_at_local || customer.datetime_created_at_local < startOfThreeMonthsAgo)
    );

    const totalActiveCustomers = activeCustomersData.length;


    const percentageReturning = (returningCustomers.length / totalActiveCustomers) * 100;
    const percentageNew = (newCustomers.length / totalActiveCustomers) * 100;
    const percentageNonReturning = (nonReturningCustomers.length / totalActiveCustomers) * 100;

    console.log("Customer Segmentation:", {
        new_customers: newCustomers.length,
        returning_customers: returningCustomers.length,
        non_returning_customers: nonReturningCustomers.length,
        total_customers: totalActiveCustomers,
        percentage_returning: percentageReturning,
        percentage_new: percentageNew,
        percentage_non_returning: percentageNonReturning
    });

    return {
        new_customers: newCustomers.length,
        returning_customers: returningCustomers.length,
        non_returning_customers: nonReturningCustomers.length,
        total_customers: totalActiveCustomers,
        percentage_returning: percentageReturning,
        percentage_new: percentageNew,
        percentage_non_returning: percentageNonReturning
    };
};


// // Function to compare performance between current and last month
const performanceComparison = async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() - 1; // rememeber to remove -1 to get for current month

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0);

    const startOfLastMonth = new Date(lastYear, lastMonth, 1);
    const endOfLastMonth = new Date(lastYear, lastMonth + 1, 0);

    const currentMonthSalesData = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND datetime_created_at_local <= ? AND successful = ?',
        [startOfCurrentMonth.toISOString(), endOfCurrentMonth.toISOString(), true]
    );

    const lastMonthSalesData = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND datetime_created_at_local <= ? AND successful = ?',
        [startOfLastMonth.toISOString(), endOfLastMonth.toISOString(), true]
    );


    const currentMonthSales = currentMonthSalesData.reduce((sum, payment) => sum + parseFloat(payment.amount_transaction), 0);

    const lastMonthSales = lastMonthSalesData.reduce((sum, payment) => sum + parseFloat(payment.amount_transaction), 0);

    console.log("Performance Comparison:", {
        current_month_sales: currentMonthSales,
        last_month_sales: lastMonthSales
    });

    return {
        current_month_sales: currentMonthSales,
        last_month_sales: lastMonthSales
    };
};


// // Function to calculate success rate
const calculateSuccessRate = async () => {
    const today = new Date();
    const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

    // Fetch transactions for last month
    const transactions = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND datetime_created_at_local <= ?',
        [startOfLastMonth.toISOString(), endOfLastMonth.toISOString()]
    );

    const totalPayments = transactions.length;
    const totalVolume = transactions.reduce((sum, payment) => sum + parseFloat(payment.amount_transaction), 0);
    const successfulPayments = transactions.filter(payment => Boolean(payment.successful)).length;
    const failedPayments = transactions.filter(payment => !Boolean(payment.successful)).length;

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
};

// Function to analyze sales this month
// const salesAnalysisThisMonth = async() => {
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();
//     const currentMonth = currentDate.getMonth() -1; // rememeber to remove -1 to get for current month

//     const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);

//     const monthlySales = await databaseRepo.getWhere<Customer>(
//         TABLES.CUSTOMERS,
//         { merchant_id: merchant_id },
//         undefined,
//         'datetime_created_at_local',
//         undefined,
//         'datetime_created_at_local >= ? AND successful = ?',
//         [startOfCurrentMonth, true]
//     );

//     const productRevenue = monthlySales.reduce((acc, payment) => {
//         acc[payment.transaction_id] = (acc[payment.transaction_id] || 0) + parseFloat(payment.amount_transaction);
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

// const salesAnalysisThisMonth = async () => {
//     const currentDate = new Date();
//     const currentYear = currentDate.getFullYear();
//     const currentMonth = currentDate.getMonth() - 1; // Remove -1 to get current month

//     const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);

//     const startOfLastYear = new Date(currentDate.getFullYear() - 1, 0, 1);

//     // Fetch transactions for the current month
//     const monthlySales = await databaseRepo.getWhere<Customer>(
//         TABLES.CUSTOMERS,
//         { merchant_id: merchant_id },
//         undefined,
//         'datetime_created_at_local',
//         undefined,
//         'datetime_created_at_local >= ? AND successful = ?',
//         [startOfCurrentMonth, true]
//     );
//     console.log("t", monthlySales)
//     // Map transaction IDs to their product IDs using the orders table
//     // const transactions = monthlySales.map(sale => sale.transaction_id);
//     // const productOrders = await databaseRepo.getWhere<Order>(
//     //     TABLES.ORDERS,
//     //     undefined,
//     //     undefined,
//     //     undefined,
//     //     undefined,
//     //     'transaction_id = ANY(?)',
//     //     [transactions]
//     // );
//     // console.log("p", await databaseRepo.getById<Order>(TABLES.ORDERS, 'transaction_id', "204359623"))
//     // console.log("p", await databaseRepo.getFirst10Records<Order>(TABLES.ORDERS))

//     // Create a map of transaction_id to dimcommerceproductid for easy lookupD
//     // const transactionToProduct = productOrders.reduce((acc, order) => {
//     //     acc[order.transaction_id] = order.dimcommerceproductid;
//     //     // console.log("de", )
//     //     return acc;
//     // }, {} as Record<string, string>);
//     // console.log("t-p", transactionToProduct)
//     //     // Calculate revenue grouped by dimcommerceproductid
//     //     const productRevenue = monthlySales.reduce((acc, payment) => {
//     //         const productId = transactionToProduct[payment.transaction_id];
//     //         if (productId) {
//     //             acc[productId] = (acc[productId] || 0) + parseFloat(payment.amount_transaction);
//     //         }
//     //         return acc;
//     //     }, {} as Record<string, number>);

//     //     // Sort and get top 5 products
//     //     const topProducts = Object.entries(productRevenue)
//     //         .sort((a, b) => b[1] - a[1])
//     //         .slice(0, 5);

//     //     console.log("Top Products This Month:", topProducts);

//     //     return {
//     //         top_products_this_month: topProducts,
//     //         monthly_sales: monthlySales
//     //     };
// }

// Function for product performance analysis
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

async function plotCustomerSegmentationPie(segmentationData: { new_customers: number; returning_customers: number; non_returning_customers: number }) {
    const chart = new QuickChart();
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

    await saveChartImage(chart, 'customer_segmentation_pie.png');
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

async function plotRevenue(revenueTrends: Record<string, { total_revenue: number }>) {

    const revenueTrendsArray = Object.entries(revenueTrends).map(([payment_date, { total_revenue }]) => ({
        payment_date,
        total_revenue,
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

    await saveChartImage(chart, 'total_revenue_trends.png');
}


async function plotTransactions(revenueTrends: Record<string, { total_transactions: number; }>) {

    const revenueTrendsArray = Object.entries(revenueTrends).map(([payment_date, { total_transactions }]) => ({
        payment_date,
        total_transactions,
    }));

    const chart = new QuickChart();
    chart.setConfig({
        type: 'line',
        data: {
            labels: revenueTrendsArray.map(entry => entry.payment_date),
            datasets: [
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
                title: {
                    display: true,
                    text: 'Total Transactions Over the Past Year'
                },
            },
            scales: { y: { beginAtZero: true } },
        }
    });

    await saveChartImage(chart, 'total_transaction_trends.png');
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

    const chart = new QuickChart();
    chart.setConfig({
        type: 'bar',
        data: {
            labels: topProducts.map(entry => entry[0]),
            datasets: [{
                label: 'Total Revenue',
                data: topProducts.map(entry => entry[1]),
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

async function plotPeakShoppingTimes(peakTimes: Record<string, number>) {
    const hours = Object.keys(peakTimes).map(String);
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

function getImageUrl(imgPath: string) {
    const imgData = fs.readFileSync(imgPath).toString('base64');
    const imgSrc = `data:image/png;base64,${imgData}`;
    return imgSrc;
}

async function createPdfReport(sr: any, da: any, satm: any, sp: any, cgr: any, csg: any, result: any) {
    const templateHtml = fs.readFileSync('reportTemplate.html', 'utf-8');
    const template = Handlebars.compile(templateHtml);
    const templateData = {
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

    const htmlContent = template(templateData);
    const options = { format: 'A4' };
    const file = { content: htmlContent };
    const pdfBuffer = await pdf.generatePdf(file, options);
    fs.writeFileSync('business_report.pdf', pdfBuffer);
    console.log("PDF report generated successfully.");
}

async function getChatCompletion(messages: any[], response_format: any) {
    try {
        const apiKey = process.env.OPENAI_API_KEY;
        const endpoint = 'https://api.openai.com/v1/chat/completions';
        const response = await axios.post(
            endpoint,
            {
                model: 'gpt-4o',
                messages: messages,
                response_format: response_format,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
            }
        );

        return response.data;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('Error response:', error.response?.data);
            console.error('Error headers:', error.response?.headers);
        } else {
            console.error('Unexpected error:', error);
        }
    }

}

async function generateReport(rst: any, cgr: any, da: any, sp: any, pp: any, psp: any, satm: any, csg: any, pc: any, sr: any) {

    try {
        const messages = [
            {
                role: "user",
                content: `
                    You are a helpful data analyst for Paystack. Your goal is to generate accurate and useful CEO-level insights from all the processed payment data we will be feeding you.
                `
            },
            {
                role: "user",
                content: `
                    This is the gathered data from business XYZ, what do you make of it? Try to think of questions that can be answered to grow/help their business. Things they need to cut or pay more attention to.

                    i.e. Should I move off this modality? What is the best play for my business right now? 

                    This is the data. Start with using thinking tags and generating all possible questions that could be reasoned from the data. Then, analyse the data and filter down to the most relevant ones. 

                    Next, try to answer ALL these questions while citing the relevant data provided.
                    
                    Next, re-evaluate your answers strictly, and extract the most important ones, then you can create your answer in a response tag.

                    After all of this, I want you to craft an action plan for the CEO in a more friendly and encouraging tone, and then 1 or 2 paragraphs about the general state of their businesses and what they should be thinking of long term. 

                    Please and please, ensure not to state things as obvious, give grounding to any statement you're making, it must be backed by data, principles and information, be sure to cite them like [1] and mention under your response if formulas or principles. Do not be condescending or too formal in your CEO response. Provide real value.

                    When you cite something, do not let it be a vague rendition, let it be the real thing you are citing, in FULL.
                    
                    {{
                        revenue_and_sales_trends : ${rst},
                        customer_growth_and_retention : ${cgr},
                        dispute_analysis : ${da},
                        subscription_performance : ${sp},
                        product_performance : ${pp},
                        peak_shopping_times : ${psp},
                        sales_analysis_this_month : ${satm['top_products_this_month']},
                        customer_segmentation: ${csg}, 
                        performance_comparison: ${pc},
                        calculate_success_rate: ${sr},
                    }}
                `
            }
        ];
        const response_format = {
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
        }

        const data = await getChatCompletion(messages, response_format)
        return data.choices[0].message.content;

    }
    catch (error: any) {
        console.error("error occured while genrating report", error)
    }

}


async function main() {
    try {
        const sr = await calculateSuccessRate();
        const cgr = await customerGrowthAndRetention();
        const da = await disputeAnalysis();
        const sp = await subscriptionPerformance();
        const rst = await revenueAndSalesTrends()
        const csg = await customerSegmentation()
        const pc = await performanceComparison()
        const psp = await peakShoppingTimes()
        // const satm = await salesAnalysisThisMonth();
        // const pp = await productPerformance();

        await plotCustomerSegmentationPie(csg)
        await plotCustomerGrowth(cgr.customers_gained_each_month);
        await plotRevenueAndSales(rst.revenue_trends);
        await plotRevenue(rst.revenue_trends);
        await plotTransactions(rst.revenue_trends)
        await plotSubscriptionPerformance(sp.subscription_history);
        await plotPeakShoppingTimes(psp.peak_shopping_times);
        // await plotProductPerformance(pp.product_sales_history);
        // await plotTopProducts(satm.top_products_this_month);
        // const result = await generateReport(rst, cgr, da, sp, pp, psp, satm, csg, pc, sr);
        // await createPdfReport(sr, da, satm, sp, cgr,  csg, JSON.parse(result));
    } catch (error) {
        console.error("Error in analysis functions:", error);
    }
}

main();