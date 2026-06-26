import React, { useEffect, useState } from 'react';
import { 
  Truck, 
  Search, 
  Calendar, 
  User, 
  CheckCircle, 
  Timer,
  Boxes,
  FileCheck2,
  PackageCheck,
  AlertTriangle,
  Send,
  X
} from 'lucide-react';
import { api } from '../services/api';

export const Deliveries = ({ addToast }) => {
  const [deliveries, setDeliveries] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'
  
  // Delivery Confirmation Modal state
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  const [deliveryForm, setDeliveryForm] = useState({
    delivery_date: new Date().toISOString().split('T')[0],
    delivered_qty: '',
    delivery_notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch history
      const resDel = await api.get('/deliveries');
      setDeliveries(resDel.data);

      // Fetch all POs and filter pending ones
      const resPO = await api.get('/purchase-orders');
      const allPOs = resPO.data;
      const today = new Date().toISOString().split('T')[0];
      
      const pending = allPOs.filter(po => 
        (po.status === 'Open' || po.status === 'Partially Paid') &&
        po.expected_delivery_date <= today
      );
      
      // Compute balance for each pending PO by fetching payments
      // Note: A better approach would be the backend providing balance directly, but we will calculate it.
      const pendingWithBalance = await Promise.all(pending.map(async (po) => {
        try {
          const res = await api.get(`/purchase-orders/${po.id}`);
          return {
            ...po,
            balance_due: res.data.balance_due,
            total_paid: res.data.total_paid
          };
        } catch (e) {
          return { ...po, balance_due: po.total_amount, total_paid: 0 };
        }
      }));

      setPendingOrders(pendingWithBalance);
    } catch (err) {
      addToast('Failed to load tracking logs.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConfirmDelivery = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/purchase-orders/${selectedPO.id}/deliver`, {
        delivery_date: deliveryForm.delivery_date,
        delivered_qty: Number(deliveryForm.delivered_qty) || 1,
        delivery_notes: deliveryForm.delivery_notes
      });
      addToast('Delivery confirmed successfully!', 'success');
      setIsConfirmModalOpen(false);
      fetchData(); // Refresh all datatables
    } catch (error) {
      addToast(error.response?.data?.error || 'Failed to confirm delivery.', 'error');
    }
  };

  const openConfirmModal = (po) => {
    setSelectedPO(po);
    setDeliveryForm({
      delivery_date: new Date().toISOString().split('T')[0],
      delivered_qty: po.items && po.items.length > 0 ? po.items[0].qty : '',
      delivery_notes: ''
    });
    setIsConfirmModalOpen(true);
  };

  // Compute metrics
  const fullyDeliveredLogsCount = deliveries.filter(d => d.delivery_status === 'Fully Delivered').length;
  const partialFulfillments = deliveries.length - fullyDeliveredLogsCount;

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50 font-sans">Materials Delivery</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pb-1">
          Review shipment receipts, quality notes, and confirm incoming deliveries.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'pending' ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 dark:border-indigo-500' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
        >
          <Timer className="h-4 w-4" /> Pending Expected Deliveries
          <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 py-0.5 px-2 rounded-full text-[10px] ml-1">{pendingOrders.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 py-3 px-6 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-emerald-600 text-emerald-700 dark:text-emerald-400 dark:border-emerald-500' : 'border-transparent text-gray-500 hover:text-gray-900 dark:hover:text-gray-300'}`}
        >
          <CheckCircle className="h-4 w-4" /> Delivery History Logs
        </button>
      </div>

      {/* Pending Deliveries Tab */}
      {activeTab === 'pending' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
          {loading ? (
             <div className="py-20 flex flex-col items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-sm font-medium text-gray-500 mt-2">Scanning active orders...</p>
            </div>
          ) : pendingOrders.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-500 mx-auto stroke-[1.5] mb-2" />
              <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-200">No Pending Deliveries</h3>
              <p className="text-xs text-gray-505 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed">
                All expected orders up to today have been confirmed.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-950/50 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                    <th className="px-5 py-4">PO Number</th>
                    <th className="px-5 py-4">Vendor Name</th>
                    <th className="px-5 py-4">Material Name</th>
                    <th className="px-5 py-4">Expected Date</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Balance Due</th>
                    <th className="px-5 py-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-sm">
                  {pendingOrders.map(po => (
                    <tr key={po.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition-colors">
                      <td className="px-5 py-4 font-mono font-bold text-xs">{po.po_number}</td>
                      <td className="px-5 py-4 font-bold text-gray-900 dark:text-gray-100">{po.vendor_name}</td>
                      <td className="px-5 py-4">{po.material_name || po.notes || 'Materials'}</td>
                      <td className="px-5 py-4 text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1.5"><AlertTriangle className="h-3 w-3" /> {po.expected_delivery_date}</td>
                      <td className="px-5 py-4">
                        <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[11px] font-bold border border-indigo-200">{po.status}</span>
                      </td>
                      <td className="px-5 py-4 text-right font-mono font-bold">{formatCurrency(po.balance_due)}</td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => openConfirmModal(po)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <FileCheck2 className="h-3.5 w-3.5" /> Confirm Delivery
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* History logs tab */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
            <div className="overflow-x-auto font-sans">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-950/50 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                    <th className="px-5 py-4">Receipt Date</th>
                    <th className="px-5 py-4">Purchase Reference</th>
                    <th className="px-5 py-4">Vendor Partner</th>
                    <th className="px-5 py-4">Fulfillment Reception Notes</th>
                    <th className="px-5 py-4">Fulfillment Agent</th>
                    <th className="px-5 py-4 text-center">Receipt Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-sm">
                  {deliveries.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-900 dark:text-gray-200 font-semibold">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{log.delivery_date}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-mono font-bold text-gray-950 dark:text-gray-100 bg-gray-100 dark:bg-gray-850 px-2 py-0.5 rounded border border-gray-150 dark:border-gray-700 text-xs">
                          {log.po_number || 'N/A'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-gray-950 dark:text-gray-50 block">{log.vendor_name || 'N/A'}</span>
                      </td>
                      <td className="px-5 py-4 max-w-xs font-sans">
                        {log.delivery_notes ? (
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic pr-4 pl-1 border-l-2 border-indigo-400 dark:border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10 py-0.5">
                            "{log.delivery_notes}"
                          </p>
                        ) : (
                          <span className="text-xs text-gray-400 dark:text-gray-550">Regular check-in</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-sans">
                        <div className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-350">
                          <User className="h-3.5 w-3.5 text-gray-400" />
                          <span>{log.received_by}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border
                          ${log.delivery_status === 'Fully Delivered' 
                            ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-150 dark:border-emerald-900/40' 
                            : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border-indigo-150 dark:border-indigo-900/40'
                          }
                        `}>
                          {log.delivery_status === 'Fully Delivered' ? (
                            <>
                              <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Fully Delivered
                            </>
                          ) : (
                            <>
                              <Boxes className="h-3.5 w-3.5 text-indigo-500" /> Partially Delivered
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        </div>
      )}

      {/* Confirm Delivery Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 dark:bg-black/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-xl overflow-hidden border border-gray-150 dark:border-gray-800">
            <div className="px-6 py-5 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-950/50">
              <div className="flex items-center gap-2.5">
                <div className="bg-emerald-100 dark:bg-emerald-900/40 p-2 rounded-xl text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-955 dark:text-gray-100">Confirm Delivery</h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">PO Ref: {selectedPO?.po_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsConfirmModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmDelivery} className="p-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Delivery Date</label>
                  <input
                    type="date"
                    required
                    value={deliveryForm.delivery_date}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_date: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm font-mono focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Delivered Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={deliveryForm.delivered_qty}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, delivered_qty: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none font-mono"
                    placeholder="Enter items received..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400">Delivery Notes</label>
                  <textarea
                    rows="3"
                    value={deliveryForm.delivery_notes}
                    onChange={(e) => setDeliveryForm({ ...deliveryForm, delivery_notes: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 focus:outline-none"
                    placeholder="Any inspection flags or receiving notes..."
                  />
                </div>
              </div>

              <div className="mt-8 flex items-center justify-end gap-3 pt-6 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-colors"
                >
                  <Send className="h-4 w-4" /> Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
