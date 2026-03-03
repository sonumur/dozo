import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface ChatRoomProps {
    mode: 'text' | 'video';
    onExit: () => void;
    socket: Socket;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ mode, onExit, socket }) => {
    const [status, setStatus] = useState<'waiting' | 'paired' | 'error'>('waiting');
    const [messages, setMessages] = useState<{ text: string, type: 'me' | 'stranger' | 'system' }[]>([]);
    const [inputText, setInputText] = useState('');
    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const [partnerId, setPartnerId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const localStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const stopMedia = () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    track.stop();
                    console.log(`Stopped track: ${track.kind}`);
                });
                localStreamRef.current = null;
            }
            if (localVideoRef.current) localVideoRef.current.srcObject = null;
        };

        const initProcess = async () => {
            if (mode === 'video') {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                    localStreamRef.current = stream;
                    if (localVideoRef.current) localVideoRef.current.srcObject = stream;
                } catch (err) {
                    console.error('Error accessing media devices.', err);
                    setStatus('error');
                    setMessages([{ text: 'Error: Camera and Microphone access is required for video chat. Please enable them in your browser settings and refresh.', type: 'system' }]);
                    stopMedia(); // Call stopMedia on error
                    return; // Stop if video mode fails to get media
                }
            }

            socket.emit('join', { mode });
        };

        initProcess();

        socket.on('waiting', () => {
            setPartnerId(currentPartnerId => {
                if (!currentPartnerId) {
                    setStatus('waiting');
                    setMessages(prev => {
                        const lastMsg = prev[prev.length - 1];
                        if (lastMsg?.text === 'Looking for someone you can chat with...') return prev;
                        return [...prev, { text: 'Looking for someone you can chat with...', type: 'system' }];
                    });
                }
                return currentPartnerId;
            });
        });

        socket.on('paired', async ({ partnerId }) => {
            setStatus('paired');
            setPartnerId(partnerId);
            setMessages([{ text: 'You are now chatting with a random stranger. Say hi!', type: 'system' }]);

            if (mode === 'video' && localStreamRef.current) {
                const pc = createPeerConnection(partnerId);
                localStreamRef.current.getTracks().forEach(track => {
                    if (localStreamRef.current) pc.addTrack(track, localStreamRef.current);
                });

                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('signal', { target: partnerId, signal: { sdp: pc.localDescription } });
            }
        });

        socket.on('signal', async ({ from, signal }) => {
            if (!peerConnectionRef.current && mode === 'video') {
                createPeerConnection(from);
            }
            const pc = peerConnectionRef.current;
            if (!pc) return;

            if (signal.sdp) {
                await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
                if (signal.sdp.type === 'offer' && localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(track => {
                        if (localStreamRef.current) pc.addTrack(track, localStreamRef.current);
                    });

                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit('signal', { target: from, signal: { sdp: pc.localDescription } });
                }
            } else if (signal.ice) {
                await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
            }
        });

        socket.on('message', ({ text }) => {
            setMessages(prev => [...prev, { text, type: 'stranger' }]);
        });

        socket.on('partnerDisconnected', () => {
            setPartnerId(null);
            setMessages(prev => [...prev, { text: 'Stranger has disconnected.', type: 'system' }]);
            setStatus('paired'); // Keep UI interactive but without partner
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        });

        return () => {
            socket.off('waiting');
            socket.off('paired');
            socket.off('signal');
            socket.off('message');
            socket.off('partnerDisconnected');
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
            stopMedia(); // Call stopMedia in cleanup
        };
    }, [mode, socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const createPeerConnection = (targetId: string) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', { target: targetId, signal: { ice: event.candidate } });
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        peerConnectionRef.current = pc;
        return pc;
    };

    const handleSendMessage = () => {
        if (inputText.trim() && partnerId) {
            socket.emit('message', { text: inputText });
            setMessages(prev => [...prev, { text: inputText, type: 'me' }]);
            setInputText('');
        }
    };

    const handleNext = () => {
        setMessages([]);
        setPartnerId(null);
        setStatus('waiting');
        if (peerConnectionRef.current) {
            peerConnectionRef.current.close();
            peerConnectionRef.current = null;
        }
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        socket.emit('next');
    };

    return (
        <div className="chat-container-classic" style={{ height: 'calc(100vh - 40px)' }}>
            <div className="header-classic">
                <h2 style={{ color: '#0044cc', margin: 0 }}>Dozu {mode === 'video' ? 'Video' : 'Text'}</h2>
                <div>
                    <button className="btn-classic" onClick={onExit} style={{ marginRight: '10px' }}>Exit</button>
                    <button className="btn-classic" style={{ fontWeight: 'bold' }} onClick={handleNext}>New</button>
                </div>
            </div>

            <div className="content-classic">
                {mode === 'video' && (
                    <div className="video-area-classic">
                        <div className="video-box" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                            {status === 'waiting' ? (
                                <div style={{ textAlign: 'center' }}>
                                    <div className="spinner"></div>
                                    <div style={{ fontSize: '12px', marginTop: '10px' }}>Finding...</div>
                                </div>
                            ) : (
                                <video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            )}
                        </div>
                        <div className="video-box">
                            <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                    </div>
                )}

                <div className="msg-area-classic">
                    <div className="messages-list">
                        {messages.map((msg, i) => (
                            <div key={i} className="msg-item">
                                <span className={`msg-${msg.type}`}>
                                    {msg.type === 'me' ? 'You: ' : msg.type === 'stranger' ? 'Stranger: ' : ''}
                                </span>
                                <span>{msg.text}</span>
                            </div>
                        ))}
                        {status === 'waiting' && <div className="finding-text" style={{ padding: '10px 0' }}>Finding...</div>}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="input-area-classic">
                        <textarea
                            className="input-box"
                            placeholder="Type your message..."
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            rows={3}
                            disabled={status === 'error'}
                        />
                        <button
                            className="btn-classic"
                            style={{ height: 'auto', padding: '0 20px', backgroundColor: '#0044cc', color: '#fff', border: '1px solid #0033aa' }}
                            onClick={handleSendMessage}
                            disabled={status === 'error'}
                        >
                            Send
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatRoom;
