import React, { useEffect, useState, useRef } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Calendar, 
  AlertTriangle,
  Receipt,
  FileCheck2,
  Trash2,
  Boxes,
  Eye,
  Edit2,
  Truck,
  PlusCircle,
  X,
  CreditCard,
  Printer,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

export const PurchaseOrders = ({ addToast, setCurrentTab }) => {
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const printAreaRef = useRef(null);
  
  // Search & Filters state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [vendorFilter, setVendorFilter] = useState('');

  // PO Form states
  const [showPOForm, setShowPOForm] = useState(false);
  const [formMode, setFormMode] = useState('Create');
  const [nextPoNumber, setNextPoNumber] = useState('');
  const [editingPoId, setEditingPoId] = useState(null);

  const [poForm, setPoForm] = useState({
    vendor_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'Pending',
    notes: '',
    items: [{ name: '', qty: 1, price: 0.0 }],
  });

  // Modal actions states
  const [selectedPO, setSelectedPO] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [submittedPaymentResult, setSubmittedPaymentResult] = useState(null);

  // Delivery Form
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    received_by: '',
    delivery_status: 'Fully Delivered',
    delivery_notes: '',
  });

  // Payment Form
  const [paymentForm, setPaymentForm] = useState({
    payment_date: new Date().toISOString().split('T')[0],
    amount: '',
    payment_type: 'Advance',
    payment_method: 'Bank Transfer',
    reference_number: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch POs with filters
      let poUrl = '/purchase-orders';
      const poParams = [];
      if (search) poParams.push(`search=${encodeURIComponent(search)}`);
      if (statusFilter) poParams.push(`status=${statusFilter}`);
      if (vendorFilter) poParams.push(`vendor_id=${vendorFilter}`);
      if (poParams.length > 0) poUrl += `?${poParams.join('&')}`;

      const [posRes, vendorsRes] = await Promise.all([
        api.get(poUrl),
        api.get('/vendors?status=Active'), // Only select active suppliers
      ]);

      setPurchaseOrders(posRes.data);
      setVendors(vendorsRes.data);
    } catch (err) {
      addToast('Could not load procurement list.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(handler);
  }, [search, statusFilter, vendorFilter]);

  const fetchNextPoNumber = async () => {
    try {
      const res = await api.get('/purchase-orders/next-number');
      setNextPoNumber(res.data.poNumber);
    } catch (err) {
      setNextPoNumber('PP-PO-' + new Date().getFullYear() + '-0000');
    }
  };

  const handleOpenCreateForm = () => {
    fetchNextPoNumber();
    setFormMode('Create');
    setEditingPoId(null);
    setPoForm({
      vendor_id: vendors.length > 0 ? vendors[0].id.toString() : '',
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'Pending',
      notes: '',
      items: [{ name: '', qty: 1, price: 0.0 }],
    });
    setShowPOForm(true);
  };

  const handleOpenEditForm = (po) => {
    setFormMode('Edit');
    setEditingPoId(po.id);
    setPoForm({
      vendor_id: po.vendor_id.toString(),
      po_date: po.po_date,
      expected_delivery_date: po.expected_delivery_date,
      status: po.status,
      notes: po.notes || '',
      items: [...po.items],
    });
    setShowPOForm(true);
  };

  // Form manipulation
  const handleAddItemRow = () => {
    setPoForm({
      ...poForm,
      items: [...poForm.items, { name: '', qty: 1, price: 0.0 }],
    });
  };

  const handleRemoveItemRow = (idx) => {
    if (poForm.items.length === 1) return;
    const copied = poForm.items.filter((_, i) => i !== idx);
    setPoForm({ ...poForm, items: copied });
  };

  const handleItemChange = (idx, field, value) => {
    const copied = [...poForm.items];
    copied[idx] = {
      ...copied[idx],
      [field]: field === 'name' ? value : Number(value),
    };
    setPoForm({ ...poForm, items: copied });
  };

  const calculateFormTotal = () => {
    return poForm.items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  };

  const handleSavePO = async (e) => {
    e.preventDefault();
    if (!poForm.vendor_id) {
      addToast('Please select a supplier.', 'error');
      return;
    }
    const invalidItems = poForm.items.some(it => !it.name.trim() || it.qty <= 0 || it.price < 0);
    if (invalidItems) {
      addToast('Please input valid names and positive quantities for all items.', 'error');
      return;
    }

    try {
      if (formMode === 'Create') {
        await api.post('/purchase-orders', poForm);
        addToast('Purchase order saved successfully!', 'success');
      } else {
        await api.put(`/purchase-orders/${editingPoId}`, poForm);
        addToast('Purchase order details updated.', 'success');
      }
      setShowPOForm(false);
      fetchData();
    } catch (err) {
      addToast('Failed to save purchase order.', 'error');
    }
  };

  const handleDeletePO = async (id, number) => {
    if (window.confirm(`Are you sure you want to delete PO "${number}"?`)) {
      try {
        await api.delete(`/purchase-orders/${id}`);
        addToast(`Purchase Order "${number}" deleted.`, 'info');
        fetchData();
      } catch (err) {
        addToast('Failed deleting order.', 'error');
      }
    }
  };

  // Delivery handler
  const handleOpenDelivery = (po) => {
    setSelectedPO(po);
    setDeliveryForm({
      delivery_date: new Date().toISOString().split('T')[0],
      received_by: '',
      delivery_status: 'Fully Delivered',
      delivery_notes: '',
    });
    setShowDeliveryModal(true);
  };

  const handleSubmitDelivery = async (e) => {
    e.preventDefault();
    if (!deliveryForm.received_by.trim()) {
      addToast('Authorized Receiver is required.', 'error');
      return;
    }

    try {
      await api.post('/deliveries', {
        po_id: selectedPO?.id,
        ...deliveryForm,
      });
      addToast('Delivery documented. Purchase order status updated.', 'success');
      setShowDeliveryModal(false);
      fetchData();
    } catch (err) {
      addToast('Filing delivery unsuccessful.', 'error');
    }
  };

  // Payment handler
  const handleOpenPayment = (po) => {
    setSelectedPO(po);
    setSubmittedPaymentResult(null); // Reset results screen
    const balance = po.total_amount - (po.advance_payment + po.final_payment);
    setPaymentForm({
      payment_date: new Date().toISOString().split('T')[0],
      amount: balance > 0 ? balance.toString() : '0',
      payment_type: po.advance_payment > 0 ? 'Final' : 'Advance',
      payment_method: 'Bank Transfer',
      reference_number: '',
      notes: '',
    });
    setShowPaymentModal(true);
  };

  const handleDropdownPoChange = (poId) => {
    const po = purchaseOrders.find(p => p.id == poId);
    if (po) {
      setSelectedPO(po);
      const balance = po.total_amount - (po.advance_payment + po.final_payment);
      setPaymentForm(prev => ({
        ...prev,
        amount: balance > 0 ? balance.toString() : '0',
        payment_type: po.advance_payment > 0 ? 'Final' : 'Advance',
      }));
    }
  };

  const getMaterialText = (po) => {
    if (!po.items || po.items.length === 0) return 'N/A';
    const names = po.items.map(it => it.name).filter(Boolean);
    if (names.length === 0) return 'N/A';
    if (names.length === 1) return names[0];
    return `${names[0]} (+${names.length - 1} more)`;
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const payAmt = Number(paymentForm.amount);
    if (!paymentForm.reference_number.trim() || payAmt <= 0) {
      addToast('Please enter reference number and positive payment sum.', 'error');
      return;
    }

    try {
      const payload = {
        amount: payAmt,
        payment_type: paymentForm.payment_type,
        payment_date: paymentForm.payment_date,
        reference_no: paymentForm.reference_number,
        notes: paymentForm.notes
      };

      const res = await api.post(`/purchase-orders/${selectedPO.id}/payment`, payload);
      
      addToast('Payment recorded successfully.', 'success');
      setSubmittedPaymentResult(res.data);
      fetchData();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.response?.data?.error || 'Unsuccessful payment registration.';
      addToast(errMsg, 'error');
    }
  };

  // Trigger professional print dialog
  const handlePrint = () => {
    if (printAreaRef.current) {
      window.print();
    } else {
      addToast('Document reference is not mounted yet.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      Draft: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700',
      Pending: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/30',
      Open: 'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/30',
      'Partially Paid': 'bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-900/30',
      'Awaiting Delivery': 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/30',
      'Partially Delivered': 'bg-cyan-50 dark:bg-cyan-950/35 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900/30',
      Delivered: 'bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-900/30',
      Settled: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/30',
      Cancelled: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/30',
    };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${map[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Find eligible POs for payment dropdown (Open and Partially Paid POs)
  const eligiblePOs = purchaseOrders.filter(po => {
    return po.status === 'Open' || po.status === 'Partially Paid';
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header section with Create PO Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-955 dark:text-gray-50">Procurement & Purchase Orders</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Build raw materials orders, trigger down payments, and track fulfillment logs.
          </p>
        </div>
        {!showPOForm && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                const firstPO = eligiblePOs[0] || purchaseOrders[0];
                if (firstPO) {
                  handleOpenPayment(firstPO);
                } else {
                  addToast('No eligible purchase orders found.', 'info');
                }
              }}
              className="flex items-center justify-center gap-2 border border-gray-200 dark:border-gray-800 bg-white hover:bg-gray-50 text-gray-900 dark:bg-gray-900 dark:hover:bg-gray-805 dark:text-gray-100 font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CreditCard className="h-4 w-4 text-gray-500" />
              <span>Record Supplier Payment</span>
            </button>
            <button
              onClick={handleOpenCreateForm}
              className="flex items-center justify-center gap-2 bg-gray-955 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-950 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Generate New PO</span>
            </button>
          </div>
        )}
      </div>

      {/* Primary Forms vs Tables Toggle */}
      {showPOForm ? (
        <form onSubmit={handleSavePO} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-955 dark:text-gray-105">
                {formMode === 'Create' ? `Create Procurement: ${nextPoNumber}` : `Edit Procurement Purchase Order`}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-405 mt-0.5">Paper Plane custom materials purchase specifications</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPOForm(false)}
              className="p-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-755 dark:hover:text-gray-250 hover:bg-gray-55 dark:hover:bg-gray-800 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Primary Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Supplier (Active list)</label>
                <select
                  required
                  value={poForm.vendor_id}
                  onChange={(e) => setPoForm({ ...poForm, vendor_id: e.target.value })}
                  className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-900 dark:text-gray-101 cursor-pointer"
                >
                  <option value="" disabled className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">-- Choose Supplier --</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">{v.name} (Representative: {v.contact_person})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">PO Creation Date</label>
                <input
                  type="date"
                  required
                  value={poForm.po_date}
                  onChange={(e) => setPoForm({ ...poForm, po_date: e.target.value })}
                  className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-200 bg-white dark:bg-gray-905 dark:text-gray-101"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Expected Delivery Arrival</label>
                <input
                  type="date"
                  required
                  value={poForm.expected_delivery_date}
                  onChange={(e) => setPoForm({ ...poForm, expected_delivery_date: e.target.value })}
                  className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-955 dark:focus:ring-gray-200 bg-white dark:bg-gray-905 dark:text-gray-101"
                />
              </div>
            </div>

            {/* Status & notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-755 dark:text-gray-300">Fulfillment Workflow State</label>
                <select
                  value={poForm.status}
                  onChange={(e) => setPoForm({ ...poForm, status: e.target.value })}
                  className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-900 dark:text-gray-101 cursor-pointer"
                >
                  <option value="Draft" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Draft (Internal record)</option>
                  <option value="Pending" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Pending Supplier Response</option>
                  <option value="Open" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Open</option>
                  <option value="Partially Paid" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Partially Paid</option>
                  <option value="Awaiting Delivery" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Awaiting Delivery</option>
                  <option value="Partially Delivered" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Partially Delivered</option>
                  <option value="Delivered" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Delivered</option>
                  <option value="Settled" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Settled</option>
                  <option value="Cancelled" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Cancelled Order</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-755 dark:text-gray-300">Fulfillment Details & Remarks</label>
                <input
                  type="text"
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-250 bg-white dark:bg-gray-950 placeholder-gray-400 dark:placeholder-gray-500 dark:text-gray-100"
                  placeholder="e.g. Ribbons for personalized birthday orders bulk batch"
                />
              </div>
            </div>

            {/* Line Items block */}
            <div className="border border-gray-150 dark:border-gray-800 rounded-2xl overflow-hidden shadow-xs">
              <div className="bg-gray-50 dark:bg-gray-955/40 border-b border-gray-150 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-755 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="h-4 w-4 text-gray-500" /> Procurement Line Items & Values
                </span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center gap-1.5 text-xs text-indigo-755 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-3 py-1.5 rounded-lg font-semibold hover:bg-indigo-100 transition-colors cursor-pointer"
                >
                  <PlusCircle className="h-3.5 w-3.5" /> Add New Item Row
                </button>
              </div>

              <div className="p-4 space-y-3.5 max-h-80 overflow-y-auto">
                {poForm.items.map((item, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-gray-55/40 dark:bg-gray-950/20 border border-gray-100 dark:border-gray-808 p-3 rounded-xl">
                    <div className="flex-1 w-full">
                      <label className="block sm:hidden text-[10px] font-bold text-gray-400 pb-1">Item Title</label>
                      <input
                        type="text"
                        required
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-950 placeholder-gray-400 dark:placeholder-gray-600 dark:text-gray-100"
                        placeholder="e.g. Red Satin Ribbons (Rolls)"
                      />
                    </div>

                    <div className="w-full sm:w-28 shrink-0">
                      <label className="block sm:hidden text-[10px] font-bold text-gray-400 pb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className="w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-950 dark:text-gray-100"
                        placeholder="Qty"
                      />
                    </div>

                    <div className="w-full sm:w-36 shrink-0">
                      <label className="block sm:hidden text-[10px] font-bold text-gray-400 pb-1">Unit Price (₹)</label>
                      <div className="relative">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          value={item.price}
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          className="w-full pl-7 pr-3 border border-gray-200 dark:border-gray-800 rounded-xl py-2 text-sm focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-950 dark:text-gray-101"
                          placeholder="Price"
                        />
                      </div>
                    </div>

                    <div className="w-full sm:w-28 font-mono font-bold text-gray-850 dark:text-gray-300 text-right text-sm py-2 px-1">
                      {formatCurrency(item.qty * item.price)}
                    </div>

                    <button
                      type="button"
                      disabled={poForm.items.length === 1}
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-2 text-rose-500 hover:text-rose-800 border border-rose-100 dark:border-rose-900/30 bg-rose-50 dark:bg-rose-950/20 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Totals panel */}
              <div className="bg-gray-50 dark:bg-gray-950/50 border-t border-gray-150 dark:border-gray-808 px-6 py-4 flex items-center justify-between flex-wrap gap-4 select-none">
                <span className="text-xs font-semibold text-gray-550 dark:text-gray-405 font-medium">Total items: {poForm.items.length} units</span>
                <span className="text-sm font-bold text-gray-955 dark:text-gray-100">
                  PO Total Value: <span className="text-lg text-indigo-700 dark:text-indigo-400 font-extrabold">{formatCurrency(calculateFormTotal())}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Form Save/Cancel bar */}
          <div className="bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowPOForm(false)}
              className="px-4 py-2 border border-gray-250 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-gray-955 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-950 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              {formMode === 'Create' ? 'Generate & Save PO' : 'Save Modifications'}
            </button>
          </div>
        </form>
      ) : (
        <>
          {/* Tables Filter Panel */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4 items-center transition-colors">
            {/* Search */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                <Search className="h-4.5 w-4.5" />
              </div>
              <input
                type="text"
                placeholder="Search PO number or notes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-905 dark:text-gray-100 placeholder-gray-405 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 dark:focus:ring-gray-200 bg-gray-50/50 dark:bg-gray-955/40 text-sm"
              />
            </div>

            {/* Filter by Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full py-2.5 px-3.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-750 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-900 cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Workflow Status: All POs</option>
                <option value="Draft" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Draft</option>
                <option value="Pending" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Pending Response</option>
                <option value="Open" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Open</option>
                <option value="Partially Paid" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Partially Paid</option>
                <option value="Awaiting Delivery" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Awaiting Delivery</option>
                <option value="Partially Delivered" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Partially Delivered</option>
                <option value="Delivered" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Delivered</option>
                <option value="Settled" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Settled</option>
                <option value="Cancelled" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Cancelled</option>
              </select>
            </div>

            {/* Filter by Vendor */}
            <div>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="block w-full py-2.5 px-3.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-750 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-955 bg-white dark:bg-gray-900 cursor-pointer"
              >
                <option value="" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">By Supplier: All Vendors</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">{v.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Primary Material Purchase table */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xs overflow-hidden transition-colors">
            {loading && purchaseOrders.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-404 mt-2">Loading procurement records...</p>
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto stroke-[1.5] mb-2" />
                <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-200">No Purchase Orders Created</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  No matching purchase orders registered in our local system. Select "Generate New PO" on top.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto font-sans">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-955/50 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                      <th className="px-5 py-4">PO Number</th>
                      <th className="px-5 py-4">Vendor</th>
                      <th className="px-5 py-4">Material</th>
                      <th className="px-5 py-4">Expected Delivery Date</th>
                      <th className="px-5 py-4">Total Amount</th>
                      <th className="px-5 py-4">Total Paid</th>
                      <th className="px-5 py-4">Balance Due</th>
                      <th className="px-5 py-4 text-center">Status</th>
                      <th className="px-5 py-4 text-center">Overdue Badge</th>
                      <th className="px-5 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-gray-805 text-sm">
                    {purchaseOrders.map((po) => {
                      const amountPaid = po.advance_payment + po.final_payment;
                      const balanceDue = po.total_amount - amountPaid;
                      const today = new Date().toISOString().split('T')[0];
                      const isOverdue = po.expected_delivery_date < today && po.status !== 'Delivered' && po.status !== 'Settled';
                      return (
                        <tr key={po.id} className="hover:bg-gray-55/50 dark:hover:bg-gray-850/10 transition-all font-sans">
                          {/* PO Number */}
                          <td className="px-5 py-4 font-mono font-extrabold text-gray-955 dark:text-gray-50">
                            {po.po_number}
                          </td>

                          {/* Vendor */}
                          <td className="px-5 py-4 font-semibold text-gray-901 dark:text-gray-101">
                            {po.vendor_name}
                          </td>

                          {/* Material */}
                          <td className="px-5 py-4 text-xs text-gray-700 dark:text-gray-300 max-w-[150px] truncate" title={getMaterialText(po)}>
                            {getMaterialText(po)}
                          </td>

                          {/* Expected Delivery Date */}
                          <td className="px-5 py-4 text-xs text-gray-655 dark:text-gray-400">
                            {po.expected_delivery_date}
                          </td>

                          {/* Total Amount */}
                          <td className="px-5 py-4 font-bold text-gray-955 dark:text-gray-50">
                            {formatCurrency(po.total_amount)}
                          </td>

                          {/* Total Paid */}
                          <td className="px-5 py-4 font-semibold text-emerald-800 dark:text-emerald-450">
                            {formatCurrency(amountPaid)}
                          </td>

                          {/* Balance Due */}
                          <td className="px-5 py-4 font-bold">
                            <span className={balanceDue > 0 ? 'text-rose-750 dark:text-rose-450' : 'text-emerald-700 dark:text-emerald-400'}>
                              {formatCurrency(balanceDue)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-5 py-4 text-center">
                            {getStatusBadge(po.status)}
                          </td>

                          {/* Overdue Badge */}
                          <td className="px-5 py-4 text-center">
                            {isOverdue ? (
                              <span className="inline-flex items-center gap-1 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                                Overdue
                              </span>
                            ) : (
                              <span className="text-gray-400 dark:text-gray-600 text-xs">-</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Preview mock PO */}
                              <button
                                onClick={() => { setSelectedPO(po); setShowPreviewModal(true); }}
                                className="p-2 text-indigo-755 hover:text-white hover:bg-indigo-700 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-lg transition-colors cursor-pointer"
                                title="Print Preview PO"
                              >
                                <Eye className="h-4 w-4" />
                              </button>

                              {/* Edit PO parameters */}
                              <button
                                onClick={() => handleOpenEditForm(po)}
                                className="p-2 text-gray-655 dark:text-gray-305 hover:text-gray-950 dark:hover:text-white bg-gray-50 dark:bg-gray-800 hover:bg-gray-150 border border-gray-100 dark:border-gray-700 rounded-lg transition-colors cursor-pointer"
                                title="Edit PO"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>

                              {/* Document Delivery received */}
                              {po.status !== 'Delivered' && (
                                <button
                                  onClick={() => handleOpenDelivery(po)}
                                  className="p-2 text-amber-700 hover:text-white hover:bg-amber-700 bg-amber-50 dark:bg-amber-950/25 rounded-lg transition-colors cursor-pointer border border-amber-100 dark:border-amber-900/30"
                                  title="Confirm Goods Receipts"
                                >
                                  <Truck className="h-4 w-4" />
                                </button>
                              )}

                              {/* Document Payments inline */}
                              {po.total_amount - amountPaid > 0 && po.status !== 'Cancelled' && (
                                <button
                                  onClick={() => handleOpenPayment(po)}
                                  className="p-2 text-emerald-705 hover:text-white hover:bg-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg transition-colors cursor-pointer border border-emerald-100 dark:border-emerald-900/30"
                                  title="Log Payment Action"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </button>
                              )}

                              {/* Delete PO completely */}
                              <button
                                onClick={() => handleDeletePO(po.id, po.po_number)}
                                className="p-2 text-rose-600 hover:bg-rose-100 hover:text-rose-900 bg-rose-50 dark:bg-rose-950/20 rounded-lg transition-colors cursor-pointer"
                                title="Delete PO"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 1. Show Delivery Confirmation Modal */}
      {showDeliveryModal && selectedPO && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-808 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-955 dark:text-gray-100">Filing Delivery Arrivals</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Logging receipt of goods for {selectedPO.po_number}</p>
              </div>
              <button onClick={() => setShowDeliveryModal(false)} className="text-gray-400 dark:text-gray-505 hover:text-gray-600 dark:hover:text-gray-255 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitDelivery}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Fulfillment Verification Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryForm.delivery_date}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_date: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm dark:bg-gray-950 dark:text-gray-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Authorized Receiver Agent Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Doe (Procurement)"
                    value={deliveryForm.received_by}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, received_by: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm dark:bg-gray-950 placeholder-gray-400 dark:placeholder-gray-601 dark:text-gray-101"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-755 dark:text-gray-300">Delivery Receipt Class</label>
                  <select
                    value={deliveryForm.delivery_status}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_status: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-900 dark:text-gray-105 cursor-pointer"
                  >
                    <option value="Partially Delivered" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Partially Delivered (Pending balance)</option>
                    <option value="Fully Delivered" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Fully Delivered (All items verified)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Delivery Log Comments / Remarks</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Received 400 out of 500 boxes. Remainder scheduled."
                    value={deliveryForm.delivery_notes}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_notes: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm dark:bg-gray-950 placeholder-gray-400 dark:placeholder-gray-601 dark:text-gray-101"
                  />
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-955 px-6 py-4 flex gap-2 justify-end border-t border-gray-100 dark:border-gray-808">
                <button type="button" onClick={() => setShowDeliveryModal(false)} className="px-4 py-2 border border-gray-202 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-150">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-gray-955 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-gray-955 rounded-xl text-xs font-semibold cursor-pointer">
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Record Payment Modal */}
      {showPaymentModal && selectedPO && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800 font-sans animate-fade-in">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-808 shrink-0">
              <div>
                <h3 className="text-base font-bold text-gray-955 dark:text-gray-100" id="record-supplier-payment-modal-title">Record Supplier Payment</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Register financial disbursement for procurement entries</p>
              </div>
              <button onClick={() => { setShowPaymentModal(false); setSubmittedPaymentResult(null); }} className="text-gray-450 dark:text-gray-500 hover:text-gray-650 dark:hover:text-gray-300 cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            {submittedPaymentResult ? (
              <div className="p-6 space-y-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                    <Receipt className="h-6 w-6" />
                  </div>
                  <h4 className="text-base font-semibold text-gray-955 dark:text-gray-50">Payment Recorded Successfully</h4>
                  <p className="text-xs text-gray-500 mt-1">Updates applied to {submittedPaymentResult.purchase_order?.po_number || selectedPO.po_number}</p>
                </div>

                <div className="border border-gray-150 dark:border-gray-800 rounded-2xl bg-gray-50 dark:bg-gray-950/50 p-4 space-y-3.5 text-sm select-none">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 dark:text-gray-450 font-medium">Total Amount:</span>
                    <span className="font-extrabold text-gray-900 dark:text-gray-50">
                      {formatCurrency(submittedPaymentResult.purchase_order?.total_amount || selectedPO.total_amount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-gray-150 dark:border-gray-800/60 pt-2.5">
                    <span className="text-gray-500 dark:text-gray-455 font-medium">Total Paid:</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(submittedPaymentResult.total_paid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-gray-150 dark:border-gray-800/60 pt-2.5">
                    <span className="text-gray-500 dark:text-gray-455 font-medium">Balance Due:</span>
                    <span className={`font-black text-sm p-1 rounded-md ${
                      submittedPaymentResult.balance_due > 0 
                        ? 'text-rose-600 dark:text-rose-400 bg-rose-50/55 dark:bg-rose-950/20' 
                        : 'text-emerald-600 dark:text-emerald-400 bg-emerald-50/55 dark:bg-emerald-950/20'
                    }`}>
                      {formatCurrency(submittedPaymentResult.balance_due)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSubmittedPaymentResult(null);
                    fetchData();
                  }}
                  id="payment-summary-done-btn"
                  className="w-full py-2.5 bg-gray-955 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-200 dark:text-gray-950 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitPayment}>
                <div className="p-6 space-y-4">
                  {/* Purchase Order Dropdown showing only Open and Partially Paid POs */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-755 dark:text-gray-300">Target Purchase Order</label>
                    <select
                      required
                      value={selectedPO.id}
                      onChange={(e) => handleDropdownPoChange(e.target.value)}
                      id="payment-po-id-dropdown"
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-901 dark:text-gray-101 focus:outline-none cursor-pointer"
                    >
                      {eligiblePOs.map(po => {
                        const balance = po.total_amount - (po.advance_payment + po.final_payment);
                        return (
                          <option key={po.id} value={po.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                            {po.po_number} | {po.vendor_name} | {formatCurrency(po.total_amount)} | {formatCurrency(balance)}
                          </option>
                        );
                      })}
                      {/* Fallback option if the selected PO is not in the eligiblePOs list */}
                      {!eligiblePOs.some(p => p.id === selectedPO.id) && (
                        <option key={selectedPO.id} value={selectedPO.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
                          {selectedPO.po_number} | {selectedPO.vendor_name} | {formatCurrency(selectedPO.total_amount)} | {formatCurrency(selectedPO.total_amount - (selectedPO.advance_payment + selectedPO.final_payment))}
                        </option>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-755 dark:text-gray-300">Payment Type</label>
                      <select
                        value={paymentForm.payment_type}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_type: e.target.value })}
                        id="payment-type-dropdown"
                        className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-955 text-gray-901 dark:text-gray-101 focus:outline-none cursor-pointer"
                      >
                        <option value="Advance" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Advance</option>
                        <option value="Partial" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Partial</option>
                        <option value="Final" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Final</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Amount Paid (₹)</label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        required
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                        id="payment-amount-input"
                        className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none bg-white dark:bg-gray-950 text-gray-901 dark:text-gray-101"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Payment Date</label>
                      <input
                        type="date"
                        required
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                        id="payment-date-input"
                        className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none bg-white dark:bg-gray-950 text-gray-901 dark:text-gray-101"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Reference Number</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. UTR-4421-OIBY"
                        value={paymentForm.reference_number}
                        onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })}
                        id="payment-reference-input"
                        className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-950 text-gray-901 dark:text-gray-101"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-750 dark:text-gray-300">Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard advance wiring verification"
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                      id="payment-notes-input"
                      className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-950 text-gray-901 dark:text-gray-101"
                    />
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-955 px-6 py-4 flex gap-2 justify-end border-t border-gray-100 dark:border-gray-808 shrink-0">
                  <button type="button" onClick={() => { setShowPaymentModal(false); setSubmittedPaymentResult(null); }} id="payment-cancel-btn" className="px-4 py-2 border border-gray-202 dark:border-gray-800 bg-white dark:bg-gray-900 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-150">
                    Cancel
                  </button>
                  <button type="submit" id="payment-submit-btn" className="px-4 py-2 bg-gray-955 hover:bg-gray-800 text-white dark:bg-white dark:hover:bg-gray-200 dark:text-gray-955 rounded-xl text-xs font-semibold cursor-pointer">
                    Disburse Payment
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
          {/* 3. PRINT PREVIEW MODAL */}
      {showPreviewModal && selectedPO && (
        <div className="fixed inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-905 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-gray-100 dark:border-gray-800 flex flex-col h-[85vh]">
            {/* Modal Actions Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 shrink-0 print:hidden select-none">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-indigo-700 font-bold dark:text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold text-gray-955 dark:text-gray-105">Purchase Order Voucher</h3>
                  <p className="text-[11px] text-gray-505">Inspect full dimensions for print dispatch</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrint}
                  className="bg-indigo-700 hover:bg-indigo-800 text-white font-semibold text-xs px-3.5 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>Print Document</span>
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1 px-2 border border-gray-250 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-650 dark:text-gray-300 rounded-xl hover:bg-gray-55 dark:hover:bg-gray-800 cursor-pointer text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Content Wrapper */}
            <div className="p-8 overflow-y-auto flex-1 font-sans bg-white dark:bg-gray-920 print:p-0 print:overflow-visible">
              <div 
                id="printed-invoice" 
                ref={printAreaRef} 
                className="space-y-6 text-gray-900 dark:text-gray-100 print:text-black print:bg-white print:p-8"
              >
                {/* SAP/Zoho ERP Style Document Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div className="space-y-1">
                    <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase font-mono leading-none print:text-black">
                      PAPER PLANE GIFTS CO.
                    </h1>
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Corporate Procurements & Industrial Materials Logistics
                    </p>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                      1500 Pine Avenue, Corporate Headquarters, Bldg A<br />
                      Seattle, WA 98101 | Tel: +1 (206) 555-0199<br />
                      Tax Registration ID: WA-98101-PPG
                    </p>
                  </div>
                  <div className="text-right space-y-1.5">
                    <span className="inline-block bg-slate-900 text-white text-[10px] font-extrabold px-2.5 py-1 tracking-widest uppercase font-mono print:bg-black print:text-white">
                      PURCHASE ORDER VOUCHER
                    </span>
                    <div className="font-mono pt-1 text-slate-800">
                      <p className="text-xs font-semibold">PO Number: <span className="font-bold text-slate-950 font-sans">{selectedPO.po_number}</span></p>
                      <p className="text-[10px] text-slate-500">Issue Date: {selectedPO.po_date}</p>
                      <p className="text-[10px] text-slate-500">Status: <span className="font-bold uppercase text-slate-800">{selectedPO.status}</span></p>
                    </div>
                  </div>
                </div>

                {/* Sender vs Receiver Info Grid */}
                <div className="grid grid-cols-2 gap-6 text-xs border border-slate-200 p-4 rounded-lg bg-slate-50/55 print:bg-white print:border-slate-300">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">DELIVER & BILL TO (Consolidation Port):</span>
                    <strong className="text-slate-900 font-bold block">Paper Plane Gifting Co.</strong>
                    <p className="text-slate-600 leading-relaxed font-mono text-[10.5px]">
                      Procurement Operations Division,<br />
                      Fulfillment Center Area 4, Dock 12,<br />
                      Seattle, WA 98101<br />
                      Email: procurements@paperplane.com
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono font-bold">PROCURE FROM LICENSED SUPPLIER:</span>
                    <strong className="text-slate-900 font-bold block">{selectedPO.vendor_name}</strong>
                    <p className="text-slate-600 leading-relaxed font-mono text-[10.5px]">
                      Representative Email: {selectedPO.vendor_email}<br />
                      Disbursements & Ledger A/C Registry<br />
                      Supply Chain Warehouse Logistics Portal
                    </p>
                  </div>
                </div>

                {/* Logistics & Delivery Metadata Parameters */}
                <div className="grid grid-cols-3 gap-4 border-y border-slate-300 py-3 text-xs font-mono">
                  <div>
                    <span className="text-slate-450 block font-bold uppercase text-[9px]">EXPECTED ARRIVAL:</span>
                    <span className="font-bold text-slate-900 font-sans text-xs">{selectedPO.expected_delivery_date}</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-bold uppercase text-[9px]">PAYMENT SETTLEMENT TERMS:</span>
                    <span className="font-bold text-slate-900 font-sans text-xs">Standard Milestone Accounts</span>
                  </div>
                  <div>
                    <span className="text-slate-450 block font-bold uppercase text-[9px]">DISPATCH REFERENCE REMARKS:</span>
                    <span className="font-bold text-slate-900 font-sans text-xs truncate block max-w-[150px]">{selectedPO.notes || 'Bulk materials delivery'}</span>
                  </div>
                </div>

                {/* Material Specification Breakdown Table */}
                <div>
                  <table className="w-full text-left font-sans text-xs border border-slate-300">
                    <thead>
                      <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-wider border-b border-slate-300 print:bg-slate-100 print:text-black">
                        <th className="px-3 py-2.5 font-mono">#</th>
                        <th className="px-3 py-2.5">Material Specification Item Description</th>
                        <th className="px-3 py-2.5 text-center font-mono">Qty Requested</th>
                        <th className="px-3 py-2.5 text-right font-mono">Unit Price (INR)</th>
                        <th className="px-3 py-2.5 text-right font-mono">Subtotal Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {selectedPO.items.map((it, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 print:hover:bg-white text-[10.5px]">
                          <td className="px-3 py-3 font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-3 font-medium text-slate-900">{it.name}</td>
                          <td className="px-3 py-3 text-center font-bold font-mono text-slate-800">{it.qty}</td>
                          <td className="px-3 py-3 text-right font-mono text-slate-650">{formatCurrency(it.price)}</td>
                          <td className="px-3 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(it.qty * it.price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Valuation Totals Breakdowns panel */}
                <div className="pt-2 flex justify-end">
                  <div className="w-full sm:w-72 space-y-1.5 text-xs font-mono border border-slate-200 p-3 rounded-lg bg-slate-50/50 print:bg-white print:border-slate-300">
                    <div className="flex items-center justify-between text-slate-705">
                      <span className="uppercase text-[9px] font-bold">Gross Evaluation:</span>
                      <span className="font-bold font-sans text-xs">{formatCurrency(selectedPO.total_amount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-805">
                      <span className="uppercase text-[9px] font-bold">Settled Payments:</span>
                      <span className="font-bold font-sans text-xs">
                        {formatCurrency(selectedPO.advance_payment + selectedPO.final_payment)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-rose-805 border-t border-slate-200 pt-1.5">
                      <span className="uppercase text-[9px] font-bold font-sans text-rose-900">Remaining Balance:</span>
                      <span className="font-bold font-sans text-sm text-rose-900">
                        {formatCurrency(selectedPO.total_amount - (selectedPO.advance_payment + selectedPO.final_payment))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dual Double-Sign off blocks with autographs */}
                <div className="pt-8 grid grid-cols-2 gap-12 text-[10px] text-slate-500 font-mono select-none print:text-black">
                  <div className="text-center">
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[9px] italic text-slate-405 print:text-slate-400 font-sans">Authorized Digital Signature Stamp</span>
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2">
                      <p className="font-bold text-slate-900">Corporate Procurements Sign-off</p>
                      <p className="text-[9px] text-slate-400">Date: ________________________</p>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-10 flex items-end justify-center pb-1">
                      <span className="text-[9px] italic text-slate-405 print:text-slate-400 font-sans">Authorized Vendor Acknowledgement</span>
                    </div>
                    <div className="border-t border-dashed border-slate-400 pt-2">
                      <p className="font-bold text-slate-900">Supplier Authority Stamp</p>
                      <p className="text-[9px] text-slate-400">Seal Signature Acceptance</p>
                    </div>
                  </div>
                </div>

                {/* Company Footer compliant with Requirement 7 */}
                <div className="pt-8 mt-4 border-t border-slate-200 text-center text-[10px] text-slate-404 font-mono leading-none print:text-slate-500 select-none font-sans">
                  Generated by Vendor Payment & Purchase Order Management System
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
