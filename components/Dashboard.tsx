
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, DashboardStats } from '../types';
import { PIE_COLORS } from '../constants';

interface DashboardProps {
  transactions: Transaction[];
  stats: DashboardStats;
}

export const Dashboard: React.FC<DashboardProps> = ({ transactions, stats }) => {
  
  const categoryData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    const groups: Record<string, number> = {};
    expenses.forEach(t => {
      groups[t.category] = (groups[t.category] || 0) + t.amount;
    });
    return Object.keys(groups).map(key => ({ name: key, value: groups[key] }));
  }, [transactions]);

  const chartData = useMemo(() => {
    // Simple aggregation by date (last 7 unique dates or so)
    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groups: Record<string, number> = {};
    sorted.forEach(t => {
        // Just accumulation for visualization
        if(t.type === 'expense') {
            groups[t.date] = (groups[t.date] || 0) + t.amount;
        }
    });
    return Object.keys(groups).map(date => ({ date, amount: groups[date] }));
  }, [transactions]);

  const isNegative = stats.balance < 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-2xl border shadow-sm transition-colors ${isNegative ? 'bg-rose-950/30 border-rose-900' : 'bg-slate-800 border-slate-700'}`}>
          <div className="flex justify-between items-start">
             <div>
                <p className={`text-sm font-medium mb-1 ${isNegative ? 'text-rose-400' : 'text-slate-400'}`}>Toplam Bakiye</p>
                <h3 className={`text-2xl font-bold ${isNegative ? 'text-rose-500' : 'text-white'}`}>
                    {stats.balance.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
                </h3>
             </div>
             {isNegative && (
                 <div className="p-2 bg-rose-500/20 rounded-lg text-rose-500">
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                 </div>
             )}
          </div>
          {isNegative && <p className="text-xs text-rose-400/70 mt-2">Bütçenizi aştınız!</p>}
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm">
          <p className="text-emerald-400/80 text-sm font-medium mb-1">Toplam Gelir (Maaş Dahil)</p>
          <h3 className="text-2xl font-bold text-emerald-400">
            + {stats.totalIncome.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </h3>
        </div>
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm">
          <p className="text-rose-400/80 text-sm font-medium mb-1">Toplam Gider (Sabit Dahil)</p>
          <h3 className="text-2xl font-bold text-rose-400">
            - {stats.totalExpense.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} ₺
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4">Harcama Dağılımı</h3>
          {categoryData.length > 0 ? (
            <div className="flex-1 w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px', color: '#f1f5f9' }}
                    itemStyle={{ color: '#f1f5f9' }}
                    formatter={(value: number) => `${value.toLocaleString('tr-TR')} ₺`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Harcama verisi yok
            </div>
          )}
        </div>

        {/* Trend Chart */}
        <div className="bg-slate-800 p-6 rounded-2xl border border-slate-700 shadow-sm min-h-[300px] flex flex-col">
          <h3 className="text-lg font-semibold text-white mb-4">Harcama Trendi</h3>
          {chartData.length > 0 ? (
            <div className="flex-1 w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickMargin={10} />
                    <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `${val}₺`} />
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                        itemStyle={{ color: '#818cf8' }}
                    />
                    <Area type="monotone" dataKey="amount" stroke="#6366f1" fillOpacity={1} fill="url(#colorAmount)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
              Veri yok
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
