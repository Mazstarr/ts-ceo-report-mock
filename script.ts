require('dotenv').config();
const csvParser = require('csv-parser');
const path = require('path');
const QuickChart = require('quickchart-js');
const Handlebars = require('handlebars');
const pdf = require('html-pdf-node');
const puppeteer = require('puppeteer');


import { format, parseISO, subYears, isBefore, subMonths, getMonth, subDays } from 'date-fns';
import * as fs from 'fs';
import { writeFileSync } from 'fs';
import axios from 'axios';
import { TABLES } from './constants';
import { databaseRepo } from './db_connection';
import { Customer, Dispute, Order, Product, Status, Subscription, Transaction } from './types';




// const merchant_id = 151697;
const merchant_id = 100043;


// Function to analyze revenue and sales trends over the past year
const revenueAndSalesTrends = async () => {
    const today = new Date();
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); //remember to remove -1 to get for current month and not last month
    const recentPayments = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND datetime_created_at_local <= ? AND successful = ?',
        [startOfLastYear, endOfCurrentMonth, true]
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

// Function to analyze transaction count and percentage by channel
const transactionCountByChannel = async () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); //remember to remove -1 to get for current month and not last month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); //remember to remove -1 to get for current month and not last month

    const recentPayments = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND datetime_created_at_local <= ? AND successful = ?',
        [startOfMonth, endOfMonth, true]
    );

    // Total transactions in the past year
    const totalTransactions = recentPayments.length;

    // Calculate counts and percentages by channel
    const channelStats = recentPayments.reduce((acc, payment) => {
        const channel = payment.dimchannel || 'Unknown';

        if (!acc[channel]) {
            acc[channel] = { count: 0, percentage: 0 };
        }
        acc[channel].count += 1;
        return acc;
    }, {} as Record<string, { count: number; percentage: number }>);

    // Calculate percentage for each channel
    for (const channel in channelStats) {
        channelStats[channel].percentage = (channelStats[channel].count / totalTransactions) * 100;
    }

    console.log("\nTransaction Count and Percentage by Channel:");
    console.log(channelStats);

    return channelStats;
}

// Function to analyze customer growth and retention rates
const customerGrowthAndRetention = async () => {
    const today = new Date();
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const startOfSixMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 6, 1);
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); //remember to remove -1 to get for current month and not last month

    const rawQuery = `
        WITH ranked_customers AS (
            SELECT *, 
                ROW_NUMBER() OVER (PARTITION BY dimcustomerid ORDER BY customer_created_at DESC) AS row_num
            FROM ??
            WHERE ?? = ? AND customer_created_at >= ? AND customer_created_at <= ?
            ORDER BY customer_created_at ASC
        )
        SELECT *
        FROM ranked_customers
        WHERE row_num = 1
    `;
    const params = [TABLES.CUSTOMERS, 'merchant_id', merchant_id, startOfLastYear.toISOString(), endOfCurrentMonth];

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



// Function to analyze subscription performance
const subscriptionPerformance = async () => {
    const today = new Date();
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    const startOfMonth = new Date(today.getFullYear(), (today.getMonth() - 1), 1); //remember to remove -1 to get for current month and not last month
    const endOfMonth = new Date(today.getFullYear(), (today.getMonth() - 1) + 1, 0); //remember to remove -1 to get for current month and not last month

    const subscriptionData = await databaseRepo.getWhere<Subscription>(
        TABLES.SUBSCRIPTIONS,
        { merchant_id: merchant_id },
        undefined,
        'dw_modified',
        undefined,
        'dw_modified >= ? AND dw_modified < ?',
        [startOfMonth, endOfMonth]
    );

    const totalSubscriptions = subscriptionData.length;
    const subscriptionVolume = subscriptionData.reduce((sum, sale) => sum + sale.amount_subscription, 0);
    const uniqueSubscribers = new Set(subscriptionData.map(payment => payment.dimcustomerid)).size;



    const subscriptionDataLastYear = await databaseRepo.getWhere<Subscription>(
        TABLES.SUBSCRIPTIONS,
        { merchant_id: merchant_id },
        undefined,
        'dw_modified',
        undefined,
        'dw_modified >= ? AND dw_modified < ?',
        [startOfLastYear, endOfMonth]
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

    console.log(`\nTotal Subscriptions for the Month: ${totalSubscriptions}`);
    console.log(`Unique Subscribers for the Month: ${uniqueSubscribers}`);
    console.log(`Subscription History:`);
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
    const endOfCurrentMonth = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); //remember to remove -1 to get for current month and not last month
    const recentPayments = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND datetime_created_at_local <= ?',
        [startOfLastYear, endOfCurrentMonth]
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
        WHERE ?? = ? AND datetime_created_at_local >= ? AND datetime_created_at_local <= ?
    )
    SELECT *
    FROM ranked_customers
    WHERE row_num = 1
