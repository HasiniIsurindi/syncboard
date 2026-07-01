'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getSocket } from '@/lib/socket';
import { BRUSH_SIZES, uid } from '@/lib/colors';
import { isShapeTool, shapeToSegments } from '@/lib/shapes';
import Header from './Header';
import Toolbar from './Toolbar';
import ChatPanel from './ChatPanel';
import UsersPanel from './UsersPanel';

const CANVAS_W = 900;
const CANVAS_H = 600;
const TYPING_TIMEOUT_MS = 1500;

function drawStroke(ctx, stroke) {
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Shape strokes (line/rect/circle/arrow) carry one or more disconnected
  // "segments" — e.g. an arrow is a shaft segment plus two head segments.
  if (stroke.segments && stroke.segments.length) {
    stroke.segments.forEach((seg) => {
      if (!seg || seg.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let i = 1; i < seg.length; i++) ctx.lineTo(seg[i].x, seg[i].y);
      ctx.stroke();
    });
    return;
  }

  // Freehand strokes are a single continuous polyline.
  if (!stroke.points || stroke.points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
  for (let i = 1; i < stroke.points.length; i++) {
    ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
  }
  ctx.stroke();
}

function typingLabelFor(names) {
  if (names.length === 0) return null;
  if (names.length === 1) return `${names[0]} is typing...`;
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
  return `${names.length} people are typing...`;
}

export default function CanvasBoard({ roomId, name, onLeave }) {
  const canvasRef = useRef(null);

  // Mutable, non-React-rendered drawing state for performance.
  const strokesMapRef = useRef(new Map());
  const strokeOrderRef = useRef([]);
  const isDrawingRef = useRef(false);
  const currentStrokeIdRef = useRef(null);
  const previewShapeRef = useRef(null); // { tool, start, end, color, size } while dragging a shape
  const lastCursorEmitRef = useRef(0);
  const typingTimeoutRef = useRef(null);
  const isTypingRef = useRef(false);

  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState(null);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#3B82F6');
  const [brushSize, setBrushSize] = useState(1);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [cursors, setCursors] = useState({});
  const [typingUsers, setTypingUsers] = useState({}); // userId -> name
  const [sidePanel, setSidePanel] = useState('chat');
  const [notification, setNotification] = useState(null);

  const notify = useCallback((msg, dur = 2600) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), dur);
  }, []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Grid background
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    strokeOrderRef.current.forEach((id) => {
      const stroke = strokesMapRef.current.get(id);
      if (stroke) drawStroke(ctx, stroke);
    });

    // Live dashed preview while dragging a shape tool
    if (previewShapeRef.current) {
      const { tool: pTool, start, end, color: c, size } = previewShapeRef.current;
      const segments = shapeToSegments(pTool, start, end);
      ctx.save();
      ctx.setLineDash([6, 5]);
      ctx.globalAlpha = 0.75;
      drawStroke(ctx, { segments, color: c, size });
      ctx.restore();
    }
  }, []);

  // ── Socket connection + event wiring ──
  useEffect(() => {
    const socket = getSocket();
    socket.connect();

    socket.on('connect', () => {
      setConnected(true);
      setMyId(socket.id);
      socket.emit('join-room', { roomId, name });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('board-state', ({ strokes, users: roomUsers, messages: roomMessages }) => {
      strokesMapRef.current.clear();
      strokeOrderRef.current = [];
      strokes.forEach((s) => {
        strokesMapRef.current.set(s.id, s);
        strokeOrderRef.current.push(s.id);
      });
      setUsers(roomUsers);
      setMessages(roomMessages);
      redraw();
    });

    socket.on('user-joined', (user) => {
      notify(`🟢 ${user.name} joined the room`);
    });

    socket.on('user-left', (leftId) => {
      setUsers((prev) => {
        const left = prev.find((u) => u.id === leftId);
        if (left) notify(`⚪ ${left.name} left the room`);
        return prev;
      });
      setCursors((prev) => {
        const next = { ...prev };
        delete next[leftId];
        return next;
      });
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[leftId];
        return next;
      });
    });

    socket.on('users-update', (list) => setUsers(list));

    socket.on('draw-start', (stroke) => {
      strokesMapRef.current.set(stroke.id, stroke);
      strokeOrderRef.current.push(stroke.id);
      redraw();
    });

    socket.on('draw-point', ({ id, point }) => {
      const stroke = strokesMapRef.current.get(id);
      if (stroke) {
        stroke.points.push(point);
        redraw();
      }
    });

    socket.on('stroke-removed', ({ id }) => {
      strokesMapRef.current.delete(id);
      strokeOrderRef.current = strokeOrderRef.current.filter((x) => x !== id);
      redraw();
    });

    socket.on('board-cleared', () => {
      strokesMapRef.current.clear();
      strokeOrderRef.current = [];
      redraw();
      notify('🗑️ Board cleared');
    });

    socket.on('cursor-update', ({ userId, x, y, name: uname, color: ucolor }) => {
      setCursors((prev) => ({ ...prev, [userId]: { x, y, name: uname, color: ucolor } }));
    });

    socket.on('chat-message', (message) => {
      setMessages((prev) => [...prev, message]);
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[message.userId];
        return next;
      });
    });

    socket.on('typing', ({ userId, name: uname }) => {
      setTypingUsers((prev) => ({ ...prev, [userId]: uname }));
    });

    socket.on('stop-typing', ({ userId }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('board-state');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('users-update');
      socket.off('draw-start');
      socket.off('draw-point');
      socket.off('stroke-removed');
      socket.off('board-cleared');
      socket.off('cursor-update');
      socket.off('chat-message');
      socket.off('typing');
      socket.off('stop-typing');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, name]);

  // ── Drawing handlers ──
  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const onPointerDown = (e) => {
    const pos = getPos(e);

    if (isShapeTool(tool)) {
      isDrawingRef.current = true;
      previewShapeRef.current = { tool, start: pos, end: pos, color, size: BRUSH_SIZES[brushSize] };
      redraw();
      return;
    }

    const socket = getSocket();
    const id = uid();
    const stroke = {
      id,
      points: [pos],
      color: tool === 'eraser' ? '#0F1117' : color,
      size: tool === 'eraser' ? 24 : BRUSH_SIZES[brushSize],
      userId: myId,
    };
    isDrawingRef.current = true;
    currentStrokeIdRef.current = id;
    strokesMapRef.current.set(id, stroke);
    strokeOrderRef.current.push(id);
    redraw();
    socket.emit('draw-start', stroke);
  };

  const onPointerMove = (e) => {
    const pos = getPos(e);
    const socket = getSocket();

    // Throttle cursor broadcasts to ~20/sec to avoid flooding the socket.
    const now = Date.now();
    if (now - lastCursorEmitRef.current > 50) {
      lastCursorEmitRef.current = now;
      socket.emit('cursor-move', pos);
    }

    if (isShapeTool(tool)) {
      if (!isDrawingRef.current || !previewShapeRef.current) return;
      previewShapeRef.current.end = pos;
      redraw();
      return;
    }

    if (!isDrawingRef.current || !currentStrokeIdRef.current) return;
    const stroke = strokesMapRef.current.get(currentStrokeIdRef.current);
    if (!stroke) return;
    stroke.points.push(pos);
    redraw();
    socket.emit('draw-point', { id: stroke.id, point: pos });
  };

  const onPointerUp = () => {
    const socket = getSocket();

    if (isShapeTool(tool)) {
      if (!isDrawingRef.current || !previewShapeRef.current) return;
      const { tool: shapeTool, start, end, color: c, size } = previewShapeRef.current;
      isDrawingRef.current = false;
      previewShapeRef.current = null;

      // Ignore an accidental click with no real drag.
      const dist = Math.hypot(end.x - start.x, end.y - start.y);
      if (dist < 3) { redraw(); return; }

      const segments = shapeToSegments(shapeTool, start, end);
      const id = uid();
      const stroke = { id, segments, points: [start, end], color: c, size, userId: myId, shape: shapeTool };
      strokesMapRef.current.set(id, stroke);
      strokeOrderRef.current.push(id);
      redraw();
      socket.emit('draw-start', stroke);
      socket.emit('draw-end', { id });
      return;
    }

    if (!isDrawingRef.current || !currentStrokeIdRef.current) return;
    const id = currentStrokeIdRef.current;
    isDrawingRef.current = false;
    currentStrokeIdRef.current = null;
    socket.emit('draw-end', { id });
  };

  const handleUndo = () => getSocket().emit('undo');
  const handleClear = () => getSocket().emit('clear-board');
  const handleSendChat = (text) => {
    getSocket().emit('chat-message', text);
    clearTimeout(typingTimeoutRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      getSocket().emit('stop-typing');
    }
  };

  const handleTyping = () => {
    const socket = getSocket();
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit('typing');
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit('stop-typing');
    }, TYPING_TIMEOUT_MS);
  };

  const handleExportPNG = () => {
    const canvas = canvasRef.current;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `syncboard-${roomId}.png`;
    a.click();
    notify('📥 Exported as PNG');
  };

  useEffect(() => { redraw(); }, [redraw]);

  const otherTypingNames = Object.entries(typingUsers)
    .filter(([id]) => id !== myId)
    .map(([, n]) => n);
  const typingLabel = typingLabelFor(otherTypingNames);

  return (
    <div className="flex flex-col h-screen bg-[#080C12] text-slate-50 overflow-hidden">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#0F1522]/95 border border-white/10 rounded-lg px-4 py-2 text-[13px] font-medium backdrop-blur-md shadow-lg pointer-events-none">
          {notification}
        </div>
      )}

      <Header
        roomId={roomId}
        users={users}
        myId={myId}
        connected={connected}
        onExportPNG={handleExportPNG}
        onLeave={onLeave}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          tool={tool} setTool={setTool}
          color={color} setColor={setColor}
          brushSize={brushSize} setBrushSize={setBrushSize}
          onUndo={handleUndo} onClear={handleClear}
        />

        <div className="flex-1 relative overflow-hidden bg-[#0F1117]">
          <canvas
            ref={canvasRef}
            width={CANVAS_W}
            height={CANVAS_H}
            className="block w-full h-full cursor-crosshair"
            onMouseDown={onPointerDown}
            onMouseMove={onPointerMove}
            onMouseUp={onPointerUp}
            onMouseLeave={onPointerUp}
            onTouchStart={onPointerDown}
            onTouchMove={onPointerMove}
            onTouchEnd={onPointerUp}
          />

          <div className="absolute inset-0 pointer-events-none">
            {Object.entries(cursors).map(([id, cur]) => {
              const canvas = canvasRef.current;
              const rect = canvas ? canvas.getBoundingClientRect() : { width: CANVAS_W, height: CANVAS_H };
              const scaleX = rect.width / CANVAS_W;
              const scaleY = rect.height / CANVAS_H;
              return (
                <div key={id} className="absolute z-10" style={{ left: cur.x * scaleX, top: cur.y * scaleY }}>
                  <div
                    className="w-3 h-3"
                    style={{
                      borderRadius: '50% 50% 50% 0',
                      background: cur.color,
                      transform: 'rotate(-45deg)',
                      boxShadow: `0 0 6px ${cur.color}`,
                    }}
                  />
                  <div
                    className="text-white text-[10px] px-1.5 py-0.5 rounded mt-0.5 whitespace-nowrap"
                    style={{ background: cur.color }}
                  >
                    {cur.name}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="w-[260px] bg-[#0A101C]/90 border-l border-white/10 flex flex-col shrink-0 overflow-hidden">
          <div className="flex border-b border-white/10">
            {[['chat', '💬 chat'], ['users', '👥 users']].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setSidePanel(id)}
                className={`flex-1 py-2 text-[11px] font-medium border-b-2 transition ${
                  sidePanel === id
                    ? 'text-blue-300 border-blue-500'
                    : 'text-slate-600 border-transparent hover:text-slate-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {sidePanel === 'chat' && (
            <ChatPanel
              messages={messages}
              myId={myId}
              onSend={handleSendChat}
              typingLabel={typingLabel}
              onTyping={handleTyping}
            />
          )}
          {sidePanel === 'users' && <UsersPanel users={users} myId={myId} />}
        </aside>
      </div>
    </div>
  );
}
