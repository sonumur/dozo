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
    const isNegotiating = useRef(false);
    const pendingIceCandidates = useRef<RTCIceCandidateInit[]>([]);

    useEffect(() => {
        const stopMedia = () => {
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    track.stop();
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
                    setMessages([{ text: 'Error: Camera and Microphone access is required. Please enable them and refresh.', type: 'system' }]);
                    stopMedia();
                    return;
                }
            }
            socket.emit('join', { mode });
        };

        initProcess();

        socket.on('waiting', () => {
            setPartnerId(currentPartnerId => {
                if (!currentPartnerId) {
                    setStatus('waiting');
                }
                return currentPartnerId;
            });
        });

        socket.on('paired', async ({ partnerId, initiator }) => {
            setStatus('paired');
            setPartnerId(partnerId);
            setMessages([{ text: 'You are now chatting with a random stranger.', type: 'system' }]);

            if (mode === 'video' && localStreamRef.current) {
                const pc = createPeerConnection(partnerId);

                localStreamRef.current.getTracks().forEach(track => {
                    if (localStreamRef.current) {
                        const senderExists = pc.getSenders().some(s => s.track === track);
                        if (!senderExists) pc.addTrack(track, localStreamRef.current);
                    }
                });

                if (initiator) {
                    try {
                        isNegotiating.current = true;
                        const offer = await pc.createOffer();
                        await pc.setLocalDescription(offer);
                        socket.emit('signal', { target: partnerId, signal: { sdp: pc.localDescription } });
                    } catch (err) {
                        console.error('Failed to create offer', err);
                    } finally {
                        isNegotiating.current = false;
                    }
                }
            }
        });

        socket.on('signal', async ({ from, signal }) => {
            if (mode !== 'video') return;

            if (!peerConnectionRef.current) {
                createPeerConnection(from);
            }
            const pc = peerConnectionRef.current;
            if (!pc) return;

            try {
                if (signal.sdp) {
                    if (isNegotiating.current || pc.signalingState !== 'stable') {
                        if (signal.sdp.type === 'offer') return;
                    }

                    await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

                    while (pendingIceCandidates.current.length > 0) {
                        const candidate = pendingIceCandidates.current.shift();
                        if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }

                    if (signal.sdp.type === 'offer' && localStreamRef.current) {
                        localStreamRef.current.getTracks().forEach(track => {
                            if (localStreamRef.current) {
                                const senderExists = pc.getSenders().some(s => s.track === track);
                                if (!senderExists) pc.addTrack(track, localStreamRef.current);
                            }
                        });

                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit('signal', { target: from, signal: { sdp: pc.localDescription } });
                    }
                } else if (signal.ice) {
                    if (pc.remoteDescription && pc.remoteDescription.type) {
                        await pc.addIceCandidate(new RTCIceCandidate(signal.ice));
                    } else {
                        pendingIceCandidates.current.push(signal.ice);
                    }
                }
            } catch (err) {
                console.error('Error handling signal.', err);
            }
        });

        socket.on('message', ({ text }) => {
            setMessages(prev => [...prev, { text, type: 'stranger' }]);
        });

        socket.on('partnerDisconnected', () => {
            setPartnerId(null);
            setMessages(prev => [...prev, { text: 'Stranger has disconnected.', type: 'system' }]);
            setStatus('waiting');
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
            stopMedia();
        };
    }, [mode, socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const createPeerConnection = (targetId: string) => {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                setMessages(prev => [...prev, { text: 'Connection lost. Please try "New" if it does not recover.', type: 'system' }]);
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('signal', { target: targetId, signal: { ice: event.candidate } });
            }
        };

        pc.ontrack = (event) => {
            if (remoteVideoRef.current && event.streams[0]) {
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
                <div className="header-title-area">
                    <img src="/logo.png" alt="Dozu" className="header-logo" />
                    <h2 style={{ color: '#0044cc', margin: 0 }}>Dozu {mode === 'video' ? 'Video' : 'Text'}</h2>
                </div>
                <div>
                    <button className="btn-classic" onClick={onExit} style={{ marginRight: '10px' }}>Exit</button>
                    <button className="btn-classic" style={{ fontWeight: 'bold' }} onClick={handleNext}>New</button>
                </div>
            </div>

            <div className="content-classic">
                <div className="video-area-classic" style={{ display: mode === 'video' ? 'flex' : 'none' }}>
                    <div className="video-box">
                        {status === 'waiting' && (
                            <div className="video-placeholder" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#000', zIndex: 2 }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div className="spinner"></div>
                                    <div style={{ fontSize: '12px', marginTop: '10px', color: '#fff' }}>Finding...</div>
                                </div>
                            </div>
                        )}
                        <video
                            ref={remoteVideoRef}
                            autoPlay
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onLoadedMetadata={() => remoteVideoRef.current?.play().catch(() => { })}
                        />
                    </div>
                    <div className="video-box">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            playsInline
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onLoadedMetadata={() => localVideoRef.current?.play().catch(() => { })}
                        />
                    </div>
                </div>

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
