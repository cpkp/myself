import { SocketProvider } from './context/SocketContext';
import VideoChat from './components/VideoChat';
import ChatBox from './components/ChatBox';
import './App.css';

function App() {
  return (
    <SocketProvider>
      <div className="app-container">
        <VideoChat />
        <ChatBox roomId="general" />
      </div>
    </SocketProvider>
  );
}

export default App;