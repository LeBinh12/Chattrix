import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Activity, Clock, Zap, Users, Play, Square, Smartphone as SmartphoneIcon, HelpCircle, CheckCircle2, ChevronRight, BarChart3, Download, X, Maximize2 } from 'lucide-react';
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
import { toast } from 'react-toastify';

// ========================
// Types & Interfaces
// ========================

interface LoadTestConfig {
  target_users: number;
  ramp_up_seconds: number;
  test_duration: number;
  message_interval: number;
  server_url: string;
}

interface MetricsSnapshot {
  timestamp: string;
  active_connections: number;
  total_messages_sent: number;
  total_messages_received: number;
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

interface ChartPoint {
  time: string;
  latency: number;
  cpu: number;
  errorRate: number;
  connections: number;
  throughput: number;
}

// ========================
// Constants
// ========================
const API_BASE = `${API_BASE_URL.replace('/v1', '')}/v1/load-test`;
const WS_BASE = API_BASE_URL.replace(/^https/, 'wss').replace(/^http/, 'ws').replace('/v1', '');
const MAX_CHART_POINTS = 60;

const defaultConfig: LoadTestConfig = {
  target_users: 1000,
  ramp_up_seconds: 30,
  test_duration: 300,
  message_interval: 1000,
  server_url: `${WS_BASE}/v1/chat/ws`,
};

// ========================
// Components
// ========================

const InfoTooltip: React.FC<{ content: string }> = ({ content }) => (
  <div className="group relative inline-block ml-1.5 align-middle">
    <div className="cursor-help hover:text-brand-500 transition-colors">
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

const SummaryCard: React.FC<{
  title: string; value: string | number; unit?: string; icon: React.ReactNode; color: string; description?: string; pulsing?: boolean; tooltip?: string;
}> = ({ title, value, unit, icon, color, description, pulsing, tooltip }) => {
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
        <div className={`p-2 rounded-lg border ${cls}`}>{icon}</div>
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

const ChartSection: React.FC<{
  title: string; data: ChartPoint[]; dataKey: keyof ChartPoint; unit: string; color: string; gradientId: string; tooltip?: string;
}> = ({ title, data, dataKey, unit, color, gradientId, tooltip }) => (
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
          <Area type="monotone" dataKey={dataKey as string} stroke={color} strokeWidth={2} fill={`url(#${gradientId})`} dot={false} isAnimationActive={false} />
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
      setSaveName(`Stress: ${config.target_users} user (${date})`);
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
      test_case: saveName || `Stress ${config.target_users} user`,
      config,
      stats,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stress_report_${config.target_users}u_${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative w-full max-w-5xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-orange-50 to-transparent shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 border border-orange-500/20">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight italic">Stress Test Summary</h2>
              <p className="text-slate-500 text-xs font-medium">Final performance metrics for high load</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center border border-slate-200 transition-colors text-slate-500">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-2 gap-5 text-slate-900">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <SmartphoneIcon size={13} />
                <span className="text-[13px] font-bold uppercase tracking-widest">Input Parameters</span>
              </div>
              <div className="bg-slate-50 rounded-2xl border border-slate-100 divide-y divide-slate-100/80">
                {[
                  { label: 'Target Users', value: String(config.target_users) },
                  { label: 'Ramp-up', value: `${config.ramp_up_seconds}s` },
                  { label: 'Duration', value: `${config.test_duration}s` },
                  { label: 'Interval', value: `${config.message_interval}ms` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-slate-500 text-sm font-bold">{label}</span>
                    <span className="text-slate-900 text-sm font-semibold font-mono">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 size={13} />
                <span className="text-[13px] font-bold uppercase tracking-widest">KPIs</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Total Time', value: stats.elapsed_seconds, unit: 's', cls: 'bg-emerald-50/60 border-emerald-100 text-emerald-600' },
                  { label: 'CPU Usage', value: stats.cpu_usage_percent.toFixed(1), unit: '%', cls: 'bg-blue-50/60 border-blue-100 text-brand-600' },
                  { label: 'Avg Latency', value: stats.avg_latency_ms.toFixed(1), unit: 'ms', cls: 'bg-amber-50/60 border-amber-100 text-amber-600' },
                  { label: 'Throughput', value: stats.messages_per_sec.toFixed(1), unit: '/s', cls: 'bg-green-50/60 border-green-100 text-emerald-600' },
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

          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Activity size={13} />
                <span className="text-[13px] font-bold uppercase tracking-widest text-slate-900">Execution Stats</span>
              </div>  
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Activity size={14} />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide">Total Sent</p>
                      <p className="text-base font-semibold font-mono text-slate-900 leading-tight">{stats.total_messages_sent.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <SmartphoneIcon size={14} className="text-brand-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide">Total Received</p>
                      <p className="text-base font-semibold font-mono text-slate-900 leading-tight">{stats.total_messages_received.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={14} className="text-emerald-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide">Success</p>
                      <p className="text-base font-semibold font-mono text-emerald-600 leading-tight">{stats.success_messages.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-slate-600 tabular-nums">
                    {((stats.success_messages / (stats.total_messages_sent || 1)) * 100).toFixed(1)}%
                  </span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <X size={14} className="text-rose-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide">Errors</p>
                      <p className="text-base font-semibold font-mono text-rose-600 leading-tight">{stats.error_messages.toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="text-rose-600 text-xs font-bold">{stats.error_rate_percent.toFixed(2)}%</span>
                </div>

                <div className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Zap size={14} className="text-purple-500" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide">Memory Used</p>
                      <p className="text-base font-semibold font-mono text-slate-900 leading-tight">{stats.memory_mb.toFixed(0)} MB</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {!isSaved ? (
              <button 
                onClick={handleSave}
                className="px-5 py-2 rounded-xl bg-orange-600 text-white hover:bg-orange-700 font-semibold text-sm transition-all"
              >
                Save Result
              </button>
            ) : (
              <span className="text-emerald-600 font-bold text-sm">✓ Saved to History</span>
            )}
            <button 
              onClick={handleExportJson}
              className="px-5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-sm transition-all flex items-center gap-2"
            >
              <Download size={14} /> Export JSON
            </button>
          </div>
          <button onClick={onClose} className="px-5 py-2 rounded-xl bg-slate-900 text-white font-semibold text-sm active:scale-95">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

// ========================
// Main StressTestingDashboard
// ========================
const StressTestingDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<LoadTestConfig>(defaultConfig);
  const [metrics, setMetrics] = useState<MetricsSnapshot | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [finalStats, setFinalStats] = useState<MetricsSnapshot | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  
  const sseRef = useRef<EventSource | null>(null);
  const lastMetricsRef = useRef<MetricsSnapshot | null>(null);

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

  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`${API_BASE}/stats`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const snap: MetricsSnapshot = JSON.parse(e.data);
        const prevStatus = lastMetricsRef.current?.status;

        setMetrics(snap);
        lastMetricsRef.current = snap;
        appendChartPoint(snap);

        if ((snap.status === 'completed' || snap.status === 'stopped') && prevStatus === 'running') {
          setFinalStats(snap);
          setShowSummary(true);
        }
      } catch {}
    };
  }, [appendChartPoint]);

  useEffect(() => {
    connectSSE();
    return () => sseRef.current?.close();
  }, [connectSSE]);

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/seed`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        setError(data.error);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleStartStress = async () => {
    setError(null);
    setChartData([]);
    try {
      const res = await fetch(`${API_BASE}/stress-start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? 'Failed to start stress test');
      }
    } catch (e: any) {
      setError(`Không thể kết nối server: ${e.message}`);
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${API_BASE}/stop`, { method: 'POST' });
    } catch (e: any) {
      setError(`Stop error: ${e.message}`);
    }
  };

  const isRunning = metrics?.status === 'running';
  const activeCount = metrics?.active_connections ?? 0;
  const phonesToShow = Math.min(activeCount || 12, 50);

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-brand-500/30 font-roboto">
      {/* === Header === */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-6">
          <div className="py-4 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-4">
               <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-orange-500/20">
                  <Zap className="text-white w-5 h-5" />
               </div>
                <div>
                  <span className="text-xl font-semibold tracking-tight">Stress Test Dashboard (1000 Users)</span>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                    <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
                      {isRunning ? 'System Running' : 'Idle Mode'}
                    </span>
                  </div>
                </div>
            </div>

            {metrics && metrics.status !== 'idle' && (
                 <div className="flex items-center gap-6 px-6 border-r border-white/10">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-0.5">Elapsed Time</p>
                    <p className="text-lg font-mono font-semibold text-orange-400 leading-none">{metrics.elapsed_seconds}s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-0.5">Total Sent</p>
                    <p className="text-lg font-mono font-semibold text-brand-400 leading-none">{metrics.total_messages_sent.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-0.5">Success</p>
                    <p className="text-lg font-mono font-semibold text-emerald-400 leading-none">{metrics.success_messages.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-0.5">Received</p>
                    <p className="text-lg font-mono font-semibold text-blue-400 leading-none">{metrics.total_messages_received.toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-0.5">Throughput</p>
                    <p className="text-lg font-mono font-semibold text-indigo-400 leading-none">{metrics.messages_per_sec.toFixed(1)}/s</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter mb-0.5">Error Rate</p>
                    <p className={`text-lg font-mono font-semibold leading-none ${metrics.error_rate_percent > 1 ? 'text-rose-500' : 'text-cyan-400'}`}>
                      {metrics.error_rate_percent.toFixed(2)}%
                    </p>
                  </div>
                </div>
              )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSeed}
                  disabled={isSeeding || isRunning}
                  className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-semibold text-base ${isSeeding ? 'bg-slate-800 text-slate-500' : 'bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/10 active:scale-95'}`}
                >
                  <Users size={18} /> {isSeeding ? 'Seeding...' : 'Seed 1000 Users'}
                </button>

                {!isRunning ? (
                  <button
                    onClick={handleStartStress}
                    className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-orange-500/10 active:scale-95 text-base"
                  >
                    <Play size={18} fill="currentColor" /> Start Stress Test
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-rose-600/10 active:scale-95 text-base"
                  >
                    <Square size={18} fill="currentColor" /> Stop Test
                  </button>
                )}
                
                <button
                  onClick={() => setShowDashboard(true)}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-6 py-3 rounded-2xl transition-all font-semibold text-base group text-slate-200"
                >
                  <Maximize2 size={18} className="text-orange-500 group-hover:scale-110 transition-transform" />
                  Real-time Reports
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Inputs Bar */}
          <div className="py-3 flex items-center justify-between gap-8 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-4 grow max-w-4xl">
               <div className="flex flex-col gap-1.5 min-w-[130px]">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider ml-1">Target Users</label>
                  <input type="number" value={config.target_users} disabled={isRunning} onChange={e => setConfig({...config, target_users: Number(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all font-semibold text-white" />
               </div>
               <div className="flex flex-col gap-1.5 min-w-[110px]">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider ml-1">Ramp-up (s)</label>
                  <input type="number" value={config.ramp_up_seconds} disabled={isRunning} onChange={e => setConfig({...config, ramp_up_seconds: Number(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all font-semibold text-white" />
               </div>
               <div className="flex flex-col gap-1.5 min-w-[110px]">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider ml-1">Duration (s)</label>
                  <input type="number" value={config.test_duration} disabled={isRunning} onChange={e => setConfig({...config, test_duration: Number(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all font-semibold text-white" />
               </div>
               <div className="flex flex-col gap-1.5 min-w-[110px]">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider ml-1">Interval (ms)</label>
                  <input type="number" value={config.message_interval} disabled={isRunning} onChange={e => setConfig({...config, message_interval: Number(e.target.value)})} className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all font-semibold text-white" />
               </div>
               <div className="flex flex-col gap-1.5 grow">
                  <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider ml-1">WebSocket Gateway</label>
                  <input type="text" value={config.server_url} disabled={isRunning} onChange={e => setConfig({...config, server_url: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-orange-500/30 transition-all font-semibold text-white" />
               </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
               <div className="h-8 w-px bg-white/10 mx-2" />
               <div className="flex flex-col items-end">
                   <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-1.5">Load Status</p>
                   <div className="flex items-baseline gap-1.5">
                     <span className="text-2xl font-semibold text-white leading-none">{activeCount}</span>
                     <span className="text-xs text-slate-400 font-semibold uppercase">/ {config.target_users}</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-6 py-6">
        {error && (
          <div className="mb-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-6 py-4 text-rose-400 text-sm flex items-center gap-3 animate-in fade-in slide-in-from-top-2 shadow-sm">
            <X size={18} className="shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-6">
           {Array.from({ length: phonesToShow }).map((_, i) => (
             <PhoneFrame key={i} userId={`StressUser_${i+1}`} status={metrics?.status ?? 'idle'} messageInterval={config.message_interval} />
           ))}
        </div>
        
        {activeCount > 50 && (
          <div className="mt-12 text-center p-10 bg-white/5 border border-dashed border-white/10 rounded-3xl group hover:border-orange-500/30 transition-all shadow-sm">
             <p className="text-slate-400 text-sm font-medium italic group-hover:text-slate-200 transition-colors">
               Displaying 50 of {activeCount} active virtual machines...
             </p>
          </div>
        )}
      </main>

      {/* === Reports Modal (Simplified for space) === */}
      {showDashboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-8 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setShowDashboard(false)} />
           <div className="relative w-full max-w-7xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden max-h-[95vh]">
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                  <div>
                     <h2 className="text-xl font-semibold">Stress Test Metrics</h2>
                     <p className="text-slate-400 text-xs font-medium">Detailed analysis of 1000 real users messaging</p>
                  </div>
                  <button onClick={() => setShowDashboard(false)} className="w-10 h-10 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-colors"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                 <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <SummaryCard title="Connections" value={metrics?.active_connections ?? 0} icon={<Users size={16} />} color="blue" pulsing={isRunning} />
                    <SummaryCard title="Avg Latency" value={metrics ? metrics.avg_latency_ms.toFixed(1) : '0.0'} unit="ms" icon={<Clock size={16} />} color="orange" />
                    <SummaryCard title="Throughput" value={metrics ? metrics.messages_per_sec.toFixed(1) : '0.0'} unit="msg/s" icon={<Zap size={16} />} color="green" pulsing={isRunning} />
                    <SummaryCard title="CPU Usage" value={metrics ? metrics.cpu_usage_percent.toFixed(1) : '0.0'} unit="%" icon={<Activity size={16} />} color="red" />
                    <SummaryCard title="Error Rate" value={metrics ? metrics.error_rate_percent.toFixed(2) : '0.00'} unit="%" icon={<Activity size={16} />} color="cyan" />
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <ChartSection title="Latency (ms)" data={chartData} dataKey="latency" unit="ms" color="#f59e0b" gradientId="lGrad" />
                    <ChartSection title="CPU Usage (%)" data={chartData} dataKey="cpu" unit="%" color="#3b82f6" gradientId="cGrad" />
                    <ChartSection title="Error Rate (%)" data={chartData} dataKey="errorRate" unit="%" color="#ef4444" gradientId="eGrad" />
                    <ChartSection title="Throughput (msg/s)" data={chartData} dataKey="throughput" unit="msg/s" color="#10b981" gradientId="tGrad" />
                 </div>
              </div>
              <div className="p-6 border-t border-white/5 bg-white/5 flex justify-end">
                <button onClick={() => setShowDashboard(false)} className="px-8 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-all shadow-lg shadow-orange-500/10">Close Report</button>
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
         onSave={(name) => {
            if (!finalStats) return;
            const result = {
               name,
               users: config.target_users,
               throughput: finalStats.messages_per_sec,
               memory: finalStats.memory_mb,
               cpu: finalStats.cpu_usage_percent,
               successRate: ((finalStats.success_messages / (finalStats.total_messages_sent || 1)) * 100),
            };
            const history = JSON.parse(localStorage.getItem('stress_test_history') || '[]');
            localStorage.setItem('stress_test_history', JSON.stringify([result, ...history].slice(0, 20)));
         }}
      />
    </div>
  );
};

export default StressTestingDashboard;
