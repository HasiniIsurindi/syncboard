// In-memory room store.
// Each room tracks connected users, all strokes (completed + in-progress),
// and recent chat messages. Rooms are cleaned up a few minutes after the
// last user leaves, so state briefly survives refreshes/reconnects.

function createRoomStore() {
  const rooms = new Map();

  function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        users: new Map(),      // socketId -> { id, name, color, avatar }
        strokes: new Map(),    // strokeId -> stroke object
        strokeOrder: [],       // strokeIds in the order they were created
        messages: [],          // chat history (capped)
        cleanupTimer: null,
      });
    }
    const room = rooms.get(roomId);
    if (room.cleanupTimer) {
      clearTimeout(room.cleanupTimer);
      room.cleanupTimer = null;
    }
    return room;
  }

  function startStroke(roomId, socketId, stroke) {
    const room = getOrCreateRoom(roomId);
    // Freehand strokes carry a flat "points" array that grows via addPoint().
    // Shape strokes (line/rect/circle/arrow) arrive complete with "segments"
    // — one array of points per disconnected line (e.g. an arrow has 3).
    const points = Array.isArray(stroke.points) ? [...stroke.points] : [];
    const segments = Array.isArray(stroke.segments)
      ? stroke.segments.map((seg) => seg.map((p) => ({ ...p })))
      : undefined;

    const stored = { ...stroke, userId: socketId, points };
    if (segments) stored.segments = segments;

    room.strokes.set(stroke.id, stored);
    room.strokeOrder.push(stroke.id);
  }

  function addPoint(roomId, strokeId, point) {
    const room = rooms.get(roomId);
    if (!room) return;
    const stroke = room.strokes.get(strokeId);
    if (stroke) stroke.points.push(point);
  }

  function getAllStrokes(roomId) {
    const room = rooms.get(roomId);
    if (!room) return [];
    return room.strokeOrder.map((id) => room.strokes.get(id)).filter(Boolean);
  }

  // Removes the most recent stroke created by this socket. Used for per-user undo.
  function undoLastStroke(roomId, socketId) {
    const room = rooms.get(roomId);
    if (!room) return null;
    for (let i = room.strokeOrder.length - 1; i >= 0; i--) {
      const id = room.strokeOrder[i];
      const stroke = room.strokes.get(id);
      if (stroke && stroke.userId === socketId) {
        room.strokes.delete(id);
        room.strokeOrder.splice(i, 1);
        return id;
      }
    }
    return null;
  }

  function clearRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.strokes.clear();
    room.strokeOrder = [];
  }

  // Called when a room becomes empty. Keeps state alive for a grace period
  // in case someone refreshes the page, then frees memory.
  function maybeCleanupRoom(roomId) {
    const room = rooms.get(roomId);
    if (!room) return;
    room.cleanupTimer = setTimeout(() => {
      const r = rooms.get(roomId);
      if (r && r.users.size === 0) rooms.delete(roomId);
    }, 10 * 60 * 1000); // 10 minutes
  }

  function roomCount() {
    return rooms.size;
  }

  return {
    getOrCreateRoom,
    startStroke,
    addPoint,
    getAllStrokes,
    undoLastStroke,
    clearRoom,
    maybeCleanupRoom,
    roomCount,
  };
}

module.exports = { createRoomStore };
