import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SimplePeer from 'simple-peer'; // You might need `vite-plugin-node-polyfills` for simple-peer buffer
import { io, Socket } from 'socket.io-client';
import { useAppSelector } from '../app/hooks';

// We need to polyfill 'global' and 'process' or use a different library if Vite issues arise.
// Often `simple-peer` requires `global` and `Buffer`.
// Let's assume standard Vite config or we might need to patch it. 
// For now, I'll write the logic.

const ENDPOINT = import.meta.env.VITE_SOCKET_URL || 'https://prochat-production.up.railway.app';

const MeetingPage: React.FC = () => {
    const { meetingId } = useParams();
    const { user } = useAppSelector((state) => state.auth);
    const navigate = useNavigate();

    const [stream, setStream] = useState<MediaStream>();
    const [me, setMe] = useState('');
    const [callAccepted, setCallAccepted] = useState(false);
    const [voiceMuted, setVoiceMuted] = useState(false);
    const [videoMuted, setVideoMuted] = useState(false);

    // For 1-on-1 simplicity initially
    const [caller, setCaller] = useState('');
    const [callerSignal, setCallerSignal] = useState<any>();
    const [receivingCall, setReceivingCall] = useState(false);
    const [callEnded, setCallEnded] = useState(false);

    const myVideo = useRef<HTMLVideoElement>(null);
    const userVideo = useRef<HTMLVideoElement>(null);
    const connectionRef = useRef<SimplePeer.Instance | null>(null);
    const socket = useRef<Socket | null>(null);

    useEffect(() => {
        socket.current = io(ENDPOINT);

        navigator.mediaDevices.getUserMedia({ video: true, audio: true })
            .then((currentStream) => {
                setStream(currentStream);
                if (myVideo.current) {
                    myVideo.current.srcObject = currentStream;
                }
            });

        socket.current.on('me', (id) => setMe(id));

        socket.current.emit("join meeting", meetingId);

        // Listening for signals
        socket.current.on("call-user", (data) => {
            setReceivingCall(true);
            setCaller(data.from);
            setCallerSignal(data.signal);
        });

        socket.current.on('user-joined', (userId) => {
            console.log('User joined, calling...', userId);
            callUser(userId);
        });

        // This logic is a bit 1-on-1 specific. 
        // For a meeting room with ID, we often want a "mesh" or at least auto-join.
        // Let's implement a simple "Join and see who's there" or just wait for calls.

    }, [meetingId]);

    const answerCall = () => {
        setCallAccepted(true);
        const peer = new SimplePeer({
            initiator: false,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (data) => {
            socket.current?.emit("answer-call", { signal: data, to: caller });
        });

        peer.on("stream", (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        peer.signal(callerSignal);
        connectionRef.current = peer;
    };

    const callUser = (id: string) => {
        const peer = new SimplePeer({
            initiator: true,
            trickle: false,
            stream: stream,
        });

        peer.on("signal", (data) => {
            socket.current?.emit("call-user", {
                userToCall: id,
                signalData: data,
                from: me,
                name: user?.name
            });
        });

        peer.on("stream", (currentStream) => {
            if (userVideo.current) {
                userVideo.current.srcObject = currentStream;
            }
        });

        socket.current?.on("call-accepted-signal", (signal) => {
            setCallAccepted(true);
            peer.signal(signal);
        });

        connectionRef.current = peer;
    };

    const leaveCall = () => {
        setCallEnded(true);
        connectionRef.current?.destroy();
        navigate('/chats');
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
            setVoiceMuted(!voiceMuted);
        }
    }

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
            setVideoMuted(!videoMuted);
        }
    }

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
                    {/* Stream active indicator handled by browser usually, but we can add UI */}
                    <video playsInline ref={myVideo} autoPlay muted className="w-full h-full object-cover transform scale-x-[-1]" />
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <span>You</span>
                        {voiceMuted && <span className="text-red-400 text-xs">(Muted)</span>}
                    </div>
                </div>

                {/* User Video */}
                {callAccepted && !callEnded ? (
                    <div className="relative w-full md:w-[48%] aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
                        <video playsInline ref={userVideo} autoPlay className="w-full h-full object-cover transform scale-x-[-1]" />
                        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
                            Peer
                        </div>
                    </div>
                ) : (
                    receivingCall || caller ? (
                        <div className="w-full md:w-[48%] aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 border-dashed">
                            <div className="text-center animate-pulse">
                                <p className="text-2xl font-bold text-slate-500">Connecting...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full md:w-[48%] aspect-video bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 border-dashed">
                            <div className="text-center text-slate-500">
                                <p>Waiting for others to join...</p>
                                <p className="text-sm mt-2">Share meeting ID: <span className="font-mono bg-slate-800 px-1 rounded select-all">{meetingId}</span></p>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* Incoming Call Notification */}
            {receivingCall && !callAccepted && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 glass-dark p-6 rounded-2xl flex flex-col items-center gap-4 shadow-2xl z-50 border border-emerald-500/30 animate-fade-in">
                    <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-2 animate-bounce">
                        <span className="text-2xl">&#128222;</span>
                    </div>
                    <div>
                        <p className="text-slate-400 text-sm">Incoming call from</p>
                        <p className="font-bold text-xl">{caller}</p>
                    </div>
                    <div className="flex gap-4 w-full">
                        <button onClick={answerCall} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold transition-colors">
                            Accept
                        </button>
                        {/* <button className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-bold transition-colors">Decline</button> */}
                    </div>
                </div>
            )}

            {/* Controls Bar */}
            <div className="p-6 flex justify-center gap-6">
                <div className="glass-dark px-8 py-4 rounded-full flex items-center gap-6">
                    <button
                        onClick={toggleMute}
                        className={`p-4 rounded-full transition-all transform hover:scale-110 ${voiceMuted ? 'bg-red-500 text-white shadow-red-500/50 shadow-lg' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
                        title={voiceMuted ? "Unmute" : "Mute"}
                    >
                        {/* Mic Icon */}
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
                        {/* Video Icon */}
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
                </div>
            </div>
            {/* Manual Call Trigger - For debugging/demo purposes (Hidden in Production) */}
            {/* <div className="mt-8 flex justify-center gap-2">
                <input 
                    placeholder="Enter Socket ID to call" 
                    className="text-black p-2 rounded"
                    onChange={(e) => setCaller(e.target.value)}
                />
                <button 
                    onClick={() => callUser(caller)}
                    className="bg-blue-600 px-4 py-2 rounded"
                >
                    Call User
                </button>
             </div> */}
        </div>
    );
};

export default MeetingPage;
