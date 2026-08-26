import React from 'react';

export default function SupportChat({ token }: { token?: string }) {
  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl text-slate-300">
      <h3 className="text-sm font-bold text-white mb-2">Live Support Session</h3>
      <p className="text-xs text-slate-400">Token: {token || 'N/A'}</p>
    </div>
  );
}
