import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Box,
  Grid,
  Paper,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  IconButton,
  CircularProgress,
  Container,
  Card,
  CardContent,
  Chip,
  Badge,
} from "@mui/material";
import {
  Send as SendIcon,
  Favorite as FavoriteIcon,
  ThumbUp as ThumbUpIcon,
  EmojiEmotions as EmojiIcon,
  People as PeopleIcon,
  VolumeUp as VolumeIcon,
  FullscreenRounded as FullscreenIcon,
} from "@mui/icons-material";
import Layout from "../components/Layout";
import { streamApi, djProfileApi } from "../services/api";
import { Stream, DJProfile, ChatMessage } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";

const StreamView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { socket } = useSocket();

  const [stream, setStream] = useState<Stream | null>(null);
  const [djProfile, setDjProfile] = useState<DJProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState<string>("");
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [likeCount, setLikeCount] = useState<number>(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStreamData = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch stream data
        const streamResponse = await streamApi.getById(id);
        setStream(streamResponse.data);

        // Fetch DJ profile
        if (streamResponse.data.djId) {
          const djResponse = await djProfileApi.getById(
            streamResponse.data.djId
          );
          setDjProfile(djResponse.data);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching stream data:", err);
        setError("Failed to load stream. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchStreamData();
  }, [id]);

  // Socket connection for chat and viewer count
  useEffect(() => {
    if (!socket || !id || !isAuthenticated) return;

    // Join stream room
    socket.emit("joinStream", { streamId: id, userId: user?.id });

    // Listen for new messages
    socket.on("chatMessage", (message: ChatMessage) => {
      setMessages((prevMessages) => [...prevMessages, message]);

      // Auto-scroll to bottom of chat
      if (chatContainerRef.current) {
        setTimeout(() => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop =
              chatContainerRef.current.scrollHeight;
          }
        }, 100);
      }
    });

    // Listen for viewer count updates
    socket.on("viewerCount", (count: number) => {
      setViewerCount(count);
    });

    // Listen for like count updates
    socket.on("likeCount", (count: number) => {
      setLikeCount(count);
    });

    // Fetch initial chat history
    socket.emit(
      "getChatHistory",
      { streamId: id },
      (history: ChatMessage[]) => {
        setMessages(history);

        // Auto-scroll to bottom of chat
        if (chatContainerRef.current) {
          setTimeout(() => {
            if (chatContainerRef.current) {
              chatContainerRef.current.scrollTop =
                chatContainerRef.current.scrollHeight;
            }
          }, 100);
        }
      }
    );

    return () => {
      // Leave stream room when component unmounts
      socket.emit("leaveStream", { streamId: id, userId: user?.id });
      socket.off("chatMessage");
      socket.off("viewerCount");
      socket.off("likeCount");
    };
  }, [socket, id, isAuthenticated, user]);

  // Initialize video player
  useEffect(() => {
    if (!stream || !videoRef.current) return;

    // In a real implementation, this would initialize a video player with the stream URL
    // For example, using Amazon IVS Player or HLS.js

    // Mock implementation for demonstration
    const initPlayer = () => {
      console.log(
        "Initializing video player with stream URL:",
        stream.streamUrl
      );

      // In a real implementation, you would initialize the player here
      // Example with IVS player:
      // const player = IVSPlayer.create();
      // player.attachHTMLVideoElement(videoRef.current);
      // player.load(stream.streamUrl);
      // player.play();
    };

    initPlayer();

    return () => {
      // Cleanup player when component unmounts
      // Example: player.delete();
    };
  }, [stream, videoRef]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket || !id || !user) return;

    const messageData: Omit<ChatMessage, "id" | "timestamp"> = {
      streamId: id,
      userId: user.id,
      userName: user.name,
      message: newMessage.trim(),
    };

    socket.emit("sendChatMessage", messageData);
    setNewMessage("");
  };

  const handleLikeStream = () => {
    if (!socket || !id || !user) return;

    socket.emit("likeStream", { streamId: id, userId: user.id });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  if (isLoading) {
    return (
      <Layout title="Live Stream">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !stream) {
    return (
      <Layout title="Live Stream">
        <Typography color="error" sx={{ mb: 2 }}>
          {error || "Stream not found"}
        </Typography>
        <Button variant="contained" onClick={() => navigate("/streams")}>
          Browse Other Streams
        </Button>
      </Layout>
    );
  }

  return (
    <Layout title={stream.title || "Live Stream"}>
      <Container maxWidth="xl">
        <Grid container spacing={2}>
          {/* Video Player */}
          <Grid item xs={12} md={8}>
            <Paper
              sx={{
                position: "relative",
                backgroundColor: "#000",
                borderRadius: 1,
                overflow: "hidden",
                aspectRatio: "16/9",
              }}
            >
              <video
                ref={videoRef}
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                controls
                playsInline
                poster={
                  stream.thumbnailUrl ||
                  djProfile?.imageUrl ||
                  "https://via.placeholder.com/1280x720?text=Live+Stream"
                }
              />

              {/* Video Controls Overlay */}
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  p: 1,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
                  color: "white",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Badge badgeContent={viewerCount} color="error" max={999}>
                    <PeopleIcon />
                  </Badge>
                  <Badge badgeContent={likeCount} color="error" max={999}>
                    <FavoriteIcon />
                  </Badge>
                </Box>

                <Box>
                  <IconButton color="inherit" onClick={toggleFullscreen}>
                    <FullscreenIcon />
                  </IconButton>
                </Box>
              </Box>
            </Paper>

            {/* Stream Info */}
            <Box sx={{ mt: 2, mb: 4 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                {stream.title}
              </Typography>

              <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                {djProfile && (
                  <>
                    <Avatar
                      src={djProfile.imageUrl}
                      alt={djProfile.name}
                      sx={{ mr: 2 }}
                    />
                    <Typography variant="h6">{djProfile.name}</Typography>
                  </>
                )}

                <Box sx={{ ml: "auto", display: "flex", gap: 1 }}>
                  <Chip
                    icon={<PeopleIcon />}
                    label={`${viewerCount} watching`}
                    variant="outlined"
                  />
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<FavoriteIcon />}
                    onClick={handleLikeStream}
                  >
                    Like
                  </Button>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="body1">
                {stream.description ||
                  "Join this live DJ session and enjoy the music!"}
              </Typography>

              {stream.genre && (
                <Box sx={{ mt: 2 }}>
                  <Chip
                    icon={<VolumeIcon />}
                    label={stream.genre}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}
            </Box>
          </Grid>

          {/* Chat */}
          <Grid item xs={12} md={4}>
            <Card
              sx={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              <CardContent sx={{ p: 2, flexGrow: 0 }}>
                <Typography variant="h6" gutterBottom>
                  Live Chat
                </Typography>
              </CardContent>

              <Divider />

              {/* Chat Messages */}
              <Box
                ref={chatContainerRef}
                sx={{
                  flexGrow: 1,
                  overflowY: "auto",
                  p: 2,
                  height: { xs: "300px", md: "500px" },
                }}
              >
                {messages.length === 0 ? (
                  <Box
                    sx={{ textAlign: "center", color: "text.secondary", mt: 4 }}
                  >
                    <Typography variant="body2">
                      No messages yet. Be the first to say hello!
                    </Typography>
                  </Box>
                ) : (
                  <List>
                    {messages.map((msg, index) => (
                      <ListItem
                        key={msg.id || index}
                        alignItems="flex-start"
                        sx={{
                          py: 1,
                          px: 0,
                        }}
                      >
                        <ListItemAvatar>
                          <Avatar alt={msg.userName}>
                            {msg.userName.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                              sx={{ fontWeight: "bold" }}
                            >
                              {msg.userName}
                            </Typography>
                          }
                          secondary={
                            <Typography
                              component="span"
                              variant="body2"
                              color="text.primary"
                            >
                              {msg.message}
                            </Typography>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>

              <Divider />

              {/* Chat Input */}
              {isAuthenticated ? (
                <Box sx={{ p: 2, display: "flex", alignItems: "center" }}>
                  <TextField
                    fullWidth
                    placeholder="Type a message..."
                    variant="outlined"
                    size="small"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    InputProps={{
                      endAdornment: (
                        <IconButton color="primary" size="small">
                          <EmojiIcon />
                        </IconButton>
                      ),
                    }}
                  />
                  <IconButton
                    color="primary"
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    sx={{ ml: 1 }}
                  >
                    <SendIcon />
                  </IconButton>
                </Box>
              ) : (
                <Box sx={{ p: 2, textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Sign in to join the conversation
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() =>
                      navigate("/login", { state: { from: `/streams/${id}` } })
                    }
                  >
                    Sign In
                  </Button>
                </Box>
              )}
            </Card>
          </Grid>
        </Grid>
      </Container>
    </Layout>
  );
};

export default StreamView;
