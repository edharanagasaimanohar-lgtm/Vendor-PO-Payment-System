import React, { useEffect, useState } from 'react';
import { 
  FileSpreadsheet, 
  Printer, 
  Users, 
  Download,
  PackageOpen,
  Banknote,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export const VendorStatement = ({ addToast }) => {
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(false);

  // Load vendors list on startup
  useEffect(() => {
    async function loadVendors() {
      try {
        const res = await api.get('/vendors');
        setVendors(res.data);
        if (res.data.length > 0) {
          setSelectedVendorId(res.data[0].id.toString());
        }
      } catch (err) {
        addToast('Could not load vendors dropdown.', 'error');
      }
    }
    loadVendors();
  }, []);

  // Fetch statement on vendor change
  useEffect(() => {
    if (!selectedVendorId) return;

    async function fetchStatement() {
      try {
        setLoading(true);
        const res = await api.get(`/vendors/${selectedVendorId}/statement`);
        setStatement(res.data);
      } catch (err) {
        addToast('Could not generate vendor accounting statement.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchStatement();
  }, [selectedVendorId]);

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header with Print selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden select-none font-sans">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-955 dark:text-gray-50 font-sans">Vendor Statement</h1>
          <p className="text-sm text-gray-450 dark:text-gray-400 mt-1 pb-1">
            Display dual-entry transaction debits and credits with live running outstanding balances.
          </p>
        </div>
        
        {statement && (
          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 bg-indigo-700 hover:bg-indigo-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm animate-fade-in"
            >
              <Printer className="h-4 w-4" />
              <span>Print Statement</span>
            </button>
          </div>
        )}
      </div>

      {/* Selector Dropdown Panel */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-4.5 shadow-sm flex flex-wrap gap-4 items-center justify-between print:hidden font-sans">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 rounded-xl text-gray-600 shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-505 uppercase tracking-widest leading-none mb-1">Target Account Partnership</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="block w-full md:w-72 py-1.5 px-1 bg-transparent border-0 font-bold text-gray-955 dark:text-gray-50 text-sm focus:outline-none focus:ring-0 cursor-pointer"
            >
              <option value="" disabled className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">-- Select Corporate Supplier --</option>
              {vendors.map(v => (
                <option key={v.id} value={v.id} className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">{v.name} (Representative: {v.contact_person})</option>
              ))}
            </select>
          </div>
        </div>

        {statement && (
          <div className="flex gap-4 md:gap-8 justify-end text-xs w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-gray-450 block font-semibold uppercase text-[10px]">Active Status</span>
              <span className={`font-bold mt-1 inline-block ${statement.vendor.status === 'Active' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-450'}`}>
                ● {statement.vendor.status} Supplier
              </span>
            </div>
            <div>
              <span className="text-gray-455 block font-semibold uppercase text-[10px] dark:text-gray-500">Representative Contact</span>
              <span className="font-bold text-gray-850 dark:text-gray-300 block mt-1">{statement.vendor.contact_person}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Statement panel */}
      {loading ? (
        <div className="py-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center shadow-sm">
          <svg className="animate-spin h-8 w-8 text-black dark:text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 mt-2">Computing statement data...</p>
        </div>
      ) : !statement ? (
        <div className="py-16 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 border-dashed rounded-2xl text-center shadow-sm font-sans">
          <FileSpreadsheet className="h-10 w-10 text-gray-300 dark:text-gray-700 mx-auto stroke-[1.5] mb-2" />
          <h3 className="text-sm font-semibold text-gray-955 dark:text-gray-200 font-sans">Select Partner to Load</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
            Choose any company supplier from the dropdown field to analyze dual ledger transcripts.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 sm:p-8 space-y-8 print:p-0 print:border-none print:shadow-none font-sans">
          {/* Print Letterhead layout */}
          <div className="flex justify-between items-start border-b border-gray-100 dark:border-gray-800 pb-5">
            <div>
              <h2 className="text-xl font-bold text-gray-955 dark:text-gray-50 uppercase font-mono tracking-tight leading-none print:text-black">Paper Plane Logistics Ledger</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 print:text-gray-500">Materials Sourcing & Account Disbursements Statement</p>
              <div className="text-[11px] text-gray-500 mt-1 space-y-0.5 select-none print:block">
                <p>Partnership: {statement.vendor.name}</p>
                <p>Email: {statement.vendor.email} | Contact: {statement.vendor.phone}</p>
                <p>Billing Address: {statement.vendor.address}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-gray-400 block uppercase tracking-wide">Statement Compile Date</span>
              <p className="text-xs font-mono font-bold text-gray-955 dark:text-gray-100 mt-1 print:text-black">{new Date().toISOString().split('T')[0]}</p>
            </div>
          </div>

          {/* Quick Balance Summary Box */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-950/20 border border-gray-150 dark:border-gray-808 p-5 rounded-2xl select-none print:bg-white print:border-gray-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Purchase Value</span>
              <p className="text-lg font-mono font-extrabold text-blue-900 dark:text-blue-300 print:text-blue-900">{formatCurrency(statement.total_purchase_value)}</p>
            </div>

            <div className="space-y-1 sm:border-x sm:border-gray-200 dark:sm:border-gray-800 sm:px-6">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Paid</span>
              <p className="text-lg font-mono font-extrabold text-emerald-800 dark:text-emerald-450 print:text-emerald-800">{formatCurrency(statement.total_paid)}</p>
            </div>

            <div className="space-y-1 sm:pl-6 leading-none">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Outstanding</span>
              <p className="text-lg font-mono font-extrabold text-rose-800 dark:text-rose-455 print:text-rose-800">{formatCurrency(statement.total_outstanding)}</p>
            </div>
          </div>

          {/* All Purchase Orders Table */}
          <div>
            <h3 className="text-sm font-bold text-gray-955 dark:text-gray-100 uppercase tracking-widest mb-3 flex items-center gap-1.5 select-none font-sans">
              <PackageOpen className="h-4 w-4" /> ALL PURCHASE ORDERS
            </h3>

            <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
              <table className="w-full text-left border-collapse font-sans text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-950/45 text-gray-600 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-250 dark:border-gray-850 select-none">
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Material Name</th>
                    <th className="px-4 py-3">PO Date</th>
                    <th className="px-4 py-3 text-right">Total Amount</th>
                    <th className="px-4 py-3 text-right">Total Paid</th>
                    <th className="px-4 py-3 text-right">Balance Due</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-4 py-3 text-center">Delivery Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-gray-850 dark:text-gray-300">
                  {statement.purchase_orders.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-gray-400">
                        No purchase orders found for this vendor.
                      </td>
                    </tr>
                  ) : (
                    statement.purchase_orders.map((po, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/10 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold">{po.po_number || 'N/A'}</td>
                        <td className="px-4 py-3 font-semibold">{po.material_name || po.notes || 'Materials'}</td>
                        <td className="px-4 py-3 font-mono text-xs">{po.po_date}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-gray-955 dark:text-gray-50">{formatCurrency(po.total_amount)}</td>
                        <td className="px-4 py-3 text-right font-mono text-emerald-700 dark:text-emerald-400">{formatCurrency(po.total_paid)}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">{formatCurrency(po.balance_due)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${po.status === 'Completed' || po.status === 'Settled' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {po.actual_delivery_date ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1 text-[11px] font-bold">
                              <CheckCircle2 className="h-3 w-3" /> Delivered
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400 text-[11px] font-bold">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History Table */}
          <div>
            <h3 className="text-sm font-bold text-gray-955 dark:text-gray-100 uppercase tracking-widest mb-3 flex items-center gap-1.5 select-none font-sans">
              <Banknote className="h-4 w-4" /> PAYMENT HISTORY
            </h3>

            <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-xl">
              <table className="w-full text-left border-collapse font-sans text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-950/45 text-gray-600 dark:text-gray-400 text-[11px] font-bold uppercase tracking-wider border-b border-gray-250 dark:border-gray-850 select-none">
                    <th className="px-4 py-3">Payment Date</th>
                    <th className="px-4 py-3">PO Number</th>
                    <th className="px-4 py-3">Payment Type</th>
                    <th className="px-4 py-3">Reference Number</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-gray-850 dark:text-gray-300">
                  {statement.payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-gray-400">
                        No payment history found for this vendor.
                      </td>
                    </tr>
                  ) : (
                    statement.payments.map((payment, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/10 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs">{payment.payment_date}</td>
                        <td className="px-4 py-3 font-mono font-bold text-gray-700 dark:text-gray-300">{payment.po_number || 'N/A'}</td>
                        <td className="px-4 py-3">
                          <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 px-2 py-0.5 rounded text-[11px] font-bold">
                            {payment.payment_type}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{payment.reference_no}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(payment.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
};
