import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
  Building2, Users, DollarSign, ShieldCheck, Plus, Search, Filter, RefreshCw,
  MoreVertical, CheckCircle2, XCircle, AlertTriangle, KeyRound, ExternalLink,
  Edit3, Ban, PlayCircle, Layers, Calendar, Mail, User, ShieldAlert, Sparkles,
  TrendingUp, Activity, Check, Globe
} from 'lucide-react';
import SpokeSpinner from './common/SpokeSpinner.jsx';

export default function SuperAdminDashboard({ tab = 'saas-dashboard' }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    activeBusinesses: 0,
    suspendedBusinesses: 0,
    expiredBusinesses: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  // Form States
  const [createForm, setCreateForm] = useState({
    name: '',
    arthiCode: '',
    ownerName: '',
    email: '',
    password: '',
    phone: '',
    plan: 'Pro',
    tenantId: '',
    subscriptionExpiresAt: ''
  });
  const [isArthiCodeManuallyEdited, setIsArthiCodeManuallyEdited] = useState(false);

  const [editForm, setEditForm] = useState({
    name: '',
    arthiCode: '',
    ownerName: '',
    email: '',
    phone: '',
    plan: 'Pro',
    status: 'Active',
    subscriptionExpiresAt: ''
  });

  const [newPassword, setNewPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: '', text: '' });

  // Fetch Businesses & Stats
  const fetchData = async () => {
    setLoading(true);
    try {
      const [bizRes, statsRes] = await Promise.all([
        api.get('/super-admin/businesses'),
        api.get('/super-admin/stats')
      ]);
      setBusinesses(bizRes.data || []);
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Failed to fetch Super Admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Suggest Arthi Code from Business Name
  const suggestCode = async (name) => {
    if (!name || isArthiCodeManuallyEdited) return;
    try {
      const res = await api.get(`/super-admin/businesses/suggest-arthi-code?name=${encodeURIComponent(name)}`);
      if (res.data?.suggestedCode && !isArthiCodeManuallyEdited) {
        setCreateForm(prev => ({ ...prev, arthiCode: res.data.suggestedCode }));
      }
    } catch (err) {
      // Local fallback
      const words = name.trim().split(/\s+/).filter(Boolean);
      let fallbackCode = '';
      if (words.length >= 2) {
        fallbackCode = (words[0][0] + words[1][0]).toUpperCase();
      } else if (words.length === 1 && words[0].length >= 2) {
        fallbackCode = words[0].substring(0, 3).toUpperCase();
      }
      if (fallbackCode && !isArthiCodeManuallyEdited) {
        setCreateForm(prev => ({ ...prev, arthiCode: fallbackCode.replace(/[^A-Z0-9]/g, '') }));
      }
    }
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setActionMessage({ type: '', text: '' });
    try {
      await api.post('/super-admin/businesses', createForm);
      setActionMessage({ type: 'success', text: 'Business registered successfully!' });
      setShowCreateModal(false);
      setCreateForm({
        name: '', arthiCode: '', ownerName: '', email: '', password: '', phone: '', plan: 'Pro', tenantId: '', subscriptionExpiresAt: ''
      });
      setIsArthiCodeManuallyEdited(false);
      fetchData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to create business.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditBusiness = async (e) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    setActionLoading(true);
    try {
      await api.put(`/super-admin/businesses/${selectedBusiness.id || selectedBusiness._id}`, editForm);
      setActionMessage({ type: 'success', text: 'Business details updated successfully!' });
      setShowEditModal(false);
      fetchData();
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to update business.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (biz, newStatus) => {
    try {
      await api.patch(`/super-admin/businesses/${biz.id || biz._id}/status`, { status: newStatus });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update business status.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedBusiness || !newPassword) return;
    setActionLoading(true);
    try {
      await api.post(`/super-admin/businesses/${selectedBusiness.id || selectedBusiness._id}/reset-password`, { newPassword });
      setActionMessage({ type: 'success', text: `Password for ${selectedBusiness.name} updated successfully!` });
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (err) {
      setActionMessage({ type: 'error', text: err.response?.data?.error || 'Failed to reset password.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered Businesses
  const filteredBusinesses = businesses.filter(b => {
    const matchesSearch = (b.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (b.tenantId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (b.email || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      
      {/* Top Banner Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white border border-indigo-500/20 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={14} className="text-indigo-400" />
              <span>Super Admin Master Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              MandiOS SaaS Management System
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              Centralized platform administration. Manage tenant businesses, subscription plans, system access, and multi-tenant telemetry.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Register New Business</span>
            </button>
            <button
              onClick={fetchData}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-all cursor-pointer border border-slate-700"
              title="Refresh Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMessage.text && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          actionMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
        }`}>
          <div className="flex items-center space-x-2">
            {actionMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage({ type: '', text: '' })} className="text-slate-400 hover:text-white">
            <XCircle size={16} />
          </button>
        </div>
      )}

      {/* Executive SaaS KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Total Registered Businesses</span>
            <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-500">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.totalBusinesses || 0}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Tenant Mandi OS Accounts</p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-500">Active Subscriptions</span>
            <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-emerald-500">{stats.activeBusinesses || 0}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Fully Operational Tenants</p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-500">Suspended / Expired</span>
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-amber-500">{(stats.suspendedBusinesses || 0) + (stats.expiredBusinesses || 0)}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Require Renewals or Support</p>
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-500">Platform Active Users</span>
            <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-500">
              <Users size={20} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-3xl font-black text-cyan-500">{stats.totalUsers || 0}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Total Clerks, Admins & Staff</p>
          </div>
        </div>

      </div>

      {/* Main SaaS Businesses Table Section */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Table Controls */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Registered Tenant Businesses</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">View and manage all MandiOS businesses, domains, and subscription lifecycles.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search business, email, tenant ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Suspended">Suspended</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>

        {/* Business List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-4 px-6">Business & Tenant</th>
                <th className="py-4 px-6">Admin Contact</th>
                <th className="py-4 px-6">Subscription Plan</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Expires On</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs font-medium">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center space-x-2">
                      <RefreshCw size={18} className="animate-spin text-indigo-500" />
                      <span>Loading SaaS tenants...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredBusinesses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    No businesses found matching query.
                  </td>
                </tr>
              ) : (
                filteredBusinesses.map((b) => (
                  <tr key={b.id || b._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    
                    {/* Business Name & Tenant ID */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500 font-bold shrink-0">
                          <Building2 size={18} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{b.name}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-400">
                              Tenant: <span className="text-indigo-400 font-semibold">{b.tenantId}</span>
                            </span>
                            {b.arthiCode ? (
                              <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold text-[10px] border border-emerald-500/20">
                                Arthi: {b.arthiCode}
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-500 font-mono text-[10px]">
                                No Arthi Code
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Admin Contact */}
                    <td className="py-4 px-6">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{b.ownerName || 'Admin'}</p>
                        <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                          <Mail size={11} />
                          <span>{b.email}</span>
                        </p>
                      </div>
                    </td>

                    {/* Plan */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                        b.plan === 'Enterprise' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        b.plan === 'Pro' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                        'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                      }`}>
                        {b.plan || 'Standard'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        b.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                        b.status === 'Suspended' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                        'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${b.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <span>{b.status}</span>
                      </span>
                    </td>

                    {/* Expiration */}
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-400">
                      {b.subscriptionExpiresAt ? new Date(b.subscriptionExpiresAt).toLocaleDateString() : 'Never'}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        
                        {/* Status Toggle */}
                        {b.status === 'Active' ? (
                          <button
                            onClick={() => handleToggleStatus(b, 'Suspended')}
                            className="p-2 rounded-xl bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all cursor-pointer"
                            title="Suspend Business Access"
                          >
                            <Ban size={15} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(b, 'Active')}
                            className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                            title="Activate Business Access"
                          >
                            <PlayCircle size={15} />
                          </button>
                        )}

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setSelectedBusiness(b);
                            setShowPasswordModal(true);
                          }}
                          className="p-2 rounded-xl bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer"
                          title="Reset Admin Password"
                        >
                          <KeyRound size={15} />
                        </button>

                        {/* Edit Business */}
                        <button
                          onClick={() => {
                            setSelectedBusiness(b);
                            setEditForm({
                              name: b.name || '',
                              arthiCode: b.arthiCode || '',
                              ownerName: b.ownerName || '',
                              email: b.email || '',
                              phone: b.phone || '',
                              plan: b.plan || 'Pro',
                              status: b.status || 'Active',
                              subscriptionExpiresAt: b.subscriptionExpiresAt ? new Date(b.subscriptionExpiresAt).toISOString().split('T')[0] : ''
                            });
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all cursor-pointer"
                          title="Edit Business Configuration"
                        >
                          <Edit3 size={15} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE BUSINESS MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-7 space-y-6 shadow-2xl relative text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Register New Mandi Business</h3>
                  <p className="text-[10px] text-slate-400">Creates an isolated tenant account with dedicated MandiOS database namespace.</p>
                </div>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white p-2">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Business Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bismillah Fruit Commission Shop"
                    value={createForm.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCreateForm({ ...createForm, name: val });
                      suggestCode(val);
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] font-extrabold uppercase text-slate-400">Arthi Code * (2–5 Chars)</label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsArthiCodeManuallyEdited(false);
                        suggestCode(createForm.name);
                      }}
                      className="text-[10px] text-emerald-500 hover:underline font-bold"
                    >
                      Auto-suggest
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    placeholder="e.g. BF, RT, SFM"
                    value={createForm.arthiCode}
                    onChange={(e) => {
                      setIsArthiCodeManuallyEdited(true);
                      setCreateForm({ 
                        ...createForm, 
                        arthiCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') 
                      });
                    }}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                  />
                  <p className="text-[9px] text-slate-400 mt-1">
                    Prefix for Khata IDs (e.g. {createForm.arthiCode || 'CODE'}-C-1). Unique platform-wide.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Custom Tenant ID (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. tenant_bismillah_002"
                    value={createForm.tenantId}
                    onChange={(e) => setCreateForm({ ...createForm, tenantId: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Admin Owner Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mian Rashid"
                    value={createForm.ownerName}
                    onChange={(e) => setCreateForm({ ...createForm, ownerName: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Admin Phone Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 0300-1234567"
                    value={createForm.phone}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Admin Login Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@bismillahmandi.com"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">SaaS Plan Tier</label>
                  <select
                    value={createForm.plan}
                    onChange={(e) => setCreateForm({ ...createForm, plan: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Pro">Pro Plan</option>
                    <option value="Enterprise">Enterprise Tier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Subscription Expiry Date</label>
                  <input
                    type="date"
                    value={createForm.subscriptionExpiresAt}
                    onChange={(e) => setCreateForm({ ...createForm, subscriptionExpiresAt: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all cursor-pointer flex items-center space-x-2"
                >
                  {actionLoading ? (
                    <>
                      <SpokeSpinner size={16} color="#FFFFFF" />
                      <span>Registering...</span>
                    </>
                  ) : (
                    <span>Register Business</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* EDIT BUSINESS MODAL */}
      {showEditModal && selectedBusiness && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-xl rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-7 space-y-6 shadow-2xl relative text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-500">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Edit Business Settings</h3>
                  <p className="text-[10px] text-slate-400">Updating configuration for tenant: {selectedBusiness.tenantId}</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white p-2">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleEditBusiness} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Business Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Arthi Code (2–5 Chars)</label>
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="e.g. BF"
                    value={editForm.arthiCode}
                    onChange={(e) => setEditForm({ 
                      ...editForm, 
                      arthiCode: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') 
                    })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 tracking-wider"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Owner Name</label>
                  <input
                    type="text"
                    value={editForm.ownerName}
                    onChange={(e) => setEditForm({ ...editForm, ownerName: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Admin Email</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">SaaS Plan Tier</label>
                  <select
                    value={editForm.plan}
                    onChange={(e) => setEditForm({ ...editForm, plan: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Basic">Basic Plan</option>
                    <option value="Pro">Pro Plan</option>
                    <option value="Enterprise">Enterprise Tier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">Account Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Suspended">Suspended</option>
                    <option value="Expired">Expired</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition-all cursor-pointer flex items-center space-x-2"
                >
                  {actionLoading ? (
                    <>
                      <SpokeSpinner size={16} color="#FFFFFF" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {showPasswordModal && selectedBusiness && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 p-7 space-y-6 shadow-2xl relative text-xs">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Reset Admin Password</h3>
                  <p className="text-[10px] text-slate-400">For: {selectedBusiness.name} ({selectedBusiness.email})</p>
                </div>
              </div>
              <button onClick={() => setShowPasswordModal(false)} className="text-slate-400 hover:text-white p-2">
                <XCircle size={20} />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-extrabold uppercase text-slate-400 mb-1">New Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 border-t border-slate-100 dark:border-slate-800 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-6 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center space-x-2"
                >
                  {actionLoading ? (
                    <>
                      <SpokeSpinner size={16} color="#FFFFFF" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
