import { io, Socket } from "socket.io-client";
import { ChatMessage } from "../types";

// Socket.io instance for real-time communication
let socket: Socket | null = null;

// Initialize socket connection
export const initSocket = (): Socket => {
  if (!socket) {
    // Get JWT token for authentication
    const token = localStorage.getItem("token");

    // Create socket connection with auth token
    socket = io({
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      withCredentials: true,
      auth: {
        token,
      },
    });

    // Log socket connection events
    socket.on("connect", () => {
      console.log("Socket connected:", socket?.id);
    });

    socket.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
    });

    socket.on("error", (error) => {
      console.error("Socket error:", error);
    });

    socket.on("connect_error", (error) => {
      console.error("Socket connect error:", error);
    });
  }

  return socket;
};

// Disconnect socket
export const disconnectSocket = (): void => {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("Socket disconnected by user");
  }
};

// Join a chat room for a specific stream
export const joinChatRoom = (streamId: string): void => {
  if (!socket) {
    initSocket();
  }

  socket?.emit("join_room", streamId);
  console.log("Joined chat room:", streamId);
};

// Leave a chat room
export const leaveChatRoom = (streamId: string): void => {
  socket?.emit("leave_room", streamId);
  console.log("Left chat room:", streamId);
};

// Send a message to a specific room
export const sendChatMessage = (streamId: string, content: string): void => {
  socket?.emit("chat_message", { streamId, content });
  console.log("Sent message to room:", streamId);
};

// Listen for new messages
export const onChatMessage = (
  callback: (message: ChatMessage) => void
): void => {
  socket?.on("chat_message", callback);
};

// Listen for stream status updates (like when a DJ goes live)
export const onStreamStatusChange = (
  callback: (data: { streamId: string; status: string }) => void
): void => {
  socket?.on("stream_status_change", callback);
};

// Remove all listeners when component unmounts
export const cleanupSocketListeners = (): void => {
  socket?.off("chat_message");
  socket?.off("stream_status_change");
  console.log("Cleaned up socket listeners");
};

export default {
  initSocket,
  disconnectSocket,
  joinChatRoom,
  leaveChatRoom,
  sendChatMessage,
  onChatMessage,
  onStreamStatusChange,
  cleanupSocketListeners,
};
