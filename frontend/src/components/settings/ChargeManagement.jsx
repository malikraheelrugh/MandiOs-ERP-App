import React, { useState, useEffect } from 'react';
import api from '../../utils/api.js';
import { useConfirm } from '../../context/ConfirmContext.jsx';
import { Plus, Pencil, Trash, Search } from 'lucide-react';
import SpokeSpinner from '../common/SpokeSpinner.jsx';

export default function ChargeManagement({ showToast }) {
  const confirm = useConfirm();
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState('add');
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'Fixed Amount',
    value: '',
    chargeBasis: 'Per Crate',
    appliesTo: 'Both',
    status: 'Active'
  });

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchCharges();
  }, []);

  const fetchCharges = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings/charges');
      setCharges(res.data);
    } catch (err) {
      showToast('Failed to load auxiliary charges', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setFormMode('add');
    setFormData({
      name: '',
      type: 'Fixed Amount',
      value: '',
      chargeBasis: 'Per Crate',
      appliesTo: 'Both',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const openEditModal = (charge) => {
    setFormMode('edit');
    setSelectedId(charge.id || charge._id);
    setFormData({
      name: charge.name || '',
      type: charge.type || 'Fixed Amount',
      value: String(charge.value || 0),
      chargeBasis: charge.chargeBasis || 'Per Crate',
      appliesTo: charge.appliesTo || 'Both',
      status: charge.status || 'Active'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id, name) => {
    const confirmed = await confirm({
      title: `Delete Charge Rule?`,
      message: `Are you sure you want to delete charge rule "${name}"?`,
      confirmText: 'Delete Rule',
      type: 'danger'
    });
    if (!confirmed) {
      return;
    }
    try {
      await api.delete(`/settings/charges/${id}`);
      showToast('Charge definition deleted successfully');
      fetchCharges();
    } catch (err) {
      showToast('Failed to delete charge definition', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!formData.name || formData.value === '') {
      showToast('Name and Value are required', 'error');
      return;
    }

    const payload = {
      ...formData,
      value: Number(formData.value) || 0
    };

    setSubmitting(true);
    try {
      if (formMode === 'add') {
        await api.post('/settings/charges', payload);
        showToast('Charge definition created successfully');
      } else {
        await api.put(`/settings/charges/${selectedId}`, payload);
        showToast('Charge definition updated successfully');
      }
      setIsModalOpen(false);
      fetchCharges();
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to save charges configuration', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCharges = charges.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.appliesTo.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredCharges.length / itemsPerPage);
  const paginatedCharges = filteredCharges.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="w-8 h-8 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">Service Charges & Taxes</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Establish standard charges like Palledari (labor), charity (chungi), market fee, or transport overrides.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center space-x-2 bg-[#4F46E5] hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md shrink-0"
        >
          <Plus size={16} />
          <span>ADD SERVICE CHARGE</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center px-3.5 py-2.5 rounded-xl bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800">
          <Search size={16} className="text-slate-500 dark:text-slate-400 mr-2" />
          <input
            type="text"
            placeholder="Search charges by name or billing recipient..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-0 outline-none w-full text-xs placeholder:text-slate-500 text-slate-700 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider bg-slate-50 dark:bg-[#1E293B]">
                <th className="py-3 px-5">Charge Name</th>
                <th className="py-3 px-5">Charge Type</th>
                <th className="py-3 px-5">Value</th>
                <th className="py-3 px-5">Applies To</th>
                <th className="py-3 px-5">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {paginatedCharges.length > 0 ? (
                paginatedCharges.map(charge => (
                  <tr key={charge.id || charge._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/20">
                    <td className="py-3.5 px-5 font-bold">{charge.name}</td>
                    <td className="py-3.5 px-5 font-semibold text-slate-500">{charge.type}</td>
                    <td className="py-3.5 px-5 font-black text-indigo-500 dark:text-indigo-400">
                      {charge.type === 'Percentage' ? `${charge.value}%` : `Rs. ${charge.value}`}
                      <span className="text-[9px] text-slate-400 block font-normal">({charge.chargeBasis})</span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                        {charge.appliesTo}
                      </span>
                    </td>
                    <td className="py-3.5 px-5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${charge.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-500'}`}>
                        {charge.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => openEditModal(charge)} className="p-1.5 rounded-lg bg-slate-100 dark:bg-[#0F172A] hover:bg-slate-200 text-slate-700 dark:text-slate-300">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => handleDelete(charge.id || charge._id, charge.name)} className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400">
                          <Trash size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">No auxiliary service charges defined.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex space-x-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-scale-up text-slate-800 dark:text-slate-100">
            <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black uppercase tracking-wider">{formMode === 'add' ? 'Add New auxiliary charge' : 'Edit auxiliary charge'}</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Establish automatic transaction taxations or service additions.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Charge Name */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Charge / Fee Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Palledari (Labor Fee)"
                  className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#4F46E5]"
                  required
                />
              </div>

              {/* Type & Value */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase tracking-wider">Charge Type</label>
                  <select
                    value={formData.type}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
                    className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl outline-none"
                  >
                    <option value="Fixed Amount">Fixed Amount (Rs.)</option>
                    <option value="Percentage">Percentage (%)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase tracking-wider">Charge Value *</label>
                  <input
                    type="number"
                    step="any"
                    value={formData.value}
                    onChange={e => setFormData(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="e.g. 15"
                    className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl outline-none focus:border-[#4F46E5]"
                    required
                  />
                </div>
              </div>

              {/* Basis & Recipient */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase tracking-wider">Billing Recipient</label>
                  <select
                    value={formData.appliesTo}
                    onChange={e => setFormData(prev => ({ ...prev, appliesTo: e.target.value }))}
                    className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl outline-none"
                  >
                    <option value="Both">Both Supplier & Buyer</option>
                    <option value="Supplier">Supplier Only (Deduct)</option>
                    <option value="Customer">Buyer Only (Add-on)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-500 uppercase tracking-wider">Deduction Basis</label>
                  <select
                    value={formData.chargeBasis}
                    onChange={e => setFormData(prev => ({ ...prev, chargeBasis: e.target.value }))}
                    className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl outline-none"
                  >
                    <option value="Per Crate">Per Crate</option>
                    <option value="Per Box">Per Box</option>
                    <option value="Per Basket">Per Basket</option>
                    <option value="Per Kilogram">Per Kilogram</option>
                    <option value="Per Maund">Per Maund (40 kg)</option>
                    <option value="Per Invoice">Per Invoice (Flat)</option>
                    <option value="Sale Amount">Total Sale Amount</option>
                  </select>
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-500 uppercase tracking-wider">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 rounded-xl outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-500"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#4F46E5] hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center space-x-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <SpokeSpinner size={16} color="#FFFFFF" />
                      <span>{formMode === 'add' ? 'ADDING...' : 'SAVING...'}</span>
                    </>
                  ) : (
                    <span>{formMode === 'add' ? 'ADD CHARGE' : 'SAVE CHANGES'}</span>
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
