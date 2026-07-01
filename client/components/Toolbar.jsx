'use client';

import { COLORS, BRUSH_SIZES } from '@/lib/colors';

export default function Toolbar({
  tool, setTool,
  color, setColor,
  brushSize, setBrushSize,
  onUndo, onClear,
}) {
  return (
    <aside className="w-[52px] bg-[#0A101C]/80 border-r border-white/10 flex flex-col items-center py-2.5 gap-1 overflow-y-auto shrink-0">
      <button
        onClick={() => setTool('pen')}
        title="Pen"
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${
          tool === 'pen' ? 'bg-blue-500/20 border border-blue-500/50' : 'border border-transparent hover:bg-white/5'
        }`}
      >
        ✏️
      </button>
      <button
        onClick={() => setTool('eraser')}
        title="Eraser"
        className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${
          tool === 'eraser' ? 'bg-blue-500/20 border border-blue-500/50' : 'border border-transparent hover:bg-white/5'
        }`}
      >
        ⬜
      </button>

      <div className="w-7 h-px bg-white/10 my-1" />

      {[
        ['line', '╱', 'Line'],
        ['rect', '▭', 'Rectangle'],
        ['circle', '◯', 'Circle'],
        ['arrow', '↗', 'Arrow'],
      ].map(([id, icon, label]) => (
        <button
          key={id}
          onClick={() => setTool(id)}
          title={label}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-base ${
            tool === id ? 'bg-blue-500/20 border border-blue-500/50' : 'border border-transparent hover:bg-white/5'
          }`}
        >
          {icon}
        </button>
      ))}

      <div className="w-7 h-px bg-white/10 my-1" />

      <div className="grid grid-cols-2 gap-1">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => { setColor(c); setTool('pen'); }}
            className="w-4 h-4 rounded"
            style={{
              background: c,
              border: color === c && tool === 'pen' ? '2px solid #fff' : '2px solid transparent',
              boxShadow: color === c && tool === 'pen' ? `0 0 0 1px ${c}` : 'none',
            }}
          />
        ))}
      </div>

      <div className="w-7 h-px bg-white/10 my-1" />

      {BRUSH_SIZES.map((s, i) => (
        <button
          key={s}
          onClick={() => setBrushSize(i)}
          title={`${s}px`}
          className={`w-9 h-7 rounded-md flex items-center justify-center ${
            brushSize === i ? 'bg-blue-500/15 border border-blue-500/30' : 'border border-transparent hover:bg-white/5'
          }`}
        >
          <div
            style={{
              width: s,
              height: s,
              borderRadius: '50%',
              background: brushSize === i ? '#3B82F6' : '#64748B',
            }}
          />
        </button>
      ))}

      <div className="w-7 h-px bg-white/10 my-1" />

      <button
        onClick={onUndo}
        title="Undo your last stroke"
        className="w-9 h-[30px] rounded-md border border-white/10 bg-white/[0.03] text-slate-400 text-sm hover:bg-white/10"
      >
        ↩
      </button>
      <button
        onClick={onClear}
        title="Clear board for everyone"
        className="w-9 h-[30px] rounded-md border border-white/10 bg-white/[0.03] text-slate-400 text-sm hover:bg-white/10"
      >
        🗑
      </button>
    </aside>
  );
}
