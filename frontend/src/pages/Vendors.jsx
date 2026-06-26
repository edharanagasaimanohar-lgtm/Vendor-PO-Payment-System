import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Mail, 
  Phone, 
  X, 
  UserCheck, 
  Users2, 
  UserMinus, 
  Power
} from 'lucide-react';
import { api } from '../services/api';

const CATEGORIES = [
  'Packaging & Boxes',
  'Ribbons & Tags',
  'Custom Printing',
  'Wrapping Paper',
  'Protective Fillers',
  'Corporate Decorations',
  'General'
];

const PAYMENT_TERMS = [
  'Net 30',
  'Net 15',
  'Net 45',
  'Due on Receipt',
  'COD'
];

export const Vendors = ({ addToast }) => {
  const [vendors, setVendors] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Form handling state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('Add');
  const [selectedVendorId, setSelectedVendorId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Packaging & Boxes',
    payment_terms: 'Net 30',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active',
  });

  const [formErrors, setFormErrors] = useState({});

  const fetchVendors = async () => {
    try {
      setLoading(true);
      let url = '/vendors';
      const params = [];
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      if (statusFilter) params.push(`status=${statusFilter}`);
      
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      
      const res = await api.get(url);
      setVendors(res.data);
    } catch (err) {
      addToast('Could not fetch vendors from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Debounce search text input separately- only run search query after a short delay
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearch(searchText);
    }, 250);
    return () => clearTimeout(handler);
  }, [searchText]);

  // Execute actual API data fetching immediately when search/filters changes
  useEffect(() => {
    fetchVendors();
  }, [search, statusFilter]);

  const validate = () => {
    const errors = {};
    if (!formData.name || !formData.name.trim()) {
      errors.name = 'Vendor Name is required.';
    }
    if (!formData.phone || !formData.phone.trim()) {
      errors.phone = 'Phone number is required.';
    }
    if (!formData.payment_terms || !formData.payment_terms.trim()) {
      errors.payment_terms = 'Payment Terms are required.';
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Please provide a valid email format.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleOpenAdd = () => {
    setModalMode('Add');
    setSelectedVendorId(null);
    setFormData({
      name: '',
      category: 'Packaging & Boxes',
      payment_terms: 'Net 30',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      status: 'Active',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleOpenEdit = (v) => {
    setModalMode('Edit');
    setSelectedVendorId(v.id);
    setFormData({
      name: v.name,
      category: v.category || 'General',
      payment_terms: v.payment_terms || 'Net 30',
      contact_person: v.contact_person || '',
      email: v.email || '',
      phone: v.phone || '',
      address: v.address || '',
      status: v.status || 'Active',
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('Please correct validation errors on the form.', 'error');
      return;
    }

    try {
      if (modalMode === 'Add') {
        await api.post('/vendors', formData);
        addToast(`Vendor "${formData.name}" registered successfully!`, 'success');
      } else {
        await api.put(`/vendors/${selectedVendorId}`, formData);
        addToast(`Vendor details updated.`, 'success');
      }
      setShowModal(false);
      fetchVendors();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed saving vendor profile.', 'error');
    }
  };

  // Soft Delete / Change Active Status dynamically
  const handleToggleStatus = async (vendor) => {
    const nextStatus = vendor.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await api.put(`/vendors/${vendor.id}`, {
        name: vendor.name,
        category: vendor.category || 'General',
        payment_terms: vendor.payment_terms || 'Net 30',
        contact_person: vendor.contact_person || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        status: nextStatus,
      });
      addToast(`Status of "${vendor.name}" toggled to ${nextStatus}.`, 'success');
      fetchVendors();
    } catch (err) {
      addToast(err.response?.data?.error || 'Failed updating status.', 'error');
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently delete Vendor "${name}"? This action cannot be undone and will cascade delete all associated purchase orders!`)) {
      try {
        await api.delete(`/vendors/${id}?purge=true`);
        addToast(`Vendor "${name}" has been permanently deleted.`, 'success');
        fetchVendors();
      } catch (err) {
        addToast('Failed to delete vendor. Make sure you are authenticated.', 'error');
      }
    }
  };

  // Derived KPI aggregates
  const totalVendors = vendors.length;
  const activeVendors = vendors.filter(v => v.status === 'Active').length;
  const inactiveVendors = vendors.filter(v => v.status === 'Inactive').length;

  // Filter local listings by category locally for smoother client experience
  const filteredVendors = vendors.filter(vendor => {
    if (categoryFilter && vendor.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div id="vendor-master-container" className="space-y-6 font-sans">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-955 dark:text-gray-50 font-sans">
            Vendor Directory
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pb-1">
            Configure secure sourcing partners, specify category expertise, payment timelines, and dispatch coordinates.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            id="add-vendor-btn"
            onClick={handleOpenAdd}
            className="flex items-center justify-center gap-2 bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm px-4.5 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Add New Vendor</span>
          </button>
        </div>
      </div>

      {/* KPI Dashboard Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 select-none font-sans">
        {/* Card 1: Total Vendors */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Registry</p>
            <h3 className="text-3xl font-extrabold text-gray-950 dark:text-white tracking-tight">{totalVendors}</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-405 font-medium">Registered supplier contracts</p>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-105 dark:border-blue-900/40">
            <Users2 className="h-6 w-6" />
          </div>
        </div>

        {/* Card 2: Active Vendors */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Active Partners</p>
            <h3 className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-450 tracking-tight">{activeVendors}</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-405 font-medium">Fulfilling material procurements</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        {/* Card 3: Inactive Vendors */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex items-center justify-between transition-colors">
          <div className="space-y-1.5">
            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Inactive / On Hold</p>
            <h3 className="text-3xl font-extrabold text-rose-600 dark:text-rose-400 tracking-tight">{inactiveVendors}</h3>
            <p className="text-[11px] text-gray-500 dark:text-gray-405 font-medium">Temporarily status suspended</p>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-650 dark:text-rose-450 rounded-xl border border-rose-100 dark:border-rose-900/40">
            <UserMinus className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Advanced Filter, Category Select, and Search Toolbar */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between transition-all font-sans">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400 dark:text-gray-550">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            id="vendor-search-input"
            type="text"
            placeholder="Search by company name, agent, email..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 transition-all text-sm bg-gray-50/55 dark:bg-gray-950/40"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          {/* Local Category Filter */}
          <select
            id="vendor-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="block w-full sm:w-48 py-2.5 px-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 cursor-pointer"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Active Status DB Filter */}
          <select
            id="vendor-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full sm:w-44 py-2.5 px-3 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 cursor-pointer"
          >
            <option value="">Status: All States</option>
            <option value="Active">Active Partners Only</option>
            <option value="Inactive">Inactive / Suspended</option>
          </select>
        </div>
      </div>

      {/* Main Vendor Dashboard Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors font-sans">
        {loading && filteredVendors.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-black dark:text-white mb-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Synchronizing corporate logistics registry...</p>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="py-16 text-center bg-gray-50/20 dark:bg-gray-955/5">
            <PlusCircle className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto stroke-[1.5] mb-3" />
            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-200">
              No Supplier Records Match
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed font-sans">
              No registered contracts correspond to your active query filters. Add a brand new vendor profile to seed your pipeline database.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-955/50 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                  <th className="px-6 py-4">Vendor Name / category</th>
                  <th className="px-6 py-4">Expertise Category</th>
                  <th className="px-6 py-4">Payment Terms</th>
                  <th className="px-6 py-4">Contact Agent</th>
                  <th className="px-6 py-4">Phone / Email</th>
                  <th className="px-6 py-4 text-center">Active Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/15 transition-colors border-none font-sans">
                    <td className="px-6 py-4.5">
                      <div>
                        <span className="font-extrabold text-gray-950 dark:text-gray-50 text-sm block tracking-tight font-sans">
                          {vendor.name}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 font-sans">
                          <span className="inline-block bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 text-[9.5px] font-bold px-1.5 py-0.5 rounded uppercase">
                            {vendor.category || 'General'}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 font-medium text-gray-700 dark:text-gray-300 font-sans">
                      {vendor.category || 'General'}
                    </td>
                    <td className="px-6 py-4.5 font-mono">
                      <span className="font-mono text-[11.5px] font-bold text-gray-800 dark:text-gray-200 border border-gray-205 dark:border-gray-800 px-2 py-0.5 rounded bg-gray-50 dark:bg-gray-950">
                        {vendor.payment_terms || 'Net 30'}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 font-sans">
                      <div className="flex items-center gap-1.5 text-gray-800 dark:text-gray-200">
                        <UserCheck className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-semibold">{vendor.contact_person || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 space-y-1 font-mono">
                      <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300">
                        <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="font-mono tracking-tight text-xs font-semibold">{vendor.phone}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-[10.5px]">
                        <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span className="max-w-[150px] truncate leading-none">{vendor.email || 'No email registered'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4.5 text-center font-sans">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase
                        ${vendor.status === 'Active' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30' 
                          : 'bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30'
                        }
                      `}>
                        {vendor.status === 'Active' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-rose-500" /> Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4.5 text-right font-sans">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-semibold font-sans">
                        {/* Toggle Status Button (Deactivate/Activate) */}
                        <button
                          onClick={() => handleToggleStatus(vendor)}
                          className={`p-2 rounded-lg border transition-colors cursor-pointer text-xs flex items-center justify-center gap-1 font-semibold
                            ${vendor.status === 'Active'
                              ? 'text-amber-805 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-950/40 hover:bg-amber-100'
                              : 'text-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-950/40 hover:bg-emerald-100'
                            }
                          `}
                          title={vendor.status === 'Active' ? 'Deactivate Vendor Status' : 'Activate Vendor Status'}
                        >
                          <Power className="h-3.5 w-3.5 shrink-0" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(vendor)}
                          className="p-2 text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg transition-colors cursor-pointer"
                          title="Edit Vendor Details"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(vendor.id, vendor.name)}
                          className="p-2 text-rose-605 dark:text-rose-400 hover:text-rose-900 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-100 dark:border-rose-900/40 rounded-lg transition-colors cursor-pointer"
                          title="Permanently Delete Vendor"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Professional Soft Add / Modify Vendor Slide Modal */}
      {showModal && (
        <div id="vendor-modal-backdrop" className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-gray-150 dark:border-gray-800 animate-fade-in font-sans">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100 dark:border-gray-805">
              <div>
                <h3 className="text-base font-bold text-gray-955 dark:text-gray-105">
                  {modalMode === 'Add' ? 'Add New Vendor Profile' : 'Edit Sourcing Vendor Profile'}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Fields marked as required must be specified before registration.</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-250 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave}>
              <div className="p-6 space-y-4">
                
                {/* Vendor Company Name */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Vendor Company Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="modal-vendor-name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:border-gray-950"
                    placeholder="e.g. BoxCraft Supplies"
                  />
                  {formErrors.name && <p className="text-xs text-rose-600 dark:text-rose-450 font-semibold mt-1">{formErrors.name}</p>}
                </div>

                {/* Category & Payment Terms Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Category Expert Sector <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="modal-vendor-category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-955 text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Payment Terms <span className="text-rose-500">*</span>
                    </label>
                    <select
                      id="modal-vendor-payment-terms"
                      value={formData.payment_terms}
                      onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-955 text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                      {PAYMENT_TERMS.map(term => (
                        <option key={term} value={term}>{term}</option>
                      ))}
                    </select>
                    {formErrors.payment_terms && <p className="text-xs text-rose-605 dark:text-rose-400 font-semibold mt-1">{formErrors.payment_terms}</p>}
                  </div>
                </div>

                {/* Contact Person & Email Address */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Contact Representative
                    </label>
                    <input
                      id="modal-vendor-contact-person"
                      type="text"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:border-gray-950"
                      placeholder="e.g. Sarah Jenkins"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Agent Email Coordinate
                    </label>
                    <input
                      id="modal-vendor-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:border-gray-950"
                      placeholder="e.g. office@boxcraft.com"
                    />
                    {formErrors.email && <p className="text-xs text-rose-600 dark:text-rose-450 font-semibold mt-1">{formErrors.email}</p>}
                  </div>
                </div>

                {/* Phone & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-sans">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="modal-vendor-phone"
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:border-gray-950 font-mono"
                      placeholder="e.g. +1-555-0192"
                    />
                    {formErrors.phone && <p className="text-xs text-rose-600 dark:text-rose-450 font-semibold mt-1">{formErrors.phone}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                      Partnership Status
                    </label>
                    <select
                      id="modal-vendor-status"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-805 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 cursor-pointer"
                    >
                      <option value="Active">Active Supplier Partner</option>
                      <option value="Inactive">Inactive / Suspended</option>
                    </select>
                  </div>
                </div>

                {/* Courier Dispatch address */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                    Warehouse Dispatch Address
                  </label>
                  <textarea
                    id="modal-vendor-address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    rows={2}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 focus:border-gray-955"
                    placeholder="e.g. 102 Industrial Way, Seattle, WA"
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="bg-gray-50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-808 px-6 py-4 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4.5 py-2 border border-gray-200 dark:border-gray-805 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  id="modal-save-btn"
                  type="submit"
                  className="px-4.5 py-2 bg-gray-955 hover:bg-gray-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  {modalMode === 'Add' ? 'Add Vendor Profile' : 'Save Modifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
