import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "./AuthContext";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(
      import.meta.env.VITE_API_URL || "http://localhost:5000",
      {
        autoConnect: false,
        withCredentials: true,
      }
    );

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      if (socketInstance) {
        socketInstance.disconnect();
      }
    };
  }, []);

  // Connect/disconnect based on authentication status
  useEffect(() => {
    if (!socket) return;

    if (isAuthenticated && user) {
      // Connect and authenticate socket
      socket.auth = { userId: user.id };
      socket.connect();

      // Set up event listeners
      socket.on("connect", () => {
        console.log("Socket connected");
        setIsConnected(true);
      });

      socket.on("disconnect", () => {
        console.log("Socket disconnected");
        setIsConnected(false);
      });

      socket.on("connect_error", (error) => {
        console.error("Socket connection error:", error);
        setIsConnected(false);
      });
    } else {
      // Disconnect if not authenticated
      if (socket.connected) {
        socket.disconnect();
        setIsConnected(false);
      }
    }

    // Cleanup event listeners
    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
        socket.off("connect_error");
      }
    };
  }, [socket, isAuthenticated, user]);

  // Log connection status changes
  useEffect(() => {
    if (isConnected) {
      console.log("Socket connection established");
    } else {
      console.log("Socket disconnected or not yet connected");
    }
  }, [isConnected]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketProvider;
