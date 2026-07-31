import React, { useState, useEffect, useRef } from 'react';
import {
  Headphones,
  Clock,
  Send,
  Image,
  Film,
  Mic,
  Paperclip,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  User,
  Phone,
  ShieldCheck,
  Bot,
  FileText,
  X,
  MessageCircle
} from 'lucide-react';

interface Message {
  sender: 'user' | 'admin' | 'system';
  senderName?: string;
  text?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'voice' | 'document' | string;
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

export default function SupportChat({ token }: { token: string }) {
  const [session, setSession] = useState<SupportSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [valid, setValid] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState('10:00');
  const [isExpired, setIsExpired] = useState(false);
  const [showMediaMenu, setShowMediaMenu] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileType, setSelectedFileType] = useState<'image' | 'video' | 'voice' | 'document'>('image');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const fetchSessionInfo = async () => {
    try {
      const res = await fetch(`/api/support/session-info?token=${encodeURIComponent(token)}`);
      const json = await res.json();
      if (json.code === 0 && json.valid && json.session) {
        setSession(json.session);
        setValid(true);
      } else {
        setValid(false);
        setErrorMsg(json.msg || 'Support session expired or invalid.');
        if (json.session) setSession(json.session);
      }
    } catch (e: any) {
      console.error('Failed to fetch session info:', e);
      setErrorMsg('Network error connecting to support server.');
      setValid(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionInfo();
    const interval = setInterval(() => {
      fetchSessionInfo();
    }, 2500);
    return () => clearInterval(interval);
  }, [token]);

  // Timer countdown from expiresAt
  useEffect(() => {
    if (!session || !session.expiresAt) return;

    const timer = setInterval(() => {
      const expTime = new Date(session.expiresAt).getTime();
      const now = Date.now();
      const diffSec = Math.floor((expTime - now) / 1000);

      if (diffSec <= 0) {
        setTimeLeftStr('00:00');
        setIsExpired(true);
        setValid(false);
        setErrorMsg('Support Session Expired (10 minutes validity lapsed).');
        clearInterval(timer);
      } else {
        const mins = Math.floor(diffSec / 60);
        const secs = diffSec % 60;
        setTimeLeftStr(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session?.expiresAt]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages?.length]);

  const handleSendMessage = async (textToSend?: string, mediaUrl?: string, mediaType?: string, mediaName?: string) => {
    if ((!textToSend && !inputText.trim() && !mediaUrl) || sending) return;
    setSending(true);

    const messageText = textToSend || inputText.trim();

    try {
      const res = await fetch('/api/support/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          text: messageText,
          mediaUrl,
          mediaType,
          mediaName,
          sender: 'user',
          senderName: session?.userFullName || 'User'
        })
      });
      const json = await res.json();
      if (json.code === 0) {
        setInputText('');
        fetchSessionInfo();
      } else {
        alert(json.msg || 'Failed to send message');
      }
    } catch (e: any) {
      alert('Error sending message: ' + e.message);
    } finally {
      setSending(false);
      setShowMediaMenu(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setShowMediaMenu(false);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/support/upload', {
        method: 'POST',
        body: formData
      });
      const json = await res.json();

      if (json.code === 0 && json.fileUrl) {
        await handleSendMessage('', json.fileUrl, json.mediaType || selectedFileType, json.fileName || file.name);
      } else {
        alert(json.msg || 'File upload failed');
      }
    } catch (e: any) {
      alert('File upload error: ' + e.message);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-semibold text-cyan-400">Connecting to Monexo Live Support Representative...</p>
        </div>
      </div>
    );
  }

  if (valid === false || isExpired || session?.status === 'expired' || session?.status === 'closed') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 bg-red-500/20 text-red-400 border border-red-500/40 rounded-full flex items-center justify-center mx-auto animate-pulse">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Link Expired / Invalid Token</h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            {errorMsg || 'Aapka temporary support session link expired ho gaya hai ya token invalid hai.'}
          </p>
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-400 text-left space-y-2">
            <p className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-cyan-400" /> Need Live Support Again?
            </p>
            <p>1. Open Monexo Telegram Support Bot.</p>
            <p>2. Type <span className="text-cyan-300 font-mono">"Human Agent"</span> to get a fresh 10-minute live support link.</p>
          </div>
          <a
            href="https://t.me/"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-2 w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm rounded-xl transition shadow-lg shadow-cyan-600/30"
          >
            <MessageCircle className="w-4 h-4" /> Open Telegram Support Bot
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 p-4 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Monexo Live Support Agent <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              </h1>
              <p className="text-xs text-slate-400">
                User: <span className="text-cyan-300 font-mono">{session?.phone}</span> | ID: <span className="text-slate-300 font-mono">{session?.userId}</span>
              </p>
            </div>
          </div>

