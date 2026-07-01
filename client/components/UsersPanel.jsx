'use client';

export default function UsersPanel({ users, myId }) {
  return (
    <div className="p-3 flex flex-col gap-1.5">
      <div className="text-[11px] text-slate-500 font-semibold mb-1 uppercase tracking-wide">
        Online — {users.length}
      </div>
      {users.map((u) => (
        <div key={u.id} className="flex items-center gap-2.5 px-2.5 py-2 bg-white/[0.03] rounded-lg">
          <div
            className="w-8 h-8 rounded-full text-[13px] font-bold flex items-center justify-center text-white"
            style={{ background: u.color }}
          >
            {u.avatar}
          </div>
          <div>
            <div className="text-[13px] font-medium text-slate-300">
              {u.name}{u.id === myId ? ' (you)' : ''}
            </div>
            <div className="text-[10px] text-green-500 mt-0.5">● online</div>
          </div>
          <div className="w-2 h-2 rounded-full ml-auto" style={{ background: u.color }} />
        </div>
      ))}
    </div>
  );
}
