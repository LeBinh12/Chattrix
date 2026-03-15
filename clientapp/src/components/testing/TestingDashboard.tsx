import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Clock, Zap, Users, Play, Square, Wifi, Download } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { API_BASE_URL } from '../../config/api';
import PhoneFrame from './PhoneFrame';
import { useNavigate } from 'react-router-dom';
import { Maximize2, X, Smartphone as SmartphoneIcon, HelpCircle, CheckCircle2, ChevronRight, BarChart3, AlertCircle } from 'lucide-react';

// ========================
// Types & Interfaces
// ========================

/** Cấu hình test do người dùng nhập */
interface LoadTestConfig {
  target_users: number;
  ramp_up_seconds: number;
  test_duration: number;
  message_interval: number;
  server_url: string;
}

/** Metrics snapshot nhận từ SSE backend */
interface MetricsSnapshot {
  timestamp: string;
  active_connections: number;
  total_messages_sent: number;
  success_messages: number;
  error_messages: number;
  messages_per_sec: number;
  error_rate_percent: number;
  avg_latency_ms: number;
  cpu_usage_percent: number;
  memory_mb: number;
  status: 'running' | 'completed' | 'stopped' | 'idle';
  elapsed_seconds: number;
}

/** Dữ liệu điểm trên biểu đồ */
interface ChartPoint {
  time: string;           // label trục X
  latency: number;        // ms
  cpu: number;            // %
  errorRate: number;      // %
  connections: number;    // số kết nối
  throughput: number;     // msg/s
}

// ========================
// Constants
// ========================
// Derive load-test API base from the same host/port as the rest of the app
const API_BASE = `${API_BASE_URL.replace('/v1', '')}/v1/load-test`;
// Derive WebSocket URL (http→ws, https→wss)
const WS_BASE = API_BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws').replace('/v1', '');
const MAX_CHART_POINTS = 60; // giữ tối đa 60 data points

const defaultConfig: LoadTestConfig = {
  target_users: 100,
  ramp_up_seconds: 10,
  test_duration: 60,
  message_interval: 500,
  server_url: `${WS_BASE}/v1/chat/ws`,
};

// ========================
// Tooltip Component (Simple & Premium)
// ========================
interface InfoTooltipProps {
  content: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ content }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <div className="cursor-help  hover:text-brand-500 transition-colors">
      <HelpCircle size={12} />
    </div>
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-white border border-slate-200 rounded-lg shadow-2xl 
                    text-[10px] text-slate-700 leading-relaxed font-medium opacity-0 group-hover:opacity-100 pointer-events-none 
                    transition-all duration-200 translate-y-2 group-hover:translate-y-0 z-50 overflow-visible">
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white" />
      {content}
    </div>
  </div>
);

