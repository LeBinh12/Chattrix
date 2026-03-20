import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
  Legend,
  LabelList
} from 'recharts';
import { ArrowLeft, BarChart3, Activity, Zap, HardDrive, CheckCircle2, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ========================
// Types & Data
// ========================

interface TestScenario {
  name: string;
  users: number;
  throughput: number;
  memory: number;
  cpu: number;
  successRate: number;
  connectionsSucceeded?: string;
}

const BENCHMARKS: TestScenario[] = [
  { name: 'Benchmark 1k', users: 1000, throughput: 1841.7, memory: 296, cpu: 12.4, successRate: 100, connectionsSucceeded: '1000 / 1000' },
  { name: 'Benchmark 5k', users: 5000, throughput: 5808.8, memory: 744, cpu: 45.8, successRate: 100, connectionsSucceeded: '5000 / 5000' },
  { name: 'Benchmark 7k', users: 7000, throughput: 4587.2, memory: 1333, cpu: 82.1, successRate: 99.68, connectionsSucceeded: '6977 / 7000' },
];

const BRAND_COLOR = "#00568c";

// ========================
// Sub-Components
// ========================

interface ChartCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  description?: string;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, icon, children, description }) => (
  <div className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-xl bg-slate-50 text-brand-600 border border-slate-100">
        {icon}
      </div>
      <div>
        <h3 className="text-slate-900 font-semibold text-sm uppercase tracking-wider">{title}</h3>
        {description && <p className="text-slate-500 text-xs font-medium">{description}</p>}
      </div>
    </div>
    <div className="h-[300px] w-full">
      {children}
    </div>
  </div>
);

// ========================
// Main Component
// ========================

