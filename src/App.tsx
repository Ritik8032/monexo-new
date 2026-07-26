import React, { useState, useEffect } from 'react';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  Flag,
  XCircle,
  Send,
  Eye,
  RefreshCw,
  Search,
  Lock,
  FileText,
  Database,
  UserCheck,
  Bell,
  MessageSquare,
  Sparkles,
  Clock,
  Filter,
  Check,
  X,
  ChevronDown,
  Info,
  ShieldCheck,
  UserX,
  Activity
} from 'lucide-react';

interface AggregatedUser {
  userId: string;
  phone: string;
  realName: string;
  balance: number;
  kycStatus: number;
  smsCount: number;
  notifCount: number;
  pendingReviewCount: number;
  flaggedCount: number;
  latestEventType: string;
  latestStatus: string;
  latestAction: {
    action: string;
    notes: string;
    timestamp: string;
  } | null;
}

interface AuditAction {
  _id: string;
  adminPhone: string;
  userPhone: string;
  action: string;
  targetType: string;
  previousStatus: string;
  newStatus: string;
  notes: string;
  timestamp: string;
}

interface LiveLogItem {
  _id: string;
  userId: string;
  userPhone: string;
  sender: string;
  type: 'SMS' | 'NOTIFICATION';
  rawMessage: string;
  sanitizedMessage?: string;
  eventType?: string;
  status?: string;
  metadata?: any;
  timestamp: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'take-action' | 'live-logs' | 'ingestion' | 'audit'>('take-action');
  const [users, setUsers] = useState<AggregatedUser[]>([]);
  const [liveLogs, setLiveLogs] = useState<LiveLogItem[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserForAction, setSelectedUserForAction] = useState<AggregatedUser | null>(null);
  const [selectedJsonModal, setSelectedJsonModal] = useState<any | null>(null);

  // Take Action Modal State
  const [actionType, setActionType] = useState<'APPROVE' | 'REVIEW' | 'FLAG' | 'REJECT' | 'SEND_NOTIF'>('APPROVE');
  const [actionNotes, setActionNotes] = useState('');
  const [notifyUserCheck, setNotifyUserCheck] = useState(true);
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Ingestion Simulator State
  const [ingestPhone, setIngestPhone] = useState('7870873927');
  const [ingestType, setIngestType] = useState<'sms' | 'notification'>('sms');
  const [ingestSender, setIngestSender] = useState('AX-BANK-SMS');
  const [ingestRawText, setIngestRawText] = useState('A/C 918273645019 credited with Rs. 2,500.00 via UPI/420192837192. OTP is 8492. Passcode: mysecret123');
  const [consentVerified, setConsentVerified] = useState(true);
  const [ingesting, setIngesting] = useState(false);
  const [ingestResult, setIngestResult] = useState<any | null>(null);

