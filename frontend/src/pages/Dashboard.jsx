import React, { useEffect, useState } from 'react';
import { 
  Users, 
  FileText, 
  Wallet, 
  Truck, 
  TrendingUp, 
  Calendar,
  AlertCircle,
  Clock,
  ArrowRight
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { api } from '../services/api';

export const Dashboard = ({ setCurrentTab, addToast }) => {
  const [stats, setStats] = useState(null);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const statsRes = await api.get('/dashboard/stats');
        setStats(statsRes.data);

        // Fetch recent pending purchase orders
        const posRes = await api.get('/purchase-orders?status=Pending');
        setPendingOrders(posRes.data.slice(0, 5));
      } catch (err) {
        addToast('Failed to load dashboard metrics.', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <svg className="animate-spin h-8 w-8 text-gray-900" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Compiling financial metrics...</p>
        </div>
      </div>
    );
  }

  // Cards layout
  const statCards = [
    {
      id: "vendors",
      title: 'Total Vendors',
      value: stats?.totalVendors || 0,
      sub: `${stats?.activeVendors || 0} active suppliers`,
      icon: Users,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-300 dark:border-indigo-900/50',
    },
    {
      id: "pos",
      title: 'Open Purchase Orders',
      value: stats?.openPOs || 0,
      sub: 'Awaiting fulfillment',
      icon: FileText,
      color: 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-300 dark:border-amber-900/50',
    },
    {
      id: "outstanding",
      title: 'Outstanding Dues',
      value: formatCurrency(stats?.outstandingAmount || 0),
      sub: 'Calculated balance',
      icon: Wallet,
      color: 'bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/20 dark:text-rose-300 dark:border-rose-900/50',
    },
    {
      id: "deliveries",
      title: 'Delivered Orders',
      value: stats?.deliveredPOs || 0,
      sub: 'All-time fully archived',
      icon: Truck,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-300 dark:border-emerald-900/50',
    },
  ];

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 font-sans">Procurement & Payments Home</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 pb-1">
            Real-time analytics for packaging materials and raw supplier balances.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-3.5 py-2 rounded-xl text-gray-600 dark:text-gray-400 shadow-sm w-fit">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="font-semibold">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
        </div>
      </div>

      {/* Grid of 4 statistic cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              onClick={() => {
                if (card.id === "vendors") setCurrentTab("vendors");
                if (card.id === "pos" || card.id === "deliveries") setCurrentTab("pos");
                if (card.id === "outstanding") setCurrentTab("payments");
              }}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group flex items-start justify-between"
            >
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  {card.title}
                </span>
                <p className="text-2xl font-bold text-gray-950 dark:text-gray-50 tracking-tight group-hover:scale-[1.01] transition-transform">
                  {card.value}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400 block leading-none">
                  {card.sub}
                </span>
              </div>
              <div className={`p-3 rounded-xl border ${card.color} shrink-0`}>
                <Icon className="h-5 w-5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytical Spend Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts monthly spend graph */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-base font-semibold text-gray-950 dark:text-gray-50">Monthly Procurement Spend</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">Trends of aggregate purchase order values</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-lg">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Spend Analytics Active</span>
            </div>
          </div>

          <div className="h-72 w-full pr-4 select-none">
            {stats && stats.monthlySpend && stats.monthlySpend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.monthlySpend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    tickFormatter={(tick) => `₹${tick}`}
                  />
                  <Tooltip 
                    contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value) => [`₹${parseFloat(value).toLocaleString()}`, 'Purchases Amount']}
                    labelStyle={{ color: '#94a3b8', fontWeight: 600 }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="amount" 
                    stroke="#10b981" 
                    strokeWidth={2} 
                    fillOpacity={1} 
                    fill="url(#colorSpend)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-gray-50/50 dark:bg-gray-950/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-xs text-gray-400">No purchase order spend history found.</p>
              </div>
            )}
          </div>
        </div>

        {/* Action Priority Cards */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <div className="space-y-0.5 border-b border-gray-100 dark:border-gray-800 pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-950 dark:text-gray-50 font-sans">Awaiting Delivery</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">POs pending shipment verification</p>
              </div>
              <span className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 font-bold px-2 py-0.5 rounded-full">
                {pendingOrders.length} List
              </span>
            </div>

            <div className="space-y-3 max-h-56 overflow-y-auto">
              {pendingOrders.length === 0 ? (
                <div className="py-6 flex flex-col items-center justify-center text-center text-gray-400">
                  <Clock className="h-8 w-8 text-gray-300 dark:text-gray-700 stroke-[1.5] mb-2" />
                  <p className="text-xs font-medium">All orders safely delivered!</p>
                </div>
              ) : (
                pendingOrders.map((po) => (
                  <div key={po.po_number} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-950 border border-gray-150 dark:border-gray-800 hover:bg-gray-100/70 dark:hover:bg-gray-800 transition-all">
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold text-gray-900 dark:text-gray-100">{po.po_number}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate font-medium">{po.vendor_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold text-gray-950 dark:text-gray-200">{formatCurrency(po.total_amount)}</p>
                      <p className="text-[10px] text-rose-500 font-semibold mt-0.5">Due {new Date(po.expected_delivery_date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button 
            onClick={() => setCurrentTab('pos')}
            className="w-full mt-4 flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-950 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-semibold text-gray-800 dark:text-gray-300 transition-colors cursor-pointer"
          >
            <span>Procure New Raw Materials</span>
            <ArrowRight className="h-4 w-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Notice Banner */}
      <div className="bg-gray-900 dark:bg-gray-900 border border-gray-800 text-white rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest block font-mono">Paper Plane Operations</span>
          <h3 className="text-base font-semibold leading-tight font-sans">Fast-Track Gifting Logistics</h3>
          <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
            Auto-generate professional purchase orders for ribbons, heavy kraft cardboards, cardboard separators, and custom foils. Document partial receipts and lock in advance down payments efficiently.
          </p>
        </div>
        <div className="flex gap-2 relative z-10">
          <button 
            onClick={() => setCurrentTab('vendors')}
            className="px-4 py-2 bg-white text-gray-950 hover:bg-gray-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 animate-fade-in"
          >
            Manage Suppliers
          </button>
          <button 
            onClick={() => setCurrentTab('statements')}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 animate-fade-in"
          >
            Ledger Statements
          </button>
        </div>
        <div className="absolute right-0 bottom-0 translate-x-12 translate-y-8 h-32 w-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
      </div>
    </div>
  );
};
