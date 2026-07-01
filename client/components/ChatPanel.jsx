'use client';

import { useEffect, useRef, useState } from 'react';

function formatTime(isoString) {
  const d = new Date(isoString);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

export default function ChatPanel({ messages, myId, onSend, typingLabel, onTyping }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    onSend(input.trim());
    setInput('');
  };

  const handleChange = (e) => {
    setInput(e.target.value);
    onTyping?.();
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5">
        {messages.map((m) => {
          const isMe = m.userId === myId;
          return (
            <div key={m.id} className={`flex gap-1.5 items-start ${isMe ? 'flex-row-reverse' : ''}`}>
              {!isMe && (
                <div
                  className="w-[26px] h-[26px] rounded-full text-[11px] font-bold flex items-center justify-center text-white shrink-0"
                  style={{ background: m.color }}
                >
                  {m.avatar}
                </div>
              )}
              <div className="max-w-[78%]">
                {!isMe && <div className="text-[10px] text-slate-500 mb-0.5 pl-0.5">{m.name}</div>}
                <div
                  className="px-2.5 py-1.5 text-[13px] leading-snug rounded-xl"
                  style={{
                    background: isMe ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${isMe ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    borderTopRightRadius: isMe ? 4 : undefined,
                    borderTopLeftRadius: isMe ? undefined : 4,
                    color: '#CBD5E1',
                  }}
                >
                  {m.text}
                </div>
                <div className="text-[9px] text-slate-700 mt-0.5 pl-0.5">{formatTime(m.time)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {typingLabel && (
        <div className="px-3 pb-1 text-[11px] text-slate-500 italic">{typingLabel}</div>
      )}
      <div className="flex gap-1.5 p-2 border-t border-white/10">
        <input
          className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-[13px] outline-none focus:border-blue-500"
          placeholder="Message..."
          value={input}
          onChange={handleChange}
          onKeyDown={(e) => e.key === 'Enter' && send()}
        />
        <button
          onClick={send}
          className="w-8 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-sm flex items-center justify-center"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
