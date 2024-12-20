export interface Customer {
    dimcustomerid: number;
    transaction_id: string;
    amount_transaction: string;
    datetime_created_at_local: Date; 
    successful: boolean;
    dimchannelid: string;
    dimcustomercountryid: string;
    recurring: boolean;
    subscription_id: string | null;
    referrer: string | null;
    dimchannel: string;
    dimcustomercountry: string;
    customer_id: string;
    merchant_id: number;
    customer_created_at: Date;  
  }
  
export interface Dispute {
    reporting_date: Date;
    dispute_created_at_date: Date;
    dispute_resolved_at_date: Date | null;
    reporting_week_startdate: Date;
    previous_week_startdate: Date;
    reporting_month_startdate: Date;
    previous_month_startdate: Date;
    reporting_date_1yearago: Date;
    is_currentyear: boolean; 
    is_previousyear: boolean; 
    is_currentmonth: boolean; 
    is_previousmonth: boolean; 
    is_last7days: boolean; 
    is_prev7days: boolean; 
    is_prev91days: boolean; 
    cohort_week: Date;
    cohort_month: Date;
    merchant_id: number;
    merchant_country: string;
    merchant_classification: string;
    merchant_business_type: string;
    merchant_category: string;
    merchant_industry: string;
    is_keymerchant: boolean;
    currency_code: string;
    channel: string;
    card_brand: string;
    card_type: string;
    issuing_bank: string;
    acquiring_gateway: string;
    is_internationalpayment: "Yes" | "No";
    dispute_status: string;
    dispute_category: string;
    dispute_resolution: string;
    reason_code: string;
    disputes_type: string;
    successful_collections_volume: string; 
    successful_collections_value: string; 
    successful_collections_value_usd: number;
    dispute_volume: string; 
    dispute_value: string; 
    dispute_value_usd: number;
    dispute_refund_value: string; 
    dispute_refund_value_usd: number;
    partial_deducted_dispute_refunds_value: string; 
    partial_deducted_dispute_refunds_value_usd: number;
  }
  
  export interface Transaction {
    merchant_id: number;
    merchant_country: string;
    merchant_classification: string;
    merchant_business_type: string;
    merchant_category: string;
    merchant_industry: string;
    is_keymerchant: boolean; 
    mcc_category: string;
    transaction_type: string;
    currency_code: string;
    transaction_status: string;
    is_successful: number; 
    channel: string;
    commerce_product: string;
    piv_issuing_bank: string;
    piv_acquiring_bank: string;
    acquiring_gateway: string;
    is_internationalpayment: string; 
    is_recurring: boolean; 
    is_cardonfile: boolean; 
    reporting_date: Date; 
    reporting_month_startdate: Date; 
    previous_month_startdate: Date; 
    reporting_date_1yearago: Date; 
    is_currentyear: boolean; 
    is_previousyear: boolean; 
    is_currentmonth: boolean; 
    is_previousmonth: boolean; 
    transaction_count: string; 
    transaction_amount: string; 
    transaction_amount_usd: number;
    transaction_count_ytd: string; 
    transaction_amount_ytd: string; 
    transaction_amount_usd_ytd: number;
    transaction_count_mtd: string | null; 
    transaction_amount_mtd: string | null; 
    transaction_amount_usd_mtd: number | null;
    transaction_count_prevmonth: string | null; 
    transaction_amount_prevmonth: string | null; 
    transaction_amount_usd_prevmonth: number | null;
    transaction_count_prevyearmtd: string | null; 
    transaction_amount_prevyearmtd: string | null; 
    transaction_amount_usd_prevyearmtd: number | null;
    transaction_count_prevmtd: string | null; 
    transaction_amount_prevmtd: string | null; 
    transaction_amount_usd_prevmtd: number | null;
    time_to_transfer_secs: string; 
  }
  
  export interface Subscription {
    subscription_id: string;
    dimmerchantid: string;
    merchant_id: number;
    dimcustomerid: string;
    dimcommercesubscriptionplanid: string | null;
    dimstatusid: string;
    dimcurrencyid: string;
    quantity: number;
    amount_subscription: number;
    next_payment_date: Date;
    invoice_limit: number;
    authorization_id: number;
    datetime_created_at: Date;
    datetime_created_at_local: Date;
    datetime_cancelled_at: Date | null;
    datetime_cancelled_at_local: Date | null;
    dw_modified: Date;
}

export interface Order {
  order_id: string;
  orderitem_id: string;
  order_date: Date;
  dimmerchantid: string;
  merchant_id: string;
  dimcommerceid: string;
  dimcommerceinstanceid: string;
  dimcommerceproductid: string;
  dimcustomerid: string;
  transaction_id: string;
  dimcurrencyid: string;
  quantity: string;
  amount_value: string;
  date_created_at: Date;
  datetime_created_at: Date;
  date_created_at_local: Date;
  datetime_created_at_local: Date;
  date_paid_at: Date | null;
  datetime_paid_at: Date | null;
  date_paid_at_local: Date | null;
  datetime_paid_at_local: Date | null;
  pay_for_me_flag: boolean;
  refunded_flag: boolean;
  dimstatusid: string;
  dw_modified: Date;
}

export interface Product {
  dimcommerceproductid: string;
  product_id: string;
  product_slug: string;
  product_name: string;
  currency: string;
  amount_price: string;
  product_type: string;
  merchant_id: number;
  created_date: Date;
  deleted_date: Date | null;
  active_flag: boolean;
  variant_flag: boolean;
  in_stock_flag: boolean;
  low_stock_alert_flag: boolean;
  unlimited_stock_flag: boolean;
  shippable_flag: boolean;
  minimum_orderable: number;
  maximum_orderable: number | null;
  datetime_created_at: Date;
  datetime_created_at_local: Date;
  datetime_deleted_at: Date | null;
  datetime_deleted_at_local: Date | null;
  dw_modified: Date;
}

export interface Status{
  dimstatusid: string;
  status: string;
}