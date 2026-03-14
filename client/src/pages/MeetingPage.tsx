import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SimplePeer from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../app/hooks';

const ENDPOINT = import.meta.env.VITE_SOCKET_URL || 'https://prochat-k2jw.onrender.com';

const MeetingPage: React.FC = () => {
    const { meetingId } = useParams();
    const { user } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();

    const [stream, setStream] = useState<MediaStream | null>(null);
    const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
    const [callAccepted, setCallAccepted] = useState(false);
    const [voiceMuted, setVoiceMuted] = useState(false);
    const [videoMuted, setVideoMuted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

    const myVideo = useRef<HTMLVideoElement>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<SimplePeer.Instance | null>(null);
    const socket = useRef<Socket | null>(null);
    const pendingSignals = useRef<any[]>([]);

    useEffect(() => {
        const initializeCall = async () => {
            socket.current = io(ENDPOINT);

            // Get user media first
            // Listen for other users in room
            socket.current.on('user-joined', (socketId: string) => {
                console.log('[MEETING] Other user joined:', socketId);
                // If we are the ones already in the room, we initiate the call
                // But we need to make sure WE have our stream ready
                setCallAccepted(true); // Show the video placeholder early
            });

            // Listen for incoming signals (offer, answer, candidates)
            socket.current.on("call-user", (data: any) => {
                console.log(`[MEETING] Received signal (${data.signal.type || 'candidate'}) from ${data.from}`);
                if (connectionRef.current) {
                    connectionRef.current.signal(data.signal);
                } else if (data.signal.type === 'offer') {
                    setCallAccepted(true);
                    // answerCall will handle it when it runs
                } else {
                    // Buffer candidate signals if they arrive before the peer is ready
                    pendingSignals.current.push(data.signal);
                }
            });

            // Listen for call acceptance (answer/candidates from responder)
            socket.current.on("call-accepted-signal", (signal: any) => {
                console.log(`[MEETING] Received acceptance signal (${signal.type || 'candidate'})`);
                setCallAccepted(true);
                if (connectionRef.current) {
                    connectionRef.current.signal(signal);
                }
            });

            // Get user media
            try {
                const currentStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user' },
                    audio: true
                });
                setStream(currentStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }

                // Now that media is ready, join the room
                socket.current.emit("join meeting", meetingId);

                // Re-attach listeners with the stream available in closure
                socket.current.off('user-joined');
                socket.current.on('user-joined', (socketId: string) => {
                    initiateCall(socketId, currentStream);
                });

                socket.current.off("call-user");
                socket.current.on("call-user", (data: any) => {
                    if (connectionRef.current) {
                        connectionRef.current.signal(data.signal);
                    } else if (data.signal.type === 'offer') {
                        answerCall(data, currentStream);
                    } else {
                        pendingSignals.current.push(data.signal);
                    }
                });

            } catch (error) {
                console.error('[MEETING] Media access error:', error);
                alert('Please allow camera and microphone access');
            }

            return () => {
                socket.current?.disconnect();
                stream?.getTracks().forEach(track => track.stop());
            };
        };

        initializeCall();
    }, [meetingId]);

    const initiateCall = (targetSocketId: string, mediaStream: MediaStream) => {
        const peer = new SimplePeer({
            initiator: true,
            trickle: true,
            stream: mediaStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    {
                        urls: "turn:openrelay.metered.ca:80",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443?transport=tcp",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    }
                ],
                iceCandidatePoolSize: 10
            }
        });

        connectionRef.current = peer;

        peer.on("signal", (data) => {
            console.log('[MEETING] Sending signal to:', targetSocketId);
            socket.current?.emit("call-user", {
                userToCall: targetSocketId,
                signalData: data,
                from: socket.current.id,
                name: user?.name
            });
        });

        peer.on("stream", (remoteStream) => {
            console.log('[MEETING] Received remote stream');
            setRemoteStream(remoteStream);
            setCallAccepted(true);
        });

        // Add Effect to handle remote stream attachment
        connectionRef.current = peer;
    };

    useEffect(() => {
        if (remoteStream && userVideo.current) {
            userVideo.current.srcObject = remoteStream;
        }
    }, [remoteStream, callAccepted]);

    const answerCall = (callData: any, mediaStream: MediaStream) => {
        setCallAccepted(true);
        const peer = new SimplePeer({
            initiator: false,
            trickle: true,
            stream: mediaStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    { urls: 'stun:stun.services.mozilla.com' },
                    { urls: 'stun:global.stun.twilio.com:3478' },
                    {
                        urls: "turn:openrelay.metered.ca:80",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    },
                    {
                        urls: "turn:openrelay.metered.ca:443?transport=tcp",
                        username: "openrelayproject",
                        credential: "openrelayproject"
                    }
                ],
                iceCandidatePoolSize: 10
            }
        });

        connectionRef.current = peer;

        // 1. SIGNAL THE OFFER FIRST
        peer.signal(callData.signal);

        // 2. PROCESS QUEUED CANDIDATES
        pendingSignals.current.forEach(sig => peer.signal(sig));
        pendingSignals.current = [];

        peer.on("signal", (data) => {
            console.log('[MEETING] Answering call');
            socket.current?.emit("answer-call", {
                signal: data,
                to: callData.from
            });
        });

        peer.on("stream", (remoteStream) => {
            console.log('[MEETING] Received remote stream (answer)');
            setRemoteStream(remoteStream);
        });

        peer.on("error", (err) => {
            console.error('[MEETING] Peer error (answer):', err);
        });
    };

    const leaveCall = () => {
        setCallEnded(true);
        connectionRef.current?.destroy();
        stream?.getTracks().forEach(track => track.stop());
        navigate('/chats');
    };

    const toggleMute = () => {
        if (stream) {
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                setVoiceMuted(!audioTrack.enabled);
            }
        }
    };

    const toggleVideo = () => {
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                setVideoMuted(!videoTrack.enabled);
            }
        }
    };

    const flipCamera = async () => {
        if (!stream) return;

        try {
            const newMode = facingMode === 'user' ? 'environment' : 'user';

            // Stop the old video track first for better mobile browser compatibility
            const oldVideoTrack = stream.getVideoTracks()[0];
            if (oldVideoTrack) oldVideoTrack.stop();

            let newStream;
            try {
                // Try to get exact camera (vital for iOS/Android back camera)
                newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { exact: newMode } }
                });
            } catch (err) {
                // Fallback for laptops or devices that don't support 'exact' constraints
                newStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: newMode }
                });
            }

            const newVideoTrack = newStream.getVideoTracks()[0];

            if (connectionRef.current) {
                connectionRef.current.replaceTrack(oldVideoTrack, newVideoTrack, stream);
            }

            stream.removeTrack(oldVideoTrack);
            stream.addTrack(newVideoTrack);

            newVideoTrack.enabled = !videoMuted;

            if (myVideo.current) {
                myVideo.current.srcObject = stream;
            }

            setFacingMode(newMode);
        } catch (error) {
            console.error('[MEETING] Error flipping camera:', error);
            alert("Failed to switch camera. It might be blocked or unavailable.");
            
            // Try to recover the old stream if switch failed and we stopped it
            try {
                const recoveredStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: facingMode }
                });
                const recoveredTrack = recoveredStream.getVideoTracks()[0];
                stream.addTrack(recoveredTrack);
                if (connectionRef.current) {
                    connectionRef.current.replaceTrack(stream.getVideoTracks()[0], recoveredTrack, stream);
                }
                if (myVideo.current) myVideo.current.srcObject = stream;
            } catch (recoveryError) {
                console.error("Camera recovery failed", recoveryError);
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-950 text-white relative overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 z-10 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-center">
                <div className="glass-dark px-4 py-2 rounded-full flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                    <h1 className="text-sm font-mono tracking-wider">MEETING: {meetingId?.slice(0, 8)}...</h1>
                </div>
                <button
                    onClick={leaveCall}
                    className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold shadow-lg transition-all transform hover:scale-105"
                >
                    Leave Meeting
                </button>
            </div>

            {/* Main Video Area */}
            <div className="flex-1 flex items-center justify-center p-4 gap-4 flex-wrap content-center">
                {/* My Video */}
                <div className="relative w-full md:w-[48%] aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800 transition-all hover:border-slate-600 group">
                    <video playsInline ref={myVideo} autoPlay muted className={`w-full h-full object-cover transform ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <span>You</span>
                        {voiceMuted && <span className="text-red-400 text-xs">(Muted)</span>}
                    </div>
                </div>

                {/* User Video */}
                {callAccepted && !callEnded ? (
                    <div className="relative w-full md:w-[48%] aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                        <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover" />
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                            Peer
                        </div>
                    </div>
                ) : (
                    <div className="w-full md:w-[48%] aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 border-dashed">
                        <div className="text-center text-slate-500">
                            <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                            </div>
                            <p>Waiting for others to join...</p>
                            <p className="text-sm mt-2">Share meeting ID: <span className="font-mono bg-slate-800 px-2 py-1 rounded select-all">{meetingId}</span></p>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className="p-6 flex justify-center gap-6">
                <div className="glass-dark px-8 py-4 rounded-full flex items-center gap-6">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all transform hover:scale-110 ${voiceMuted ? 'bg-red-500 text-white shadow-red-500/50 shadow-lg' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        title={voiceMuted ? "Unmute" : "Mute"}
                    >
                        {voiceMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 0 0 0 6-6v-1.5m-6 7.5a6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 0 0 1-3-3V4.5a3 0 1 1 6 0v8.25a3 0 0 1-3 3Z" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition-all transform hover:scale-110 ${videoMuted ? 'bg-red-500 text-white shadow-red-500/50 shadow-lg' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        title={videoMuted ? "Start Video" : "Stop Video"}
                    >
                        {videoMuted ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 2.25 21.75 21.75" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                            </svg>
                        )}
                    </button>
                    <button
                        onClick={flipCamera}
                        className="p-4 rounded-full transition-all transform hover:scale-110 bg-slate-700 text-white hover:bg-slate-600"
                        title="Flip Camera"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MeetingPage;
