import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Clock,
  Search,
  MessageSquare,
  Send,
  Image,
  Film,
  Mic,
  Paperclip,
  PlusCircle,
  X,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Copy,
  ExternalLink,
  Bot,
  FileText,
  User,
  Phone,
  ShieldCheck,
  BookOpen
} from 'lucide-react';

interface Message {
  sender: 'user' | 'admin' | 'system';
  senderName?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaName?: string;
  timestamp: string;
}

interface SupportSessionData {
  token: string;
  userId: string;
  phone: string;
  userFullName: string;
  balance: number;
  kycStatus: string;
  aiProblemSummary: string;
  status: 'active' | 'closed' | 'expired';
  createdAt: string;
  expiresAt: string;
  messages: Message[];
}

export default function GuideSupportTab() {
  const [sessions, setSessions] = useState<SupportSessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSession, setSelectedSession] = useState<SupportSessionData | null>(null);

  // Admin Live Chat Modal State
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'video' | 'voice' | 'document'>('image');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Live countdown state updated every second
  const [nowTime, setNowTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNowTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/support/admin/sessions');
      const json = await res.json();
      if (json.code === 0 && Array.isArray(json.data)) {
        setSessions(json.data);
        if (selectedSession) {
          const updated = json.data.find((s: any) => s.token === selectedSession.token);
          if (updated) setSelectedSession(updated);
        }
      }
    } catch (e) {
      console.error('Failed to fetch admin support sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(() => {
      fetchSessions();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedSession?.messages?.length]);

  const calculateTimeLeft = (expiresAtStr: string) => {
    const exp = new Date(expiresAtStr).getTime();
    const diffSec = Math.floor((exp - nowTime) / 1000);

    if (diffSec <= 0) {
      return { text: 'EXPIRED', isExpired: true, seconds: 0 };
    }

    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;
    return {
      text: `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`,
      isExpired: false,
      seconds: diffSec
    };
  };

  const handleSendMessage = async () => {
    if (!selectedSession || !inputText.trim() || sending) return;
    setSending(true);

    try {
      const res = await fetch('/api/support/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: selectedSession.token,
          text: inputText.trim(),
          sender: 'admin',
          senderName: 'Monexo Support Representative'
        })
      });
      const json = await res.json();
      if (json.code === 0) {
        setInputText('');
        fetchSessions();
      } else {
        alert(json.msg || 'Failed to send admin message');
      }
    } catch (e: any) {
      alert('Error sending admin message: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSession) return;

    setUploading(true);
    setShowMediaMenu(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const uploadRes = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData
      });
      const uploadJson = await uploadRes.json();

      if (uploadJson.code === 0 && uploadJson.fileUrl) {
        const msgRes = await fetch('/api/support/send-message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: selectedSession.token,
            text: '',
            mediaUrl: uploadJson.fileUrl,
            mediaType: uploadJson.mediaType || selectedFileType,
            mediaName: uploadJson.fileName || file.name,
            sender: 'admin',
            senderName: 'Monexo Support Representative'
          })
        });
        const msgJson = await msgRes.json();
        if (msgJson.code === 0) {
          fetchSessions();
        } else {
          alert(msgJson.msg || 'Failed to send file');
        }
      } else {
        alert(uploadJson.msg || 'File upload failed');
      }
    } catch (e: any) {
      alert('Upload error: ' + e.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerFileInput = (type: 'image' | 'video' | 'voice' | 'document') => {
    setSelectedFileType(type);
    if (fileInputRef.current) {
      if (type === 'image') fileInputRef.current.accept = 'image/*';
      else if (type === 'video') fileInputRef.current.accept = 'video/*';
      else if (type === 'voice') fileInputRef.current.accept = 'audio/*';
      else fileInputRef.current.accept = '*/*';
      fileInputRef.current.click();
    }
  };

  const handleExtendSession = async (token: string) => {
    try {
      const res = await fetch('/api/support/admin/extend-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, minutes: 10 })
      });
      const json = await res.json();
      if (json.code === 0) {
        alert('Session extended by 10 minutes!');
        fetchSessions();
      }
    } catch (e: any) {
      alert('Extend session error: ' + e.message);
    }
  };

  const handleCloseSession = async (token: string) => {
    if (!confirm('Are you sure you want to close this support session?')) return;
    try {
      const res = await fetch('/api/support/admin/close-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const json = await res.json();
      if (json.code === 0) {
        fetchSessions();
      }
    } catch (e: any) {
      alert('Close session error: ' + e.message);
    }
  };

  const filteredSessions = sessions.filter(s =>
    s.phone.includes(searchTerm) ||
    s.token.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.aiProblemSummary.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

      {/* Guide & Architecture Section */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-indigo-950/60 border border-cyan-800/40 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Live Support Session Guide & Token Management
              </h3>
              <p className="text-xs text-slate-300">
                10-Minute Temporary Chat Sessions generated from Telegram Support Bot requests.
              </p>
            </div>
          </div>
          <button
            onClick={fetchSessions}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Sessions
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-400 flex items-center gap-1">
              <Clock className="w-4 h-4 text-amber-400" /> 10-Min Live Timer Count
            </span>
            <p className="text-slate-400 leading-relaxed">
              Every token created in Telegram has a strict 10-minute expiry window. Live countdown ticks in real-time from the exact generation timestamp.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-400 flex items-center gap-1">
              <Bot className="w-4 h-4 text-cyan-300" /> AI Problem Extraction
            </span>
            <p className="text-slate-400 leading-relaxed">
              Before transferring to a human representative, Telegram bot automatically captures and summarizes the exact problem described by the user.
            </p>
          </div>

          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-400 flex items-center gap-1">
              <Paperclip className="w-4 h-4 text-purple-400" /> Rich Media Chat
            </span>
            <p className="text-slate-400 leading-relaxed">
              Both user and support representatives can exchange text messages, screenshots, video recordings, voice notes, and document files.
            </p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Mobile, Token, or Issue..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="text-xs text-slate-400 flex items-center space-x-3">
          <span>Total Sessions: <strong className="text-white">{sessions.length}</strong></span>
          <span>Active: <strong className="text-emerald-400">{sessions.filter(s => s.status === 'active' && new Date(s.expiresAt) > new Date()).length}</strong></span>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Live Timer & Status</th>
                <th className="py-3.5 px-4">User Details</th>
                <th className="py-3.5 px-4">Session Token</th>
                <th className="py-3.5 px-4">AI Discribed User Problem</th>
                <th className="py-3.5 px-4 text-right">Live Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-500">
                    No support chat sessions found. Trigger a "Human Agent" request in Telegram bot to see it live here.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((session) => {
                  const timer = calculateTimeLeft(session.expiresAt);
                  const isClosed = session.status === 'closed';

                  return (
                    <tr key={session.token} className="hover:bg-slate-800/40 transition">
                      {/* Live Timer Column */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {isClosed ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            Closed
                          </span>
                        ) : timer.isExpired ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-950/80 text-red-400 border border-red-800">
                            <Clock className="w-3.5 h-3.5" /> EXPIRED (10m)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700 animate-pulse">
                            <Clock className="w-3.5 h-3.5 text-amber-400" /> {timer.text} remaining
                          </span>
                        )}
                        <p className="text-[10px] text-slate-500 mt-1">
                          Created: {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </td>

                      {/* User Info Column */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-white text-xs">{session.phone}</div>
                        <div className="text-[10px] text-slate-400">ID: {session.userId}</div>
                        <div className="text-[10px] text-emerald-400">Wallet: ₹{session.balance}</div>
                      </td>

                      {/* Token Column */}
                      <td className="py-4 px-4 whitespace-nowrap font-mono text-xs">
                        <div className="flex items-center space-x-1">
                          <span className="text-cyan-300 font-bold">{session.token}</span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`https://monexo-new.onrender.com/support?token=${session.token}`);
                              alert('Live Support Link copied!');
                            }}
                            className="text-slate-500 hover:text-white p-1"
                            title="Copy Support Link"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* AI Discribed Problem Column */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 font-mono truncate">
                          {session.aiProblemSummary || 'No issue description provided.'}
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="py-4 px-4 text-right whitespace-nowrap space-x-2">
                        <button
                          onClick={() => setSelectedSession(session)}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> Open Chat
                        </button>

                        {!isClosed && (
                          <>
                            <button
                              onClick={() => handleExtendSession(session.token)}
                              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold text-xs rounded-xl border border-amber-800/40 transition inline-flex items-center gap-1"
                              title="Extend Session +10 Minutes"
                            >
                              <PlusCircle className="w-3.5 h-3.5" /> +10m
                            </button>
                            <button
                              onClick={() => handleCloseSession(session.token)}
                              className="px-2 py-1.5 bg-slate-800 hover:bg-red-950 text-red-400 font-semibold text-xs rounded-xl border border-red-800/40 transition"
                              title="Close Session"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Live Support Chat Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-600/30 border border-cyan-500/40 flex items-center justify-center text-cyan-300">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Live Chat with {selectedSession.phone}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Token: <span className="text-cyan-300 font-mono">{selectedSession.token}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={`/support?token=${selectedSession.token}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> User View
                </a>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* AI Problem Summary Box inside Admin Modal */}
            <div className="bg-slate-950 p-3.5 border-b border-slate-800 text-xs space-y-1">
              <span className="font-bold text-cyan-400 flex items-center gap-1">
                <Bot className="w-4 h-4" /> AI Problem Context from Telegram:
              </span>
              <p className="text-slate-300 font-mono leading-relaxed bg-slate-900 p-2.5 rounded-xl border border-slate-800">
                {selectedSession.aiProblemSummary}
              </p>
            </div>

            {/* Modal Message Stream */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950">
              {selectedSession.messages.map((msg, idx) => {
                const isAdmin = msg.sender === 'admin';
                const isSystem = msg.sender === 'system';

                if (isSystem) {
                  return (
                    <div key={idx} className="text-center my-2">
                      <span className="inline-block bg-slate-900 border border-slate-800 text-[11px] text-slate-400 px-3 py-1 rounded-full font-mono">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <span className="text-[10px] text-slate-400 px-1">
                      {msg.senderName || (isAdmin ? 'Support Agent' : 'User')} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>

                    <div
                      className={`max-w-[85%] rounded-2xl p-3 space-y-2 text-xs shadow-md ${
                        isAdmin
                          ? 'bg-purple-600 text-white rounded-br-none'
                          : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none'
                      }`}
                    >
                      {msg.mediaUrl && (
                        <div className="rounded-xl overflow-hidden bg-black/40 p-1 border border-white/10">
                          {msg.mediaType === 'image' && (
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                              <img src={msg.mediaUrl} alt="Photo" className="max-h-60 w-auto rounded-lg object-contain" />
                            </a>
                          )}
                          {msg.mediaType === 'video' && (
                            <video src={msg.mediaUrl} controls className="max-h-60 w-full rounded-lg" />
                          )}
                          {msg.mediaType === 'voice' && (
                            <audio src={msg.mediaUrl} controls className="w-full" />
                          )}
                          {msg.mediaType === 'document' && (
                            <a href={msg.mediaUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 p-1 text-cyan-300 font-semibold underline">
                              <FileText className="w-4 h-4" /> {msg.mediaName || 'Attachment'}
                            </a>
                          )}
                        </div>
                      )}

                      {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Modal Input Footer */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
              {showMediaMenu && (
                <div className="bg-slate-950 border border-slate-800 rounded-2xl p-2.5 grid grid-cols-4 gap-2">
                  <button onClick={() => triggerFileInput('image')} className="p-2 rounded-xl bg-purple-950 border border-purple-800 text-purple-300 text-xs font-semibold flex items-center justify-center gap-1">
                    <Image className="w-4 h-4" /> Photo
                  </button>
                  <button onClick={() => triggerFileInput('video')} className="p-2 rounded-xl bg-blue-950 border border-blue-800 text-blue-300 text-xs font-semibold flex items-center justify-center gap-1">
                    <Film className="w-4 h-4" /> Video
                  </button>
                  <button onClick={() => triggerFileInput('voice')} className="p-2 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1">
                    <Mic className="w-4 h-4" /> Voice
                  </button>
                  <button onClick={() => triggerFileInput('document')} className="p-2 rounded-xl bg-amber-950 border border-amber-800 text-amber-300 text-xs font-semibold flex items-center justify-center gap-1">
                    <Paperclip className="w-4 h-4" /> File
                  </button>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowMediaMenu(!showMediaMenu)}
                  className="p-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type reply to customer..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none h-10"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={sending || uploading || !inputText.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5"
                >
                  {sending || uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
