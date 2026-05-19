import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  connect() {
    if (!this.socket) {
      // Connect to the same host that serves the Vite app
      this.socket = io(window.location.origin, {
         path: '/socket.io',
      });

      // Pass through events
      this.socket.onAny((event, ...args) => {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(...args));
      });
      
      this.socket.on('connect', () => {
         const callbacks = this.listeners.get('connect') || [];
         callbacks.forEach(cb => cb());
      });
      
      this.socket.on('disconnect', () => {
         const callbacks = this.listeners.get('disconnect') || [];
         callbacks.forEach(cb => cb());
      });
    }
  }

  on(event: string, callback: Function) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.push(callback);
    this.listeners.set(event, callbacks);
  }

  off(event: string, callback?: Function) {
    if (!callback) {
      this.listeners.delete(event);
      return;
    }
    const callbacks = this.listeners.get(event) || [];
    this.listeners.set(event, callbacks.filter(cb => cb !== callback));
  }

  emit(event: string, ...args: any[]) {
    if (this.socket) {
      this.socket.emit(event, ...args);
    }
  }
}

export const socketService = new SocketService();
