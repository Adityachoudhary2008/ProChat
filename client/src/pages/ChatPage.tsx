import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchChats, setSelectedChat, accessChat, fetchMessages, sendMessage, addMessage, updateLatestMessage } from '../features/chat/chatSlice';
import api from '../services/api';
import UserListItem from '../components/UserListItem';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';

const ENDPOINT = import.meta.env.VITE_SOCKET_URL || 'https://prochat-production.up.railway.app';

const ChatPage: React.FC = () => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const { user } = useAppSelector((state) => state.auth);
    const { chats, selectedChat, isLoading, messages } = useAppSelector((state) => state.chat);

    const socket = useRef<Socket | null>(null);

    const [search, setSearch] = useState('');
    const [searchResult, setSearchResult] = useState([]);
    const [loadingChat, setLoadingChat] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef<null | HTMLDivElement>(null);

    const [isTyping, setIsTyping] = useState(false);
    const [typing, setTyping] = useState(false);
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

    useEffect(() => {
        if (user) {
            socket.current = io(ENDPOINT);
            socket.current.emit('setup', user);
            socket.current.on('connected', () => { });
            socket.current.on('typing', (room: string) => {
                if (selectedChat?._id === room) setIsTyping(true);
            });
            socket.current.on('stop typing', (room: string) => {
                if (selectedChat?._id === room) setIsTyping(false);
            });

            // Incoming call listeners
            socket.current.on('incoming-call', (data: any) => {
                setIncomingCall(data);
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                audio.play().catch(() => { });
            });

            socket.current.on('call-accepted', ({ meetingId }: any) => {
                setIsCalling(false);
                window.open(`/meeting/${meetingId}`, '_blank');
            });

            socket.current.on('call-rejected', () => {
                setIsCalling(false);
                toast.error("Call declined");
            });

            socket.current.on('call-error', (data: any) => {
                setIsCalling(false);
                toast.error(data.message || "Call failed");
            });

            socket.current.on('message received', (newMessageReceived: any) => {
                // Update sidebar for every received message
                dispatch(updateLatestMessage(newMessageReceived));

                // If chat is not selected or doesn't match current chat, notify
                if (!selectedChat || selectedChat._id !== newMessageReceived.chat._id) {
                    toast.success(`New message from ${newMessageReceived.sender.name}`, {
                        icon: '💬',
                        position: 'top-right'
                    });
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                    audio.play().catch(() => { });
                } else {
                    dispatch(addMessage(newMessageReceived));
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3');
                    audio.play().catch(() => { });
                }
            });

            return () => {
                socket.current?.disconnect();
            };
        }
    }, [user, selectedChat?._id, dispatch]);

    useEffect(() => {
        if (selectedChat) {
            dispatch(fetchMessages(selectedChat._id));
            socket.current?.emit("join chat", selectedChat._id);
        }
    }, [selectedChat, dispatch]);

    const typingHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewMessage(e.target.value);

        if (!socket.current) return;

        if (!typing) {
            setTyping(true);
            socket.current.emit("typing", selectedChat?._id);
        }

        let lastTypingTime = new Date().getTime();
        var timerLength = 3000;
        setTimeout(() => {
            var timeNow = new Date().getTime();
            var timeDiff = timeNow - lastTypingTime;
            if (timeDiff >= timerLength) {
                socket.current?.emit("stop typing", selectedChat?._id);
                setTyping(false);
            }
        }, timerLength);
    };

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSearch = async () => {
        if (!search) {
            alert("Please enter something in search");
            return;
        }

        try {
            setLoadingChat(true);
            const { data } = await api.get(`/user?search=${search}`);
            setLoadingChat(false);
            setSearchResult(data);
        } catch (error) {
            setLoadingChat(false);
            alert("Failed to Load the Search Results");
        }
    };

    const accessChatHandler = async (userId: string) => {
        try {
            setLoadingChat(true);
            await dispatch(accessChat(userId));
            setLoadingChat(false);
            setIsSearchOpen(false);
        } catch (error) {
            setLoadingChat(false);
            alert("Error fetching the chat");
        }
    };

    const sendMessageHandler = async (imageUrl?: string) => {
        if ((newMessage || imageUrl) && selectedChat) {
            try {
                const messageData = { content: newMessage, chatId: selectedChat._id, image: imageUrl };
                setNewMessage('');
                const data = await dispatch(sendMessage(messageData)).unwrap();
                socket.current?.emit("new message", data);
            } catch (error) {
                toast.error("Failed to send message");
            }
        }
    };

    const handleStartMeeting = async () => {
        if (!selectedChat || selectedChat.isGroupChat) {
            toast.error("Direct calling is currently supported for 1-on-1 chats only");
            return;
        }

        const targetUser = selectedChat.users.find((u: any) => u._id !== user?._id);
        if (!targetUser) return;

        try {
            setIsCalling(true);
            const { data } = await api.post('/meeting');
            socket.current?.emit("direct-call", {
                targetUserId: targetUser._id,
                fromUser: { _id: user?._id, name: user?.name },
                meetingId: data.meetingId
            });
            toast.success("Calling...", { icon: '📞' });
        } catch (e) {
            toast.error("Failed to start call");
            setIsCalling(false);
        }
    };

    const acceptCall = () => {
        if (incomingCall) {
            socket.current?.emit('accept-call', {
                toUserId: incomingCall.fromUser._id,
                meetingId: incomingCall.meetingId
            });
            window.open(`/meeting/${incomingCall.meetingId}`, '_blank');
            setIncomingCall(null);
        }
    };

    const rejectCall = () => {
        if (incomingCall) {
            socket.current?.emit('reject-call', { toUserId: incomingCall.fromUser._id });
            setIncomingCall(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            sendMessageHandler();
        }
    };

    const [groupChatName, setGroupChatName] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<any[]>([]);
    const [isGroupOpen, setIsGroupOpen] = useState(false);

    const handleGroup = (userToAdd: any) => {
        if (selectedUsers.includes(userToAdd)) {
            toast.error("User already added");
            return;
        }
        setSelectedUsers([...selectedUsers, userToAdd]);
    };

    const handleDelete = (delUser: any) => {
        setSelectedUsers(selectedUsers.filter((sel) => sel._id !== delUser._id));
    };

    const handleSubmitGroup = async () => {
        if (!groupChatName || selectedUsers.length < 2) {
            toast.error("Group name and at least 2 users are required");
            return;
        }

        try {
            await api.post('/chat/group', {
                name: groupChatName,
                users: JSON.stringify(selectedUsers.map((u) => u._id)),
            });
            dispatch(fetchChats());
            setIsGroupOpen(false);
            setGroupChatName('');
            setSelectedUsers([]);
            toast.success("New Group Chat Created!");
        } catch (error) {
            toast.error("Failed to Create the Chat!");
        }
    };

    useEffect(() => {
        dispatch(fetchChats());
    }, [dispatch]);

    return (
        <div className="flex h-screen bg-slate-50 relative overflow-hidden">
            {/* Incoming Call Modal */}
            {incomingCall && (
                <div className="absolute inset-0 bg-black/80 z-[100] flex justify-center items-center animate-fade-in">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 w-full max-w-sm p-8 rounded-3xl shadow-2xl border border-emerald-500/30">
                        <div className="flex flex-col items-center gap-6">
                            <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/50">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-12 text-white">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-slate-400 text-sm mb-1">Incoming Video Call</p>
                                <p className="font-bold text-2xl text-white">{incomingCall.fromUser.name}</p>
                            </div>
                            <div className="flex gap-4 w-full mt-4">
                                <button
                                    onClick={rejectCall}
                                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-red-600/50 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                    </svg>
                                    Decline
                                </button>
                                <button
                                    onClick={acceptCall}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg hover:shadow-emerald-500/50 flex items-center justify-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                                    </svg>
                                    Accept
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Calling Overlay */}
            {isCalling && (
                <div className="absolute inset-0 bg-black/80 z-[100] flex justify-center items-center animate-fade-in">
                    <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-10 text-white">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
                            </svg>
                        </div>
                        <p className="text-white text-xl font-bold">Calling...</p>
                        <button
                            onClick={() => setIsCalling(false)}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Group Chat Modal */}
            <div className={`absolute inset-0 bg-black/50 z-50 flex justify-center items-center transition-opacity duration-300 ${isGroupOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="bg-white w-full max-w-md p-6 rounded-2xl shadow-2xl animate-fade-in relative">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-900">Create Group Chat</h3>
                        <button onClick={() => setIsGroupOpen(false)} className="text-slate-400 hover:text-red-500 p-2 rounded-full hover:bg-slate-100 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <input
                        placeholder="Chat Name"
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
                        onChange={(e) => setGroupChatName(e.target.value)}
                        value={groupChatName}
                    />

                    <div className="mb-4">
                        <input
                            placeholder="Add Users (e.g., John, Jane)"
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 mb-2 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
                            onChange={(e) => {
                                setSearch(e.target.value);
                                handleSearch();
                            }}
                        />
                        <div className="flex flex-wrap gap-2">
                            {selectedUsers.map((u) => (
                                <div key={u._id} className="bg-slate-900 text-white px-3 py-1 rounded-full text-xs flex items-center gap-2">
                                    {u.name}
                                    <span onClick={() => handleDelete(u)} className="cursor-pointer hover:text-red-400 font-bold ml-1">&times;</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="max-h-40 overflow-y-auto mb-6 space-y-1">
                        {loadingChat ? (
                            <div className="flex justify-center p-4 text-slate-400 animate-pulse">Searching...</div>
                        ) : (
                            searchResult?.slice(0, 4).map((user: any) => (
                                <div key={user._id} onClick={() => handleGroup(user)} className="p-3 hover:bg-slate-50 rounded-xl cursor-pointer flex items-center gap-3 border border-slate-100 transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs text-uppercase">
                                        {user.name.charAt(0)}
                                    </div>
                                    <p className="text-sm font-medium">{user.name}</p>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={handleSubmitGroup}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg active:scale-[0.98]"
                    >
                        Create Chat
                    </button>
                </div>
            </div>

            {/* User Search Drawer */}
            <div className={`absolute inset-0 bg-black/50 z-50 flex justify-start transition-opacity duration-300 ${isSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className={`bg-white w-full md:w-96 h-full p-6 shadow-2xl flex flex-col transform transition-transform duration-300 ${isSearchOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-2xl font-bold font-sans tracking-tight text-slate-900">Search Users</h3>
                        <button onClick={() => setIsSearchOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-slate-100">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div className="flex gap-2 mb-8">
                        <div className="relative flex-1">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name or email"
                                className="w-full border border-slate-200 rounded-xl pl-10 pr-4 py-3 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all shadow-sm"
                            />
                            <span className="absolute left-3 top-3.5 text-slate-400">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                                </svg>
                            </span>
                        </div>
                        <button
                            onClick={handleSearch}
                            className="bg-slate-900 text-white px-6 rounded-xl hover:bg-slate-800 transition-all shadow-lg font-medium active:scale-95"
                        >Go</button>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-2">
                        {loadingChat ? (
                            <div className="flex justify-center p-8 text-slate-400 animate-pulse">Loading...</div>
                        ) : (
                            searchResult?.map((user: any) => (
                                <UserListItem
                                    key={user._id}
                                    user={user}
                                    handleFunction={() => accessChatHandler(user._id)}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Sidebar - Chat List */}
            <div className={`w-full md:w-96 bg-white border-r border-slate-200/50 flex flex-col z-0 transition-all duration-300 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight">ProChat</h2>
                    <div className="flex gap-2 items-center">
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
                            title="Search Users"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setIsGroupOpen(true)}
                            className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors font-bold text-lg"
                            title="New Group Chat"
                        >
                            +
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                                className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white text-sm font-bold hover:shadow-lg transition-all"
                                title="Profile Menu"
                            >
                                {user?.name.charAt(0).toUpperCase()}
                            </button>
                            {isProfileMenuOpen && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden z-50">
                                    <button
                                        onClick={() => {
                                            navigate('/profile');
                                            setIsProfileMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                        </svg>
                                        Profile
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigate('/settings');
                                            setIsProfileMenuOpen(false);
                                        }}
                                        className="w-full px-4 py-3 text-left text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-3"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                                        </svg>
                                        Settings
                                    </button>
                                    <hr className="border-slate-200" />
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem('user');
                                            window.location.href = '/login';
                                        }}
                                        className="w-full px-4 py-3 text-left text-red-600 hover:bg-red-50 transition-colors flex items-center gap-3"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9V5.25A2.25 2.25 0 0 1 10.5 3h6a2.25 2.25 0 0 1 2.25 2.25v13.5A2.25 2.25 0 0 1 16.5 21h-6a2.25 2.25 0 0 1-2.25-2.25V15m-3 0-3-3m0 0 3-3m-3 3h12.75" />
                                        </svg>
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    {isLoading ? (
                        <div className="p-8 text-center text-slate-400">Loading conversations...</div>
                    ) : (
                        chats.map((chat) => (
                            <div
                                key={chat._id}
                                onClick={() => dispatch(setSelectedChat(chat))}
                                className={`p-4 rounded-xl cursor-pointer transition-all duration-200 group border border-transparent ${selectedChat?._id === chat._id ? 'bg-slate-100 shadow-sm border-slate-200' : 'hover:bg-slate-50'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <p className={`font-semibold ${selectedChat?._id === chat._id ? 'text-slate-900' : 'text-slate-700'}`}>
                                        {!chat.isGroupChat
                                            ? chat.users.find((u: any) => u._id !== user?._id)?.name || 'User'
                                            : chat.chatName}
                                    </p>
                                </div>
                                {chat.latestMessage && (
                                    <p className="text-sm text-slate-500 truncate group-hover:text-slate-600 transition-colors">
                                        <span className="font-medium text-slate-600">{chat.latestMessage.sender.name}: </span>
                                        {chat.latestMessage.content}
                                    </p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Window Area */}
            <div className={`flex-1 flex flex-col bg-slate-50/50 ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200/50 flex justify-between items-center sticky top-0 z-10">
                            <div className="flex items-center gap-4">
                                <button
                                    className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors"
                                    onClick={() => dispatch(setSelectedChat(null))}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                                    </svg>
                                </button>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                                        {!selectedChat.isGroupChat
                                            ? selectedChat.users.find((u: any) => u._id !== user?._id)?.name
                                            : selectedChat.chatName}
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full block animate-pulse"></span>
                                        <span className="text-xs text-slate-500 font-medium">{isTyping ? 'typing...' : 'Online'}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleStartMeeting}
                                    className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                                    title="Start Video Call"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                    </svg>
                                </button>
                                <button className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Messages Content */}
                        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-4">
                            <div className="flex justify-center mb-4">
                                <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">Today</span>
                            </div>
                            {messages && messages.map((m) => (
                                <div key={m._id} className={`flex ${m.sender._id === user?._id ? "justify-end" : "justify-start"} animate-fade-in`}>
                                    <div className={`max-w-[75%] md:max-w-[60%] flex flex-col ${m.sender._id === user?._id ? "items-end" : "items-start"}`}>
                                        <div
                                            className={`px-5 py-3 shadow-sm text-[15px] leading-relaxed relative group transition-all
                                            ${m.sender._id === user?._id
                                                    ? "bg-slate-900 text-white rounded-2xl rounded-tr-sm"
                                                    : "bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm"}`}
                                        >
                                            {m.image && (
                                                <img src={`${ENDPOINT}${m.image}`} alt="Uploaded" className="rounded-lg mb-2 max-w-full max-h-60 object-cover cursor-zoom-in hover:opacity-90 transition-opacity" />
                                            )}
                                            {m.content && <p>{m.content}</p>}
                                        </div>
                                        <span className="text-[10px] text-slate-400 mt-1 px-1 font-medium">
                                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex justify-start animate-fade-in">
                                    <div className="bg-slate-100 text-slate-500 rounded-full px-4 py-2 text-xs font-medium italic flex items-center gap-2">
                                        <span className="flex gap-1">
                                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></span>
                                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                                            <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                                        </span>
                                        {selectedChat.isGroupChat ? 'Someone is typing...' : `${selectedChat.users.find((u: any) => u._id !== user?._id)?.name} is typing...`}
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input Area */}
                        <div className="p-4 bg-white border-t border-slate-200">
                            <div className="max-w-4xl mx-auto flex gap-3 items-center">
                                <div className="flex gap-2 items-center flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-1 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10 transition-all">
                                    <label className="cursor-pointer p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                                        </svg>
                                        <input
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const formData = new FormData();
                                                    formData.append('image', file);
                                                    try {
                                                        const { data: imageUrl } = await api.post('/upload', formData, {
                                                            headers: { 'Content-Type': 'multipart/form-data' }
                                                        });
                                                        sendMessageHandler(imageUrl);
                                                    } catch (error) {
                                                        toast.error("Failed to upload image");
                                                    }
                                                }
                                            }}
                                        />
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Type your message..."
                                        className="flex-1 bg-transparent border-none py-3 px-2 focus:outline-none caret-slate-900 placeholder:text-slate-400 text-slate-800"
                                        value={newMessage}
                                        onChange={typingHandler}
                                        onKeyDown={handleKeyDown}
                                    />
                                </div>
                                <button
                                    onClick={() => sendMessageHandler()}
                                    disabled={!newMessage.trim()}
                                    className="bg-slate-900 text-white rounded-full p-3.5 w-12 h-12 flex items-center justify-center hover:bg-slate-800 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-5">
                                        <path d="M3.478 2.404a.75.75 0 0 0-.926.941l2.432 7.905H13.5a.75.75 0 0 1 0 1.5H4.984l-2.432 7.905a.75.75 0 0 0 .926.94 60.519 60.519 0 0 0 18.445-8.986.75.75 0 0 0 0-1.218A60.517 60.517 0 0 0 3.478 2.404Z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 bg-slate-50/50">
                        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-10 text-slate-300">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                            </svg>
                        </div>
                        <h3 className="text-3xl font-bold mb-2 text-slate-800 tracking-tight">ProChat</h3>
                        <p className="max-w-xs text-center text-slate-500">Select a conversation or start a new one to begin messaging.</p>
                        <button
                            onClick={() => setIsSearchOpen(true)}
                            className="mt-8 bg-slate-900 text-white px-8 py-3 rounded-full font-medium hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                        >
                            Start New Chat
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatPage;
