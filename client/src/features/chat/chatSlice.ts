import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import api from '../../services/api';

interface Chat {
    _id: string;
    chatName: string;
    isGroupChat: boolean;
    users: any[]; // refine type later
    latestMessage: any; // refine type later
    groupAdmin?: any;
}

interface ChatState {
    chats: Chat[];
    selectedChat: Chat | null;
    messages: any[]; // refine type later
    isLoading: boolean;
    isError: boolean;
    message: string;
}

const initialState: ChatState = {
    chats: [],
    selectedChat: null,
    messages: [],
    isLoading: false,
    isError: false,
    message: '',
};

// Fetch chats
export const fetchChats = createAsyncThunk('chat/fetchChats', async (_, thunkAPI) => {
    try {
        const response = await api.get('/chat');
        return response.data;
    } catch (error: any) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Access chat (create or retrieve)
export const accessChat = createAsyncThunk('chat/accessChat', async (userId: string, thunkAPI) => {
    try {
        const response = await api.post('/chat', { userId });
        return response.data;
    } catch (error: any) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Fetch messages
export const fetchMessages = createAsyncThunk('chat/fetchMessages', async (chatId: string, thunkAPI) => {
    try {
        const response = await api.get(`/message/${chatId}`);
        return response.data;
    } catch (error: any) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

// Send message
export const sendMessage = createAsyncThunk('chat/sendMessage', async (messageData: { content: string; chatId: string; image?: string }, thunkAPI) => {
    try {
        const response = await api.post('/message', messageData);
        return response.data;
    } catch (error: any) {
        const message = (error.response && error.response.data && error.response.data.message) || error.message || error.toString();
        return thunkAPI.rejectWithValue(message);
    }
});

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setSelectedChat: (state, action: PayloadAction<Chat | null>) => {
            state.selectedChat = action.payload;
        },
        addMessage: (state, action: PayloadAction<any>) => {
            state.messages.push(action.payload);
        }
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchChats.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchChats.fulfilled, (state, action) => {
                state.isLoading = false;
                state.chats = action.payload;
            })
            .addCase(fetchChats.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload as string;
            })
            .addCase(accessChat.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(accessChat.fulfilled, (state, action) => {
                state.isLoading = false;
                state.selectedChat = action.payload;
                // Add to chats if not already there
                if (!state.chats.find((c) => c._id === action.payload._id)) {
                    state.chats = [action.payload, ...state.chats];
                }
            })
            .addCase(accessChat.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload as string;
            })
            .addCase(fetchMessages.pending, (state) => {
                state.isLoading = true;
            })
            .addCase(fetchMessages.fulfilled, (state, action) => {
                state.isLoading = false;
                state.messages = action.payload;
            })
            .addCase(fetchMessages.rejected, (state, action) => {
                state.isLoading = false;
                state.isError = true;
                state.message = action.payload as string;
            })
            .addCase(sendMessage.fulfilled, (state, action) => {
                state.messages.push(action.payload);
            });
    },
});

export const { setSelectedChat, addMessage } = chatSlice.actions;
export default chatSlice.reducer;
