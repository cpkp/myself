import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

const VideoChat = () => {
  const { socket, userId, activeUsers, incomingCall, callAccepted } = useSocket();
  const [selectedUser, setSelectedUser] = useState(null);
  const [onCall, setOnCall] = useState(false);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);

  const ICE_SERVERS = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  // Initialize local stream
  useEffect(() => {
    const setupMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { min: 640, ideal: 1280, max: 1920 },
                   height: { min: 480, ideal: 720, max: 1080 } },
          audio: true
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Error accessing media devices:', err);
        alert('Please allow camera and microphone access');
      }
    };
    setupMedia();

    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Handle incoming call
  useEffect(() => {
    if (incomingCall && socket) {
      // Auto-answer for demo, or show notification
      console.log('Incoming call from:', incomingCall.from);
    }
  }, [incomingCall]);

  // Setup peer connection
  const setupPeerConnection = async (isInitiator, offer = null) => {
    try {
      const peerConnection = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = peerConnection;

      // Add local stream tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStreamRef.current);
        });
      }

      // Handle ICE candidates
      peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit('ice_candidate', {
            to: selectedUser,
            candidate: event.candidate
          });
        }
      };

      // Handle remote stream
      peerConnection.ontrack = (event) => {
        console.log('Remote track received:', event);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
        if (peerConnection.connectionState === 'connected') {
          setOnCall(true);
        }
      };

      if (isInitiator) {
        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('call', {
          from: userId,
          to: selectedUser,
          offer: peerConnection.localDescription
        });
      } else if (offer) {
        // Receive offer and send answer
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer_call', {
          to: incomingCall.from,
          answer: peerConnection.localDescription
        });
      }
    } catch (err) {
      console.error('Error setting up peer connection:', err);
    }
  };

  // Handle socket events for offer/answer/ICE
  useEffect(() => {
    if (!socket) return;

    socket.on('call_answered', async (data) => {
      if (peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        );
      }
    });

    socket.on('ice_candidate', async (data) => {
      if (peerConnectionRef.current && data.candidate) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    });

    return () => {
      socket.off('call_answered');
      socket.off('ice_candidate');
    };
  }, [socket]);

  const startCall = async (user) => {
    setSelectedUser(user);
    await setupPeerConnection(true);
  };

  const acceptCall = async () => {
    setSelectedUser(incomingCall.from);
    await setupPeerConnection(false, incomingCall.offer);
  };

  const endCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
    }
    socket.emit('end_call', { to: selectedUser });
    setOnCall(false);
    setSelectedUser(null);
  };

  return (
    <div className="video-chat-container">
      <h1>📹 Video Chat</h1>
      
      <div className="video-section">
        <div className="video-box">
          <video ref={localVideoRef} autoPlay playsInline muted style={{width: '100%', borderRadius: '8px'}} />
          <p>You ({userId?.slice(0, 8)}...)</p>
        </div>
        {onCall && (
          <div className="video-box">
            <video ref={remoteVideoRef} autoPlay playsInline style={{width: '100%', borderRadius: '8px'}} />
            <p>Remote User</p>
          </div>
        )}
      </div>

      {incomingCall && !onCall && (
        <div className="incoming-call-notification">
          <p>Incoming call from {incomingCall.from}</p>
          <button onClick={acceptCall} className="btn-accept">Accept</button>
          <button onClick={() => setIncomingCall(null)} className="btn-decline">Decline</button>
        </div>
      )}

      {!onCall && (
        <div className="users-list">
          <h3>Available Users:</h3>
          {activeUsers.length > 0 ? (
            <ul>
              {activeUsers.map(user => (
                <li key={user}>
                  <span>{user}</span>
                  <button onClick={() => startCall(user)} className="btn-call">Call</button>
                </li>
              ))}
            </ul>
          ) : (
            <p>No users available</p>
          )}
        </div>
      )}

      {onCall && (
        <button onClick={endCall} className="btn-end-call">End Call</button>
      )}
    </div>
  );
};

export default VideoChat;