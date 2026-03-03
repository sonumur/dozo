import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ChatRoom from './components/ChatRoom';
import { io } from 'socket.io-client';

const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';
const socket = io(socketUrl);

function App() {
    const [mode, setMode] = useState<'landing' | 'text' | 'video'>('landing');
    const [userCount, setUserCount] = useState<number>(0);

    useEffect(() => {
        socket.on('userCount', ({ count }) => {
            setUserCount(count);
        });
        return () => {
            socket.off('userCount');
        };
    }, []);

    const handleStart = (selectedMode: 'text' | 'video') => {
        setMode(selectedMode);
    };

    const handleExit = () => {
        setMode('landing');
    };

    return (
        <div className="app-wrapper">
            <div className="live-header">
                <div className="user-count-badge">
                    {userCount.toLocaleString()} people online
                </div>
            </div>
            {mode === 'landing' ? (
                <LandingPage onStart={handleStart} />
            ) : (
                <ChatRoom mode={mode} onExit={handleExit} socket={socket} />
            )}
        </div>
    );
}

export default App;
