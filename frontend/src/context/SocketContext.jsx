import React, { createContext, useContext, useState, useEffect } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [userId, setUserId] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000', {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      // Auto-register with a random user ID
      const id = `user_${Math.random().toString(36).substr(2, 9)}`;
      setUserId(id);
      newSocket.emit('register', id);
    });

    newSocket.on('user_list', (users) => {
      setActiveUsers(users.filter(u => u !== userId));
    });

    newSocket.on('incoming_call', (data) => {
      setIncomingCall(data);
    });

    newSocket.on('call_answered', (data) => {
      setCallAccepted(true);
    });

    newSocket.on('call_ended', () => {
      setCallAccepted(false);
      setIncomingCall(null);
    });

    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  return (
    <SocketContext.Provider value={{
      socket,
      userId,
      activeUsers,
      incomingCall,
      callAccepted,
      setIncomingCall,
      setCallAccepted
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
