'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

function randomRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

export default function LobbyPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');

  const join = (codeOverride) => {
    const finalName = name.trim() || 'Guest';
    const finalRoom = (codeOverride || roomCode).trim().toUpperCase() || randomRoomCode();
    if (typeof window !== 'undefined') {
      localStorage.setItem('syncboard-name', finalName);
    }
    router.push(`/board/${finalRoom}?name=${encodeURIComponent(finalName)}`);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#0F1522]/90 border border-white/10 rounded-2xl p-10 backdrop-blur-xl shadow-2xl text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl text-blue-500">⬡</span>
          <h1 className="text-2xl font-bold tracking-tight">SyncBoard</h1>
        </div>
        <p className="text-slate-500 text-sm mb-8">Real-time collaborative whiteboard</p>

        <div className="space-y-1 text-left">
          <label className="block text-xs text-slate-400 mb-1">Your name</label>
          <input
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500"
            placeholder="e.g. Pasindu"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={24}
          />

          <label className="block text-xs text-slate-400 mb-1 mt-4">Room code</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono tracking-wider outline-none focus:border-blue-500"
              placeholder="ABC12"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              maxLength={12}
            />
            <button
              onClick={() => join()}
              className="bg-blue-600 hover:bg-blue-500 transition rounded-lg px-4 py-2 text-sm font-semibold"
            >
              Join
            </button>
          </div>
        </div>

        <button
          onClick={() => join(randomRoomCode())}
          className="mt-6 w-full border border-white/10 rounded-lg py-2 text-xs text-slate-400 hover:text-slate-200 transition"
        >
          Create a new room →
        </button>

        <div className="flex flex-wrap gap-2 justify-center mt-8">
          {['Real-time drawing', 'Live cursors', 'Team chat', 'No signup needed'].map((f) => (
            <span
              key={f}
              className="text-[11px] bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full px-3 py-1"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </main>
  );
}
