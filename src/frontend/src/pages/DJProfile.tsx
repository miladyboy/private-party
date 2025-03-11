import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Typography,
  Grid,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Avatar,
  Rating,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Paper,
  Container,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  MusicNote as MusicNoteIcon,
  AttachMoney as MoneyIcon,
  Event as EventIcon,
  LocationOn as LocationIcon,
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
} from "@mui/icons-material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  LocalizationProvider,
  DatePicker,
  TimePicker,
} from "@mui/x-date-pickers";
import Layout from "../components/Layout";
import { djProfileApi, bookingApi } from "../services/api";
import { DJProfile } from "../types";
import { useAuth } from "../contexts/AuthContext";

const DJProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  const [djProfile, setDjProfile] = useState<DJProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Booking dialog state
  const [openBookingDialog, setOpenBookingDialog] = useState<boolean>(false);
  const [bookingDate, setBookingDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [location, setLocation] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchDJProfile = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await djProfileApi.getById(id);
        setDjProfile(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching DJ profile:", err);
        setError("Failed to load DJ profile. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchDJProfile();
  }, [id]);

  const handleBookingOpen = () => {
    if (!isAuthenticated) {
      // Redirect to login if not authenticated
      navigate("/login", { state: { from: `/djs/${id}` } });
      return;
    }

    setOpenBookingDialog(true);
  };

  const handleBookingClose = () => {
    setOpenBookingDialog(false);
    // Reset form
    setBookingDate(null);
    setStartTime(null);
    setEndTime(null);
    setLocation("");
    setNotes("");
    setBookingError(null);
  };

  const calculateDuration = (): number => {
    if (!startTime || !endTime) return 0;

    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    return Math.max(0, durationHours);
  };

  const calculateTotalCost = (): number => {
    if (!djProfile) return 0;

    const duration = calculateDuration();
    return djProfile.rate * duration;
  };

  const validateBookingForm = (): boolean => {
    if (!bookingDate) {
      setBookingError("Please select a date");
      return false;
    }

    if (!startTime) {
      setBookingError("Please select a start time");
      return false;
    }

    if (!endTime) {
      setBookingError("Please select an end time");
      return false;
    }

    if (startTime >= endTime) {
      setBookingError("End time must be after start time");
      return false;
    }

    if (!location.trim()) {
      setBookingError("Please enter a location");
      return false;
    }

    return true;
  };

  const handleBookingSubmit = async () => {
    if (!validateBookingForm() || !djProfile || !user) return;

    setBookingError(null);

    try {
      // Format the booking data
      const bookingData = {
        djId: djProfile.id,
        userId: user.id,
        date: bookingDate!.toISOString().split("T")[0],
        startTime: startTime!.toISOString(),
        endTime: endTime!.toISOString(),
        location: location,
        notes: notes,
        status: "pending",
        totalAmount: calculateTotalCost(),
      };

      await bookingApi.create(bookingData);
      setBookingSuccess(true);
      handleBookingClose();
    } catch (err) {
      console.error("Error creating booking:", err);
      setBookingError("Failed to create booking. Please try again.");
    }
  };

  const handleSnackbarClose = () => {
    setBookingSuccess(false);
  };

  if (isLoading) {
    return (
      <Layout title="DJ Profile">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !djProfile) {
    return (
      <Layout title="DJ Profile">
        <Typography color="error" sx={{ mb: 2 }}>
          {error || "DJ not found"}
        </Typography>
        <Button variant="contained" onClick={() => navigate("/djs")}>
          Back to DJ List
        </Button>
      </Layout>
    );
  }

  return (
    <Layout title={`DJ ${djProfile.name}`}>
      <Container maxWidth="lg">
        {/* Hero Section */}
        <Paper
          sx={{
            p: 4,
            mb: 4,
            backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url(${
              djProfile.coverImageUrl ||
              "https://via.placeholder.com/1200x400?text=DJ+Cover"
            })`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "white",
            borderRadius: 2,
          }}
        >
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={3}>
              <Avatar
                src={
                  djProfile.imageUrl ||
                  "https://via.placeholder.com/200x200?text=DJ"
                }
                alt={djProfile.name}
                sx={{
                  width: { xs: 150, md: 200 },
                  height: { xs: 150, md: 200 },
                  mx: { xs: "auto", md: 0 },
                }}
              />
            </Grid>
            <Grid item xs={12} md={9}>
              <Typography variant="h3" component="h1" gutterBottom>
                {djProfile.name}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 2,
                  flexWrap: "wrap",
                  gap: 1,
                }}
              >
                <Chip label={djProfile.genre} color="primary" size="medium" />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    ml: { xs: 0, sm: 2 },
                  }}
                >
                  <Rating value={4.5} readOnly precision={0.5} />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    (24 reviews)
                  </Typography>
                </Box>
              </Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                ${djProfile.rate}/hour
              </Typography>
              <Button
                variant="contained"
                size="large"
                onClick={handleBookingOpen}
                sx={{ mt: 2 }}
              >
                Book Now
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Main Content */}
        <Grid container spacing={4}>
          {/* Left Column - DJ Info */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  About
                </Typography>
                <Typography variant="body1" paragraph>
                  {djProfile.bio}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h5" component="h2" gutterBottom>
                  Experience & Equipment
                </Typography>
                <Typography variant="body1" paragraph>
                  {djProfile.experience ||
                    "Professional DJ with years of experience in private events and parties. Equipped with high-quality sound system, lighting, and an extensive music library covering various genres."}
                </Typography>

                <List>
                  <ListItem>
                    <ListItemIcon>
                      <MusicNoteIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Music Genres"
                      secondary={djProfile.genre}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EventIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Event Types"
                      secondary="Private Parties, Corporate Events, Weddings, Birthdays"
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="Location"
                      secondary={
                        djProfile.location || "Available for events nationwide"
                      }
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            {/* Reviews Section */}
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  Reviews
                </Typography>
                {/* Sample reviews - would be replaced with actual reviews from API */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Avatar sx={{ mr: 2 }}>J</Avatar>
                    <Box>
                      <Typography variant="subtitle1">John D.</Typography>
                      <Rating value={5} readOnly size="small" />
                    </Box>
                  </Box>
                  <Typography variant="body2">
                    "Amazing DJ! Created the perfect atmosphere for our party.
                    Highly recommended!"
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
                    <Avatar sx={{ mr: 2 }}>S</Avatar>
                    <Box>
                      <Typography variant="subtitle1">Sarah M.</Typography>
                      <Rating value={4} readOnly size="small" />
                    </Box>
                  </Box>
                  <Typography variant="body2">
                    "Great music selection and very professional. Would book
                    again."
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Right Column - Booking Info */}
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 4, position: { md: "sticky" }, top: { md: 24 } }}>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  Booking Information
                </Typography>

                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <MoneyIcon sx={{ mr: 2, color: "primary.main" }} />
                  <Typography variant="body1">
                    <strong>${djProfile.rate}</strong> per hour
                  </Typography>
                </Box>

                <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                  <TimeIcon sx={{ mr: 2, color: "primary.main" }} />
                  <Typography variant="body1">
                    <strong>Minimum booking:</strong> 2 hours
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" paragraph>
                  Price includes standard sound equipment. Additional services
                  like lighting or special equipment may incur extra charges.
                </Typography>

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handleBookingOpen}
                  sx={{ mt: 2 }}
                >
                  Book This DJ
                </Button>
              </CardContent>
            </Card>

            {/* Availability Calendar would go here */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Available Dates
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Check the booking form for available dates. Contact directly
                  for special arrangements.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Booking Dialog */}
      <Dialog
        open={openBookingDialog}
        onClose={handleBookingClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Book DJ {djProfile.name}</DialogTitle>
        <DialogContent>
          {bookingError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {bookingError}
            </Alert>
          )}

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <DatePicker
                  label="Event Date"
                  value={bookingDate}
                  onChange={(newValue: Date | null) => setBookingDate(newValue)}
                  slotProps={{
                    textField: { fullWidth: true, margin: "normal" },
                  }}
                />
              </Grid>

              <Grid item xs={6}>
                <TimePicker
                  label="Start Time"
                  value={startTime}
                  onChange={(newValue: Date | null) => setStartTime(newValue)}
                  slotProps={{
                    textField: { fullWidth: true, margin: "normal" },
                  }}
                />
              </Grid>

              <Grid item xs={6}>
                <TimePicker
                  label="End Time"
                  value={endTime}
                  onChange={(newValue: Date | null) => setEndTime(newValue)}
                  slotProps={{
                    textField: { fullWidth: true, margin: "normal" },
                  }}
                />
              </Grid>
            </Grid>
          </LocalizationProvider>

          <TextField
            margin="normal"
            label="Location"
            fullWidth
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <TextField
            margin="normal"
            label="Additional Notes"
            fullWidth
            multiline
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {startTime && endTime && startTime < endTime && (
            <Box
              sx={{ mt: 2, p: 2, bgcolor: "background.paper", borderRadius: 1 }}
            >
              <Typography variant="subtitle1" gutterBottom>
                Booking Summary
              </Typography>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2">Duration:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {calculateDuration().toFixed(1)} hours
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2">Rate:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    ${djProfile.rate}/hour
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1">Total:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="subtitle1" align="right">
                    ${calculateTotalCost().toFixed(2)}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleBookingClose}>Cancel</Button>
          <Button
            onClick={handleBookingSubmit}
            variant="contained"
            disabled={!bookingDate || !startTime || !endTime || !location}
          >
            Request Booking
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={bookingSuccess}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          Booking request sent successfully! You'll receive a confirmation soon.
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default DJProfilePage;
