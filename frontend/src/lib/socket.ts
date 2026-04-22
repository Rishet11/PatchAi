import { io } from 'socket.io-client';
import { BACKEND_URL } from '@/lib/constants';

const SOCKET_URL = BACKEND_URL;

export const socket = io(SOCKET_URL, {
  autoConnect: false, // We'll connect manually in the store
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
});