          {/* Session Countdown Badge */}
          <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="text-slate-400">Session Timer:</span>
            <span className="font-mono font-bold text-amber-400">{timeLeftStr}</span>
          </div>
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col space-y-4 overflow-y-auto">
        {/* User Account & AI Issue Summary Box */}
        <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-4 space-y-2 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-cyan-300" /> AI Discribed User Problem & Context
            </span>
            <span className="text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full font-medium">
              Verified User
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-950/80 p-3 rounded-xl border border-slate-800">
            {session?.aiProblemSummary || 'User requested human customer care assistance.'}
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Main Balance: <strong className="text-emerald-400">₹{session?.balance || 0}</strong></span>
            <span>KYC Status: <strong className="text-cyan-300">{session?.kycStatus || 'Approved'}</strong></span>
            <span>Token: <strong className="text-slate-300 font-mono">{session?.token}</strong></span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="space-y-3 flex-1 pb-20">
          {session?.messages?.map((msg, index) => {
            if (msg.sender === 'system') {
              return (
                <div key={index} className="text-center my-2">
                  <span className="inline-block bg-slate-900 border border-slate-800 text-[11px] text-slate-400 px-3 py-1 rounded-full font-mono">
                    {msg.text}
                  </span>
                </div>
              );
            }

            const isUser = msg.sender === 'user';

            return (
              <div
                key={index}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1`}
              >
                <span className="text-[10px] text-slate-400 px-1">
                  {msg.senderName || (isUser ? 'You' : 'Support Representative')} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3.5 space-y-2 text-sm shadow-md ${
                    isUser
                      ? 'bg-cyan-600 text-white rounded-br-none'
                      : 'bg-slate-800 border border-slate-700 text-slate-100 rounded-bl-none'
                  }`}
                >
                  {/* Media Content */}
                  {msg.mediaUrl && (
                    <div className="rounded-xl overflow-hidden bg-black/40 p-1 border border-white/10">
                      {msg.mediaType === 'image' && (
                        <a href={msg.mediaUrl} target="_blank" rel="noreferrer">
                          <img src={msg.mediaUrl} alt="Uploaded photo" className="max-h-60 w-auto rounded-lg object-contain hover:opacity-90 transition" />
                        </a>
                      )}
                      {msg.mediaType === 'video' && (
                        <video src={msg.mediaUrl} controls className="max-h-60 w-full rounded-lg" />
                      )}
                      {msg.mediaType === 'voice' && (
                        <audio src={msg.mediaUrl} controls className="w-full" />
                      )}
                      {msg.mediaType === 'document' && (
                        <a
                          href={msg.mediaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 p-2 text-xs font-semibold text-cyan-300 hover:underline"
                        >
                          <FileText className="w-4 h-4" /> {msg.mediaName || 'Attachment Document'}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Text Content */}
                  {msg.text && <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>
      </div>

      {/* Input Action Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/95 border-t border-slate-800 p-3 z-30 backdrop-blur-md">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Media Option Bar Toggle */}
          {showMediaMenu && (
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 grid grid-cols-4 gap-2 shadow-xl animate-in fade-in slide-in-from-bottom-3">
              <button
                onClick={() => triggerFileInput('image')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 transition text-xs font-semibold space-y-1"
              >
                <Image className="w-5 h-5 text-purple-400" />
                <span>Send Photo</span>
              </button>
              <button
                onClick={() => triggerFileInput('video')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-blue-950/60 hover:bg-blue-900/60 border border-blue-800/50 text-blue-300 transition text-xs font-semibold space-y-1"
              >
                <Film className="w-5 h-5 text-blue-400" />
                <span>Send Video</span>
              </button>
              <button
                onClick={() => triggerFileInput('voice')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/50 text-emerald-300 transition text-xs font-semibold space-y-1"
              >
                <Mic className="w-5 h-5 text-emerald-400" />
                <span>Send Voice</span>
              </button>
              <button
                onClick={() => triggerFileInput('document')}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-amber-950/60 hover:bg-amber-900/60 border border-amber-800/50 text-amber-300 transition text-xs font-semibold space-y-1"
              >
                <Paperclip className="w-5 h-5 text-amber-400" />
                <span>Send Document</span>
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMediaMenu(!showMediaMenu)}
              className={`p-2.5 rounded-xl border transition ${
                showMediaMenu
                  ? 'bg-cyan-600 border-cyan-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
              title="Attach File / Voice / Video"
            >
              <Paperclip className="w-5 h-5" />
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
              placeholder="Type your query or reply here..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none h-11"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={sending || uploading || (!inputText.trim())}
              className="px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-sm transition shadow-lg shadow-cyan-600/30 flex items-center justify-center min-w-[50px]"
            >
              {sending || uploading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