  // Open Action Menu for a specific user
  const [openDropdownUserId, setOpenDropdownUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/xxapi/admin/aggregated-user-logs?search=${encodeURIComponent(searchTerm)}`);
      const json = await res.json();
      if (json.code === 0 && Array.isArray(json.data)) {
        setUsers(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch aggregated users:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveLogs = async () => {
    try {
      const res = await fetch('/xxapi/admin/all-live-logs');
      const json = await res.json();
      if (json.code === 0 && Array.isArray(json.data)) {
        setLiveLogs(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch live logs:', e);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const res = await fetch('/xxapi/admin/action-history');
      const json = await res.json();
      if (json.code === 0 && Array.isArray(json.data)) {
        setAuditLogs(json.data);
      }
    } catch (e) {
      console.error('Failed to fetch audit logs:', e);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchLiveLogs();
    fetchAuditLogs();
  }, [searchTerm]);

  const handleExecuteAction = async () => {
    if (!selectedUserForAction) return;
    setSubmittingAction(true);
    setActionFeedback(null);

    try {
      const res = await fetch('/xxapi/admin/take-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserForAction.userId,
          action: actionType,
          notes: actionNotes || `Action ${actionType} triggered by admin.`,
          notifyUser: notifyUserCheck
        })
      });
      const json = await res.json();
      if (json.code === 0) {
        setActionFeedback({
          type: 'success',
          message: json.msg || `Action ${actionType} executed successfully!`
        });
        setTimeout(() => {
          setSelectedUserForAction(null);
          setActionNotes('');
          setActionFeedback(null);
          fetchUsers();
          fetchAuditLogs();
        }, 1200);
      } else {
        setActionFeedback({
          type: 'error',
          message: json.msg || 'Failed to execute administrative action.'
        });
      }
    } catch (e: any) {
      setActionFeedback({
        type: 'error',
        message: 'Network error executing action: ' + (e.message || String(e))
      });
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleIngestPayload = async () => {
    setIngesting(true);
    setIngestResult(null);

    try {
      const res = await fetch('/xxapi/ingest/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: ingestPhone,
          type: ingestType,
          sender: ingestSender,
          rawContent: ingestRawText,
          consentVerified: consentVerified
        })
      });
      const json = await res.json();
      setIngestResult(json);
      if (json.code === 0) {
        fetchUsers();
      }
    } catch (e: any) {
      setIngestResult({
        code: 500,
        msg: 'Failed to complete ingestion request: ' + (e.message || String(e))
      });
    } finally {
      setIngesting(false);
    }
  };

  // Helper for status badge colors
  const getStatusBadge = (status: string) => {
    switch ((status || '').toUpperCase()) {
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3.5 h-3.5" /> Approved</span>;
      case 'FLAGGED':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200"><Flag className="w-3.5 h-3.5" /> Flagged</span>;
      case 'IN_REVIEW':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><AlertTriangle className="w-3.5 h-3.5" /> In Review</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-300"><XCircle className="w-3.5 h-3.5" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200"><Clock className="w-3.5 h-3.5" /> Pending</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-purple-500 selection:text-white">
      {/* Top Security & Brand Navbar */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                Monexo Admin <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">Control Hub</span>
              </h1>
              <p className="text-xs text-slate-400">Authorized User Workflow & Compliance Management</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-3 py-1.5 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
              <span>Security Headers Active</span>
            </div>
            <a
              href="/admin"
              className="text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" /> Full Panel
            </a>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner */}
        <div className="bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-800/40 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-purple-400 flex items-center gap-1 mb-1">
                <Sparkles className="w-3.5 h-3.5" /> Authorized Internal Dashboard
              </span>
              <h2 className="text-xl font-bold text-white">Administrative User Workflow & Data Ingestion</h2>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                Securely ingest explicit user-consented SMS & system notifications, perform automated PII sanitization, and execute administrative "Take Action" workflows for auditing and support tracking.
              </p>
            </div>
            <button
              onClick={() => { fetchUsers(); fetchAuditLogs(); }}
              className="self-start md:self-auto bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Telemetry
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 space-x-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('take-action')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'take-action'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-4 h-4" /> User List & "Take Action" ({users.length})
          </button>
          <button
            onClick={() => { setActiveTab('live-logs'); fetchLiveLogs(); }}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'live-logs'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-sky-400" /> Received SMS & Notifications ({liveLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('ingestion')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'ingestion'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-4 h-4" /> Ingestion Hub
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 px-4 text-sm font-bold border-b-2 whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'audit'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" /> Audit Action Logs ({auditLogs.length})
          </button>
        </div>

        {/* TAB 1: USER LIST & TAKE ACTION WORKFLOW */}
        {activeTab === 'take-action' && (
          <div className="space-y-4">
            {/* Search Filter */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by user phone or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="text-xs text-slate-400 flex items-center gap-4">
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> KYC Verified</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500"></div> Pending Review</span>
                <span className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-red-500"></div> Flagged</span>
              </div>
            </div>

            {/* Users Table */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">User Identifier</th>
                      <th className="py-3.5 px-4">Real Name</th>
                      <th className="py-3.5 px-4">Balance</th>
                      <th className="py-3.5 px-4">SMS Logs</th>
                      <th className="py-3.5 px-4">Notifications</th>
                      <th className="py-3.5 px-4">Workflow Status</th>
                      <th className="py-3.5 px-4 text-right">Take Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-500">
                          {loading ? 'Loading user workflow records...' : 'No users found matching query.'}
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.userId} className="hover:bg-slate-900/50 transition">
                          <td className="py-3.5 px-4 font-mono text-purple-300 font-bold">
                            {user.phone || user.userId}
                          </td>
                          <td className="py-3.5 px-4 text-white font-medium">
                            {user.realName}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-emerald-400 font-semibold">
                            ₹{user.balance.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              <MessageSquare className="w-3 h-3 text-sky-400" /> {user.smsCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              <Bell className="w-3 h-3 text-purple-400" /> {user.notifCount}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            {getStatusBadge(user.latestStatus)}
                          </td>
                          <td className="py-3.5 px-4 text-right relative">
                            <button
                              onClick={() => {
                                setSelectedUserForAction(user);
                                setActionType('APPROVE');
                                setActionNotes('');
                              }}
                              className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-3 py-1.5 rounded-lg text-xs transition shadow-md shadow-purple-600/20 inline-flex items-center gap-1"
                            >
                              Take Action <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: LIVE RECEIVED SMS & NOTIFICATIONS LOGS */}
        {activeTab === 'live-logs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-400" /> Live Ingested Device Logs
                </h3>
                <p className="text-xs text-slate-400">All incoming SMS & App Notifications received from Expo mobile devices</p>
              </div>
              <button
                onClick={fetchLiveLogs}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Logs
              </button>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-3.5 px-4">Timestamp</th>
                      <th className="py-3.5 px-4">User Phone</th>
                      <th className="py-3.5 px-4">Sender / Origin</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Message / Details</th>
                      <th className="py-3.5 px-4 text-right">JSON Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {liveLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-500">
                          No live SMS or notification logs received yet.
                        </td>
                      </tr>
                    ) : (
                      liveLogs.map((log) => (
                        <tr key={log._id} className="hover:bg-slate-900/50 transition">
                          <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-purple-300 font-bold">
                            {log.userPhone}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-400 font-bold font-mono">
                            {log.sender}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              log.type === 'SMS' 
                                ? 'bg-sky-950 text-sky-300 border-sky-800' 
                                : 'bg-purple-950 text-purple-300 border-purple-800'
                            }`}>
                              {log.type}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 max-w-md">
                            <p className="text-slate-200 line-clamp-2">{log.rawMessage}</p>
                            {log.sanitizedMessage && log.sanitizedMessage !== log.rawMessage && (
                              <p className="text-[11px] text-emerald-400 mt-1 font-mono">
                                Sanitized: {log.sanitizedMessage}
                              </p>
                            )}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => setSelectedJsonModal(log)}
                              className="bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono text-[11px] px-2.5 py-1 rounded border border-slate-700 transition inline-flex items-center gap-1"
                            >
                              <FileText className="w-3 h-3" /> View JSON
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DATA INGESTION HUB */}
        {activeTab === 'ingestion' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payload Ingestion Simulator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-400" /> System Notification & SMS Ingestion
                </h3>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30">
                  Real-time PII Sanitizer
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Target User Phone / Identifier</label>
                  <input
                    type="text"
                    value={ingestPhone}
                    onChange={(e) => setIngestPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Content Type</label>
                    <select
                      value={ingestType}
                      onChange={(e: any) => setIngestType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-purple-500"
                    >
                      <option value="sms">User-Consented SMS</option>
                      <option value="notification">System Notification</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Sender / Channel</label>
                    <input
                      type="text"
                      value={ingestSender}
                      onChange={(e) => setIngestSender(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Raw Payload Content (Will be auto-sanitized)</label>
                  <textarea
                    rows={4}
                    value={ingestRawText}
                    onChange={(e) => setIngestRawText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-mono focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="flex items-center space-x-2 bg-slate-900 p-3 rounded-lg border border-slate-800">
                  <input
                    type="checkbox"
                    id="consent"
                    checked={consentVerified}
                    onChange={(e) => setConsentVerified(e.target.checked)}
                    className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <label htmlFor="consent" className="text-slate-300 font-medium cursor-pointer text-xs">
                    Verified explicit user consent for administrative transaction tracking
                  </label>
                </div>

                <button
                  onClick={handleIngestPayload}
                  disabled={ingesting}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center justify-center gap-2"
                >
                  {ingesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Sanitize & Ingest Payload
                </button>
              </div>
            </div>

            {/* Live Ingestion Output & Sanitization Result */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" /> Ingestion & Masking Telemetry
                  </h3>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950 border border-emerald-800 px-2 py-0.5 rounded">
                    Auto PII Masking
                  </span>
                </div>

                {ingestResult ? (
                  <div className="space-y-3 font-mono text-xs">
                    <div className={`p-3 rounded-lg border ${ingestResult.code === 0 ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300' : 'bg-red-950/50 border-red-800 text-red-300'}`}>
                      {ingestResult.msg}
                    </div>

                    {ingestResult.data && (
                      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-2 text-slate-300">
                        <p><span className="text-slate-500">Record ID:</span> {ingestResult.data.id}</p>
                        <p><span className="text-slate-500">User Phone:</span> {ingestResult.data.userPhone}</p>
                        <p><span className="text-slate-500">Event Type:</span> <span className="text-purple-400 font-bold">{ingestResult.data.eventType}</span></p>
                        <p><span className="text-slate-500">Sanitized Payload:</span></p>
                        <div className="bg-slate-950 p-3 rounded-lg text-emerald-300 border border-slate-800">
                          {ingestResult.data.sanitizedMessage}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 space-y-2">
                    <Lock className="w-8 h-8 mx-auto text-slate-600" />
                    <p className="text-xs">Submit a payload on the left to view automated PII masking and extracted metadata.</p>
                  </div>
                )}
              </div>

              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-[11px] text-purple-300">
                <p className="font-semibold mb-1 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5" /> PII Masking Rules Applied:
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-purple-300/80">
                  <li>OTPs and Passcodes masked as <code>****</code></li>
                  <li>Account / Card numbers masked as <code>****-****-****-XXXX</code></li>
                  <li>Amounts & UTR reference metadata automatically extracted</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: AUDIT ACTION HISTORY */}
        {activeTab === 'audit' && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-400" /> Compliance Audit Trail
              </h3>
              <span className="text-xs text-slate-400">Recorded Administrative Actions ({auditLogs.length})</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 uppercase tracking-wider text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Timestamp</th>
                    <th className="py-3.5 px-4">Admin</th>
                    <th className="py-3.5 px-4">Target User</th>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Target</th>
                    <th className="py-3.5 px-4">Status Update</th>
                    <th className="py-3.5 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No administrative audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log._id} className="hover:bg-slate-900/50 transition">
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-purple-300 font-bold">
                          {log.adminPhone}
                        </td>
                        <td className="py-3 px-4 text-white font-bold">
                          {log.userPhone}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800 font-bold">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {log.targetType}
                        </td>
                        <td className="py-3 px-4 text-emerald-400">
                          {log.previousStatus} &rarr; <span className="font-bold">{log.newStatus}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans max-w-xs truncate">
                          {log.notes}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* TAKE ACTION MODAL */}
      {selectedUserForAction && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-400" /> Execute Administrative Action
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  User: <span className="text-purple-300 font-mono font-bold">{selectedUserForAction.phone}</span> ({selectedUserForAction.realName})
                </p>
              </div>
              <button
                onClick={() => setSelectedUserForAction(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Action</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActionType('APPROVE')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      actionType === 'APPROVE'
                        ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400" /> Approve Workflow
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('REVIEW')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      actionType === 'REVIEW'
                        ? 'bg-amber-950 border-amber-500 text-amber-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400" /> Secondary Review
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('FLAG')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      actionType === 'FLAG'
                        ? 'bg-red-950 border-red-500 text-red-300'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <Flag className="w-4 h-4 text-red-400" /> Flag Account
                  </button>

                  <button
                    type="button"
                    onClick={() => setActionType('REJECT')}
                    className={`p-2.5 rounded-xl border text-left font-bold transition flex items-center gap-2 ${
                      actionType === 'REJECT'
                        ? 'bg-slate-800 border-slate-500 text-slate-200'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-slate-400" /> Reject Event
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Administrative Notes</label>
                <textarea
                  rows={3}
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder="Enter specific audit justification or support notes..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="notifyUserModal"
                  checked={notifyUserCheck}
                  onChange={(e) => setNotifyUserCheck(e.target.checked)}
                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor="notifyUserModal" className="text-slate-300 font-medium cursor-pointer">
                  Send automated system notification to user regarding this update
                </label>
              </div>

              {actionFeedback && (
                <div
                  className={`p-3 rounded-xl border text-xs font-semibold ${
                    actionFeedback.type === 'success'
                      ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300'
                      : 'bg-red-950/80 border-red-600 text-red-300'
                  }`}
                >
                  {actionFeedback.message}
                </div>
              )}

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedUserForAction(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteAction}
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                >
                  {submittingAction && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Confirm & Execute Action
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON INSPECTOR MODAL */}
      {selectedJsonModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-400" /> Log JSON Payloads & Receiver Details
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: <span className="text-sky-300 font-mono">{selectedJsonModal._id}</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedJsonModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-x-auto max-h-96 text-emerald-400">
                <pre>{JSON.stringify(selectedJsonModal, null, 2)}</pre>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(selectedJsonModal, null, 2));
                    alert('JSON copied to clipboard!');
                  }}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition"
                >
                  Copy JSON
                </button>
                <button
                  onClick={() => setSelectedJsonModal(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 font-bold text-xs"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

