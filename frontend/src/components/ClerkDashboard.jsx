import React, { useState, useEffect } from 'react';
import api from '../utils/api.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import {
  Plus, Pencil, Trash, Search, ShieldAlert, Calendar, Printer, Filter, CheckCircle2, Home, Boxes, DollarSign, X
} from 'lucide-react';
import HomeTab from './HomeTab.jsx';
import RecordBatchSale from './RecordBatchSale.jsx';
import SoldConsignments from './SoldConsignments.jsx';
import TruckLogsAndLogistics from './TruckLogsAndLogistics.jsx';
import ProductCatalog from './ProductCatalog.jsx';
import ReturnsManagement from './ReturnsManagement.jsx';
import BusinessProfile from './settings/BusinessProfile.jsx';
import { openReportInNewTab } from '../utils/navigation.js';
import SpokeSpinner from './common/SpokeSpinner.jsx';

import { useConfirm } from '../context/ConfirmContext.jsx';

export default function ClerkDashboard({ tab, setCurrentTab }) {
  const { t } = useLanguage();
  const confirm = useConfirm();
  const [suppliers, setSuppliers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockEntries, setStockEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Search & Filtering States
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [invoiceSettings, setInvoiceSettings] = useState(null);

  // Modals
  const [modalType, setModalType] = useState(null); // 'stock', 'sale', 'invoice'
  const [modalMode, setModalMode] = useState('add'); // 'add', 'edit'
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [suppliersRes, customersRes, productsRes, stockRes, salesRes, invoiceSettingsRes] = await Promise.all([
        api.get('/suppliers').catch(() => ({ data: [] })),
        api.get('/customers').catch(() => ({ data: [] })),
        api.get('/products').catch(() => ({ data: [] })),
        api.get('/stock').catch(() => ({ data: [] })),
        api.get('/sales').catch(() => ({ data: [] })),
        api.get('/settings/invoice').catch(() => ({ data: null })),
      ]);

      const extractArray = (data) => Array.isArray(data) ? data : (Array.isArray(data?.products) ? data.products : (Array.isArray(data?.data) ? data.data : []));

      setSuppliers(extractArray(suppliersRes.data));
      setCustomers(extractArray(customersRes.data));
      setProducts(extractArray(productsRes.data));
      setStockEntries(extractArray(stockRes.data));
      setSales(extractArray(salesRes.data));
      setInvoiceSettings(invoiceSettingsRes.data || null);
    } catch (err) {
      showToast('Error loading server data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tab]);

  const openModal = (type, mode, item = null) => {
    setModalType(type);
    setModalMode(mode);
    setSelectedItem(item);
    if (mode === 'edit' && item) {
      setFormData({ ...item });
    } else {
      setFormData({});
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedItem(null);
    setFormData({});
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (modalSubmitting) return;
    setModalSubmitting(true);
    try {
      let endpoint = modalType === 'stock' ? '/stock' : '/sales';
      if (modalMode === 'add') {
        if (!formData.date) {
          formData.date = new Date().toISOString().split('T')[0];
        }
        await api.post(endpoint, formData);
        showToast(`${modalType.toUpperCase()} entry successfully recorded!`);
      } else {
        const updateEndpoint = modalType === 'stock' ? `/stock/${selectedItem.id || selectedItem._id}` : `/sales/${selectedItem.id || selectedItem._id}`;
        await api.put(updateEndpoint, formData);
        showToast(`${modalType.toUpperCase()} entry successfully updated!`);
      }
      closeModal();
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Operation failed', 'error');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDelete = async (type, id, name) => {
    const confirmed = await confirm({
      title: `Delete ${name}?`,
      message: `Are you sure you want to delete ${name}? This action cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });
    if (!confirmed) return;
    try {
      const endpoint = type === 'stock' ? `/stock/${id}` : `/sales/${id}`;
      await api.delete(endpoint);
      showToast(`${type.toUpperCase()} deleted successfully.`);
      fetchData();
    } catch (err) {
      showToast(err.response?.data?.error || 'Delete failed', 'error');
    }
  };

  const filterAndPaginate = (list) => {
    let filtered = Array.isArray(list) ? list : [];

    if (searchTerm) {
      filtered = filtered.filter(item => 
        Object.values(item).some(val => 
          String(val).toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (filterSupplier) {
      filtered = filtered.filter(item => item.supplierId === filterSupplier);
    }
    if (filterCustomer) {
      filtered = filtered.filter(item => item.customerId === filterCustomer);
    }
    if (filterDate) {
      filtered = filtered.filter(item => item.date === filterDate);
    }

    const totalItems = filtered.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIdx = (currentPage - 1) * itemsPerPage;
    const paginated = filtered.slice(startIdx, startIdx + itemsPerPage);

    return { paginated, totalPages, totalItems };
  };

  const triggerPrint = (title) => {
    const printContent = document.getElementById('printable-area');
    const win = window.open('', '', 'height=700,width=900');
    win.document.write('<html><head><title>' + title + '</title>');
    win.document.write('<link href="https://cdn.jsdelivr.net/npm/tailwindcss@3.3.0/dist/tailwind.min.css" rel="stylesheet">');
    win.document.write('</head><body class="p-8 bg-white text-slate-900">');
    win.document.write(printContent.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    setTimeout(() => {
      win.print();
      win.close();
    }, 500);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-[#4F46E5] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold tracking-wide text-slate-500 dark:text-slate-400">{t("Loading Clerk Desk...")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-xl transition-all border
          ${toast.type === 'error' ? 'bg-rose-500/10 border-rose-500/20 text-rose-500' : 'bg-[#4F46E5]/10 border-[#4F46E5]/20 text-[#4F46E5] dark:text-indigo-400'}`}>
          <CheckCircle2 size={18} />
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* ----------------- TAB: HOME ----------------- */}
      {tab === 'home' && (
        <HomeTab setCurrentTab={setCurrentTab} />
      )}

      {/* ----------------- TAB: TRUCK LOGS & LOGISTICS ----------------- */}
      {tab === 'logistics' && (
        <TruckLogsAndLogistics suppliers={suppliers} showToast={showToast} />
      )}

      {/* ----------------- TAB: BUSINESS PROFILE ----------------- */}
      {(tab === 'business_profile' || tab === 'business') && (
        <BusinessProfile showToast={showToast} />
      )}

      {/* ----------------- TAB: DASHBOARD ----------------- */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">{t("Products")}</p>
                <h3 className="text-2xl font-black mt-1 text-[#4F46E5] dark:text-indigo-400">{(products || []).length}</h3>
              </div>
              <div className="p-3 bg-[#4F46E5]/10 text-[#4F46E5] dark:text-indigo-400 rounded-xl"><Boxes size={22} /></div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">{t("Today's Supplies")}</p>
                <h3 className="text-2xl font-black mt-1 text-blue-400">
                  {(stockEntries || []).filter(s => s.date === new Date().toISOString().split('T')[0]).length} {t("Entries")}
                </h3>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl"><Home size={22} /></div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase">{t("Today's Sales")}</p>
                <h3 className="text-2xl font-black mt-1 text-amber-400">
                  {(sales || []).filter(s => s.date === new Date().toISOString().split('T')[0]).length} {t("Tickets")}
                </h3>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><DollarSign size={22} /></div>
            </div>
          </div>

          {/* Low Stock Alerts */}
          {(products || []).some(p => p.currentQuantity <= 20) && (
            <div className="p-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 text-amber-300 flex items-center space-x-3">
              <ShieldAlert size={20} className="text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">{t("Low Stock Warnings!")}</p>
                <p className="text-xs opacity-80 mt-0.5">
                  {t("Items near depletion")}: {products.filter(p => p.currentQuantity <= 20).map(p => `${p.name} (${p.currentQuantity} ${p.unit} ${t("left")})`).join(', ')}. {t("Coordinate with Suppliers!")}
                </p>
              </div>
            </div>
          )}

          {/* Recent entries board */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-wider">Recent Stock Supplies (Purchase)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Supplier</th>
                      <th className="py-2.5">Item</th>
                      <th className="py-2.5 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockEntries.slice(0, 5).map(e => (
                      <tr key={e.id || e._id} className="border-b border-slate-800/20">
                        <td className="py-2 text-slate-500 dark:text-slate-400">{e.date}</td>
                        <td className="py-2 font-semibold">{e.supplierName}</td>
                        <td className="py-2">{e.productName}</td>
                        <td className="py-2 text-right text-indigo-400 font-bold">{e.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 space-y-4">
              <h4 className="text-sm font-black uppercase tracking-wider">Recent Sales Tickets</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                      <th className="py-2.5">Date</th>
                      <th className="py-2.5">Buyer</th>
                      <th className="py-2.5">Item</th>
                      <th className="py-2.5 text-right">Sum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, 5).map(s => (
                      <tr key={s.id || s._id} className="border-b border-slate-800/20">
                        <td className="py-2 text-slate-500 dark:text-slate-400">{s.date}</td>
                        <td className="py-2 font-semibold">{s.customerName}</td>
                        <td className="py-2">{s.productName}</td>
                        <td className="py-2 text-right text-[#4F46E5] dark:text-indigo-400 font-bold">Rs. {s.totalAmount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB: SUPPLIER STOCK (PURCHASE) ----------------- */}
      {tab === 'stock' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider">Agriculture Stock Supplies</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add, edit, or delete shipments supplied by growers and farmers</p>
            </div>
            <button 
              onClick={() => openModal('stock', 'add')}
              className="flex items-center space-x-2 bg-[#4F46E5] hover:bg-[#4F46E5] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              <Plus size={16} />
              <span>RECORD NEW SHIPMENT</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center px-4 py-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80">
              <Search size={16} className="text-slate-500 dark:text-slate-400 mr-2" />
              <input type="text" placeholder="Search supplies..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-0 outline-none text-xs w-full" />
            </div>
            <div className="flex items-center px-4 py-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80">
              <Filter size={16} className="text-slate-500 dark:text-slate-400 mr-2" />
              <select value={filterSupplier} onChange={e => setFilterSupplier(e.target.value)} className="bg-transparent border-0 outline-none text-xs w-full">
                <option value="">All Suppliers</option>
                {suppliers.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
              </select>
            </div>
            <div className="flex items-center px-4 py-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80">
              <Calendar size={16} className="text-slate-500 dark:text-slate-400 mr-2" />
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-transparent border-0 outline-none text-xs w-full" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-5">Supplier Name</th>
                  <th className="py-4 px-5">Product Name</th>
                  <th className="py-4 px-5 text-right">Arrived Qty</th>
                  <th className="py-4 px-5 text-right">Remaining Qty</th>
                  <th className="py-4 px-5 text-right">Avg Sale Rate</th>
                  <th className="py-4 px-5 text-right">Total Credited</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-200 dark:divide-slate-800/50">
                {filterAndPaginate(stockEntries).paginated.map(entry => {
                  const rem = entry.remainingQuantity !== undefined ? entry.remainingQuantity : entry.quantity;
                  return (
                    <tr key={entry.id || entry._id}>
                      <td className="py-3 px-5 font-bold text-slate-700 dark:text-slate-300">{entry.date}</td>
                      <td className="py-3 px-5 font-semibold">{entry.supplierName}</td>
                      <td className="py-3 px-5">{entry.productName}</td>
                      <td className="py-3 px-5 text-right font-bold text-indigo-400">{entry.quantity}</td>
                      <td className="py-3 px-5 text-right font-bold text-emerald-400">{rem}</td>
                      <td className="py-3 px-5 text-right">Rs. {entry.purchaseRate || 0}</td>
                      <td className="py-3 px-5 text-right font-bold text-rose-400">Rs. {(entry.totalAmount || 0).toLocaleString()}</td>
                      <td className="py-3 px-5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button onClick={() => openModal('stock', 'edit', entry)} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300"><Pencil size={13} /></button>
                          <button onClick={() => handleDelete('stock', entry.id || entry._id, `${entry.quantity} of ${entry.productName}`)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB: SALES TRANSACTIONS ----------------- */}
      {tab === 'sales' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black uppercase tracking-wider">Commission Brokerage Sales Tickets</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Record fruit and vegetable sales to wholesale and retail buyers</p>
            </div>
            <button 
              onClick={() => openModal('sale', 'add')}
              className="flex items-center space-x-2 bg-[#4F46E5] hover:bg-[#4F46E5] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all"
            >
              <Plus size={16} />
              <span>RECORD NEW SALE</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center px-4 py-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80">
              <Search size={16} className="text-slate-500 dark:text-slate-400 mr-2" />
              <input type="text" placeholder="Search sales tickets..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="bg-transparent border-0 outline-none text-xs w-full" />
            </div>
            <div className="flex items-center px-4 py-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80">
              <Filter size={16} className="text-slate-500 dark:text-slate-400 mr-2" />
              <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="bg-transparent border-0 outline-none text-xs w-full">
                <option value="">All Customers</option>
                {customers.map(c => <option key={c.id || c._id} value={c.id || c._id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center px-4 py-3 rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80">
              <Calendar size={16} className="text-slate-500 dark:text-slate-400 mr-2" />
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="bg-transparent border-0 outline-none text-xs w-full" />
            </div>
          </div>

          <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/80 text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">
                  <th className="py-4 px-5">Date</th>
                  <th className="py-4 px-5">Customer Name</th>
                  <th className="py-4 px-5">Product Name</th>
                  <th className="py-4 px-5 text-right">Quantity</th>
                  <th className="py-4 px-5 text-right">Sale Rate</th>
                  <th className="py-4 px-5 text-right">Discount</th>
                  <th className="py-4 px-5 text-right">Billing Sum</th>
                  <th className="py-4 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-200 dark:divide-slate-800/50">
                {filterAndPaginate(sales).paginated.map(sale => (
                  <tr key={sale.id || sale._id}>
                    <td className="py-3 px-5 font-bold text-slate-700 dark:text-slate-300">{sale.date}</td>
                    <td className="py-3 px-5 font-semibold">{sale.customerName}</td>
                    <td className="py-3 px-5">{sale.productName}</td>
                    <td className="py-3 px-5 text-right font-bold text-blue-400">{sale.quantity}</td>
                    <td className="py-3 px-5 text-right">Rs. {sale.saleRate}</td>
                    <td className="py-3 px-5 text-right text-rose-400">Rs. {sale.discount || 0}</td>
                    <td className="py-3 px-5 text-right font-black text-[#4F46E5] dark:text-indigo-400">Rs. {sale.totalAmount.toLocaleString()}</td>
                    <td className="py-3 px-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button 
                          onClick={() => {
                            openReportInNewTab('sale-invoice', { saleId: sale.id || sale._id });
                          }} 
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          <Printer size={13} />
                        </button>
                        <button onClick={() => handleDelete('sale', sale.id || sale._id, `${sale.quantity} of ${sale.productName}`)} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"><Trash size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ----------------- TAB: RECORD BATCH SALE ----------------- */}
      {tab === 'sales_batch' && (
        <RecordBatchSale setCurrentTab={setCurrentTab} />
      )}

      {/* ----------------- TAB: SOLD CONSIGNMENTS ----------------- */}
      {tab === 'sales_sold_consignments' && (
        <SoldConsignments setCurrentTab={setCurrentTab} />
      )}

      {/* ----------------- TAB: RETURNS & SETTLEMENTS ----------------- */}
      {tab === 'returns' && (
        <ReturnsManagement role="Clerk" />
      )}

      {/* ----------------- TAB: PRODUCT CATALOG ----------------- */}
      {tab === 'products' && (
        <ProductCatalog
          products={products}
          onRefresh={fetchData}
          showToast={showToast}
          role="Clerk"
        />
      )}

      {/* --- MODALS --- */}
      {modalType && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          {modalType === 'stock' && (
            <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800/80 p-6 space-y-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
                <h3 className="text-base font-black uppercase tracking-wider">{modalMode === 'add' ? 'RECORD' : 'EDIT'} SUPPLIER STOCK ARRIVAL</h3>
                <button onClick={closeModal} className="text-slate-500 dark:text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block">Supplier / Grower</label>
                    <select required name="supplierId" value={formData.supplierId || ''} onChange={handleFormChange} className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 outline-none">
                      <option value="">Select Supplier</option>
                      {suppliers.map(s => <option key={s.id || s._id} value={s.id || s._id}>{s.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block">Product</label>
                    <select required name="productId" value={formData.productId || ''} onChange={handleFormChange} className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 outline-none">
                      <option value="">Select Product</option>
                      {products.map(p => <option key={p.id || p._id} value={p.id || p._id}>{p.name} ({p.unit})</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block">Arrival Quantity</label>
                    <input required type="number" name="quantity" value={formData.quantity || ''} onChange={handleFormChange} placeholder="Enter physical units received" className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block">Voucher Date</label>
                    <input required type="date" name="date" value={formData.date || ''} onChange={handleFormChange} className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 outline-none" />
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-xl text-[11px]">
                  <strong>Note:</strong> Rate will be left pending at arrival, and will be updated automatically as you make sales tickets from this lot.
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                  <button type="button" onClick={closeModal} className="px-5 py-3 rounded-xl hover:bg-slate-800 text-xs font-bold uppercase">Cancel</button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-6 py-3 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase flex items-center space-x-2 cursor-pointer"
                  >
                    {modalSubmitting ? (
                      <>
                        <SpokeSpinner size={16} color="#FFFFFF" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Arrival</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {modalType === 'sale' && (
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800/80 p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
                <h3 className="text-base font-black uppercase tracking-wider">RECORD BATCH CONSIGNMENT SALE</h3>
                <button onClick={closeModal} className="text-slate-500 dark:text-slate-400 hover:text-white"><X size={18} /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block text-[10px]">Select Available Farmer Consignment</label>
                  <select 
                    required 
                    name="stockEntryId" 
                    value={formData.stockEntryId || ''} 
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      setFormData(prev => ({ 
                        ...prev, 
                        stockEntryId: selectedId,
                        date: prev.date || new Date().toISOString().split('T')[0],
                        buyers: [] // Reset buyers list
                      }));
                    }} 
                    className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 outline-none"
                  >
                    <option value="">Select active consignment</option>
                    {stockEntries
                      .filter(s => (s.remainingQuantity !== undefined ? s.remainingQuantity : s.quantity) > 0)
                      .map(s => (
                        <option key={s.id || s._id} value={s.id || s._id}>
                          {s.productName} ({(s.remainingQuantity !== undefined ? s.remainingQuantity : s.quantity)} left) - Supplier: {s.supplierName} (Arrived: {s.date})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block text-[10px]">Set Sale Rate (Rs.)</label>
                    <input 
                      required 
                      type="number" 
                      name="saleRate" 
                      placeholder="Set flat rate for selected buyers"
                      value={formData.saleRate || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, saleRate: e.target.value }))}
                      className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 outline-none font-bold text-sm" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block text-[10px]">Booking Date</label>
                    <input 
                      required 
                      type="date" 
                      name="date" 
                      value={formData.date || ''} 
                      onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full bg-[#F8FAFC] dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-xl px-4 py-3 outline-none" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-slate-500 dark:text-slate-400 font-bold uppercase block text-[10px]">Select Buyers & Enter Quantities</label>
                  <div className="max-h-52 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-3 bg-[#F8FAFC] dark:bg-[#0F172A]">
                    {customers.map(c => {
                      const buyerConfig = (formData.buyers || []).find(b => b.customerId === (c.id || c._id));
                      const isChecked = !!buyerConfig;
                      return (
                        <div key={c.id || c._id} className="space-y-2 border-b border-slate-100 dark:border-slate-800/40 pb-2 last:border-0 last:pb-0">
                          <div className="flex items-center space-x-2">
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                if (checked) {
                                  const updatedBuyers = [...(formData.buyers || []), { customerId: c.id || c._id, name: c.name, quantity: '', discount: '' }];
                                  setFormData(prev => ({ ...prev, buyers: updatedBuyers }));
                                } else {
                                  const updatedBuyers = (formData.buyers || []).filter(b => b.customerId !== (c.id || c._id));
                                  setFormData(prev => ({ ...prev, buyers: updatedBuyers }));
                                }
                              }}
                              className="rounded text-[#4F46E5] focus:ring-[#4F46E5] h-4 w-4"
                            />
                            <span className="font-bold text-slate-700 dark:text-slate-300">{c.name}</span>
                          </div>
                          {isChecked && (
                            <div className="grid grid-cols-2 gap-3 pl-6">
                              <div>
                                <span className="text-[9px] text-slate-500 uppercase block mb-1">Quantity to Buy</span>
                                <input 
                                  required
                                  type="number" 
                                  placeholder="Qty"
                                  value={buyerConfig.quantity || ''}
                                  onChange={(e) => {
                                    const updatedBuyers = (formData.buyers || []).map(b => 
                                      b.customerId === (c.id || c._id) ? { ...b, quantity: e.target.value } : b
                                    );
                                    setFormData(prev => ({ ...prev, buyers: updatedBuyers }));
                                  }}
                                  className="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none"
                                />
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-500 uppercase block mb-1">Discount (Rs.)</span>
                                <input 
                                  type="number" 
                                  placeholder="Discount"
                                  value={buyerConfig.discount || ''}
                                  onChange={(e) => {
                                    const updatedBuyers = (formData.buyers || []).map(b => 
                                      b.customerId === (c.id || c._id) ? { ...b, discount: e.target.value } : b
                                    );
                                    setFormData(prev => ({ ...prev, buyers: updatedBuyers }));
                                  }}
                                  className="w-full bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 outline-none"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {formData.stockEntryId && formData.saleRate && (formData.buyers || []).length > 0 && (
                  <div className="p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5">
                    <span className="text-[10px] font-bold text-[#4F46E5] uppercase block">Batch Sale Summary</span>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Total Buyers Selected:</span>
                      <span>{formData.buyers.length}</span>
                    </div>
                    <div className="flex justify-between text-xs font-semibold">
                      <span>Total Units Sold:</span>
                      <span>
                        {formData.buyers.reduce((acc, curr) => acc + (Number(curr.quantity) || 0), 0)} units
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-black text-[#4F46E5]">
                      <span>Total Billing Amount:</span>
                      <span>
                        Rs. {formData.buyers.reduce((acc, curr) => {
                          const amt = ((Number(curr.quantity) || 0) * Number(formData.saleRate)) - (Number(curr.discount) || 0);
                          return acc + amt;
                        }, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                  <button type="button" onClick={closeModal} className="px-5 py-3 rounded-xl hover:bg-slate-800 text-xs font-bold uppercase">Cancel</button>
                  <button
                    type="submit"
                    disabled={modalSubmitting}
                    className="px-6 py-3 bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold uppercase flex items-center space-x-2 cursor-pointer"
                  >
                    {modalSubmitting ? (
                      <>
                        <SpokeSpinner size={16} color="#FFFFFF" />
                        <span>Recording...</span>
                      </>
                    ) : (
                      <span>Record Batch Sales</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* INVOICE VIEWER */}
          {modalType === 'invoice' && selectedItem && (
            <div className="w-full max-w-xl rounded-2xl bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-slate-200 dark:border-slate-800/80 p-6 space-y-6 shadow-2xl relative flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-200 dark:border-slate-800/80 pb-4">
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black uppercase tracking-wider">SALES BILL INVOICE</h3>
                  {invoiceSettings?.paperSize && (
                    <span className="text-[10px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full font-bold">
                      Format: {invoiceSettings.paperSize}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => triggerPrint(`Invoice-${selectedItem.id || selectedItem._id}`)} className="flex items-center space-x-1 bg-[#4F46E5] hover:bg-[#4F46E5] text-white font-bold text-xs px-3 py-1.5 rounded-xl">
                    <Printer size={13} />
                    <span>PRINT</span>
                  </button>
                  <button onClick={closeModal} className="text-slate-500 dark:text-slate-400 hover:text-white"><X size={18} /></button>
                </div>
              </div>

              <div
                id="printable-area"
                className={`p-6 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl mx-auto shadow-sm ${
                  invoiceSettings?.paperSize === 'Thermal 3-inch'
                    ? 'w-[76mm] max-w-[320px] font-mono text-[10px] space-y-3'
                    : invoiceSettings?.paperSize === 'A5'
                    ? 'w-[148mm] max-w-md text-[11px] space-y-4'
                    : 'w-full max-w-xl space-y-6 text-xs'
                }`}
              >
                {/* Header block */}
                <div className={`flex ${invoiceSettings?.paperSize === 'Thermal 3-inch' ? 'flex-col items-center text-center' : 'justify-between items-start'} border-b-2 border-slate-200 pb-4`}>
                  <div className={invoiceSettings?.paperSize === 'Thermal 3-inch' ? 'space-y-1' : ''}>
                    {invoiceSettings?.companyLogo ? (
                      <img
                        src={invoiceSettings.companyLogo}
                        alt="Logo"
                        className="h-10 object-contain mb-1.5"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex items-center space-x-2 mb-1">
                        <img 
                          src="/mandi_logo.jpg" 
                          alt="Mandi OS Logo" 
                          referrerPolicy="no-referrer"
                          className="h-9 w-auto object-contain rounded"
                        />
                        <h2 className="text-base font-black tracking-wider uppercase text-[#4F46E5]">
                          {invoiceSettings?.header || 'Mandi OS - Sabzi & Fruit Broker'}
                        </h2>
                      </div>
                    )}
                    {!invoiceSettings?.companyLogo && invoiceSettings?.header && (
                      <h2 className="text-sm font-black tracking-wide uppercase text-slate-800">
                        {invoiceSettings.header}
                      </h2>
                    )}
                    <p className="text-[10px] text-slate-500">Shop 12, Fruit Market, Lahore, Pakistan</p>
                  </div>
                  <div className={invoiceSettings?.paperSize === 'Thermal 3-inch' ? 'text-center mt-2 pt-2 border-t border-dashed border-slate-300 w-full' : 'text-right'}>
                    <p className="font-bold text-[10px]">
                      Invoice: {invoiceSettings?.invoicePrefix || 'MANDI'}-{selectedItem.id?.substring(0, 5) || selectedItem._id?.substring(0, 5)}
                    </p>
                    <p className="text-[10px] text-slate-500">Date: {selectedItem.date}</p>
                  </div>
                </div>

                <div className={`grid ${invoiceSettings?.paperSize === 'Thermal 3-inch' ? 'grid-cols-1 space-y-2' : 'grid-cols-2 gap-4'} py-3 border-b border-slate-200 text-[10px]`}>
                  <div>
                    <span className="text-slate-500 font-bold block text-[8px]">Billed To:</span>
                    <p className="font-bold text-sm text-slate-800">{selectedItem.customerName}</p>
                  </div>
                  <div className={invoiceSettings?.paperSize === 'Thermal 3-inch' ? 'text-left' : 'text-right'}>
                    <span className="text-slate-500 font-bold block text-[8px]">Account Category:</span>
                    <p className="text-slate-600 text-[9px]">Mandi Trade Account Buyer</p>
                  </div>
                </div>

                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 font-bold uppercase text-slate-500 text-[8px]">
                      <th className="py-1">Description</th>
                      <th className="py-1 text-right">Qty</th>
                      <th className="py-1 text-right">Rate</th>
                      <th className="py-1 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold text-slate-800 text-[10px]">
                      <td className="py-2">{selectedItem.productName}</td>
                      <td className="py-2 text-right">{selectedItem.quantity}</td>
                      <td className="py-2 text-right">Rs. {selectedItem.saleRate}</td>
                      <td className="py-2 text-right">Rs. {(selectedItem.quantity * selectedItem.saleRate).toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>

                <div className="border-t border-slate-200 pt-3 flex justify-end">
                  <div className={`${invoiceSettings?.paperSize === 'Thermal 3-inch' ? 'w-full' : 'w-1/2'} space-y-1 text-right font-bold text-[10px]`}>
                    {(() => {
                      const grossSub = selectedItem.grossSale || ((selectedItem.quantity || 0) * (selectedItem.saleRate || 0));
                      const comm = selectedItem.commissionAmount || 0;
                      const disc = selectedItem.discount || selectedItem.discountAmount || 0;
                      const netTotal = grossSub + comm - disc;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Gross Subtotal:</span>
                            <span>Rs. {grossSub.toLocaleString()}</span>
                          </div>
                          {comm > 0 && (
                            <div className="flex justify-between text-slate-600">
                              <span className="text-slate-500">Buyer Commission:</span>
                              <span>+ Rs. {comm.toLocaleString()}</span>
                            </div>
                          )}
                          {disc > 0 && (
                            <div className="flex justify-between text-rose-600">
                              <span>Discount:</span>
                              <span>- Rs. {disc.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between border-t border-slate-300 pt-1.5 text-xs font-black text-slate-900">
                            <span>Total Invoice:</span>
                            <span>Rs. {netTotal.toLocaleString()}</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Terms and Conditions */}
                {invoiceSettings?.termsAndConditions && (
                  <div className="border-t border-slate-200 pt-3 text-[9px] text-slate-500 text-left">
                    <span className="font-bold block uppercase text-[8px]">Terms & Conditions:</span>
                    <p className="whitespace-pre-line leading-normal text-slate-600">{invoiceSettings.termsAndConditions}</p>
                  </div>
                )}

                {/* Signature Block */}
                <div className="flex justify-between items-end pt-5 border-t border-slate-200 text-[9px]">
                  <div className="text-slate-400 text-[8px]">
                    Format: {invoiceSettings?.paperSize || 'A4 Standard'}
                  </div>
                  <div className="text-right">
                    <div className="w-24 border-b border-slate-300 mx-auto"></div>
                    <p className="text-[9px] text-slate-500 mt-1.5 font-bold">
                      {invoiceSettings?.signature || 'Authorized Signatory'}
                    </p>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="border-t border-slate-100 pt-3 text-center text-[9px] text-slate-500 font-semibold uppercase tracking-wider">
                  {invoiceSettings?.footer || 'Thank you for trading at Lahore Sabzi & Fruit Mandi!'}
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={closeModal} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold uppercase">Close Invoice</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
