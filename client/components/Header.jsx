'use client';

export default function Header({ roomId, users, myId, connected, onExportPNG, onLeave }) {
  return (
    <header className="h-[52px] flex items-center justify-between px-4 border-b border-white/10 bg-[#0A101C]/95 backdrop-blur-md shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-xl text-blue-500">⬡</span>
        <span className="font-bold text-sm tracking-tight">SyncBoard</span>
        <div className="flex items-center gap-1.5 bg-blue-500/10 border border-blue-500/25 rounded-md px-2 py-0.5 text-[11px] font-mono text-blue-300 tracking-wide">
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: connected ? '#22C55E' : '#EF4444' }}
          />
          {roomId}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {users.map((u) => (
          <div
            key={u.id}
            title={u.name}
            className="w-[26px] h-[26px] rounded-full text-[11px] font-bold flex items-center justify-center text-white"
            style={{
              background: u.color,
              border: u.id === myId ? '2px solid #fff' : '2px solid transparent',
            }}
          >
            {u.avatar}
          </div>
        ))}
        <span className="text-xs text-slate-500 ml-1.5">{users.length} online</span>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onExportPNG}
          className="bg-white/5 border border-white/10 rounded-md px-3 py-1 text-xs text-slate-300 hover:bg-white/10 transition"
        >
          Export PNG
        </button>
        <button
          onClick={onLeave}
          className="bg-white/5 border border-white/10 rounded-md px-3 py-1 text-xs text-slate-400 hover:bg-white/10 transition"
        >
          Leave
        </button>
      </div>
    </header>
  );
}
