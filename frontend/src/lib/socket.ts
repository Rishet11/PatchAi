import { io } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually in the store
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