const TestComparisonReport: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = React.useState<TestScenario[]>([]);

  React.useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('test_comparison_history') || '[]');
      setHistory(saved);
    } catch (e) {
      console.error('Failed to load history', e);
    }
  }, []);

  const allData = [...BENCHMARKS, ...history];
  const stableScenarios = allData.filter(d => d.users < 8000);
  const unstableScenarios = allData.filter(d => d.users >= 8000);

  const clearHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử chạy test?')) {
      localStorage.removeItem('test_comparison_history');
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-10 font-roboto">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <button 
              onClick={() => navigate('/testing')}
              className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-brand-600 transition-all shadow-sm active:scale-95"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="text-brand-600" size={24} />
                <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Báo cáo So sánh Kịch bản</h1>
              </div>
              <p className="text-slate-500 font-bold text-sm">Phân tích hiệu năng hệ thống qua các ngưỡng tải khác nhau</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
             <div className="px-4 py-2 bg-brand-50 text-brand-600 rounded-xl text-xs font-semibold uppercase tracking-widest border border-brand-100 flex items-center gap-2">
               <Activity size={14} /> {allData.length} Kịch bản
             </div>
             {history.length > 0 && (
               <button 
                onClick={clearHistory}
                className="px-4 py-2 bg-slate-50 text-slate-400 hover:text-rose-600 rounded-xl text-xs font-semibold uppercase tracking-widest border border-slate-100 transition-colors"
               >
                 Xóa Lịch sử
               </button>
             )}
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* 1. Throughput Chart */}
          <ChartCard 
            title="Sơ đồ so sánh Lưu lượng" 
            description="Thông lượng tin nhắn (msg/s) dựa trên số lượng người dùng"
            icon={<Zap size={18} />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={allData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  label={{ value: 'msg/s', angle: -90, position: 'insideLeft', fontSize: 12, fontWeight: 'bold' }}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                />
                <Bar 
                  dataKey="throughput" 
                  radius={[8, 8, 0, 0]} 
                  barSize={40}
                >
                  <LabelList 
                    dataKey="throughput" 
                    position="top" 
                    fill="#0f172a" 
                    fontSize={10} 
                    fontWeight="black" 
                    formatter={(v: any) => `${Math.round(v).toLocaleString()}`}
                  />
                  {allData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.users >= 10000 ? '#ef4444' : (entry.users === 5000 ? BRAND_COLOR : `${BRAND_COLOR}80`)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Memory Usage Chart */}
          <ChartCard 
            title="Tiêu thụ Bộ nhớ" 
            description="Sử dụng RAM (MB) tỷ lệ thuận với số lượng Connection"
            icon={<HardDrive size={18} />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={allData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Area 
                  type="monotone" 
                  dataKey="memory" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorMem)" 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                >
                  <LabelList 
                    dataKey="memory" 
                    position="top" 
                    offset={10}
                    fill="#065f46" 
                    fontSize={10} 
                    fontWeight="bold" 
                    formatter={(v: any) => `${v ?? 0} MB`}
                  />
                </Area>
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Success Rate Chart */}
          <ChartCard 
            title="Tỷ lệ Thành công" 
            description="Độ tin cậy của hệ thống dưới áp lực tải cao"
            icon={<CheckCircle2 size={18} />}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={allData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis domain={[80, 100]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Line 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#ef4444" 
                  strokeWidth={3} 
                  dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }}
                >
                  <LabelList 
                    dataKey="successRate" 
                    position="top" 
                    offset={10}
                    fill="#991b1b" 
                    fontSize={10} 
                    fontWeight="black" 
                    formatter={(v: any) => `${v ?? 0}%`}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Combined View Card - Summary Info */}
          <div className="bg-white border border-slate-200 rounded-[2rem] p-8 flex flex-col justify-between shadow-sm">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4 border border-brand-100">
                <LayoutDashboard size={24} />
              </div>
              <h3 className="text-2xl font-semibold leading-tight text-slate-900">Tổng quan Phân tích</h3>
              <p className="text-slate-600 text-sm font-medium leading-relaxed">
                Hệ thống đạt đỉnh hiệu suất tại <span className="text-brand-600 font-bold underline decoration-brand-200 underline-offset-4">5,000 Users</span> với thông lượng tin nhắn vượt mức 5,800 msg/s.
                Ở mức <span className="text-rose-600 font-bold">10,000 Users</span>, hệ thống trở nên <span className="italic">không ổn định</span>: Thông lượng giảm mạnh xuống ~3,000 msg/s, tỷ lệ thành công rớt xuống dưới 90% và tài nguyên RAM bị chiếm dụng gần 2GB.
              </p>
            </div>
            
            <div className="pt-8 grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Peak Performance</p>
                <p className="text-xl font-semibold text-brand-600">5.8k msg/s</p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">Max Stability</p>
                <p className="text-xl font-semibold text-slate-900">5,000 Users</p>
              </div>
            </div>
          </div>

        </div>

        {/* Stable Scenarios Table */}
        <div className="space-y-6 pt-10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
              <CheckCircle2 size={20} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-800">Kịch bản Hiệu năng Ổn định (1k - 7k Users)</h2>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-sm overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-8 py-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Kịch bản</th>
                  <th className="px-8 py-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Kết nối thành công</th>
                  <th className="px-8 py-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Lưu lượng</th>
                  <th className="px-8 py-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Bộ nhớ</th>
                  <th className="px-8 py-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">CPU</th>
                  <th className="px-8 py-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Tỷ lệ Thành công</th>
                  <th className="px-8 py-6 text-xs font-semibold text-slate-500 uppercase tracking-widest">Trạng thái Tải</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stableScenarios.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50/80 transition-all duration-300">
                    <td className="px-8 py-6 text-base font-semibold text-slate-900">{row.name}</td>
                    <td className="px-8 py-6">
                       <span className="text-sm font-semibold text-slate-900">{row.connectionsSucceeded || `${row.users} / ${row.users}`}</span>
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold text-brand-600">
                        {row.throughput.toLocaleString()} <span className="text-[10px] text-slate-400">msg/s</span>
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold text-slate-600">
                       {row.memory} MB
                    </td>
                    <td className="px-8 py-6 text-sm font-semibold text-slate-600">
                       {row.cpu}%
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-sm font-semibold text-emerald-600">{row.successRate}%</span>
                    </td>
                    <td className="px-8 py-6">
                       <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-semibold border border-emerald-100">
                         ỔN ĐỊNH
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Unstable Scenarios Table */}
        <div className="space-y-6 pt-10 pb-12">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 shadow-sm animate-pulse">
              <Zap size={20} />
            </div>
            <h2 className="text-2xl font-semibold text-slate-800">Phân tích Stress Test (10,000 Users)</h2>
          </div>
          
          <div className="bg-white border border-rose-100 rounded-sm overflow-hidden shadow-sm ring-4 ring-rose-50/50">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-rose-50/30 border-b border-rose-100">
                  <th className="px-8 py-6 text-xs font-semibold text-rose-600 uppercase tracking-widest">Lần chạy</th>
                  <th className="px-8 py-6 text-xs font-semibold text-rose-600 uppercase tracking-widest">Kết nối / 10,000</th>
                  <th className="px-8 py-6 text-xs font-semibold text-rose-600 uppercase tracking-widest">Lưu lượng</th>
                  <th className="px-8 py-6 text-xs font-semibold text-rose-600 uppercase tracking-widest">Bộ nhớ</th>
                  <th className="px-8 py-6 text-xs font-semibold text-rose-600 uppercase tracking-widest">CPU</th>
                  <th className="px-8 py-6 text-xs font-semibold text-rose-600 uppercase tracking-widest">Tỉ lệ Thành công</th>
                  <th className="px-8 py-6 text-xs font-semibold text-rose-600 uppercase tracking-widest">Trạng thái Tải</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-50">
                {unstableScenarios.map((row, i) => (
                  <tr key={i} className="hover:bg-rose-50/20 transition-all duration-300">
                    <td className="px-8 py-8 text-base font-semibold text-slate-900">{row.name}</td>
                    <td className="px-8 py-8">
                       <span className="text-lg font-semibold text-rose-600">{row.connectionsSucceeded || `~${Math.round(row.users * (row.successRate / 100))} / ${row.users}`}</span>
                    </td>
                    <td className="px-8 py-8 text-base font-mono font-semibold text-slate-900">
                        {row.throughput.toLocaleString()} <span className="text-[10px] text-slate-400">msg/s</span>
                    </td>
                    <td className="px-8 py-8 text-sm font-semibold text-slate-600">
                       {row.memory} MB
                    </td>
                    <td className="px-8 py-8 text-sm font-semibold text-rose-600">
                       {row.cpu}%
                    </td>
                    <td className="px-8 py-8">
                       <span className="text-base font-semibold text-rose-600">{row.successRate}%</span>
                    </td>
                    <td className="px-8 py-8">
                       <span className="px-4 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-[10px] font-semibold border border-rose-200">
                         KHÔNG ỔN ĐỊNH
                       </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default TestComparisonReport;