`;
    const params = [TABLES.CUSTOMERS, 'merchant_id', merchant_id, startOfYear.toISOString(), endOfMonth];

    // Fetch active customers within the year 
    console.log("execut")
    const activeCustomersData = await databaseRepo.executeRawQuery<Customer>(rawQuery, params);
    console.log("executed")
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
    const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); //remember to remove -1 to get for current month and not last month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); //remember to remove -1 to get for current month and not last month


    // Fetch transactions for last month
    const transactions = await databaseRepo.getWhere<Customer>(
        TABLES.CUSTOMERS,
        { merchant_id: merchant_id },
        undefined,
        'datetime_created_at_local',
        undefined,
        'datetime_created_at_local >= ? AND datetime_created_at_local <= ?',
        [startOfMonth, endOfMonth]
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

// Function to analyze disputes with resolution percentages
const disputeAnalysis = async () => {

    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); // Remove -1 to get for current month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); // Remove -1 to get for current month

    const openDisputes = await databaseRepo.getWhere<Dispute>(TABLES.DISPUTES, { merchant_id: merchant_id }, undefined, undefined, {
        dispute_status: 'Resolved',
    });
    const disputesOpen = openDisputes.length;

    const resolvedDisputesForTheMonth = await databaseRepo.getWhere<Dispute>(
        TABLES.DISPUTES,
        { merchant_id: merchant_id, dispute_status: 'Resolved' },
        undefined,
        undefined,
        undefined,
        'dispute_resolved_at_date >= ? AND dispute_resolved_at_date <= ?',
        [startOfMonth, endOfMonth]
    );
    const disputesResolved = resolvedDisputesForTheMonth.length;


    // Calculate Mean Time to Resolution
    let meanTimeToResolution = 0;
    if (resolvedDisputesForTheMonth.length > 0) {
        const totalDays = resolvedDisputesForTheMonth.reduce((acc, dispute) => {
            const createdDate = dispute.dispute_created_at_date ? new Date(dispute.dispute_created_at_date) : null;
            const resolvedDate = dispute.dispute_resolved_at_date ? new Date(dispute.dispute_resolved_at_date) : null;

            if (!createdDate || isNaN(createdDate.getTime()) || !resolvedDate || isNaN(resolvedDate.getTime())) {
                return acc;
            }

            if (resolvedDate < createdDate) {
                return acc;
            }
            return acc + (resolvedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24); // Convert ms to days
        }, 0);

        meanTimeToResolution = totalDays / resolvedDisputesForTheMonth.length;
    }

    // Calculate percentages for each dispute resolution category
    const resolutionCategories = [
        'Paystack-Accepted',
        'Unknown',
        'Auto-Accepted',
        'Declined',
        'Merchant-Accepted'
    ];

    const resolutionPercentages = resolutionCategories.reduce((acc, category) => {
        const count = resolvedDisputesForTheMonth.filter(dispute => dispute.dispute_resolution === category).length;
        const percentage = resolvedDisputesForTheMonth.length > 0
        ? (count / resolvedDisputesForTheMonth.length) * 100
        : 0;
        acc[category] = {
            count,
            percentage: percentage.toFixed(2) // Format percentage to 2 decimal places
        };
        return acc;
    }, {} as Record<string, { count: number; percentage: string }>);

    console.log("\nNumber of Open Disputes: ", disputesOpen);
    console.log("Number of Disputes Resolved in the Month: ", disputesResolved);
    console.log("Mean Time to Resolution (Days): ", meanTimeToResolution.toFixed(2));
    console.log("Dispute Resolution Percentages by Category: ", resolutionPercentages);

    return {
        open_disputes: disputesOpen,
        resolved_this_month: disputesResolved,
        mean_time_to_resolution: meanTimeToResolution.toFixed(2),
        resolution_percentages: resolutionPercentages
    };
};


// Function to analyze sales this month
const salesAnalysisThisMonth = async () => {

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

    const deliveredStatus = await databaseRepo.get<Status>(TABLES.STATUS, 'status', 'delivered');
    const paidStatus = await databaseRepo.get<Status>(TABLES.STATUS, 'status', 'paid');

    const statusIds = [deliveredStatus.dimstatusid, paidStatus.dimstatusid];

    // Fetch orders with either "delivered" or "paid" status
    const monthlyOrders = await databaseRepo.getWhere<Order>(
        TABLES.ORDERS,
        { dimmerchantid: merchant_id.toString() },
        undefined,
        'datetime_paid_at',
        undefined,
        'datetime_paid_at >= ? AND datetime_paid_at <= ? AND dimstatusid IN (?, ?)',
        [startOfCurrentMonth, endOfCurrentMonth, ...statusIds]
    );

    const productRevenue = monthlyOrders.reduce((acc, order) => {
        acc[order.dimcommerceproductid] = (acc[order.dimcommerceproductid] || 0) + parseFloat(order.amount_value);
        return acc;
    }, {} as Record<string, number>);

    // Sort and get the top 5 product IDs by revenue
    const topProductIds = Object.entries(productRevenue)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(entry => entry[0]);

    if (topProductIds.length === 0) {
        console.log("No top products found this month.");
        return {
            top_products_this_month: [],
        };
    }

    const rawQuery = `dimcommerceproductid IN (${topProductIds.map(() => '?').join(', ')})`;

    // Fetch product details for the top 5 products using raw query
    const topProducts = await databaseRepo.getWhere<Product>(
        TABLES.PRODUCTS,
        {},
        undefined,
        'created_date',
        undefined,
        rawQuery,
        topProductIds
    );

    // Map the product details to their IDs for easy lookup
    const productMap = new Map<string, string>();
    topProducts.forEach(product => {
        productMap.set(product.dimcommerceproductid, product.product_name);
    });

    // Combine the revenue with the product names, ensuring only entries with defined product names
    const topProductRevenue: [string, number][] = topProductIds
        .map(productId => {
            const productName = productMap.get(productId);
            return productName ? [productName, productRevenue[productId]] : undefined;
        })
        .filter((entry): entry is [string, number] => entry !== undefined);

    console.log("Top Products This Month:", topProductRevenue);

    return {
        top_products_this_month: topProductRevenue,
    };
};


// Function for product performance analysis
const productPerformance = async () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();

    const startOfCurrentYear = new Date(currentYear, 0, 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1 + 1, 0); //remember to remove -1 to get for current month and not last month
    const deliveredStatus = await databaseRepo.get<Status>(TABLES.STATUS, 'status', 'delivered');
    const paidStatus = await databaseRepo.get<Status>(TABLES.STATUS, 'status', 'paid');

    const statusIds = [deliveredStatus.dimstatusid, paidStatus.dimstatusid];

    const yearlyOrders = await databaseRepo.getWhere<Order>(
        TABLES.ORDERS,
        { dimmerchantid: merchant_id.toString() },
        undefined,
        'datetime_paid_at',
        undefined,
        'datetime_paid_at >= ? AND datetime_paid_at <= ? AND dimstatusid IN (?, ?)',
        [startOfCurrentYear, endOfCurrentMonth, ...statusIds]
    );

    const productSalesHistory = yearlyOrders.reduce((acc, order) => {
        if (!acc[order.dimcommerceproductid]) {
            acc[order.dimcommerceproductid] = { total_sales: 0, total_transactions: 0, average_sale_value: 0 };
        }
        acc[order.dimcommerceproductid].total_sales += parseFloat(order.amount_value);
        acc[order.dimcommerceproductid].total_transactions += 1;
        return acc;
    }, {} as Record<string, { total_sales: number, total_transactions: number, average_sale_value: number }>);


    const productIds = Object.keys(productSalesHistory);
    if (productIds.length == 0) {
        return {
            product_sales_history: {},
        };
    }

    const rawQuery = `dimcommerceproductid IN (${productIds.map(() => '?').join(', ')})`;

    // Fetch product details for the products in the sales history using raw query
    const products = await databaseRepo.getWhere<Product>(
        TABLES.PRODUCTS,
        {},
        undefined,
        'created_date',
        undefined,
        rawQuery,
        productIds
    );

    // Map the product details to their IDs for easy lookup
    const productMap = new Map<string, string>();
    products.forEach(product => {
        productMap.set(product.dimcommerceproductid, product.product_name);
    });

    // Add product names to the sales history and format the output
    const productSalesWithNames = Object.keys(productSalesHistory).reduce((acc, productId) => {
        const product = productSalesHistory[productId];
        const productName = productMap.get(productId) || 'Unknown Product';
        acc[productName] = {
            total_sales: product.total_sales,
            total_transactions: product.total_transactions,
            average_sale_value: product.total_sales / product.total_transactions,
        };
        return acc;
    }, {} as Record<string, { total_sales: number, total_transactions: number, average_sale_value: number }>);

    console.log("\nProduct Performance Analysis:");
    console.log(productSalesWithNames);

    return {
        product_sales_history: productSalesWithNames,
    };
};




async function saveChartImage(chart: InstanceType<typeof QuickChart>, fileName: string) {
    console.log("plotting")
    const imageUrl = await chart.getShortUrl();
    console.log("url", fileName, imageUrl);

    const response = await fetch(imageUrl);
    const buffer = await response.arrayBuffer();

    writeFileSync(path.join(__dirname, fileName), Buffer.from(buffer));
}


async function plotCustomerGrowth(customerGrowth: Record<string, number>) {
    // Transform the object into an array
    const customerGrowthArray = Object.entries(customerGrowth).map(([added_on, new_customers]) => ({
        added_on: format(new Date(added_on), 'MMM yyyy'),
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
                backgroundColor: '#09A5DB',
            }]
        },
        options: {
            legend: { display: false },
            scales: { y: { beginAtZero: true } },
        }
    });

    chart.setWidth(565);
    chart.setHeight(300);

    return chart.toDataUrl();
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
                    '#011B33',
                    '#FFAD00',
                    '#E35D69'
                ],
            }]
        },
        options: {
            legend: { display: false },
            plugins: {
                datalabels: { display: false }, // Disable datalabels plugin
            },
            scales: { y: { beginAtZero: true } },
        }
    });

    chart.setWidth(153);
    chart.setHeight(153); 
    chart.setDevicePixelRatio(2); 
    return chart.toDataUrl();
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
        payment_date: format(new Date(payment_date), 'MMM yyyy'),
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
                    borderColor: '#09A5DB',  // Line color
                    borderWidth: 2,
                    fill: false,
                }
            ]
        },
        options: {
            legend: { display: false },
            // title: { display: true, text: 'Total Revenue Over the Past Year' },
            scales: {
                x: {
                    ticks: {
                        color: '#B1BAC3',
                        autoSkip: true,  // Automatically skip labels if too many
                    },

                    grid: {
                        color: '#E0F3FD',
                    },
                    borderColor: '#333B43',
                    borderWidth: 2,
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#B1BAC3',
                    },
                    grid: {
                        color: '#E0F3FD',
                    },
                    borderColor: '#333B43',
                    borderWidth: 2,
                },
            },

        }

    });

    chart.setWidth(565);
    chart.setHeight(300);

    return chart.toDataUrl();
}

async function plotTransactions(revenueTrends: Record<string, { total_transactions: number; }>) {

    const revenueTrendsArray = Object.entries(revenueTrends).map(([payment_date, { total_transactions }]) => ({
        payment_date: format(new Date(payment_date), 'MMM yyyy'),
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
                    borderColor: '#22D34B',
                    fill: false,
                }
            ]
        },
        options: {
            legend: { display: false },
            scales: {
                x: {
                    ticks: {
                        color: '#B1BAC3',
                        autoSkip: true,  // Automatically skip labels if too many
                    },

                    grid: {
                        color: '#E0F3FD',
                    },
                    borderColor: '#333B43',
                    borderWidth: 2,
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#B1BAC3',
                    },
                    grid: {
                        color: '#E0F3FD',
                    },
                    borderColor: '#333B43',
                    borderWidth: 2,
                },
            },

        }

    });

    chart.setWidth(565);
    chart.setHeight(300);

    return chart.toDataUrl();
}


async function plotSubscriptionPerformance(subscriptionHistory: Record<string, { total_subscriptions: number; total_revenue: number; }>) {
    // Transform the subscriptionHistory object into an array
    const subscriptionArray = Object.entries(subscriptionHistory).map(([payment_date, { total_subscriptions }]) => ({
        payment_date: format(new Date(payment_date), 'MMM yyyy'),
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
                backgroundColor: '#09A5DB',
            }]
        },
        options: {
            legend: { display: false },
            scales: { y: { beginAtZero: true } },
        }
    });

    chart.setWidth(565);
    chart.setHeight(300);

    return chart.toDataUrl();
}


async function plotProductPerformance(productSalesHistory: Record<string, { total_sales: number; total_transactions: number; average_sale_value: number; }>) {

    const productSalesArray = Object.entries(productSalesHistory).map(([item, { total_sales, total_transactions, average_sale_value }]) => ({
        item,
        total_sales,
        total_transactions,
        average_sale_value,
    }));

    // Sort the array based on total_sales
    // const sortedData = productSalesArray.sort((a, b) => a.total_sales - b.total_sales);

    const chart = new QuickChart();
    chart.setConfig({
        type: 'bar',
        data: {
            labels: productSalesArray.map(entry => entry.item),
            datasets: [{
                label: 'Total Sales',
                data: productSalesArray.map(entry => entry.total_sales),
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
                label: 'Top products',
                data: topProducts.map(entry => entry[1]),
                backgroundColor: '#09A5DB',
            }]
        },
        options: {
            legend: { display: false },
            scales: { y: { beginAtZero: true } },
        }
    });
    chart.setWidth(565);
    chart.setHeight(300);

    return chart.toDataUrl();
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
                backgroundColor: '#09A5DB',
            }]
        },
        options: {
            legend: { display: false },
            scales: { y: { beginAtZero: true } },
        }
    });
    chart.setWidth(565);
    chart.setHeight(300);

    return chart.toDataUrl();
}

function getImageUrl(imgPath: string) {
    const imgData = fs.readFileSync(imgPath).toString('base64');
    const imgSrc = `data:image/png;base64,${imgData}`;
    return imgSrc;
}

async function createPdfReport(sr: any, da: any, satm: any, sp: any, cgr: any, csg: any, result: any) {

    Handlebars.registerHelper('gt', function (a: number, b: number) {
        return a > b;
    });

    Handlebars.registerHelper('gte', function (a: number, b: number) {
        return a >= b;
    });
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
        best_product: satm.top_products_this_month?.[0]?.[0] || 'No product',
        best_product_revenue: satm.top_products_this_month?.[0]?.[1]
            ? satm.top_products_this_month[0][1].toLocaleString()
            : 0,
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

const getMerchants = async () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); //remember to remove -1 to get for current month and not last month
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() - 1 + 1, 0); //remember to remove -1 to get for current month and not last month

    const rawQuery = `
    SELECT 
        merchant_id, 
        merchant_business_type, 
        merchant_category,
        merchant_industry,
        merchant_country, 
        merchant_classification, 
        mcc_category,
        SUM(transaction_amount) AS total_transaction_volume
    FROM ??
    WHERE reporting_date >= ? AND reporting_date <= ?
    GROUP BY merchant_id, merchant_business_type, merchant_category, merchant_industry, merchant_country, merchant_classification, mcc_category;
    `;

    const results = await databaseRepo.executeRawQuery<Transaction>(rawQuery, [
        TABLES.TRANSACTIONS,
        startOfMonth,
        endOfMonth,
    ]);

    console.log('Unique merchants with total transaction volume for the month:', results);
    return results;
};


const getMerchantById = async (merchant_id: number) => {
    const merchant = await databaseRepo.get<Transaction>(TABLES.TRANSACTIONS, 'merchant_id', merchant_id);
    console.log("m", merchant)
    return merchant;

}

// async function createPdfReportNew() {

//     Handlebars.registerHelper('gt', function (a: number, b: number) {
//         return a > b;
//     });

//     Handlebars.registerHelper('gte', function (a: number, b: number) {
//         return a >= b;
//     });
//     const templateHtml = fs.readFileSync('template.html', 'utf-8');
//     const template = Handlebars.compile(templateHtml);
//     const templateData = {
//         current_month: format(new Date(), 'MMMM'),

//     };

//     const htmlContent = template(templateData);
//     const options = { format: 'A4' };
//     const file = { content: htmlContent };
//     const pdfBuffer = await pdf.generatePdf(file, options);
//     fs.writeFileSync('new_report.pdf', pdfBuffer);
//     console.log("PDF report generated successfully.");
// }
// da: any, satm: any, sp: any, cgr: any, csg: any,
// result: any

async function createPdfReportNew(sr: any, da:any, satm: any, sp: any, cgr: any, csg: any, psp: any, image_blobs: any) {
    // Read the HTML template
    const templateHtml = fs.readFileSync('template.html', 'utf-8');

    // Register Handlebars helpers
    Handlebars.registerHelper('gt', function (a, b) {
        return a > b;
    });

    Handlebars.registerHelper('gte', function (a, b) {
        return a >= b;
    });

    // Read the pie chart image and convert it to base64
    const pieImagePath = path.join(__dirname, 'assets/images/pie.svg');
    const pieImageBase64 = fs.readFileSync(pieImagePath, { encoding: 'base64' });

    const arrowImagePath = path.join(__dirname, 'assets/images/arrow.svg');
    const arrowImageBase64 = fs.readFileSync(arrowImagePath, { encoding: 'base64' });


    const peakShoppingTimeStats = Object.entries(psp.peak_shopping_times as Record<string, number>).reduce(
        (acc, curr) => {
            if (acc) {
                if (curr?.[1] > acc.transactions) {
                    return {
                        time: curr[0],
                        transactions: curr[1],
                    };
                } else {
                    return acc;
                }
            } else {
                return {
                    time: curr[0],
                    transactions: curr[1],
                };
            }
        },
        null as null | {
            time: string;
            transactions: number;
        }
    );
    // Prepare template data
    const templateData = {
        current_month: format(new Date(), 'MMMM'),
        pieImageBase64: pieImageBase64,
        arrowImageBase64: arrowImageBase64,
        total_payments: sr.total_payments.toLocaleString(),
        total_volume: sr.total_volume.toLocaleString() || 'X',
        successful_payments: sr.successful_payments.toLocaleString(),
        success_rate: sr.success_rate.toFixed(2),
        revenue_trend_image: image_blobs['total_revenue_trends'],
        transaction_trend_image: image_blobs['total_transaction_trends'],
        best_product: satm.top_products_this_month?.[0]?.[0] || null,
        best_product_revenue: satm.top_products_this_month?.[0]?.[1]
            ? satm.top_products_this_month[0][1].toLocaleString()
            : 0,
        top_products_image: image_blobs['top_products'],
        subscription_performance_image: image_blobs['subscription_performance'],
        total_subscriptions: sp.total_subscriptions,
        subscription_volume: sp.subscription_volume.toLocaleString(),
        customer_growth_image: image_blobs['customer_growth'],
        customer_segmentation_image: image_blobs['customer_segmentation_pie'],
        new_customers: csg.new_customers,
        returning_customers: csg.returning_customers,
        non_returning_customers: csg.non_returning_customers,
        retention_rate_over_last_year: cgr.retention_rate_over_last_year,
        peak_shopping_time: peakShoppingTimeStats.time,
        peak_shopping_time_transactions: peakShoppingTimeStats.transactions,
        peak_times_image: image_blobs['peak_shopping_times'],
        open_disputes: da.open_disputes,
        resolved_this_month: da.resolved_this_month,
        mean_time_to_resolution: da.mean_time_to_resolution,
        // revenue_sales_trend: getImageUrl('./revenue_and_sales_trends.png'),
        // responses_to_key_questions: result.responses_to_key_questions,
        // action_plan: result.action_plan,
        // ceo_summary_paragraphs_title: result.ceo_summary_paragraphs_title,
        // ceo_summary_paragraphs: result.ceo_summary_paragraphs
    };

    // Compile the Handlebars template
    const template = Handlebars.compile(templateHtml);
    const htmlContent = template(templateData);

    // Launch Puppeteer browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Path to the fonts in the assets directory
    const fontDir = path.join(__dirname, 'assets/fonts');

    // Inject external CSS for fonts into the page dynamically
    await page.addStyleTag({
        content: `
            @font-face {
                font-family: 'Graphik';
                src: url('file://${path.join(fontDir, 'Graphik-Medium.otf')}') format('truetype');
                font-weight: 600;
                font-style: normal;
            }
            @font-face {
                font-family: 'Graphik';
                src: url('file://${path.join(fontDir, 'Graphik-Regular.otf')}') format('truetype');
                font-weight: 400;
                font-style: normal;
            }
            @font-face {
                font-family: 'Graphik';
                src: url('file://${path.join(fontDir, 'Graphik-MediumItalic.otf')}') format('truetype');
                font-weight: 600;
                font-style: italic;
            }
            @font-face {
                font-family: 'Graphik';
                src: url('file://${path.join(fontDir, 'Graphik-RegularItalic.otf')}') format('truetype');
                font-weight: 400;
                font-style: italic;
            }
            @font-face {
                font-family: 'Boing';
                src: url('file://${path.join(fontDir, 'Boing-SemiBold.ttf')}') format('truetype');
                font-weight: 600;
                font-style: normal;
            }
            @font-face {
                font-family: 'Boing';
                src: url('file://${path.join(fontDir, 'Boing-SemiBoldItalic.ttf')}') format('truetype');
                font-weight: 600;
                font-style: italic;
            }
        `
    });

    // Set the HTML content of the page
    await page.setContent(htmlContent);

    // Generate the PDF
    await page.pdf({ path: 'new_report.pdf', format: 'A4' });

    // Close the browser
    await browser.close();
    console.log("PDF report generated successfully.");
}


async function main() {
    try {

        // await getMerchants();
        // await transactionCountByChannel()

        const sr = await calculateSuccessRate();
        const rst = await revenueAndSalesTrends()
        const satm = await salesAnalysisThisMonth();
        const sp = await subscriptionPerformance();
        const csg = await customerSegmentation()
        const cgr = await customerGrowthAndRetention();
        const psp = await peakShoppingTimes()
        const da = await disputeAnalysis();
        // const pp = await productPerformance();
        // const pc = await performanceComparison()
        await plotRevenue(rst.revenue_trends);
        const image_blobs = {};
        const [
            totalRevenueTrendsPlot,
            totalTransactionTrendsPlot,
            topProductsPlot,
            subscriptionPerformancePlot,
            customerSegmentationPie,
            customerGrowthPlot,
            peakShoppingTimesPlot,
            // revenueAndSalesPlot,
            // productPerformancePlot,
        ] = await Promise.all([
            plotRevenue(rst.revenue_trends),
            plotTransactions(rst.revenue_trends),
            plotTopProducts(satm.top_products_this_month),
            plotSubscriptionPerformance(sp.subscription_history),
            plotCustomerSegmentationPie(csg),
            plotCustomerGrowth(cgr.customers_gained_each_month),
            plotPeakShoppingTimes(psp.peak_shopping_times),
            // plotRevenueAndSales(rst.revenue_trends),
            // plotProductPerformance(pp.product_sales_history),
        ]);

        // Assign plots to image_blobs
        image_blobs['total_revenue_trends'] = totalRevenueTrendsPlot;
        image_blobs['total_transaction_trends'] = totalTransactionTrendsPlot;
        image_blobs['top_products'] = topProductsPlot;
        image_blobs['subscription_performance'] = subscriptionPerformancePlot;
        image_blobs['customer_segmentation_pie'] = customerSegmentationPie;
        image_blobs['customer_growth'] = customerGrowthPlot;
        image_blobs['peak_shopping_times'] = peakShoppingTimesPlot;
        //   image_blobs['revenue_and_sales_trends'] = revenueAndSalesPlot;
        //   image_blobs['product_performance'] = productPerformancePlot;


        // const result = await generateReport(rst, cgr, da, sp, pp, psp, satm, csg, pc, sr);
        // await createPdfReport(sr, da, satm, sp, cgr, csg, JSON.parse(result));
        // da, satm, sp, cgr, csg,
        await createPdfReportNew(sr, da, satm, sp, cgr, csg, psp, image_blobs);
    } catch (error) {
        console.error("Error in analysis functions:", error);
    }
}

main();