import React, { useState, useEffect } from "react";
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  CircularProgress,
  Box,
  Chip,
  Divider,
  Tab,
  Tabs,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { useAuth } from "../contexts/AuthContext";
import { bookingApi, djProfileApi, streamApi } from "../services/api";
import { Booking, DJProfile, Stream } from "../types";

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
};

const a11yProps = (index: number) => {
  return {
    id: `dashboard-tab-${index}`,
    "aria-controls": `dashboard-tabpanel-${index}`,
  };
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeStreams, setActiveStreams] = useState<Stream[]>([]);
  const [djProfile, setDjProfile] = useState<DJProfile | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch bookings for all users
        const bookingsResponse = await bookingApi.getAll();
        setBookings(bookingsResponse.data);

        // Fetch active streams
        const streamsResponse = await streamApi.getAllActive();
        setActiveStreams(streamsResponse.data);

        // If user is a DJ, fetch their profile
        if (user?.role === "dj") {
          try {
            const djProfileResponse = await djProfileApi.getAll();
            const userDjProfile = djProfileResponse.data.find(
              (profile: DJProfile) => profile.userId === user.id
            );

            if (userDjProfile) {
              setDjProfile(userDjProfile);
            }
          } catch (err) {
            console.error("Error fetching DJ profile:", err);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please try again.");
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleViewBooking = (bookingId: string) => {
    navigate(`/bookings/${bookingId}`);
  };

  const handleJoinStream = (streamId: string) => {
    navigate(`/streams/${streamId}`);
  };

  const handleCreateDJProfile = () => {
    navigate("/dj-profile/create");
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Get status color for bookings and streams
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "success";
      case "pending":
        return "warning";
      case "cancelled":
        return "error";
      case "completed":
        return "info";
      case "live":
        return "success";
      case "scheduled":
        return "warning";
      case "ended":
        return "info";
      default:
        return "default";
    }
  };

  if (isLoading) {
    return (
      <Layout title="Dashboard">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard">
        <Box sx={{ p: 2 }}>
          <Typography color="error">{error}</Typography>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {user?.name}!
        </Typography>

        <Typography variant="body1" color="text.secondary" gutterBottom>
          {user?.role === "dj"
            ? "Manage your DJ profile, bookings, and streams from here."
            : "Manage your bookings and join live streams from here."}
        </Typography>
      </Box>

      {/* DJ Profile Section (only for DJs) */}
      {user?.role === "dj" && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
            Your DJ Profile
          </Typography>

          {djProfile ? (
            <Card>
              <CardContent>
                <Typography variant="h6">{djProfile.name}</Typography>
                <Chip
                  label={djProfile.genre}
                  size="small"
                  color="primary"
                  sx={{ my: 1 }}
                />
                <Typography variant="body2" paragraph>
                  {djProfile.bio}
                </Typography>
                <Typography variant="body1">
                  Rate: ${djProfile.rate}/hour
                </Typography>
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => navigate(`/dj-profile/${djProfile.id}`)}
                >
                  Edit Profile
                </Button>
              </CardActions>
            </Card>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  You haven't created a DJ profile yet. Create one to start
                  receiving bookings!
                </Typography>
                <Button variant="contained" onClick={handleCreateDJProfile}>
                  Create DJ Profile
                </Button>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Tabs for Bookings and Streams */}
      <Box sx={{ width: "100%" }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="dashboard tabs"
          >
            <Tab label="Your Bookings" {...a11yProps(0)} />
            <Tab label="Active Streams" {...a11yProps(1)} />
          </Tabs>
        </Box>

        {/* Bookings Tab */}
        <TabPanel value={tabValue} index={0}>
          {bookings.length > 0 ? (
            <Grid container spacing={3}>
              {bookings.map((booking) => (
                <Grid item xs={12} md={6} key={booking.id}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6">
                          {user?.role === "dj"
                            ? `Booking with ${booking.user?.name}`
                            : `Booking with DJ ${booking.djProfile?.name}`}
                        </Typography>
                        <Chip
                          label={booking.status}
                          size="small"
                          color={getStatusColor(booking.status) as any}
                        />
                      </Box>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        When: {formatDate(booking.startTime)} -{" "}
                        {formatDate(booking.endTime)}
                      </Typography>

                      <Divider sx={{ my: 1 }} />

                      <Typography variant="body1">
                        Total: ${booking.totalAmount}
                      </Typography>

                      {booking.notes && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                          Notes: {booking.notes}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => handleViewBooking(booking.id)}
                      >
                        View Details
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                You don't have any bookings yet.
              </Typography>
              <Button variant="contained" onClick={() => navigate("/djs")}>
                {user?.role === "dj" ? "Set Up Your DJ Profile" : "Find a DJ"}
              </Button>
            </Box>
          )}
        </TabPanel>

        {/* Active Streams Tab */}
        <TabPanel value={tabValue} index={1}>
          {activeStreams.length > 0 ? (
            <Grid container spacing={3}>
              {activeStreams.map((stream) => (
                <Grid item xs={12} md={6} key={stream.id}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 2,
                        }}
                      >
                        <Typography variant="h6">{stream.title}</Typography>
                        <Chip
                          label={stream.status}
                          size="small"
                          color={getStatusColor(stream.status) as any}
                        />
                      </Box>

                      <Typography variant="body2" gutterBottom>
                        DJ: {stream.djProfile?.name}
                      </Typography>

                      {stream.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          paragraph
                        >
                          {stream.description}
                        </Typography>
                      )}

                      {stream.startTime && (
                        <Typography variant="body2">
                          Started: {formatDate(stream.startTime)}
                        </Typography>
                      )}
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        variant="contained"
                        color="primary"
                        onClick={() => handleJoinStream(stream.id)}
                      >
                        {stream.status === "live"
                          ? "Join Stream"
                          : "View Details"}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="body1">
                There are no active streams at the moment.
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Box>
    </Layout>
  );
};

export default Dashboard;
