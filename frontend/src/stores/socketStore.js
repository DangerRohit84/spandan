import { create } from 'zustand'
import { io } from 'socket.io-client'
import { SOCKET_URL } from '../config.js'

export const useSocketStore = create((set, get) => ({
  socket: null,
  isConnected: false,
  currentRoom: null,
  userId: null,
  participants: 0,

  connect: (token, userId) => {
    const { socket: existingSocket } = get()
    if (existingSocket?.connected) {
      return
    }

    // Clean up old socket if it exists but is disconnected
    if (existingSocket) {
      existingSocket.removeAllListeners()
      existingSocket.disconnect()
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      path: '/spandan/socket.io',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    socket.on('connect', () => {
      set({ isConnected: true })
      socket.emit('authenticate', { token })

      // Auto-rejoin room after reconnection
      const { currentRoom, userId: storedUserId } = get()
      if (currentRoom && storedUserId) {
        socket.emit('room:join', { roomCode: currentRoom, userId: storedUserId })
      }
    })

    socket.on('disconnect', () => {
      set({ isConnected: false })
    })

    socket.on('authenticated', (data) => {
      if (!data.success) {
        console.error('Socket authentication failed:', data.error)
      }
    })

    socket.on('room:joined', (data) => {
      set({ 
        currentRoom: data.roomCode,
        participants: data.participants || 0
      })
    })

    socket.on('room:left', (data) => {
      set({ 
        currentRoom: null,
        participants: 0
      })
    })

    set({ socket, userId })
  },

  disconnect: () => {
    const { socket } = get()
    if (socket) {
      socket.removeAllListeners()
      socket.disconnect()
      set({ socket: null, isConnected: false, currentRoom: null, userId: null })
    }
  },

  joinRoom: (roomCode, userId) => {
    const { socket } = get()
    if (socket) {
      set({ currentRoom: roomCode, userId })
      socket.emit('room:join', { roomCode, userId })
    }
  },

  leaveRoom: (roomCode, userId) => {
    const { socket } = get()
    if (socket) {
      socket.emit('room:leave', { roomCode, userId })
      set({ currentRoom: null, participants: 0 })
    }
  },

  submitResponse: (data) => {
    const { socket } = get()
    if (socket) {
      socket.emit('response:submit', data)
    }
  },

  startQuestion: (data) => {
    const { socket } = get()
    if (socket) {
      socket.emit('question:start', data)
    }
  },

  endQuestion: (data) => {
    const { socket } = get()
    if (socket) {
      socket.emit('question:end', data)
    }
  }
}))

export default useSocketStore
