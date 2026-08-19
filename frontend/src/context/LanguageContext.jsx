import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext(null);

const translations = {
  en: {
    // Layout & Navigation
    "Mandi Broker": "Mandi Broker",
    "Home": "Home",
    "Sabzi & Fruit System": "Sabzi & Fruit System",
    "Dashboard": "Dashboard",
    "Clerks / Employees": "Clerks / Employees",
    "Suppliers Catalog": "Suppliers Catalog",
    "Customers Portfolio": "Customers Portfolio",
    "Product Catalog": "Product Catalog",
    "Stock Supplies": "Stock Supplies",
    "Sales Ledger": "Sales Ledger",
    "Payments & Receipts": "Payments & Receipts",
    "Financial Reports": "Financial Reports",
    "Audit & Log Activity": "Audit & Log Activity",
    "Sign Out": "Sign Out",
    "Confirm Sign Out": "Confirm Sign Out",
    "Are you sure you want to sign out?": "Are you sure you want to sign out?",
    "Cancel": "Cancel",
    "Mandi Trade Ledger": "Mandi Trade Ledger",
    "Sabzi & Fruit Commission Brokerage Engine": "Sabzi & Fruit Commission Brokerage Engine",
    "Supplier Stock": "Supplier Stock",
    "Sales Transactions": "Sales Transactions",
    "Products List": "Products List",
    "My Dashboard": "My Dashboard",
    "Purchase History": "Purchase History",
    "My General Ledger": "My General Ledger",
    "Supply History": "Supply History",
    "Select Language": "Select Language",
    "English": "English",

    // Login Page
    "Mandi Broker Management": "Mandi Broker Management",
    "Sabzi & Fruit Commission Trade Engine": "Sabzi & Fruit Commission Trade Engine",
    "Email Address": "Email Address",
    "Password Key": "Password Key",
    "System Role Access": "System Role Access",
    "Admin (Full Control)": "Admin (Full Control)",
    "Clerk (Desk Operator)": "Clerk (Desk Operator)",
    "Customer (Buyer)": "Customer (Buyer)",
    "Supplier (Farmer/Grower)": "Supplier (Farmer/Grower)",
    "Authenticating Trade Access...": "Authenticating Trade Access...",
    "Sign In To Mandi": "Sign In To Mandi",
    "Demo Credentials:": "Demo Credentials:",

    // Common Dashboard translations
    "Total Stock Inward": "Total Stock Inward",
    "Total Sales Handled": "Total Sales Handled",
    "Active Accounts": "Active Accounts",
    "Brokerage Commission": "Brokerage Commission",
    "Gross Commissions": "Gross Commissions",
    "Total Receivables": "Total Receivables",
    "Total Payables": "Total Payables",
    "Overall Cash Balance": "Overall Cash Balance",
    "Overview Statistics": "Overview Statistics",
    "Live Mandi Commission Brokerage Analytics": "Live Mandi Commission Brokerage Analytics",
    "Net Balance": "Net Balance",
    "Active Clerks": "Active Clerks",
    "Suppliers": "Suppliers",
    "Customers": "Customers",
    "Products": "Products",
    "Stock Entries": "Stock Entries",
    "Sales": "Sales",
    "Payments": "Payments",
    "Audit Logs": "Audit Logs",
    "Search...": "Search...",
    "Search": "Search",
    "Add": "Add",
    "Actions": "Actions",
    "Delete": "Delete",
    "Edit": "Edit",
    "Close": "Close",
    "Save": "Save",
    "Name": "Name",
    "Phone": "Phone",
    "Address": "Address",
    "Role": "Role",
    "Status": "Status",
    "Date": "Date",
    "Amount": "Amount",
    "Type": "Type",
    "Description": "Description",
    "Category": "Category",
    "Unit": "Unit",
    "Rate": "Rate",
    "Quantity": "Quantity",
    "Remaining": "Remaining",
    "Total": "Total",
    "Discount": "Discount",
    "Net Total": "Net Total",
    "Party Name": "Party Name",
    "Party Type": "Party Type",
    "Payment Mode": "Payment Mode",
    "Cash": "Cash",
    "Bank": "Bank",
    "Check": "Check",
    "Inward Stock": "Inward Stock",
    "Outward Sales": "Outward Sales",

    // Add forms & modals
    "Add New Clerk": "Add New Clerk",
    "Add New Supplier": "Add New Supplier",
    "Add New Customer": "Add New Customer",
    "Add New Product": "Add New Product",
    "Record Stock Inward": "Record Stock Inward",
    "Record Sales Invoice": "Record Sales Invoice",
    "Record Payment / Receipt": "Record Payment / Receipt",
    "Supplier / Grower": "Supplier / Grower",
    "Party Select": "Party Select",
    "Select Name": "Select Name",
    "Select Product": "Select Product",
    "Select Supplier": "Select Supplier",
    "Select Customer": "Select Customer",
    "Purchase Rate": "Purchase Rate",
    "Market Sale Rate": "Market Sale Rate",
    "Sale Rate": "Sale Rate",
    "Save Details": "Save Details",
    "Submitting...": "Submitting...",

    // Balances
    "Receivable": "Receivable",
    "Payable": "Payable",
    "Debt": "Debt",
    "Balance": "Balance",
    "No records found": "No records found",
    "All Suppliers": "All Suppliers",
    "All Customers": "All Customers",
    "All Products": "All Products",

    // Clerks & Admin Dashboard Dashboard Texts
    "Today's Supplies": "Today's Supplies",
    "Today's Sales": "Today's Sales",
    "Low Stock Warnings!": "Low Stock Warnings!",
    "Recent Stock Supplies (Purchase)": "Recent Stock Supplies (Purchase)",
    "Recent Sales Tickets": "Recent Sales Tickets",
    "Agriculture Stock Supplies": "Agriculture Stock Supplies",
    "Add, edit, or delete shipments supplied by growers and farmers": "Add, edit, or delete shipments supplied by growers and farmers",
    "RECORD NEW SHIPMENT": "RECORD NEW SHIPMENT",
    "Search supplies...": "Search supplies...",
    "Supplier Name": "Supplier Name",
    "Product Name": "Product Name",
    "Arrived Qty": "Arrived Qty",
    "Remaining Qty": "Remaining Qty",
    "Avg Sale Rate": "Avg Sale Rate",
    "Total Credited": "Total Credited",
    "Mandi Wholesale Sales Invoices": "Mandi Wholesale Sales Invoices",
    "Manage and record auction sales of grower products to customers": "Manage and record auction sales of grower products to customers",
    "RECORD NEW SALE TICKET": "RECORD NEW SALE TICKET",
    "Search sales...": "Search sales...",
    "Buyer / Customer": "Buyer / Customer",
    "Commission": "Commission",
    "Market Fee": "Market Fee",
    "Total Amount": "Total Amount",
    "Bill Amount": "Bill Amount",
    "Final Net Bill": "Final Net Bill",
    "Rate / Unit": "Rate / Unit",
    "Loading Clerk Desk...": "Loading Clerk Desk...",
    "Loading Admin Suite...": "Loading Admin Suite...",
    "Total Debited": "Total Debited",
    "My Customer Account Profile": "My Customer Account Profile",
    "Total Purchased": "Total Purchased",
    "Outstanding Balance (Payable)": "Outstanding Balance (Payable)",
    "My Ledger History": "My Ledger History",
    "My Supplier (Grower) Profile": "My Supplier (Grower) Profile",
    "Total Supplied (Qty)": "Total Supplied (Qty)",
    "Outstanding Balance (Receivable)": "Outstanding Balance (Receivable)",
    "My Supply Shipments": "My Supply Shipments",
    "Ledger Transaction Sheet": "Ledger Transaction Sheet",
    "Entries": "Entries",
    "Tickets": "Tickets",
    "left": "left",
    "Items near depletion": "Items near depletion",
    "Coordinate with Suppliers!": "Coordinate with Suppliers!",
    "Verified payments on counter": "Verified payments on counter",
    "Verified cashier payouts": "Verified cashier payouts",
    "Pending from Customers": "Pending from Customers",
    "Owed to Suppliers": "Owed to Suppliers",
    "Net Profit": "Net Profit",
    "In chosen period": "In chosen period",
    "Active Products": "Active Products",
    "Low Stock items": "Low Stock items",
    "Loading Brokerage Dashboard...": "Loading Brokerage Dashboard...",
    "All": "All",
    "Done": "Done",
    "Cancelled": "Cancelled",
    "All Statuses": "All Statuses",
    "Record Cancelled": "Record Cancelled",
    "Sale Cancelled": "Sale Cancelled",
    "Lot Cancelled": "Lot Cancelled",
    "Payment Cancelled": "Payment Cancelled",
    "Expense Cancelled": "Expense Cancelled"
  }
};

export function LanguageProvider({ children }) {
  const [language] = useState('en');

  useEffect(() => {
    localStorage.setItem('mandi_lang', 'en');
    const root = window.document.documentElement;
    root.setAttribute('dir', 'ltr');
    root.setAttribute('lang', 'en');
    root.classList.remove('lang-ur');
    root.classList.remove('font-urdu');
    document.body.classList.remove('lang-ur');
    document.body.classList.remove('font-urdu');
    document.body.setAttribute('dir', 'ltr');
  }, []);

  const t = (key) => {
    if (!key) return '';
    const cleanKey = key.trim();
    if (translations['en'] && translations['en'][cleanKey] !== undefined) {
      return translations['en'][cleanKey];
    }
    return key;
  };

  const dir = 'ltr';

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {}, t, dir }}>
      <div dir="ltr" className="ltr">
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
