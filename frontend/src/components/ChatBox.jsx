import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

const ChatBox = ({ roomId }) => {
  const { socket } = useSocket();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!socket) return;

    socket.on('receive_message', (data) => {
      setMessages(prev => [...prev, {
        text: data.text,
        sender: data.sender,
        timestamp: data.timestamp,
        isSelf: data.senderSocketId === socket.id
      }]);
    });

    return () => {
      socket.off('receive_message');
    };
  }, [socket]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputValue.trim() && socket && roomId) {
      socket.emit('send_message', {
        roomId,
        text: inputValue,
        sender: 'You',
        timestamp: new Date().toLocaleTimeString()
      });
      setInputValue('');
    }
  };

  return (
    <div className="chat-box">
      <div className="messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.isSelf ? 'self' : 'other'}`}>
            <div className="message-content">
              <p className="sender">{msg.sender}</p>
              <p className="text">{msg.text}</p>
              <p className="timestamp">{msg.timestamp}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={sendMessage} className="message-input">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
};

export default ChatBox;
