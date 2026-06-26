import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Award, 
  Calendar, 
  ShoppingBag,
  Sparkles,
  Percent,
  XCircle,
  Truck,
  Coins
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { api } from '../services/api';

export const Reports = ({ addToast }) => {
  const [monthlySpend, setMonthlySpend] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active Report sub-tab selector
  const [activeReportTab, setActiveReportTab] = useState('spend');

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const [spendRes, perfRes] = await Promise.all([
          api.get('/reports/monthly-spend'),
          api.get('/reports/vendor-performance'),
        ]);
        setMonthlySpend(spendRes.data);
        setPerformance(perfRes.data);
      } catch (err) {
        addToast('Could not load operational reports metadata.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Helper to resolve month names nicely
  const getMonthName = (monthStr) => {
    if (!monthStr) return '';
    const parts = monthStr.split('-');
    if (parts.length < 2) return monthStr;
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const idx = parseInt(parts[1], 10) - 1;
    return `${months[idx]} ${parts[0]}`;
  };

  // Quick statistics aggregates on client side
  const cumulativeAllTimeSpend = performance.reduce((acc, p) => acc + p.total_spend, 0);
  const totalPurchaseOrdersCount = performance.reduce((acc, p) => acc + p.total_orders, 0);
  const totalDeliveredOrdersCount = performance.reduce((acc, p) => acc + p.delivered_orders, 0);
  const avgFulfillmentRate = totalPurchaseOrdersCount > 0 ? (totalDeliveredOrdersCount / totalPurchaseOrdersCount * 100) : 0;

  // Pie chart theme colors
  const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4', '#8b5cf6'];

  // Data processing helpers
  const getAggregatedMonthlySpend = () => {
    const map = {};
    monthlySpend.forEach(row => {
      const key = row.month_str;
      map[key] = (map[key] || 0) + row.total_amount;
    });
    return Object.entries(map)
      .map(([month_str, amount]) => ({
        month_str,
        monthName: getMonthName(month_str),
        amount
      }))
      .sort((a, b) => a.month_str.localeCompare(b.month_str));
  };

  const getVendorSpendShare = () => {
    const map = {};
    monthlySpend.forEach(row => {
      map[row.vendor_name] = (map[row.vendor_name] || 0) + row.total_amount;
    });
    return Object.entries(map).map(([vendor, amount]) => ({
      name: vendor,
      value: amount
    }));
  };

  const getFulfillmentPrecisionData = () => {
    return performance.map(row => {
      const total = row.total_orders || 0;
      const rate = total > 0 ? (row.delivered_orders / total * 100) : 0;
      return {
        name: row.vendor_name,
        'Accuracy Rate (%)': parseFloat(rate.toFixed(1)),
        'Total Orders': total,
        'Delivered': row.delivered_orders || 0
      };
    });
  };

  const getDeliveryBreakdownData = () => {
    return performance.map(row => ({
      name: row.vendor_name,
      Delivered: row.delivered_orders || 0,
      Pending: row.partial_orders || 0,
      Cancelled: row.cancelled_orders || 0
    }));
  };

  const spendTrendData = getAggregatedMonthlySpend();
  const spendShareData = getVendorSpendShare();
  const performanceRateData = getFulfillmentPrecisionData();
  const performanceBreakdownData = getDeliveryBreakdownData();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-955 dark:text-gray-50 font-sans">Spend Intelligence</h1>
          <p className="text-sm text-gray-550 dark:text-gray-400 mt-1 pb-1">
            Analyze corporate raw materials budgets, expenditure summaries, and vendor delivery precision.
          </p>
        </div>

        {/* Toggle selectors list */}
        <div className="flex border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 p-1 rounded-xl shrink-0 select-none">
          <button
            onClick={() => setActiveReportTab('spend')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2
              ${activeReportTab === 'spend' 
                ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950 shadow-sm shadow-gray-950/10' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-150/35'
              }
            `}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>Spend Analysis</span>
          </button>
          <button
            onClick={() => setActiveReportTab('performance')}
            className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all flex items-center gap-2
              ${activeReportTab === 'performance' 
                ? 'bg-gray-950 dark:bg-white text-white dark:text-gray-950 shadow-sm shadow-gray-950/10' 
                : 'text-gray-500 hover:text-gray-805 hover:bg-gray-150/35'
              }
            `}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Supplier Performance</span>
          </button>
        </div>
      </div>

      {/* Analytics stat cubes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 select-none font-sans">
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex items-center justify-between shadow-sm transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Cumulative Expenditure</span>
            <p className="text-lg font-mono font-extrabold text-blue-900 dark:text-blue-300 leading-none">{formatCurrency(cumulativeAllTimeSpend)}</p>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block pt-1.5 font-medium">All-time settled procurement</span>
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 text-blue-805 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 rounded-xl">
            <Coins className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex items-center justify-between shadow-sm transition-colors">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Gross Orders Issued</span>
            <p className="text-lg font-mono font-extrabold text-indigo-900 dark:text-indigo-300 leading-none">{totalPurchaseOrdersCount} POs</p>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block pt-1.5 font-medium">Packaging materials orders</span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 rounded-xl">
            <ShoppingBag className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 flex items-center justify-between shadow-sm transition-colors">
          <div className="space-y-1 col-span-1">
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Average Fulfillment Ratio</span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-mono font-extrabold text-emerald-805 dark:text-emerald-400 leading-none">{avgFulfillmentRate.toFixed(1)}%</span>
              <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 font-bold px-1 rounded">Benchmark</span>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 block pt-1.5 font-medium">Delivered vs Outstanding</span>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-355 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
            <Percent className="h-5 w-5" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-24 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl flex flex-col items-center justify-center">
          <svg className="animate-spin h-8 w-8 text-black dark:text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-2">Computing intelligence data...</p>
        </div>
      ) : activeReportTab === 'spend' ? (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 select-none animate-fade-in font-sans">
            {/* Area Chart block */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-bold text-gray-905 dark:text-white font-sans">Aggregate Procurement Trend</h3>
                <p className="text-xs text-gray-450 dark:text-gray-400">Total monthly sourcing expenditure across categories</p>
              </div>

              <div className="h-64 w-full pr-4 select-none">
                {spendTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={spendTrendData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-gray-800" />
                      <XAxis 
                        dataKey="monthName" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                        tickFormatter={(v) => `₹${v / 1000}k`}
                      />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                        formatter={(value) => [`₹${parseFloat(value).toLocaleString()}`, 'Total Spend']}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#4f46e5" 
                        strokeWidth={2.5} 
                        fillOpacity={1} 
                        fill="url(#spendGrad)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <p className="text-xs text-gray-450">No monthly trends tracked.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Donut Chart block */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-805 rounded-2xl p-5 shadow-sm flex flex-col justify-between space-y-4 select-none">
              <div>
                <h3 className="text-sm font-bold text-gray-905 dark:text-white">Supplier Budget Allocation</h3>
                <p className="text-xs text-gray-450">Share of financial invoices per corporate vendor</p>
              </div>

              <div className="h-52 w-full flex items-center justify-center relative">
                {spendShareData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={spendShareData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {spendShareData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                        formatter={(value) => [`₹${parseFloat(value).toLocaleString()}`, 'All-time Spend']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-gray-400">No share metrics available.</p>
                )}
              </div>

              {/* Custom Legend */}
              <div className="flex flex-wrap justify-center gap-x-3.5 gap-y-1.5 text-[10px] text-gray-500 font-semibold pt-2 border-t border-gray-100 dark:border-gray-800 uppercase tracking-wide">
                {spendShareData.map((d, index) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate max-w-[85px]">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sourcing Grid */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 space-y-4 transition-colors font-sans">
            <div className="border-b border-gray-100 dark:border-gray-850 pb-3">
              <h3 className="text-base font-bold text-gray-950 dark:text-gray-50 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-700 dark:text-indigo-455" /> Monthly Spend Analytics Breakdown
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Sourcing budgets aggregated by Month-Year and Corporate Vendor</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-950/40 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                    <th className="px-5 py-3">Procurement Cycle Month</th>
                    <th className="px-5 py-3">Partner Supplier Organization</th>
                    <th className="px-5 py-3 text-center">Requisitions Count</th>
                    <th className="px-5 py-3 text-right">Aggregate Spend Values</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs">
                  {monthlySpend.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-gray-400">
                        No purchase records registered for spend aggregation.
                      </td>
                    </tr>
                  ) : (
                    monthlySpend.map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/10 transition-colors border-none">
                        <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5 select-none font-sans">
                          <Calendar className="h-4 w-4 text-gray-405" />
                          {getMonthName(row.month_str)}
                        </td>
                        <td className="px-5 py-3.5">
                          <strong className="text-gray-950 dark:text-gray-50 font-bold font-sans">{row.vendor_name}</strong>
                        </td>
                        <td className="px-5 py-3.5 text-center font-semibold font-sans">
                          <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-300 px-2 py-0.5 border border-indigo-150 dark:border-indigo-900/30 rounded">
                            {row.po_count} Orders
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-extrabold text-blue-900 dark:text-blue-300 text-sm">
                          {formatCurrency(row.total_amount)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Performance Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 select-none animate-fade-in font-sans">
            {/* Fulfillment Accuracy bar chart */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-808 rounded-2xl p-5 shadow-sm space-y-4 select-none animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-gray-905 dark:text-white">Fulfillment Success Precision (%)</h3>
                <p className="text-xs text-gray-450">Percentage of purchase orders fully delivered within specified SLAs</p>
              </div>

              <div className="h-64 w-full pr-4 select-none">
                {performanceRateData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceRateData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-gray-800" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                        domain={[0, 100]}
                        unit="%"
                      />
                      <Tooltip 
                        contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }}
                        formatter={(v) => [`${v}%`, 'Fulfillment precision']}
                      />
                      <Bar dataKey="Accuracy Rate (%)" radius={[8, 8, 0, 0]} maxBarSize={38}>
                        {performanceRateData.map((entry, index) => {
                          const rate = entry['Accuracy Rate (%)'];
                          const color = rate >= 80 ? '#10b981' : rate >= 50 ? '#f59e0b' : '#f43f5e';
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <p className="text-xs text-gray-450">No performance metrics generated.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Workflow states breakdown stacked chart */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4 select-none animate-fade-in">
              <div>
                <h3 className="text-sm font-bold text-gray-905 dark:text-white font-sans">SLA Logistics Breakdown</h3>
                <p className="text-xs text-gray-455">Disbursed material orders sorted by delivery class</p>
              </div>

              <div className="h-64 w-full pr-4 select-none">
                {performanceBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceBreakdownData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" className="dark:stroke-gray-800" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 500 }} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 500 }}
                      />
                      <Tooltip contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '11px' }} />
                      <Legend iconSize={8} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      <Bar dataKey="Delivered" stackId="states" fill="#10b981" />
                      <Bar dataKey="Pending" stackId="states" fill="#f59e0b" />
                      <Bar dataKey="Cancelled" stackId="states" fill="#f43f5e" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full w-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-800 rounded-xl">
                    <p className="text-xs text-gray-400">No breakdowns available.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-6 space-y-4 transition-colors font-sans">
            <div className="border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between font-sans">
              <div>
                <h3 className="text-base font-bold text-gray-955 dark:text-gray-50 flex items-center gap-2">
                  <Award className="h-5 w-5 text-indigo-700" /> Supplier Reliability & Precision Report
                </h3>
                <p className="text-xs text-gray-500 mt-0.5 font-medium dark:text-gray-400">Evaluation metrics mapping delivery speed versus cancellation rates</p>
              </div>
              <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/40 text-indigo-800 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                <Sparkles className="h-3 w-3 animate-spin" /> QA Approved
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-955/40 text-gray-400 text-[10px] font-bold uppercase tracking-wider border-b border-gray-150 dark:border-gray-800">
                    <th className="px-5 py-3">Supplier Name</th>
                    <th className="px-5 py-3 text-center">Total Orders</th>
                    <th className="px-5 py-3 text-center">Fulfillment States Breakdown</th>
                    <th className="px-5 py-3 text-right">All-Time Spend</th>
                    <th className="px-5 py-3 text-right">Delivery Fulfillment precision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-xs">
                  {performance.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-400">
                        No supplier operational history found.
                      </td>
                    </tr>
                  ) : (
                    performance.map((row) => {
                      const total = row.total_orders || 0;
                      const rate = total > 0 ? (row.delivered_orders / total * 100) : 0;
                      return (
                        <tr key={row.vendor_id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/10 transition-colors border-none font-sans">
                          <td className="px-5 py-4">
                            <strong className="text-gray-955 dark:text-gray-50 font-bold block">{row.vendor_name}</strong>
                            <span className="text-[10px] text-gray-400 dark:text-gray-505 block mt-0.5 italic">Ecopack Materials logistics Partner</span>
                          </td>
                          <td className="px-5 py-4 text-center font-semibold font-mono text-gray-850 dark:text-gray-200">
                            {total}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex justify-center items-center gap-2 flex-wrap font-sans">
                              <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/30 rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 leading-none">
                                <Truck className="h-3 w-3 font-semibold text-emerald-500" /> Delivered: {row.delivered_orders || 0}
                              </span>
                              <span className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/30 rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 leading-none">
                                <ShoppingBag className="h-3 w-3 text-amber-500" /> Partner Paid: {row.partial_orders || 0}
                              </span>
                              <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/30 rounded px-1.5 py-0.5 text-[10px] font-bold flex items-center gap-1 leading-none">
                                <XCircle className="h-3 w-3 text-rose-500" /> Cancelled: {row.cancelled_orders || 0}
                              </span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-gray-900 dark:text-gray-100">
                            {formatCurrency(row.total_spend || 0)}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex flex-col items-end gap-1 select-none font-sans">
                              <span className={`font-mono font-bold text-xs
                                ${rate >= 80 ? 'text-emerald-700 dark:text-emerald-400' : rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600'}
                              `}>
                                {rate.toFixed(1)}% precision
                              </span>
                              {/* Visual Progress Bar */}
                              <div className="w-24 bg-gray-150 dark:bg-gray-800 h-1.5 rounded-full overflow-hidden border border-gray-100/50 dark:border-gray-900/20">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300
                                    ${rate >= 80 ? 'bg-emerald-500' : rate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}
                                  `}
                                  style={{ width: `${rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
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
