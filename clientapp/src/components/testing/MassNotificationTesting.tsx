import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Send, Zap, CheckCircle2, XCircle, Search, Loader2, Play, Square, DownloadCloud } from 'lucide-react';
import { API_BASE_URL } from '../../config/api';
import { toast } from 'react-toastify';

interface UserSocket {
  id: string;
  display_name: string;
  username: string;
  status: 'offline' | 'connecting' | 'online' | 'error' | 'received';
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
  received_user_ids: string[];
}

const API_BASE = `${API_BASE_URL.replace('/v1', '')}/v1/load-test`;

interface SummaryReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetCount: number;
  stats: MetricsSnapshot | null;
}

const SummaryReportModal: React.FC<SummaryReportModalProps> = ({ isOpen, onClose, targetCount, stats }) => {
  if (!isOpen || !stats) return null;

  const downloadJson = () => {
    const exportData = {
      test_case: `Broadcast: ${targetCount} users (${new Date().toLocaleTimeString('vi-VN')})`,
      config: { target_users: targetCount, type: 'broadcast' },
      stats,
      exported_at: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_broadcast_${targetCount}u_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-orange-50">
          <h2 className="text-xl font-bold">Broadcast Test Summary</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><XCircle size={20} /></button>
        </div>
        <div className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Target Users</p>
                <p className="text-2xl font-bold">{targetCount.toLocaleString()}</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Pass / Received</p>
                <p className="text-2xl font-bold text-orange-600">{stats.total_messages_received.toLocaleString()}</p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Success Rate</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {((stats.total_messages_received / (stats.total_messages_sent || 1)) * 100).toFixed(1)}%
                </p>
             </div>
             <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Avg Latency</p>
                <p className="text-2xl font-bold">{stats.avg_latency_ms.toFixed(1)}ms</p>
             </div>
          </div>
          <div className="pt-4 flex gap-3">
             <button onClick={downloadJson} className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-2xl hover:bg-orange-700 transition-all flex items-center justify-center gap-2">
                <DownloadCloud size={20} /> Export Result JSON
             </button>
             <button onClick={onClose} className="px-8 bg-slate-900 text-white font-bold py-3 rounded-2xl">Done</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MassNotificationTesting: React.FC = () => {
  const [users, setUsers] = useState<UserSocket[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    online: 0,
    received: 0,
    error: 0
  });
  const [targetCount, setTargetCount] = useState(1000);
  const [rampUpSeconds, setRampUpSeconds] = useState(10);
  const [broadcastInterval, setBroadcastInterval] = useState(100);
  const [broadcastBatchSize, setBroadcastBatchSize] = useState(1);
  const [showSummary, setShowSummary] = useState(false);
  const [lastMetrics, setLastMetrics] = useState<MetricsSnapshot | null>(null);

  const sseRef = useRef<EventSource | null>(null);
  const prevStatusRef = useRef<string>('idle');

  const connectSSE = useCallback(() => {
    if (sseRef.current) sseRef.current.close();
    const es = new EventSource(`${API_BASE}/stats`);
    sseRef.current = es;
    es.onmessage = (e) => {
      try {
        const snap: MetricsSnapshot = JSON.parse(e.data);
        const prevStatus = prevStatusRef.current;
        
        setLastMetrics(snap);
        setStats(prev => ({
          ...prev,
          online: snap.active_connections,
          received: snap.total_messages_received,
          error: snap.error_messages
        }));

        if ((snap.status === 'completed' || snap.status === 'stopped') && prevStatus === 'running') {
            setShowSummary(true);
        }
        prevStatusRef.current = snap.status;

        if (snap.received_user_ids && snap.received_user_ids.length > 0) {
            const receivedSet = new Set(snap.received_user_ids);
            setUsers(prev => prev.map(u => 
                receivedSet.has(u.id) ? { ...u, status: 'received' } : u
            ));
        }

        // Cập nhật status online dựa trên active_connections
        if (snap.active_connections > 0) {
            setUsers(prev => {
                let onlineNeeded = snap.active_connections;
                // Đã có bao nhiêu người online hoặc received rồi?
                const alreadyOnlineOrDone = prev.filter(u => u.status === 'online' || u.status === 'received').length;
                let toAdd = onlineNeeded - alreadyOnlineOrDone;

                if (toAdd <= 0) return prev;

                return prev.map(u => {
                    if (toAdd > 0 && (u.status === 'offline' || u.status === 'connecting')) {
                        toAdd--;
                        return { ...u, status: 'online' };
                    }
                    return u;
                });
            });
        }
      } catch (err) {}
    };
  }, [users]);

  useEffect(() => {
    connectSSE();
    return () => sseRef.current?.close();
  }, [connectSSE]);

  const handleFetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_users: targetCount }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully fetched ${data.users.length} users`);
        setUsers(data.users);
        setStats({
          total: data.users.length,
          online: 0,
          received: 0,
          error: 0
        });
      } else {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error('Failed to fetch users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectAll = async () => {
    if (users.length === 0) {
      toast.warn('Please load users first');
      return;
    }

    setIsConnecting(true);
    try {
      const userIds = users.map(u => u.id);
      const res = await fetch(`${API_BASE}/mass-connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: userIds, ramp_up_seconds: rampUpSeconds }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
        setUsers(prev => prev.map(u => ({ ...u, status: 'connecting' })));
      } else {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error('Failed to connect: ' + err.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectAll = async () => {
    try {
      await fetch(`${API_BASE}/stop`, { method: 'POST' });
      setUsers(prev => prev.map(u => ({ ...u, status: 'offline' })));
      setStats({ ...stats, online: 0, received: 0, error: 0 });
      toast.info('All connections stopped');
    } catch (e: any) {
      toast.error(`Stop error: ${e.message}`);
    }
  };

  const handleSendMassNotification = async () => {
    if (!message.trim()) {
      toast.warn('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch(`${API_BASE}/broadcast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            message, 
            batch_size: broadcastBatchSize, 
            interval_ms: broadcastInterval 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error);
      }
    } catch (err: any) {
      toast.error('Failed to send broadcast: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.display_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.id.includes(searchTerm)
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white selection:bg-orange-500/30 font-roboto text-sm">
      <SummaryReportModal 
        isOpen={showSummary} 
        onClose={() => setShowSummary(false)} 
        targetCount={targetCount} 
        stats={lastMetrics} 
      />
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/80 backdrop-blur-2xl sticky top-0 z-40">
        <div className="max-w-[1700px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Zap className="text-white w-5 h-5" />
            </div>
            <div>
              <span className="text-xl font-semibold tracking-tight">Mass Notification Testing (Fetch & Connect Flow)</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${stats.online > 0 ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {stats.online} Connectors / {stats.total} Loaded
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5 mr-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Target</label>
                <input 
                    type="number" 
                    value={targetCount} 
                    onChange={e => setTargetCount(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 w-20"
                    placeholder="Count"
                />
            </div>
            <div className="flex flex-col gap-0.5 mr-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Ramp-up</label>
                <input 
                    type="number" 
                    value={rampUpSeconds} 
                    onChange={e => setRampUpSeconds(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 w-16"
                    placeholder="Sec"
                />
            </div>
            {lastMetrics && (
              <button 
                onClick={() => setShowSummary(true)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-slate-300 font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all"
              >
                <DownloadCloud size={16} /> Results
              </button>
            )}
            <button
              onClick={handleFetchUsers}
              disabled={loading}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl border border-white/10 transition-all"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <DownloadCloud size={16} />} 
              Load Users
            </button>

            <button
              onClick={handleConnectAll}
              disabled={isConnecting || users.length === 0}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/10"
            >
              {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} fill="currentColor" />}
              Connect Sockets
            </button>
            <button
              onClick={handleDisconnectAll}
              className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 font-semibold px-4 py-2.5 rounded-xl border border-rose-500/20 transition-all"
            >
              <Square size={16} fill="currentColor" /> Stop
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1700px] mx-auto px-6 py-6 flex flex-col gap-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Users in List</p>
            <p className="text-2xl font-bold tracking-tight">{stats.total}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Server Connections</p>
            <p className="text-2xl font-bold tracking-tight text-green-400">{stats.online}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Received (Pass)</p>
            <p className="text-2xl font-bold tracking-tight text-orange-400">{stats.received}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-sm">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-1.5">Load Errors</p>
            <p className="text-2xl font-bold tracking-tight text-rose-400">{stats.error}</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-5 flex flex-col lg:flex-row items-center gap-5 shadow-xl backdrop-blur-sm">
          <div className="relative flex-1 w-full group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-orange-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Search user by name, username or ID..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 border border-white/10 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all text-sm"
            />
          </div>
          <div className="flex items-center gap-3 w-full lg:w-auto">
            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Batch</label>
                <input 
                    type="number" 
                    value={broadcastBatchSize} 
                    onChange={e => setBroadcastBatchSize(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 w-16"
                />
            </div>
            <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Intv(ms)</label>
                <input 
                    type="number" 
                    value={broadcastInterval} 
                    onChange={e => setBroadcastInterval(Number(e.target.value))}
                    className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500 w-20"
                />
            </div>
            <input
              type="text"
              placeholder="Enter message for broadcast blast..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              className="flex-1 lg:w-64 bg-slate-800/50 border border-white/10 rounded-2xl px-6 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all text-sm"
            />
            <button
              onClick={handleSendMassNotification}
              disabled={isSending || stats.online === 0}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-orange-500/20 whitespace-nowrap active:scale-95 disabled:active:scale-100"
            >
              {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Broadcast Blast
            </button>
          </div>
        </div>

        {/* User Table */}
        <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-md">
          <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 z-10">
                <tr className="bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-white/10">
                    <th className="px-8 py-4">User Details</th>
                    <th className="px-8 py-4">System ID</th>
                    <th className="px-8 py-4 text-center">Status</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                {loading ? (
                    <tr>
                    <td colSpan={3} className="px-8 py-24 text-center">
                        <Loader2 className="animate-spin mx-auto text-orange-500 mb-4" size={40} />
                        <p className="text-slate-400 font-medium tracking-wide">Fetching random users for testing...</p>
                    </td>
                    </tr>
                ) : filteredUsers.length === 0 ? (
                    <tr>
                    <td colSpan={3} className="px-8 py-24 text-center">
                        <Users className="mx-auto text-slate-800 mb-4" size={60} />
                        <p className="text-slate-500 font-bold uppercase tracking-widest">No users loaded - Please scale up and load</p>
                    </td>
                    </tr>
                ) : (
                    filteredUsers.map(user => (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-4">
                            <div className="flex flex-col">
                                <span className="font-bold text-slate-200">{user.display_name}</span>
                                <span className="text-[11px] text-slate-500 font-medium">@{user.username}</span>
                            </div>
                        </td>
                        <td className="px-8 py-4 font-mono text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">{user.id}</td>
                        <td className="px-8 py-4">
                            <div className="flex justify-center">
                                {user.status === 'online' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 font-bold text-[10px] uppercase tracking-widest">
                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                                        Online
                                    </div>
                                )}
                                {user.status === 'connecting' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold text-[10px] uppercase tracking-widest">
                                        <Loader2 size={12} className="animate-spin" />
                                        Connecting...
                                    </div>
                                )}
                                {user.status === 'received' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-500 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/10 scale-105 transition-transform">
                                        <CheckCircle2 size={14} className="animate-bounce" />
                                        PASS / RECEIVED
                                    </div>
                                )}
                                {user.status === 'error' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 font-bold text-[10px] uppercase tracking-widest">
                                        <XCircle size={14} />
                                        Error
                                    </div>
                                )}
                                {user.status === 'offline' && (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-slate-600 font-bold text-[10px] uppercase tracking-widest group-hover:bg-white/10 transition-colors">
                                        <span className="w-1.5 h-1.5 bg-slate-700 rounded-full" />
                                        Offline
                                    </div>
                                )}
                            </div>
                        </td>
                    </tr>
                    ))
                )}
                </tbody>
            </table>
          </div>
        </div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
};

export default MassNotificationTesting;
