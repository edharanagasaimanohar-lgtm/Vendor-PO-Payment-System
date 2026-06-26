import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Wallet, 
  Search, 
  Calendar, 
  Hash, 
  ArrowUpRight, 
  CornerDownRight, 
  FileCheck,
  CheckCircle,
  Clock,
  CircleDollarSign,
  Undo2
} from 'lucide-react';
import { api } from '../services/api';

export const Payments = ({ addToast }) => {
  const [payments, setPayments] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter terms
  const [search, setSearch] = useState('');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('');

  // Recording Form toggler
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    po_id: '',
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
      const [paymentsRes, posRes] = await Promise.all([
        api.get('/payments'),
        api.get('/purchase-orders'), // Grabs all POs to map outstanding balances
      ]);
      setPayments(paymentsRes.data);
      // Filter only POs that are active (Not cancelled) and have left dues
      const eligiblePOs = posRes.data.filter((po) => {
        const left = po.total_amount - (po.advance_payment + po.final_payment);
        return po.status !== 'Cancelled' && left > 0;
      });
      setPurchaseOrders(eligiblePOs);
    } catch (err) {
      addToast('Could not fetch payments history.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute stats on fly
  const totalPaidSum = payments.reduce((acc, p) => acc + p.amount, 0);
  const bankTransferSum = payments.filter(p => p.payment_method === 'Bank Transfer').reduce((acc, p) => acc + p.amount, 0);
  const otherChannelsSum = totalPaidSum - bankTransferSum;

  const handlePoChange = (poIdStr) => {
    const poId = parseInt(poIdStr, 10);
    const selected = purchaseOrders.find(p => p.id === poId);
    if (selected) {
      const left = selected.total_amount - (selected.advance_payment + selected.final_payment);
      setForm({
        ...form,
        po_id: poIdStr,
        amount: left.toString(),
        payment_type: selected.advance_payment > 0 ? 'Final' : 'Advance',
      });
    } else {
      setForm({ ...form, po_id: '', amount: '' });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    const payAmt = Number(form.amount);
    if (!form.po_id) {
      addToast('Please select a purchase order reference.', 'error');
      return;
    }
    if (!form.reference_number.trim() || payAmt <= 0) {
      addToast('Disbursed sum must be positive with transactional reference hash.', 'error');
      return;
    }

    try {
      await api.post('/payments', {
        ...form,
        amount: payAmt,
      });
      addToast('New supplier payment transaction registered.', 'success');
      setShowForm(false);
      fetchData();
    } catch (err) {
      addToast('Failed recording payment.', 'error');
    }
  };

  // Filter payments list
  const filteredPayments = payments.filter((payment) => {
    const matchesSearch = 
      (payment.vendor_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (payment.po_number?.toLowerCase() || '').includes(search.toLowerCase()) ||
      (payment.reference_number?.toLowerCase() || '').includes(search.toLowerCase());
    const matchesType = paymentTypeFilter ? payment.payment_type === paymentTypeFilter : true;
    return matchesSearch && matchesType;
  });

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header with trigger button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-950 dark:text-gray-50 font-sans">Payment Transactions</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pb-1">
            Track deposit downpayments and final settlements disbursed to material suppliers.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              if (purchaseOrders.length === 0) {
                addToast('All active purchase orders are currently fully settled!', 'info');
              } else {
                setForm({
                  po_id: purchaseOrders[0].id.toString(),
                  payment_date: new Date().toISOString().split('T')[0],
                  amount: (purchaseOrders[0].total_amount - (purchaseOrders[0].advance_payment + purchaseOrders[0].final_payment)).toString(),
                  payment_type: purchaseOrders[0].advance_payment > 0 ? 'Final' : 'Advance',
                  payment_method: 'Bank Transfer',
                  reference_number: '',
                  notes: '',
                });
              }
              setShowForm(true);
            }}
            className="flex items-center justify-center gap-2 bg-gray-950 hover:bg-gray-800 text-white font-semibold text-sm px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="h-4.5 w-4.5" />
            <span>Record Supplier Payment</span>
          </button>
        )}
      </div>

      {/* Aggregate summaries stat widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4.5 flex items-center justify-between shadow-xs transition-colors">
          <div>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Completed Settlements</span>
            <p className="text-xl font-bold text-gray-950 dark:text-gray-55 tracking-tight mt-1">{formatCurrency(totalPaidSum)}</p>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-305 border border-emerald-100 dark:border-emerald-800/40 rounded-xl">
            <CheckCircle className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4.5 flex items-center justify-between shadow-xs transition-colors">
          <div>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-55 uppercase tracking-wider block">Bank Telegraphic Wires</span>
            <p className="text-xl font-bold text-gray-950 dark:text-gray-55 tracking-tight mt-1">{formatCurrency(bankTransferSum)}</p>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-305 border border-indigo-100 dark:border-indigo-800/40 rounded-xl">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4.5 flex items-center justify-between shadow-xs transition-colors">
          <div>
            <span className="text-xs font-semibold text-gray-400 dark:text-gray-55 uppercase tracking-wider block">Alternate Channels (Card/UPI)</span>
            <p className="text-xl font-bold text-gray-950 dark:text-gray-55 tracking-tight mt-1">{formatCurrency(otherChannelsSum)}</p>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-305 border border-amber-100 dark:border-amber-800/40 rounded-xl">
            <CircleDollarSign className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Dynamic Form to submit payment */}
      {showForm && (
        <form onSubmit={handleRecordPayment} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4 font-sans">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-950 dark:text-gray-50">Record Supplier Payment Receipt</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Document a direct bank transfer or UPI disbursement</p>
            </div>
            <button
               type="button"
               onClick={() => setShowForm(false)}
               className="p-1 text-gray-400 hover:text-gray-750 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
            >
              <Undo2 className="h-5 w-5" />
            </button>
          </div>

          {purchaseOrders.length === 0 ? (
            <div className="py-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/45 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs text-center p-3 animate-fade-in font-sans">
              🎉 Note: All outstanding purchase orders are fully cleared. No pending balance due detected!
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Purchase Order Reference (Left Balance)</label>
                  <select
                    required
                    value={form.po_id}
                    onChange={(e) => handlePoChange(e.target.value)}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                  >
                    <option value="" disabled>-- Select PO to clear balance --</option>
                    {purchaseOrders.map((po) => {
                      const balance = po.total_amount - (po.advance_payment + po.final_payment);
                      return (
                        <option key={po.id} value={po.id}>
                          {po.po_number} ({po.vendor_name}) - Valuation: {formatCurrency(po.total_amount)} (Dues: {formatCurrency(balance)})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Disbursement Amount (₹)</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-mono"
                    placeholder="Enter sum"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Settlement Category</label>
                  <select
                    value={form.payment_type}
                    onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                  >
                    <option value="Advance">Advance (Down payment deposit)</option>
                    <option value="Final">Final (Completion settlement)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Transaction Method</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                  >
                    <option value="Bank Transfer">Telegraphic Bank Transfer</option>
                    <option value="UPI">UPI Mobile Wallet</option>
                    <option value="Card">Direct Credit/Debit Card</option>
                    <option value="Cash">Cash Ledger</option>
                    <option value="Cheque">Standard Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">UTR / Reference Transaction ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TXN-9411-LKJH"
                    value={form.reference_number}
                    onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                    className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">Internal Payment Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Wire confirmation sent to accounts manager"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="mt-2 block w-full border border-gray-200 dark:border-gray-800 rounded-xl px-3.5 py-2.5 text-sm placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-850 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-white font-semibold rounded-xl text-xs cursor-pointer shadow-xs animate-fade-in"
                >
                  Confirm Payment Entry
                </button>
              </div>
            </>
          )}
        </form>
      )}

      {/* Tables search section */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between font-sans">
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <Search className="h-4.5 w-4.5" />
          </div>
          <input
            type="text"
            placeholder="Search by supplier company, po number, or Txn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:border-gray-950 transition-all text-sm bg-gray-50/50 dark:bg-gray-950/40 font-sans"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto">
          <select
            value={paymentTypeFilter}
            onChange={(e) => setPaymentTypeFilter(e.target.value)}
            className="block w-full md:w-44 py-2.5 px-3.5 border border-gray-200 dark:border-gray-800 rounded-xl text-sm font-medium text-gray-750 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-950 bg-white dark:bg-gray-950 cursor-pointer"
          >
            <option value="" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">By Category: All</option>
            <option value="Advance" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Advance Payments Only</option>
            <option value="Final" className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">Final Settlements Only</option>
          </select>
        </div>
      </div>

      {/* History Ledger Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm overflow-hidden transition-colors">
        {loading && filteredPayments.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center">
            <svg className="animate-spin h-8 w-8 text-gray-900 dark:text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">Retrieving transaction ledger...</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto stroke-[1.5] mb-2" />
            <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-200">No Payments Recorded</h3>
            <p className="text-xs text-gray-505 dark:text-gray-400 mt-1 max-w-sm mx-auto leading-relaxed font-sans">
              No financial disbursement transactions match the filters or currently exist.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-950/50 text-gray-500 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                  <th className="px-5 py-4">Transaction Details</th>
                  <th className="px-5 py-4">PO Reference</th>
                  <th className="px-5 py-4">Financial Sum</th>
                  <th className="px-5 py-4">Disbursement Method</th>
                  <th className="px-5 py-4">Txn/UTR Hash</th>
                  <th className="px-5 py-4 text-center">Form Class</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-sm">
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/20 transition-colors">
                    <td className="px-5 py-4 font-sans">
                      <div>
                        <strong className="text-gray-950 dark:text-gray-50 font-semibold block font-sans">{p.vendor_name}</strong>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-1 font-medium font-sans">
                          <Calendar className="h-3.5 w-3.5 text-gray-400" />
                          Disbursed on: {p.payment_date}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      <span className="font-mono font-bold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-850 px-2 py-0.5 rounded border border-gray-150 dark:border-gray-700 text-xs text-center inline-block">
                        {p.po_number || 'N/A'}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono">
                      <div className="flex items-center gap-1 font-extrabold text-gray-950 dark:text-gray-100 font-mono">
                        <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                        <span>{formatCurrency(p.amount)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-sans">
                      <span className="text-xs text-gray-800 dark:text-gray-250 font-semibold">{p.payment_method}</span>
                      {p.notes && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-405 italic max-w-xs truncate mt-0.5 flex items-center gap-1 leading-none select-none font-sans">
                          <CornerDownRight className="h-3 w-3 text-gray-450 shrink-0" />
                          {p.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 font-mono">
                      <span className="font-mono block truncate max-w-[155px] text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <Hash className="h-3 w-3 text-gray-400" />
                        {p.reference_number}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border font-sans
                        ${p.payment_type === 'Advance' 
                          ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900/50' 
                          : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border-emerald-250 dark:border-emerald-900/50'
                        }
                      `}>
                        {p.payment_type === 'Advance' ? (
                          <>
                            <Clock className="h-3 w-3 text-blue-500" /> Advance
                          </>
                        ) : (
                          <>
                            <FileCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Final
                          </>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
