import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useConfirm } from '../context/ConfirmContext.jsx';
import {
  RotateCcw, Plus, History, Boxes, Search, CheckCircle2,
  AlertCircle, Clock, X, Printer, Eye, Check, Ban, Sparkles,
  ArrowRight, ShieldCheck, ChevronRight, RefreshCw, ShoppingBag,
  User, Calendar, Info, FileText, CheckSquare, Layers, AlertTriangle
} from 'lucide-react';
import SpokeSpinner from './common/SpokeSpinner.jsx';

export default function ReturnsManagement({ user: propUser, role: propRole = 'Admin' }) {
  const { user: authUser } = useAuth();
  const user = propUser || authUser;
  const role = propRole || user?.role || 'Admin';
  const { t } = useLanguage();
  const confirm = useConfirm();

  // Active top view: 'new', 'history', 'customer-crates'
  const [activeTab, setActiveTab] = useState('new');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Return Type: 'Produce', 'Crate', 'Both'
  const [returnType, setReturnType] = useState('Produce');

  // Customer & Sales Selection
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSales, setCustomerSales] = useState([]);
  const [selectedSale, setSelectedSale] = useState(null);
  const [loadingSales, setLoadingSales] = useState(false);

  // Customer search in New Return
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false);
  const customerDropdownRef = useRef(null);

  // Form Fields
  const [returnDate, setReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  // Produce Return Fields
  const [produceReturnedQty, setProduceReturnedQty] = useState('');
  const [produceCondition, setProduceCondition] = useState('Good'); // 'Good', 'Damaged', 'Spoiled'

  // Crate Return Fields
  const [goodCratesReturned, setGoodCratesReturned] = useState('');
  const [damagedCratesReturned, setDamagedCratesReturned] = useState('');

  // Customer Crates Summary
  const [customerCratesData, setCustomerCratesData] = useState([]);
  const [selectedCustomerCrateDetail, setSelectedCustomerCrateDetail] = useState(null);
  const [cratesSearchTerm, setCratesSearchTerm] = useState('');

  // Return History Data & Filters
  const [returnsHistory, setReturnsHistory] = useState([]);
  const [historyTimeFilter, setHistoryTimeFilter] = useState('all'); // 'all', 'today', 'week', 'month'
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all'); // 'all', 'Produce', 'Crate', 'Both'
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all'); // 'all', 'Waiting Approval', 'Approved', 'Rejected', 'Draft'
  const [historyCustomerFilter, setHistoryCustomerFilter] = useState('all');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Modals
  const [viewingReturnModal, setViewingReturnModal] = useState(null);
  const [receiptModal, setReceiptModal] = useState(null);
  const [rejectPromptModal, setRejectPromptModal] = useState(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');

  // Business settings for receipt
  const [businessProfile, setBusinessProfile] = useState(null);

  // Helper toast
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target)) {
        setIsCustomerDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Data Load
  const fetchBaseData = async () => {
    setLoading(true);
    try {
      const [customersRes, returnsRes, cratesRes, bizRes] = await Promise.all([
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/returns').catch(() => ({ data: [] })),
        api.get('/customer-crates').catch(() => ({ data: [] })),
        api.get('/settings/business').catch(() => ({ data: null }))
      ]);

      setCustomers(customersRes.data || []);
      setReturnsHistory(returnsRes.data || []);
      setCustomerCratesData(cratesRes.data || []);
      if (bizRes?.data) setBusinessProfile(bizRes.data);
    } catch (err) {
      console.error('Failed to load returns data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  // Fetch customer recent sales when a customer is selected
  const handleSelectCustomer = async (cust) => {
    setSelectedCustomer(cust);
    setSelectedSale(null);
    setProduceReturnedQty('');
    setGoodCratesReturned('');
    setDamagedCratesReturned('');
    setIsCustomerDropdownOpen(false);
    setCustomerSearchTerm(cust.name);

    setLoadingSales(true);
    try {
      const res = await api.get(`/customers/${cust.id || cust._id}/recent-sales`);
      setCustomerSales(res.data || []);
      // If there are sales, auto-select the latest one for convenience
      if (res.data && res.data.length > 0) {
        setSelectedSale(res.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch customer sales:', err);
      setCustomerSales([]);
    } finally {
      setLoadingSales(false);
    }
  };

  // Handle Return Type Change
  const handleTypeChange = (type) => {
    setReturnType(type);
  };

  // Compute calculated amounts for New Return preview
  const returnRate = selectedSale ? (Number(selectedSale.saleRate) || 0) : 0;
  const produceQtyNum = Number(produceReturnedQty) || 0;
  const calculatedGrossAmount = Math.round(produceQtyNum * returnRate * 100) / 100;
  
  // Calculate commission reversal for returned crates/units
  const saleCommPerUnit = selectedSale ? (Number(selectedSale.commissionPerUnit) || 0) : 0;
  const calculatedReversedCommission = Math.round(produceQtyNum * saleCommPerUnit * 100) / 100;
  const calculatedReturnAmount = Math.round((calculatedGrossAmount + calculatedReversedCommission) * 100) / 100;

  // Maximum produce returnable from chosen sale
  const maxProduceCanReturn = selectedSale ? (selectedSale.canReturn !== undefined ? selectedSale.canReturn : (selectedSale.quantitySold || 0)) : 0;
  const isProduceQtyExceeded = (returnType === 'Produce' || returnType === 'Both') && Boolean(selectedSale) && produceQtyNum > maxProduceCanReturn;

  // Selected customer's crate balance
  const customerCrateStat = customerCratesData.find(
    c => String(c.customerId) === String(selectedCustomer?.id || selectedCustomer?._id)
  );
  const totalCratesWithCustomer = customerCrateStat?.cratesWithCustomer || 0;

  const goodCratesNum = Number(goodCratesReturned) || 0;
  const damagedCratesNum = Number(damagedCratesReturned) || 0;
  const totalCratesReturnedToday = goodCratesNum + damagedCratesNum;
  const cratesRemainingWithCustomer = Math.max(0, totalCratesWithCustomer - totalCratesReturnedToday);

  // Validation
  const validateForm = () => {
    if (!selectedCustomer) {
      showToast('Please select a customer first.', 'error');
      return false;
    }

    if (returnType === 'Produce' || returnType === 'Both') {
      if (!selectedSale) {
        showToast('Please select the original sale.', 'error');
        return false;
      }
      if (produceQtyNum <= 0) {
        showToast('Quantity now returned must be greater than zero.', 'error');
        return false;
      }
      const maxCanReturn = selectedSale.canReturn !== undefined ? selectedSale.canReturn : selectedSale.quantitySold;
      if (produceQtyNum > maxCanReturn) {
        showToast(`Quantity cannot be greater than the quantity sold. (Max: ${maxCanReturn})`, 'error');
        return false;
      }
    }

    if (returnType === 'Crate' || returnType === 'Both') {
      if (totalCratesReturnedToday <= 0 && returnType === 'Crate') {
        showToast('Please enter number of good or damaged crates returned.', 'error');
        return false;
      }
      if (totalCratesReturnedToday > totalCratesWithCustomer) {
        showToast(`Customer has ${totalCratesWithCustomer} crates. You cannot return more than ${totalCratesWithCustomer}.`, 'error');
        return false;
      }
    }

    return true;
  };

  // Submit Return (Submit for Approval or Save Draft)
  const handleSubmitReturn = async (submissionStatus = 'Waiting Approval') => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        returnType,
        date: returnDate,
        customerId: selectedCustomer.id || selectedCustomer._id,
        saleId: selectedSale ? (selectedSale.id || selectedSale._id) : null,
        produceReturnedQty: (returnType === 'Produce' || returnType === 'Both') ? produceQtyNum : 0,
        produceCondition: (returnType === 'Produce' || returnType === 'Both') ? produceCondition : 'Good',
        goodCratesReturned: (returnType === 'Crate' || returnType === 'Both') ? goodCratesNum : 0,
        damagedCratesReturned: (returnType === 'Crate' || returnType === 'Both') ? damagedCratesNum : 0,
        reason,
        notes,
        status: submissionStatus
      };

      const res = await api.post('/returns', payload);
      showToast(submissionStatus === 'Draft' ? 'Return saved as Draft.' : 'Return sent for approval.', 'success');

      // Refresh data
      await fetchBaseData();

      // Show receipt for quick printing if desired
      if (res.data?.returnRecord) {
        setReceiptModal(res.data.returnRecord);
      }

      // Reset form
      setProduceReturnedQty('');
      setGoodCratesReturned('');
      setDamagedCratesReturned('');
      setReason('');
      setNotes('');
      // Switch to history tab to view newly created return
      setActiveTab('history');
    } catch (err) {
      console.error('Submit return error:', err);
      const errMsg = err.response?.data?.error || 'Failed to record return. Please try again.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Approve Return
  const handleApprove = async (ret) => {
    if (ret.status === 'Approved') {
      showToast('Return has already been approved.', 'error');
      return;
    }

    const isConfirmed = await confirm({
      title: 'Approve Return?',
      message: `This will automatically update stock, customer balance, and crate balance for Return #${ret.returnNumber}. Do you want to proceed?`,
      confirmText: 'Yes, Approve Return',
      cancelText: 'Cancel',
      confirmColor: 'emerald'
    });

    if (!isConfirmed) return;

    setLoading(true);
    try {
      const res = await api.post(`/returns/${ret.id || ret._id}/approve`);
      showToast('Return approved successfully. Balances updated.', 'success');
      await fetchBaseData();
      if (res.data?.returnRecord) {
        setReceiptModal(res.data.returnRecord);
      }
    } catch (err) {
      console.error('Approve return error:', err);
      const errMsg = err.response?.data?.error || 'Failed to approve return.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Reject Return Trigger
  const handleOpenReject = (ret) => {
    if (ret.status === 'Approved') {
      showToast('Cannot reject an already approved return.', 'error');
      return;
    }
    setRejectPromptModal(ret);
    setRejectReasonInput('');
  };

  const handleConfirmReject = async () => {
    if (!rejectPromptModal) return;
    if (!rejectReasonInput.trim()) {
      showToast('Please provide a short rejection reason.', 'error');
      return;
    }

    setLoading(true);
    try {
      await api.post(`/returns/${rejectPromptModal.id || rejectPromptModal._id}/reject`, {
        rejectionReason: rejectReasonInput.trim()
      });
      showToast('Return rejected.', 'success');
      setRejectPromptModal(null);
      setRejectReasonInput('');
      await fetchBaseData();
    } catch (err) {
      console.error('Reject return error:', err);
      const errMsg = err.response?.data?.error || 'Failed to reject return.';
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Delete Return (Draft)
  const handleDeleteReturn = async (ret) => {
    const isConfirmed = await confirm({
      title: 'Delete Return?',
      message: `Are you sure you want to delete Return #${ret.returnNumber}?`,
      confirmText: 'Delete',
      cancelText: 'Cancel',
      confirmColor: 'rose'
    });

    if (!isConfirmed) return;

    setLoading(true);
    try {
      await api.delete(`/returns/${ret.id || ret._id}`);
      showToast('Return deleted successfully.', 'success');
      await fetchBaseData();
    } catch (err) {
      console.error('Delete return error:', err);
      showToast(err.response?.data?.error || 'Failed to delete return.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Filtered History
  const filteredHistory = returnsHistory.filter(r => {
    // Time filter
    if (historyTimeFilter === 'today') {
      const todayStr = new Date().toISOString().split('T')[0];
      if (r.date !== todayStr) return false;
    } else if (historyTimeFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      if (new Date(r.date) < sevenDaysAgo) return false;
    } else if (historyTimeFilter === 'month') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      if (new Date(r.date) < thirtyDaysAgo) return false;
    }

    // Type filter
    if (historyTypeFilter !== 'all' && r.returnType !== historyTypeFilter) return false;

    // Status filter
    if (historyStatusFilter !== 'all' && r.status !== historyStatusFilter) return false;

    // Customer filter
    if (historyCustomerFilter !== 'all' && String(r.customerId) !== String(historyCustomerFilter)) return false;

    // Search query
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      const matchNum = (r.returnNumber || '').toLowerCase().includes(q);
      const matchCust = (r.customerName || '').toLowerCase().includes(q);
      const matchProd = (r.productName || '').toLowerCase().includes(q);
      if (!matchNum && !matchCust && !matchProd) return false;
    }

    return true;
  });

  // Filtered Customer Crates
  const filteredCustomerCrates = customerCratesData.filter(c => {
    if (!cratesSearchTerm.trim()) return true;
    const term = cratesSearchTerm.toLowerCase();
    return (
      (c.customerName || '').toLowerCase().includes(term) ||
      (c.phone || '').toLowerCase().includes(term) ||
      (c.referenceBy || '').toLowerCase().includes(term)
    );
  });

  // Print Receipt Handler
  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl shadow-xl flex items-center space-x-3 text-sm font-bold text-white transition-all transform animate-bounce-short ${
          toast.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
        }`}>
          {toast.type === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <RotateCcw size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black uppercase tracking-wider text-slate-800 dark:text-white">
                {t('Returns & Settlements')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {t('Simple Mandi produce returns, crate balances, and automatic stock settlements')} (واپسی کھاتہ)
              </p>
            </div>
          </div>
        </div>

        {/* 3 Main Action Navigation Tabs */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl space-x-1">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'new'
                ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Plus size={16} />
            <span>{t('1. New Return')}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'history'
                ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <History size={16} />
            <span>{t('2. Return History')}</span>
            {returnsHistory.filter(r => r.status === 'Waiting Approval').length > 0 && (
              <span className="ml-1.5 px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-900 font-black">
                {returnsHistory.filter(r => r.status === 'Waiting Approval').length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('customer-crates')}
            className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all ${
              activeTab === 'customer-crates'
                ? 'bg-[#4F46E5] text-white shadow-md shadow-indigo-500/20'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Boxes size={16} />
            <span>{t('3. Customer Crates')}</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: NEW RETURN SCREEN
          ========================================================================= */}
      {activeTab === 'new' && (
        <div className="space-y-6">
          
          {/* Top 2 Large Type Selection Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleTypeChange('Produce')}
              className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all text-left ${
                returnType === 'Produce'
                  ? 'border-[#4F46E5] bg-indigo-500/10 text-indigo-900 dark:text-indigo-200 shadow-md ring-2 ring-[#4F46E5]/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:border-indigo-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-500 block">Produce Only (مال واپسی)</span>
                <h4 className="text-lg font-black">Produce Return</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Return unsold or damaged produce lots</p>
              </div>
              <div className={`p-3.5 rounded-2xl ${returnType === 'Produce' ? 'bg-[#4F46E5] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <ShoppingBag size={24} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('Crate')}
              className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all text-left ${
                returnType === 'Crate'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 shadow-md ring-2 ring-emerald-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:border-emerald-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-500 block">Bardana / Crates (خالی کریٹ واپسی)</span>
                <h4 className="text-lg font-black">Crate Return</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Collect empty and damaged crates from buyers</p>
              </div>
              <div className={`p-3.5 rounded-2xl ${returnType === 'Crate' ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Boxes size={24} />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('Both')}
              className={`p-5 rounded-2xl border-2 flex items-center justify-between transition-all text-left ${
                returnType === 'Both'
                  ? 'border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-200 shadow-md ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1E293B] hover:border-amber-300 text-slate-700 dark:text-slate-300'
              }`}
            >
              <div className="space-y-1">
                <span className="text-xs font-black uppercase tracking-wider text-amber-500 block">Produce + Crates (دونوں ایک ساتھ)</span>
                <h4 className="text-lg font-black">Both Together</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">Record produce and empty crates in one voucher</p>
              </div>
              <div className={`p-3.5 rounded-2xl ${returnType === 'Both' ? 'bg-amber-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                <Layers size={24} />
              </div>
            </button>
          </div>

          {/* Form Step-by-Step Card */}
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-6">
            
            {/* Step 1 & 2: Customer & Return Date */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Customer Selector */}
              <div className="md:col-span-2 space-y-1.5 relative" ref={customerDropdownRef}>
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <User size={14} className="text-indigo-500" />
                  <span>Step 1: Select Customer (گاہک منتخب کریں) *</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Type customer name or mobile number..."
                    value={customerSearchTerm}
                    onChange={(e) => {
                      setCustomerSearchTerm(e.target.value);
                      setIsCustomerDropdownOpen(true);
                    }}
                    onFocus={() => setIsCustomerDropdownOpen(true)}
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#4F46E5]"
                  />
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setSelectedSale(null);
                        setCustomerSearchTerm('');
                        setCustomerSales([]);
                      }}
                      className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Dropdown list */}
                {isCustomerDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 max-h-56 overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl z-30 divide-y divide-slate-100 dark:divide-slate-800">
                    {customers
                      .filter(c => {
                        if (!customerSearchTerm) return true;
                        const term = customerSearchTerm.toLowerCase();
                        return (
                          (c.name || '').toLowerCase().includes(term) ||
                          (c.phone || '').toLowerCase().includes(term)
                        );
                      })
                      .map(cust => (
                        <div
                          key={cust.id || cust._id}
                          onClick={() => handleSelectCustomer(cust)}
                          className="px-4 py-3 hover:bg-indigo-50 dark:hover:bg-slate-800 cursor-pointer flex items-center justify-between"
                        >
                          <div>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">{cust.name}</p>
                            <p className="text-xs text-slate-400">{cust.phone || 'No phone'} {cust.address ? `• ${cust.address}` : ''}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-indigo-500 block">Balance: Rs. {(cust.currentBalance || 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Return Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                  <Calendar size={14} className="text-indigo-500" />
                  <span>Return Date (تاریخ) *</span>
                </label>
                <input
                  type="date"
                  value={returnDate}
                  onChange={(e) => setReturnDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-bold text-slate-800 dark:text-white outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            {/* Step 2: Recent Sales for Customer (If Produce Return) */}
            {(returnType === 'Produce' || returnType === 'Both') && (
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
                    <ShoppingBag size={14} className="text-indigo-500" />
                    <span>Step 2: Select Original Sale (اصل فروخت منتخب کریں) *</span>
                  </label>
                  {selectedCustomer && (
                    <span className="text-xs font-bold text-slate-400">
                      {customerSales.length} recent sales found
                    </span>
                  )}
                </div>

                {!selectedCustomer ? (
                  <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 font-semibold">
                    Select a customer above to see their recent purchase history.
                  </div>
                ) : loadingSales ? (
                  <div className="py-6 flex justify-center"><SpokeSpinner /></div>
                ) : customerSales.length === 0 ? (
                  <div className="p-6 text-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 font-bold">
                    No recent sales records found for this customer.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {customerSales.map(sale => {
                      const isSelected = selectedSale && String(selectedSale.id || selectedSale._id) === String(sale.id || sale._id);
                      const isSettled = sale.isLotSettled;
                      return (
                        <div
                          key={sale.id || sale._id}
                          onClick={() => {
                            if (isSettled) {
                              showToast(`Cannot return produce or crates from Lot #${sale.lotNumber || 'Settled'}. It is already recorded to Payables & Supply Value.`, 'error');
                              return;
                            }
                            setSelectedSale(sale);
                          }}
                          className={`p-4 rounded-xl border transition-all ${
                            isSettled
                              ? 'opacity-60 bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                              : isSelected
                              ? 'border-[#4F46E5] bg-indigo-500/10 ring-2 ring-[#4F46E5]/30 cursor-pointer'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 hover:border-indigo-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80 mb-2">
                            <span className="text-xs font-black text-indigo-500">Sale #{sale.saleNumber || (sale.id || sale._id).substring(0, 6)}</span>
                            <div className="flex items-center gap-1.5">
                              {isSettled && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  Settled Lot
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400 font-bold">{sale.date}</span>
                            </div>
                          </div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-white">{sale.productName}</h4>
                          {sale.lotNumber && (
                            <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Lot #{sale.lotNumber}</p>
                          )}
                          
                          <div className="grid grid-cols-3 gap-1 mt-3 text-[11px] bg-white dark:bg-slate-800/80 p-2 rounded-lg border border-slate-100 dark:border-slate-700/50">
                            <div>
                              <span className="text-slate-400 block font-bold">Sold:</span>
                              <span className="font-black text-slate-700 dark:text-slate-200">{sale.quantitySold}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold">Returned:</span>
                              <span className="font-black text-rose-500">{sale.alreadyReturned || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block font-bold">Can Return:</span>
                              <span className={`font-black ${isSettled ? 'text-slate-400' : 'text-emerald-500'}`}>
                                {isSettled ? '0 (Settled)' : sale.canReturn}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1 text-xs">
                            <span className="text-slate-500 font-bold">Rate: Rs. {sale.saleRate}</span>
                            <span className="font-black text-[#4F46E5]">Rs. {sale.totalAmount.toLocaleString()}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Selected Sale Detail Summary Banner */}
            {selectedSale && (returnType === 'Produce' || returnType === 'Both') && (
              <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Product</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">{selectedSale.productName}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Sold</span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">{selectedSale.quantitySold}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Already Returned</span>
                  <span className="text-sm font-black text-rose-500">{selectedSale.alreadyReturned || 0}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Can Return</span>
                  <span className="text-sm font-black text-emerald-500">{selectedSale.canReturn}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-black text-slate-400 block">Sale Rate</span>
                  <span className="text-sm font-black text-[#4F46E5]">Rs. {selectedSale.saleRate}</span>
                </div>
              </div>
            )}

            {/* Step 3: Produce Return Details Section */}
            {(returnType === 'Produce' || returnType === 'Both') && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500 text-white">SECTION 1</span>
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                    Produce Return Details (پھل/سبزی واپسی)
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* Quantity Returned */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Quantity Now Returned (تعداد) *</span>
                      {selectedSale && (
                        <span className="text-[10px] text-slate-400 font-semibold lowercase">
                          max: {maxProduceCanReturn} {selectedSale.unit || 'crates'}
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max={maxProduceCanReturn}
                      placeholder="e.g. 5"
                      value={produceReturnedQty}
                      onChange={(e) => setProduceReturnedQty(e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-sm font-black text-slate-800 dark:text-white outline-none transition-colors ${
                        isProduceQtyExceeded
                          ? 'border-rose-500 bg-rose-500/5 focus:border-rose-600 focus:ring-2 focus:ring-rose-500/20'
                          : 'border-slate-200 dark:border-slate-800 focus:border-[#4F46E5]'
                      }`}
                    />
                    {isProduceQtyExceeded && (
                      <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1 mt-1">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>Entered quantity ({produceQtyNum}) exceeds bought/available quantity ({maxProduceCanReturn}).</span>
                      </p>
                    )}
                  </div>

                  {/* Condition Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Produce Condition (حالت) *
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setProduceCondition('Good')}
                        className={`py-3 rounded-xl text-xs font-black uppercase transition-all ${
                          produceCondition === 'Good'
                            ? 'bg-emerald-500 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Good (ٹھیک)
                      </button>
                      <button
                        type="button"
                        onClick={() => setProduceCondition('Damaged')}
                        className={`py-3 rounded-xl text-xs font-black uppercase transition-all ${
                          produceCondition === 'Damaged'
                            ? 'bg-amber-500 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Damaged
                      </button>
                      <button
                        type="button"
                        onClick={() => setProduceCondition('Spoiled')}
                        className={`py-3 rounded-xl text-xs font-black uppercase transition-all ${
                          produceCondition === 'Spoiled'
                            ? 'bg-rose-500 text-white shadow-md'
                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        Spoiled (خراب)
                      </button>
                    </div>
                  </div>

                  {/* Auto-Calculated Return Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>Total Credit Amount (کل واپسی کھاتہ)</span>
                      {calculatedReversedCommission > 0 && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                          - Comm. Reversed: Rs. {calculatedReversedCommission}
                        </span>
                      )}
                    </label>
                    <div className="w-full px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-base font-black text-indigo-600 dark:text-indigo-400 flex items-center justify-between">
                      <div>
                        <span>Rs. {calculatedReturnAmount.toLocaleString()}</span>
                        {calculatedReversedCommission > 0 && (
                          <span className="text-[10px] block font-medium opacity-75">
                            Gross: Rs. {calculatedGrossAmount.toLocaleString()} + Comm: Rs. {calculatedReversedCommission.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase font-mono">Rate: Rs. {returnRate}</span>
                    </div>
                  </div>
                </div>

                {produceCondition !== 'Good' && (
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 flex items-center space-x-1.5">
                    <Info size={14} />
                    <span>Damaged or spoiled produce will not go back into normal saleable stock.</span>
                  </p>
                )}
              </div>
            )}

            {/* Step 4: Crate Return Details Section */}
            {(returnType === 'Crate' || returnType === 'Both') && (
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-600 text-white">SECTION 2</span>
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                      Crate Return Details (خالی کریٹ واپسی)
                    </h4>
                  </div>

                  {selectedCustomer && (
                    <span className="text-xs font-black px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Customer has: {totalCratesWithCustomer} Crates
                    </span>
                  )}
                </div>

                {/* Customer Crate Status Alert */}
                {selectedCustomer && totalCratesWithCustomer === 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center space-x-2">
                    <AlertTriangle size={16} />
                    <span>This customer has no crates available to return.</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  {/* Good Crates */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Good Crates Returned (ٹھیک کریٹ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalCratesWithCustomer}
                      placeholder="0"
                      value={goodCratesReturned}
                      onChange={(e) => setGoodCratesReturned(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-black text-slate-800 dark:text-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Damaged Crates */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Damaged Crates (ٹوٹے ہوئے کریٹ)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max={totalCratesWithCustomer}
                      placeholder="0"
                      value={damagedCratesReturned}
                      onChange={(e) => setDamagedCratesReturned(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-black text-slate-800 dark:text-white outline-none focus:border-rose-500"
                    />
                  </div>

                  {/* Remaining Crate Balance Preview */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Crates Still With Customer (بقایا کریٹ)
                    </label>
                    <div className="w-full px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-base font-black text-emerald-600 dark:text-emerald-400 flex items-center justify-between">
                      <span>{cratesRemainingWithCustomer} Crates</span>
                      <span className="text-[10px] text-slate-400">Total Returned: {totalCratesReturnedToday}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Reason & Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Reason for Return (وجہ)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Quality issue, customer surplus, or routine empty crate return"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#4F46E5]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Notes / Remarks (اضافی تفصیل)
                </label>
                <input
                  type="text"
                  placeholder="Optional remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-semibold text-slate-800 dark:text-white outline-none focus:border-[#4F46E5]"
                />
              </div>
            </div>

            {/* Quantity Exceeded Alert Box */}
            {isProduceQtyExceeded && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start space-x-3 shadow-sm">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-black uppercase tracking-wider">Return Quantity Exceeds Bought / Sold Crates</h5>
                  <p className="text-xs font-semibold mt-0.5">
                    You entered <strong>{produceQtyNum} {selectedSale?.unit || 'crates'}</strong>, but the customer only has <strong>{maxProduceCanReturn} {selectedSale?.unit || 'crates'}</strong> available from this invoice. Please decrease the return quantity to proceed.
                  </p>
                </div>
              </div>
            )}

            {/* Bottom Large Action Buttons */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedSale(null);
                  setCustomerSearchTerm('');
                  setProduceReturnedQty('');
                  setGoodCratesReturned('');
                  setDamagedCratesReturned('');
                  setReason('');
                  setNotes('');
                }}
                className="px-5 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Cancel / Reset (منسوخ کریں)
              </button>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  disabled={loading || isProduceQtyExceeded}
                  onClick={() => handleSubmitReturn('Draft')}
                  className="px-5 py-3 rounded-xl bg-slate-800 text-white font-bold text-xs uppercase tracking-wider hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
                >
                  Save Draft
                </button>

                <button
                  type="button"
                  disabled={loading || isProduceQtyExceeded}
                  onClick={() => handleSubmitReturn('Waiting Approval')}
                  className={`px-8 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all flex items-center space-x-2 ${
                    isProduceQtyExceeded
                      ? 'bg-slate-400 dark:bg-slate-700 text-slate-200 cursor-not-allowed shadow-none'
                      : 'bg-[#4F46E5] hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20'
                  }`}
                >
                  {loading ? (
                    <SpokeSpinner />
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Submit for Approval (منظوری کیلئے بھیجیں)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: RETURN HISTORY SCREEN
          ========================================================================= */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          
          {/* Filter Bar */}
          <div className="bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            
            {/* Search Box */}
            <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search return no, customer, product..."
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                className="bg-transparent border-0 outline-none w-full font-semibold"
              />
            </div>

            {/* Time Filter */}
            <div>
              <select
                value={historyTimeFilter}
                onChange={(e) => setHistoryTimeFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none"
              >
                <option value="all">All Dates</option>
                <option value="today">Today (آج)</option>
                <option value="week">This Week (اس ہفتے)</option>
                <option value="month">This Month (اس ماہ)</option>
              </select>
            </div>

            {/* Return Type Filter */}
            <div>
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none"
              >
                <option value="all">All Return Types</option>
                <option value="Produce">Produce Only</option>
                <option value="Crate">Crates Only</option>
                <option value="Both">Produce & Crates</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={historyStatusFilter}
                onChange={(e) => setHistoryStatusFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Waiting Approval">Waiting Approval (زیرِ غور)</option>
                <option value="Approved">Approved (منظور شدہ)</option>
                <option value="Rejected">Rejected (مسترد شدہ)</option>
                <option value="Draft">Draft</option>
              </select>
            </div>

            {/* Customer Filter */}
            <div>
              <select
                value={historyCustomerFilter}
                onChange={(e) => setHistoryCustomerFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-bold outline-none"
              >
                <option value="all">All Customers</option>
                {customers.map(c => (
                  <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Return No.</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4 text-center">Type</th>
                    <th className="py-3.5 px-4">Product / Details</th>
                    <th className="py-3.5 px-4 text-right">Qty / Crates</th>
                    <th className="py-3.5 px-4 text-right">Return Amount</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredHistory.map((ret) => {
                    const isApproved = ret.status === 'Approved';
                    const isWaiting = ret.status === 'Waiting Approval';
                    const isRejected = ret.status === 'Rejected';
                    const isDraft = ret.status === 'Draft';

                    return (
                      <tr key={ret.id || ret._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-black text-indigo-500 font-mono">
                          {ret.returnNumber}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400 font-semibold">
                          {ret.date}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-800 dark:text-white">
                          {ret.customerName}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            ret.returnType === 'Produce' ? 'bg-indigo-500/10 text-indigo-500' :
                            ret.returnType === 'Crate' ? 'bg-emerald-500/10 text-emerald-500' :
                            'bg-amber-500/10 text-amber-500'
                          }`}>
                            {ret.returnType}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                          {ret.returnType === 'Crate' ? (
                            <span>Empty Crates Return</span>
                          ) : (
                            <div>
                              <span className="font-bold">{ret.productName || 'Produce Lot'}</span>
                              <span className="text-[10px] text-slate-400 block">Condition: {ret.produceCondition}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black">
                          {ret.returnType === 'Produce' && `${ret.produceReturnedQty} ${ret.unit || 'Crates'}`}
                          {ret.returnType === 'Crate' && `${ret.goodCratesReturned + ret.damagedCratesReturned} Crates`}
                          {ret.returnType === 'Both' && (
                            <div>
                              <span>{ret.produceReturnedQty} Units</span>
                              <span className="text-[10px] text-slate-400 block">{ret.goodCratesReturned + ret.damagedCratesReturned} Crates</span>
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-[#4F46E5] dark:text-indigo-400">
                          {ret.returnAmount > 0 ? `Rs. ${ret.returnAmount.toLocaleString()}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center space-x-1 ${
                            isApproved ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            isWaiting ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                            isRejected ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                            'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                          }`}>
                            {isApproved && <CheckCircle2 size={10} />}
                            {isWaiting && <Clock size={10} />}
                            {isRejected && <Ban size={10} />}
                            <span>{ret.status}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            
                            {/* View / Print Receipt Button */}
                            <button
                              onClick={() => setReceiptModal(ret)}
                              title="Print Receipt"
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
                            >
                              <Printer size={13} />
                            </button>

                            {/* Approve Button (For Waiting Approval or Draft) */}
                            {isWaiting && (
                              <button
                                onClick={() => handleApprove(ret)}
                                title="Approve Return"
                                className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center space-x-1"
                              >
                                <Check size={12} />
                                <span>Approve</span>
                              </button>
                            )}

                            {/* Reject Button (For Waiting Approval) */}
                            {isWaiting && (
                              <button
                                onClick={() => handleOpenReject(ret)}
                                title="Reject Return"
                                className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center space-x-1"
                              >
                                <X size={12} />
                                <span>Reject</span>
                              </button>
                            )}

                            {/* Delete Button (For Draft / Rejected) */}
                            {(isDraft || isRejected) && (
                              <button
                                onClick={() => handleDeleteReturn(ret)}
                                title="Delete Record"
                                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                              >
                                <X size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredHistory.length === 0 && (
                    <tr>
                      <td colSpan="9" className="py-12 text-center text-slate-400 font-semibold">
                        No return records found matching the chosen filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: CUSTOMER CRATE BALANCES SCREEN
          ========================================================================= */}
      {activeTab === 'customer-crates' && (
        <div className="space-y-6">
          
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#1E293B] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Customer Crate Balance Portfolio (گاہک کریٹ کھاتہ)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Track crates given, returned, damaged, and net balance with each buyer
              </p>
            </div>

            <div className="flex items-center px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full sm:w-72">
              <Search size={16} className="text-slate-400 mr-2" />
              <input
                type="text"
                placeholder="Search customer..."
                value={cratesSearchTerm}
                onChange={(e) => setCratesSearchTerm(e.target.value)}
                className="bg-transparent border-0 outline-none w-full text-xs font-semibold"
              />
            </div>
          </div>

          {/* Customer Crates Table */}
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Customer</th>
                    <th className="py-3.5 px-4 text-center">Phone</th>
                    <th className="py-3.5 px-4 text-right">Crates Given</th>
                    <th className="py-3.5 px-4 text-right">Good Crates Returned</th>
                    <th className="py-3.5 px-4 text-right">Damaged Crates</th>
                    <th className="py-3.5 px-4 text-right">Crates Still With Customer</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                  {filteredCustomerCrates.map((cust) => {
                    const balance = cust.cratesWithCustomer || 0;
                    const hasDamaged = (cust.damagedCrates || 0) > 0;

                    // Color logic:
                    // Green: No crates outstanding (0)
                    // Yellow: Some crates outstanding (1-49)
                    // Red: High crate balance (50+) or damaged crates
                    const badgeColor = balance === 0
                      ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      : balance < 50 && !hasDamaged
                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      : 'bg-rose-500/10 text-rose-500 border border-rose-500/20';

                    return (
                      <tr
                        key={cust.customerId}
                        onClick={() => setSelectedCustomerCrateDetail(cust)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 dark:text-white block">{cust.customerName}</span>
                          {cust.referenceBy && <span className="text-[10px] text-slate-400">Ref: {cust.referenceBy}</span>}
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-500 font-mono">
                          {cust.phone || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-700 dark:text-slate-300">
                          {cust.cratesGiven.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          {cust.goodCratesReturned.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-rose-500">
                          {cust.damagedCrates.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-black inline-block ${badgeColor}`}>
                            {balance} Crates
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomerCrateDetail(cust);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-[#4F46E5] font-bold text-[11px] inline-flex items-center space-x-1"
                          >
                            <Eye size={12} />
                            <span>View History</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredCustomerCrates.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400 font-semibold">
                        No customer crate balance records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: CUSTOMER CRATE HISTORY DETAIL
          ========================================================================= */}
      {selectedCustomerCrateDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white">
                  Crate History: {selectedCustomerCrateDetail.customerName}
                </h3>
                <p className="text-xs text-slate-400">
                  Detailed timeline of crates issued from sales and returns
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerCrateDetail(null)}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Quick Summary Cards */}
            <div className="p-5 grid grid-cols-4 gap-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 text-xs">
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Given</span>
                <span className="text-lg font-black text-slate-800 dark:text-white">{selectedCustomerCrateDetail.cratesGiven}</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Good Returned</span>
                <span className="text-lg font-black text-emerald-500">{selectedCustomerCrateDetail.goodCratesReturned}</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Damaged</span>
                <span className="text-lg font-black text-rose-500">{selectedCustomerCrateDetail.damagedCrates}</span>
              </div>
              <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/50">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Net Balance</span>
                <span className="text-lg font-black text-indigo-500">{selectedCustomerCrateDetail.cratesWithCustomer}</span>
              </div>
            </div>

            {/* Timeline Table */}
            <div className="p-5 flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Reference / Product</th>
                    <th className="py-2.5 px-3 text-right">Given</th>
                    <th className="py-2.5 px-3 text-right">Returned</th>
                    <th className="py-2.5 px-3 text-right">Damaged</th>
                    <th className="py-2.5 px-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedCustomerCrateDetail.history?.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="py-2.5 px-3 font-semibold">{item.date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          item.type.includes('Sale') ? 'bg-indigo-500/10 text-indigo-500' : 'bg-emerald-500/10 text-emerald-500'
                        }`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-700 dark:text-slate-300">
                        {item.reference} {item.productName ? `(${item.productName})` : ''}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-700 dark:text-slate-200">
                        {item.cratesGiven > 0 ? item.cratesGiven : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-emerald-500">
                        {item.goodCratesReturned > 0 ? item.goodCratesReturned : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-rose-500">
                        {item.damagedCrates > 0 ? item.damagedCrates : '-'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-indigo-600 dark:text-indigo-400">
                        {item.balance} Crates
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-900/50">
              <button
                onClick={() => setSelectedCustomerCrateDetail(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold uppercase"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: SIMPLE RECEIPT (Printable & Shareable)
          ========================================================================= */}
      {receiptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 w-full max-w-md max-h-[95vh] flex flex-col shadow-2xl overflow-hidden animate-scale-in">
            
            {/* Action Bar (Top) */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
              <div className="flex items-center space-x-2">
                <Printer size={18} />
                <span className="text-xs font-black uppercase tracking-wider">Return Receipt</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePrintReceipt}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center space-x-1.5"
                >
                  <Printer size={13} />
                  <span>Print Receipt</span>
                </button>
                <button
                  onClick={() => setReceiptModal(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Receipt Printable Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs bg-white text-slate-900" id="printable-receipt">
              
              {/* Header */}
              <div className="text-center space-y-1 border-b border-dashed border-slate-300 pb-4">
                <h2 className="text-lg font-black uppercase tracking-wide">
                  {businessProfile?.businessName || 'MANDI OS BROKERAGE'}
                </h2>
                <p className="text-[11px] text-slate-500 font-semibold">
                  {businessProfile?.address || 'Sabzi & Fruit Mandi'} {businessProfile?.phone ? `• Ph: ${businessProfile.phone}` : ''}
                </p>
                <div className="inline-block px-3 py-1 mt-2 rounded-full bg-slate-100 text-slate-800 font-black text-xs uppercase">
                  Produce & Crate Return Voucher
                </div>
              </div>

              {/* Meta Info */}
              <div className="grid grid-cols-2 gap-2 text-xs border-b border-slate-100 pb-3">
                <div>
                  <span className="text-slate-400 block font-bold">Return Number:</span>
                  <span className="font-black text-slate-800">{receiptModal.returnNumber}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-bold">Date:</span>
                  <span className="font-black text-slate-800">{receiptModal.date}</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold">Customer:</span>
                  <span className="font-black text-slate-800">{receiptModal.customerName}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block font-bold">Status:</span>
                  <span className="font-black text-emerald-600 uppercase">{receiptModal.status}</span>
                </div>
              </div>

              {/* Return Item Details */}
              <div className="space-y-3">
                
                {/* Produce Details if any */}
                {(receiptModal.returnType === 'Produce' || receiptModal.returnType === 'Both') && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Produce Return</span>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-700">{receiptModal.productName || 'Produce Lot'}</span>
                      <span className="font-black text-slate-900">{receiptModal.produceReturnedQty} {receiptModal.unit || 'Crates'}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500">
                      <span>Condition: <b className="text-slate-800">{receiptModal.produceCondition}</b></span>
                      <span>Rate: <b className="text-slate-800">Rs. {receiptModal.saleRate}</b></span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs font-black">
                      <span>Produce Credit Amount:</span>
                      <span className="text-indigo-600">Rs. {(receiptModal.returnAmount || 0).toLocaleString()}</span>
                    </div>
                  </div>
                )}

                {/* Crates Details if any */}
                {(receiptModal.returnType === 'Crate' || receiptModal.returnType === 'Both') && (
                  <div className="p-3 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider block">Crate Return</span>
                    <div className="flex justify-between items-center text-xs">
                      <span>Good Crates Returned:</span>
                      <span className="font-black text-emerald-600">{receiptModal.goodCratesReturned}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span>Damaged Crates Returned:</span>
                      <span className="font-black text-rose-500">{receiptModal.damagedCratesReturned}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-200 text-xs font-black">
                      <span>Total Crates Received:</span>
                      <span className="text-slate-800">{receiptModal.goodCratesReturned + receiptModal.damagedCratesReturned} Crates</span>
                    </div>
                  </div>
                )}

                {/* Reason */}
                {receiptModal.reason && (
                  <div className="text-[11px] text-slate-600 pt-1">
                    <span className="font-bold">Reason: </span>
                    <span>{receiptModal.reason}</span>
                  </div>
                )}
              </div>

              {/* Signatures */}
              <div className="pt-8 border-t border-dashed border-slate-300 grid grid-cols-2 gap-4 text-center text-[11px]">
                <div>
                  <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
                  <span className="font-bold text-slate-500 block">Received By</span>
                  <span className="text-[10px] text-slate-400">{receiptModal.recordedByName || 'Clerk'}</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-32 mx-auto mb-1"></div>
                  <span className="font-bold text-slate-500 block">Approved By</span>
                  <span className="text-[10px] text-slate-400">{receiptModal.approvedByName || 'Admin'}</span>
                </div>
              </div>

              <p className="text-[10px] text-center text-slate-400 pt-2 font-medium">
                Thank you for your business. (سسٹم جنریٹڈ پرچی)
              </p>
            </div>

            {/* Bottom Close Button */}
            <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end print:hidden">
              <button
                onClick={() => setReceiptModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs uppercase"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: REJECT REASON PROMPT
          ========================================================================= */}
      {rejectPromptModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-2xl space-y-4 animate-scale-in">
            <div className="flex items-center space-x-3 text-rose-500">
              <Ban size={22} />
              <h3 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-white">
                Reject Return #{rejectPromptModal.returnNumber}
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              Please enter the reason for rejecting this return voucher:
            </p>

            <textarea
              rows="3"
              placeholder="e.g. Produce condition not verified, sale mismatch, or unauthorized return..."
              value={rejectReasonInput}
              onChange={(e) => setRejectReasonInput(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-800 dark:text-white outline-none focus:border-rose-500"
            />

            <div className="flex items-center justify-end space-x-3 pt-3">
              <button
                type="button"
                onClick={() => setRejectPromptModal(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmReject}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase shadow-md flex items-center space-x-1.5"
              >
                {loading ? <SpokeSpinner /> : <span>Confirm Rejection</span>}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