// ========================
// SummaryCard Component
// ========================
interface SummaryCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color: string;
  description?: string;
  pulsing?: boolean;
  tooltip?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, value, unit, icon, color, description, pulsing, tooltip }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-brand-50 text-brand-600 border-brand-100',
    red: 'bg-red-50 text-red-600 border-red-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  };
  const cls = colorMap[color] ?? colorMap.blue;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-brand-300 transition-all duration-300 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-widest">{title}</span>
          {tooltip && <InfoTooltip content={tooltip} />}
        </div>
        <div className={`p-2 rounded-lg border ${cls}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-4xl font-semibold text-slate-900 tabular-nums tracking-tight">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-slate-500 text-base font-semibold ml-1">{unit}</span>}
        {pulsing && <span className="w-2.5 h-2.5 bg-brand-500 rounded-full animate-pulse ml-2" />}
      </div>
      {description && <p className="mt-2 text-sm text-slate-600 leading-tight font-medium">{description}</p>}
    </div>
  );
};

// ========================
// ChartSection Component
// ========================
interface ChartSectionProps {
  title: string;
  data: ChartPoint[];
  dataKey: keyof ChartPoint;
  unit: string;
  color: string;
  gradientId: string;
  tooltip?: string;
}

const ChartSection: React.FC<ChartSectionProps> = ({ title, data, dataKey, unit, color, gradientId, tooltip }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
    <div className="flex items-center mb-4">
      <h3 className="text-slate-700 font-semibold text-sm uppercase tracking-wider">{title}</h3>
      {tooltip && <InfoTooltip content={tooltip} />}
    </div>
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
          <Tooltip
            contentStyle={{ background: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
            cursor={{ stroke: '#cbd5e1' }}
            formatter={(v: unknown) => [`${Number(v).toFixed(2)} ${unit}`, title]}
          />
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// ========================
// SummaryReportModal Component
// ========================
interface SummaryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: LoadTestConfig;
  stats: MetricsSnapshot | null;
  onSave?: (name: string) => void;
}

const SummaryReportModal: React.FC<SummaryReportModalProps> = ({ isOpen, onClose, config, stats, onSave }) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saveName, setSaveName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setIsSaved(false);
      const date = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setSaveName(`${config.target_users} user (${date})`);
    }
  }, [isOpen, config.target_users]);

  if (!isOpen || !stats) return null;

  const handleSave = () => {
    if (onSave) {
      onSave(saveName);
      setIsSaved(true);
    }
  };

  const handleExportJson = () => {
    const exportData = {
      test_case: saveName || `${config.target_users} user`,
      config,
      stats,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${config.target_users}u_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300 !font-roboto">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header — compact */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">Hoàn tất Kiểm thử</h2>
              <p className="text-slate-500 text-xs font-medium">Tổng hợp hiệu năng & thông số cuối cùng</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center border border-slate-200 transition-colors text-slate-500">
            <X size={16} />
          </button>
        </div>

        {/* Body — no scroll, fixed height */}
        <div className="p-5 grid grid-cols-2 gap-5">
          
          {/* LEFT COLUMN */}
          <div className="flex flex-col gap-4">
            {/* Input Config */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <SmartphoneIcon size={13} className="" />
                <span className="text-[13px]  font-semibold  uppercase tracking-widest">Tham số đầu vào</span>
              </div>
              <div className="bg-slate-50  rounded-2xl border border-slate-100 divide-y divide-slate-100/80">
                {[
                  { label: 'Target Users', value: String(config.target_users) },
                  { label: 'Ramp-up', value: `${config.ramp_up_seconds}s` },
                  { label: 'Thời gian Test', value: `${config.test_duration}s` },
                  { label: 'Khoảng cách msg', value: `${config.message_interval}ms` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-slate-500 text-sm font-bold">{label}</span>
                    <span className="text-slate-900 text-sm font-semibold font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI Cards 2x2 */}
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 size={13} className="" />
                <span className="text-[13px]  font-bold uppercase tracking-widest">Chỉ số Hiệu năng</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tổng thời gian', value: stats.elapsed_seconds, unit: 's', cls: 'bg-emerald-50/60 border-emerald-100 text-emerald-600' },
                  { label: 'Chỉ số CPU', value: stats.cpu_usage_percent.toFixed(1), unit: '%', cls: 'bg-blue-50/60 border-blue-100 text-brand-600' },
                  { label: 'Độ trễ TB', value: stats.avg_latency_ms.toFixed(1), unit: 'ms', cls: 'bg-amber-50/60 border-amber-100 text-amber-600' },
                  { label: 'Thông lượng', value: stats.messages_per_sec.toFixed(1), unit: '/s', cls: 'bg-green-50/60 border-green-100 text-emerald-600' },
                ].map(({ label, value, unit, cls }) => (
                  <div key={label} className={`border rounded-2xl px-4 py-3 ${cls}`}>
                    <p className="text-[9px] font-semibold uppercase tracking-widest mb-1 opacity-70">{label}</p>
                    <p className="text-2xl font-semibold font-mono text-slate-900 leading-none">
                      {value}<span className="text-xs ml-0.5 opacity-40 font-medium">{unit}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — Stat rows */}
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Activity size={13} className="" />
                <span className="text-slate-900 text-[13px] !font-bold uppercase tracking-widest">Thống kê chi tiết</span>
              </div>  
              <div className="flex flex-col gap-2">
                {/* Row: Tổng gói tin */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 hover:bg-white transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-100 flex items-center justify-center  shrink-0 shadow-sm">
                      <Activity size={14} />
                    </div>
                    <div>
                      <p className="text-[10px]  font-semibold uppercase tracking-wide">Tổng gói tin mạng</p>
                      <p className="text-base font-semibold font-mono text-slate-900 leading-tight">{stats.total_messages_sent.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold border border-emerald-100 uppercase tracking-wide shrink-0">Tốt</span>
                </div>

                {/* Row: Thành công */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 hover:bg-white transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500 shrink-0 shadow-sm">
                      <CheckCircle2 size={14} />
                    </div>
                    <div>
                      <p className="text-[10px]  font-semibold uppercase tracking-wide">Giao tiếp thành công</p>
                      <p className="text-base font-semibold font-mono text-emerald-600 leading-tight">{stats.success_messages.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 tabular-nums shrink-0">
                    {((stats.success_messages / (stats.total_messages_sent || 1)) * 100).toFixed(1)}%
                    <span className="text-[10px]  font-medium ml-1">tin cậy</span>
                  </span>
                </div>

                {/* Row: Lỗi */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 hover:bg-white transition-all">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-sm ${stats.error_rate_percent > 1 ? 'bg-rose-50 border-rose-100 text-rose-500' : 'bg-white border-slate-100 '}`}>
                      <AlertCircle size={14} />
                    </div>
                    <div>
                      <p className="text-[10px]  font-semibold uppercase tracking-wide">Lỗi đường truyền</p>
                      <p className={`text-base font-semibold font-mono leading-tight ${stats.error_rate_percent > 1 ? 'text-rose-600' : 'text-slate-900'}`}>{stats.error_messages.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wide shrink-0 ${stats.error_rate_percent > 1 ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    {stats.error_rate_percent.toFixed(2)}% lỗi
                  </span>
                </div>

                {/* Row: RAM */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 hover:bg-white transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500 shrink-0 shadow-sm">
                      <Zap size={14} />
                    </div>
                    <div>
                      <p className="text-[10px]  font-semibold uppercase tracking-wide">Bộ nhớ tiêu thụ</p>
                      <p className="text-base font-semibold font-mono text-slate-900 leading-tight">{stats.memory_mb.toFixed(0)} <span className="text-xs font-medium ">MB</span></p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold  shrink-0">Ổn định</span>
                </div>
              </div>
            </div>

            {/* Error warning */}
            {stats.error_rate_percent > 5 && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-rose-600 shrink-0">
                <AlertCircle size={14} className="shrink-0" />
                <p className="text-xs font-medium">Tỷ lệ lỗi vượt 5% — kiểm tra log server.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer — compact */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!isSaved ? (
              <>
                <input 
                  type="text" 
                  value={saveName} 
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="Tên kịch bản..."
                  className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-52 transition-all"
                />
                <button 
                  onClick={handleSave}
                  className="px-5 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 font-semibold text-sm transition-all shadow-md shadow-brand-500/10 flex items-center gap-2 active:scale-95"
                >
                  <BarChart3 size={14} /> Lưu kết quả
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 font-semibold text-sm animate-in zoom-in-95">
                <CheckCircle2 size={14} /> Đã lưu vào so sánh
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleExportJson}
              className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            >
              <Download size={14} /> Xuất JSON
            </button>
            <button onClick={onClose} className="px-5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-500 font-semibold text-sm transition-all border border-slate-200 active:scale-95">
              Đóng
            </button>
            <button onClick={onClose} className="px-6 py-2 rounded-xl bg-[#00568c] hover:bg-[#00568c] !text-white font-semibold text-sm transition-all shadow-md shadow-slate-900/10 active:scale-95 flex items-center gap-1.5">
              Chạy mới <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ========================
// Main TestingDashboard Page
// ========================
const TestingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<LoadTestConfig>(defaultConfig);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [finalStats, setFinalStats] = useState<MetricsSnapshot | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const lastMetricsRef = useRef<MetricsSnapshot | null>(null);

  /** Thêm một snapshot vào mảng data của chart */
  const appendChartPoint = useCallback((snap: MetricsSnapshot) => {
    const point: ChartPoint = {
      time: `${snap.elapsed_seconds}s`,
      latency: parseFloat(snap.avg_latency_ms.toFixed(1)),
      cpu: parseFloat(snap.cpu_usage_percent.toFixed(1)),
      errorRate: parseFloat(snap.error_rate_percent.toFixed(2)),
      connections: snap.active_connections,
      throughput: parseFloat(snap.messages_per_sec.toFixed(1)),
    };
    setChartData(prev => {
      const next = [...prev, point];
      return next.length > MAX_CHART_POINTS ? next.slice(next.length - MAX_CHART_POINTS) : next;
    });
  }, []);

  /** Kết nối SSE để nhận metrics real-time */
  const connectSSE = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close();
    }
    const es = new EventSource(`${API_BASE}/stats`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const snap: MetricsSnapshot = JSON.parse(e.data);
        const prevStatus = lastMetricsRef.current?.status;
        
        setMetrics(snap);
        lastMetricsRef.current = snap;
        appendChartPoint(snap);

        // Detect completion: transition from 'running' to 'completed' or 'stopped'
        if ((snap.status === 'completed' || snap.status === 'stopped') && prevStatus === 'running') {
          setFinalStats(snap);
          setShowSummary(true);
        }
      } catch {
        // ignore parse errors
      }
    };
  }, [appendChartPoint]);

  useEffect(() => {
    connectSSE();
    return () => sseRef.current?.close();
  }, [connectSSE]);

  const handleStart = async () => {
    setError(null);
    setChartData([]);
    setShowSummary(false); // Hide summary if starting a new test
    setFinalStats(null);
    lastMetricsRef.current = null;
    try {
      const res = await fetch(`${API_BASE}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Failed to start test');
        return;
      }
    } catch (e: any) {
      setError(`Không thể kết nối server: ${e.message}. Hãy chắc chắn backend đang chạy.`);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_BASE}/stop`, { method: 'POST' });
    } catch (e: any) {
      setError(`Stop error: ${e.message}`);
    }
  };

  /** Lưu kết quả test vào localStorage */
  const handleSaveResult = (customName: string) => {
    if (!finalStats) return;

    const newResult = {
      name: customName,
      users: config.target_users,
      throughput: parseFloat(finalStats.messages_per_sec.toFixed(1)),
      memory: Math.round(finalStats.memory_mb),
      cpu: parseFloat(finalStats.cpu_usage_percent.toFixed(1)),
      successRate: parseFloat(((finalStats.success_messages / (finalStats.total_messages_sent || 1)) * 100).toFixed(2)),
      connectionsSucceeded: `${finalStats.success_messages} / ${config.target_users}`
    };

    try {
      const existingHistory = JSON.parse(localStorage.getItem('test_comparison_history') || '[]');
      const updatedHistory = [newResult, ...existingHistory].slice(0, 20); // Keep last 20 runs
      localStorage.setItem('test_comparison_history', JSON.stringify(updatedHistory));
    } catch (e) {
      console.error('Failed to save test history', e);
    }
  };

  const isRunning = metrics?.status === 'running';
  
  // Decide how many phones to show in the grid
  const activeCount = metrics?.active_connections ?? 0;
  const phonesToShow = Math.min(activeCount || 12, 50); // Show at least some placeholder phones if idle

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-brand-100 font-roboto">
      {/* === Header === */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-6">
          {/* Top Section: Branding & Actions */}
          <div className="py-4 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/10 ring-1 ring-brand-500/10">
                  <SmartphoneIcon className="text-white w-5 h-5" />
               </div>
                <div>
                  <span className="text-xl font-semibold tracking-tight text-slate-900">Giả lập Phone Grid</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-300'}`} />
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-widest">
                      {isRunning ? 'Hệ thống Đang Chạy' : 'Chế độ Chờ'}
                    </span>
                  </div>
                </div>
            </div>

            <div className="flex items-center gap-4">
              {metrics && metrics.status !== 'idle' && (
                 <div className="flex items-center gap-6 px-6 border-r border-slate-200">
                  <div className="text-center group relative cursor-help">
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-tighter mb-0.5 flex items-center justify-center gap-1">
                      Thời gian <HelpCircle size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-lg font-mono font-semibold text-brand-600 leading-none">{metrics.elapsed_seconds}s</p>
                    <div className="absolute top-full mt-2 right-0 w-32 p-2 bg-white border border-slate-200 rounded shadow-xl text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-all uppercase tracking-tighter">
                      Thời gian trôi qua kể từ khi bắt đầu test.
                    </div>
                  </div>
                  <div className="text-center group relative cursor-help">
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-tighter mb-0.5 flex items-center justify-center gap-1">
                      Lưu lượng <HelpCircle size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className="text-lg font-mono font-semibold text-emerald-600 leading-none">{metrics.messages_per_sec.toFixed(1)}/s</p>
                    <div className="absolute top-full mt-2 right-0 w-32 p-2 bg-white border border-slate-200 rounded shadow-xl text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-all uppercase tracking-tighter">
                      Số lượng tin nhắn xử lý mỗi giây.
                    </div>
                  </div>
                  <div className="text-center group relative cursor-help">
                    <p className="text-xs text-slate-500 uppercase font-semibold tracking-tighter mb-0.5 flex items-center justify-center gap-1">
                      Tỷ lệ lỗi <HelpCircle size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </p>
                    <p className={`text-lg font-mono font-semibold leading-none ${metrics.error_rate_percent > 1 ? 'text-rose-600' : 'text-cyan-600'}`}>
                      {metrics.error_rate_percent.toFixed(2)}%
                    </p>
                    <div className="absolute top-full mt-2 right-0 w-32 p-2 bg-white border border-slate-200 rounded shadow-xl text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-all uppercase tracking-tighter">
                      Tỷ lệ tin nhắn lỗi trên tổng số tin nhắn.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                {!isRunning ? (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold 
                               px-6 py-3 rounded-2xl transition-all shadow-lg shadow-brand-500/10 active:scale-95 text-base"
                  >
                    <Play size={18} fill="currentColor" /> Bắt đầu Test
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold 
                               px-6 py-3 rounded-2xl transition-all shadow-lg shadow-rose-600/10 active:scale-95 text-base"
                  >
                    <Square size={18} fill="currentColor" /> Dừng Test
                  </button>
                )}
                
                <button
                  onClick={() => setShowDashboard(true)}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-6 py-3 rounded-2xl transition-all font-semibold text-base group text-slate-700"
                >
                  <Maximize2 size={18} className="text-brand-600 group-hover:scale-110 transition-transform" />
                  Báo cáo Real-time
                </button>

                <button
                  onClick={() => navigate('/testing/comparison')}
                  className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-6 py-3 rounded-2xl transition-all font-semibold text-base group text-slate-700"
                >
                  <BarChart3 size={18} className="text-brand-600 group-hover:scale-110 transition-transform" />
                  So sánh Kịch bản
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Inputs Bar */}
          <div className="py-3 flex items-center justify-between gap-8 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-4 grow max-w-4xl">
               <div className="flex flex-col gap-1.5 min-w-[130px]">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-1">Mục tiêu (User)</label>
                  <input 
                    type="number" 
                    value={config.target_users}
                    disabled={isRunning}
                    onChange={e => setConfig({...config, target_users: Number(e.target.value)})}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all font-semibold text-slate-900 placeholder:"
                  />
               </div>
               <div className="flex flex-col gap-1.5 min-w-[110px]">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-1">Ramp-up (s)</label>
                  <input 
                    type="number" 
                    value={config.ramp_up_seconds}
                    disabled={isRunning}
                    onChange={e => setConfig({...config, ramp_up_seconds: Number(e.target.value)})}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all font-semibold text-slate-900 placeholder:"
                  />
               </div>
               <div className="flex flex-col gap-1.5 min-w-[110px]">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-1">Thời gian (s)</label>
                  <input 
                    type="number" 
                    value={config.test_duration}
                    disabled={isRunning}
                    onChange={e => setConfig({...config, test_duration: Number(e.target.value)})}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all font-semibold text-slate-900 placeholder:"
                  />
               </div>
               <div className="flex flex-col gap-1.5 min-w-[110px]">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-1">Khoảng cách (ms)</label>
                  <input 
                    type="number" 
                    value={config.message_interval}
                    disabled={isRunning}
                    onChange={e => setConfig({...config, message_interval: Number(e.target.value)})}
                    className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all font-semibold text-slate-900 placeholder:"
                  />
               </div>
               <div className="flex flex-col gap-1.5 grow">
                  <label className="text-xs text-slate-500 font-semibold uppercase tracking-wider ml-1">WebSocket Gateway</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={config.server_url}
                      disabled={isRunning}
                      onChange={e => setConfig({...config, server_url: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition-all font-semibold text-slate-900 placeholder:"
                    />
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
               <div className="h-8 w-px bg-slate-100 mx-2" />
               <div className="flex flex-col items-end">
                   <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest leading-none mb-1.5">Trạng thái Tải</p>
                   <div className="flex items-baseline gap-1.5">
                     <span className="text-2xl font-semibold text-slate-900 leading-none">{activeCount}</span>
                     <span className="text-xs text-slate-500 font-semibold uppercase">/ {config.target_users}</span>
                  </div>
               </div>
               <div className="w-24 bg-slate-100 h-1.5 rounded-full overflow-hidden self-end mb-1 border border-slate-200">
                 <div 
                    className="h-full bg-brand-500 transition-all duration-700" 
                    style={{ width: `${Math.min((activeCount / config.target_users) * 100, 100)}%` }}
                 />
               </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-6 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl px-6 py-4 text-red-600 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <X size={18} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Global Progress Line (Under Header) */}
        {isRunning && (
          <div className="absolute top-[125px] left-0 w-full h-px bg-brand-500/10 overflow-hidden z-30">
            <div className="absolute top-0 left-0 h-full bg-brand-500 w-1/4 animate-[scan_3s_linear_infinite]" />
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
           {Array.from({ length: phonesToShow }).map((_, i) => (
             <PhoneFrame 
               key={i} 
               userId={`user-${i}`} 
               status={metrics?.status ?? 'idle'} 
               messageInterval={config.message_interval}
             />
           ))}
        </div>
        
        {activeCount > 50 && (
          <div className="mt-12 text-center p-10 bg-white border border-dashed border-slate-200 rounded-3xl group hover:border-brand-300 transition-all shadow-sm">
             <p className="text-slate-500 text-sm font-medium italic group-hover:text-slate-700 transition-colors">
               Bảo vệ hiệu năng: Đang hiển thị 50 của {activeCount} máy ảo đang hoạt động...
             </p>
             <p className="text-[10px] font-semibold  uppercase tracking-widest mt-2">
               Mở Báo cáo hiệu năng để xem phân tích hệ thống đầy đủ
             </p>
          </div>
        )}
      </main>

      <style>{`
        @keyframes scan {
          0% { left: -25%; }
          100% { left: 100%; }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>

      {/* === Performance Dashboard Modal === */}
      {showDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
             {/* Modal Content */}
           <div className="relative w-full max-w-7xl bg-white border border-slate-200 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 max-h-[95vh]">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <div>
                    <h2 className="text-xl font-semibold text-slate-900">Báo cáo hiệu năng Real-time</h2>
                    <p className="text-slate-500 text-xs font-medium">Thông số chi tiết mô phỏng tải k6</p>
                 </div>
                 <button 
                    onClick={() => setShowDashboard(false)}
                    className="w-10 h-10 rounded-2xl bg-white hover:bg-slate-50 flex items-center justify-center border border-slate-200 transition-colors text-slate-500"
                 >
                    <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <SummaryCard
                    title="Kết nối Hiện tại"
                    value={metrics?.active_connections ?? 0}
                    icon={<Users size={16} />}
                    color="blue"
                    pulsing={isRunning}
                    tooltip="Số lượng người dùng ảo hiện đang duy trì kết nối WebSocket với máy chủ."
                  />
                  <SummaryCard
                    title="Độ trễ TB"
                    value={metrics ? metrics.avg_latency_ms.toFixed(1) : '0.0'}
                    unit="ms"
                    icon={<Clock size={16} />}
                    color="orange"
                    tooltip="Thời gian trung bình từ khi gửi đi một tin nhắn cho đến khi nhận được phản hồi xác nhận từ máy chủ."
                  />
                  <SummaryCard
                    title="Lưu lượng"
                    value={metrics ? metrics.messages_per_sec.toFixed(1) : '0.0'}
                    unit="msg/s"
                    icon={<Zap size={16} />}
                    color="green"
                    pulsing={isRunning}
                    tooltip="Số lượng tin nhắn mà hệ thống xử lý thành công trên mỗi giây."
                  />
                  <SummaryCard
                    title="CPU (ước tính)"
                    value={metrics ? metrics.cpu_usage_percent.toFixed(1) : '0.0'}
                    unit="%"
                    icon={<Activity size={16} />}
                    color="red"
                    tooltip="Phần trăm sử dụng CPU ước tính của máy chủ backend trong quá trình thử nghiệm."
                  />
                  <SummaryCard
                    title="Tỷ lệ lỗi"
                    value={metrics ? metrics.error_rate_percent.toFixed(2) : '0.00'}
                    unit="%"
                    icon={<Activity size={16} />}
                    color={metrics && metrics.error_rate_percent > 1 ? 'red' : 'cyan'}
                    tooltip="Tỷ lệ phần trăm các tin nhắn gặp lỗi so với tổng số tin nhắn gửi đi."
                  />
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ChartSection
                    title="Độ trễ (ms) theo thời gian"
                    data={chartData}
                    dataKey="latency"
                    unit="ms"
                    color="#f59e0b"
                    gradientId="latencyGradModal"
                    tooltip="Biểu đồ này biểu thị sự thay đổi của độ trễ trung bình qua các đợt kiểm tra. Giúp xác định các điểm thắt cổ chai khi tải tăng."
                  />
                  <ChartSection
                    title="Sử dụng CPU (%) theo thời gian"
                    data={chartData}
                    dataKey="cpu"
                    unit="%"
                    color="#3b82f6"
                    gradientId="cpuGradModal"
                    tooltip="Theo dõi hiệu năng sử dụng CPU của backend. Nếu CPU tiệm cận 100%, hệ thống có thể bị chậm phản hồi."
                  />
                  <ChartSection
                    title="Tỷ lệ lỗi (%) theo thời gian"
                    data={chartData}
                    dataKey="errorRate"
                    unit="%"
                    color="#ef4444"
                    gradientId="errGradModal"
                    tooltip="Tỷ lệ lỗi theo thời gian thực. Giúp phát hiện nhanh các đợt crash hoặc lỗi hàng loạt khi đạt ngưỡng tải nhất định."
                  />
                  <ChartSection
                    title="Lưu lượng xử lý (tin nhắn/s)"
                    data={chartData}
                    dataKey="throughput"
                    unit="msg/s"
                    color="#10b981"
                    gradientId="throughputGradModal"
                    tooltip="Lưu lượng tin nhắn được xử lý mỗi giây. Cho thấy khả năng đáp ứng thực tế của hạ tầng WebSocket."
                  />
                </div>
                
                {/* Stats Footer inside Modal */}
                {metrics && (
                   <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-wrap gap-8 text-sm">
                      <div className="flex flex-col">
                        <span className=" font-semibold uppercase text-[10px] tracking-widest border-b border-slate-200 mb-2 pb-1">Tổng lưu lượng mạng</span>
                        <div className="flex gap-6">
                            <span>Đã gửi: <b className="text-brand-600">{metrics.total_messages_sent.toLocaleString()}</b></span>
                            <span>Thành công: <b className="text-emerald-600">{metrics.success_messages.toLocaleString()}</b></span>
                            <span>Lỗi: <b className="text-rose-600">{metrics.error_messages.toLocaleString()}</b></span>
                        </div>
                      </div>
                      <div className="flex flex-col group relative cursor-help">
                        <span className=" font-semibold uppercase text-[10px] tracking-widest border-b border-slate-200 mb-2 pb-1 flex items-center gap-1">
                          Tiêu thụ tài nguyên <HelpCircle size={8} />
                        </span>
                        <span className="text-slate-700">Sử dụng bộ nhớ: <b className="text-slate-900">{metrics.memory_mb.toFixed(0)} MB</b></span>
                        <div className="absolute top-full mt-1 left-0 w-48 p-2 bg-white border border-slate-200 rounded shadow-xl text-[9px] text-slate-600 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-all uppercase tracking-tighter">
                          Lượng bộ nhớ RAM mà tiến trình backend đang sử dụng.
                        </div>
                      </div>
                   </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                <button 
                  onClick={() => setShowDashboard(false)}
                  className="px-8 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all shadow-lg shadow-brand-500/10 active:scale-95"
                >
                  Đóng Báo cáo
                </button>
              </div>
           </div>
        </div>
      )}
      {/* === Completion Summary Modal === */}
      <SummaryReportModal 
         isOpen={showSummary} 
         onClose={() => setShowSummary(false)} 
         config={config}
         stats={finalStats}
         onSave={handleSaveResult}
      />
    </div>
  );
};

export default TestingDashboard;
