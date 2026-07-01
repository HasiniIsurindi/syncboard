'use client';

import { io } from 'socket.io-client';

// Singleton socket instance shared across the app. We create it lazily
// (and only in the browser) so Next.js server rendering never touches it.
let socket;

export function getSocket() {
  if (!socket) {
    const url = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4000';
    socket = io(url, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
