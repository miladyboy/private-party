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
  CircularProgress,
  Container,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  CalendarMonth as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  AttachMoney as MoneyIcon,
  Person as PersonIcon,
  MusicNote as MusicNoteIcon,
  Notes as NotesIcon,
} from "@mui/icons-material";
import { format } from "date-fns";
import Layout from "../components/Layout";
import { bookingApi, djProfileApi } from "../services/api";
import { Booking, DJProfile } from "../types";
import { useAuth } from "../contexts/AuthContext";

// Helper function to format date and time
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString);
  return format(date, "PPP p"); // e.g., "April 29, 2023 at 2:30 PM"
};

// Helper function to get status color
const getStatusColor = (
  status: string
):
  | "default"
  | "primary"
  | "secondary"
  | "error"
  | "info"
  | "success"
  | "warning" => {
  switch (status.toLowerCase()) {
    case "confirmed":
      return "success";
    case "pending":
      return "warning";
    case "cancelled":
      return "error";
    case "completed":
      return "secondary";
    default:
      return "default";
  }
};

const BookingDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [djProfile, setDjProfile] = useState<DJProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [openCancelDialog, setOpenCancelDialog] = useState<boolean>(false);
  const [openConfirmDialog, setOpenConfirmDialog] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!id) return;

      setIsLoading(true);
      setError(null);

      try {
        const response = await bookingApi.getById(id);
        setBooking(response.data);

        // Fetch DJ profile
        if (response.data.djId) {
          const djResponse = await djProfileApi.getById(response.data.djId);
          setDjProfile(djResponse.data);
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching booking details:", err);
        setError("Failed to load booking details. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [id]);

  const handleCancelBooking = async () => {
    if (!booking || !id) return;

    setActionLoading(true);

    try {
      await bookingApi.update(id, { status: "cancelled" });
      setBooking({ ...booking, status: "cancelled" });
      setSuccessMessage("Booking has been cancelled successfully.");
      setOpenCancelDialog(false);
    } catch (err) {
      console.error("Error cancelling booking:", err);
      setError("Failed to cancel booking. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    if (!booking || !id) return;

    setActionLoading(true);

    try {
      await bookingApi.update(id, { status: "confirmed" });
      setBooking({ ...booking, status: "confirmed" });
      setSuccessMessage("Booking has been confirmed successfully.");
      setOpenConfirmDialog(false);
    } catch (err) {
      console.error("Error confirming booking:", err);
      setError("Failed to confirm booking. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSnackbarClose = () => {
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <Layout title="Booking Details">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error || !booking) {
    return (
      <Layout title="Booking Details">
        <Typography color="error" sx={{ mb: 2 }}>
          {error || "Booking not found"}
        </Typography>
        <Button variant="contained" onClick={() => navigate("/dashboard")}>
          Back to Dashboard
        </Button>
      </Layout>
    );
  }

  const isUserDJ = user?.role === "dj" && user?.id === booking.djId;
  const isUserCustomer = user?.role === "user" && user?.id === booking.userId;
  const canCancel =
    booking.status === "pending" || booking.status === "confirmed";
  const canConfirm = isUserDJ && booking.status === "pending";

  return (
    <Layout title="Booking Details">
      <Container maxWidth="lg">
        <Box sx={{ mb: 4 }}>
          <Button
            variant="outlined"
            onClick={() => navigate("/dashboard")}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>

          <Typography variant="h4" component="h1" gutterBottom>
            Booking Details
          </Typography>

          <Chip
            label={booking.status.toUpperCase()}
            color={getStatusColor(booking.status)}
            sx={{ fontWeight: "bold" }}
          />
        </Box>

        <Grid container spacing={4}>
          {/* Main Booking Info */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom>
                  Event Information
                </Typography>

                <List>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Date"
                      secondary={format(new Date(booking.date), "PPPP")} // e.g., "Monday, April 29, 2023"
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <TimeIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Time"
                      secondary={`${formatDateTime(
                        booking.startTime
                      )} - ${formatDateTime(booking.endTime)}`}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Location"
                      secondary={booking.location}
                    />
                  </ListItem>

                  {djProfile && (
                    <ListItem>
                      <ListItemIcon>
                        <MusicNoteIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText primary="DJ" secondary={djProfile.name} />
                    </ListItem>
                  )}

                  <ListItem>
                    <ListItemIcon>
                      <MoneyIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary="Total Amount"
                      secondary={`$${booking.totalAmount.toFixed(2)}`}
                    />
                  </ListItem>

                  {booking.notes && (
                    <ListItem>
                      <ListItemIcon>
                        <NotesIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary="Additional Notes"
                        secondary={booking.notes}
                      />
                    </ListItem>
                  )}
                </List>
              </CardContent>
            </Card>

            {/* Actions */}
            {(isUserDJ || isUserCustomer) && (
              <Paper sx={{ p: 3, mb: 4 }}>
                <Typography variant="h6" gutterBottom>
                  Booking Actions
                </Typography>

                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {canCancel && (
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => setOpenCancelDialog(true)}
                    >
                      Cancel Booking
                    </Button>
                  )}

                  {canConfirm && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => setOpenConfirmDialog(true)}
                    >
                      Confirm Booking
                    </Button>
                  )}

                  {djProfile && (
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/djs/${djProfile.id}`)}
                    >
                      View DJ Profile
                    </Button>
                  )}
                </Box>
              </Paper>
            )}
          </Grid>

          {/* Sidebar */}
          <Grid item xs={12} md={4}>
            {/* Payment Info */}
            <Card sx={{ mb: 4 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Payment Information
                </Typography>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1">
                    {booking.status === "confirmed"
                      ? "Payment required"
                      : "Pending confirmation"}
                  </Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h5">
                    ${booking.totalAmount.toFixed(2)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="body2" color="text.secondary" paragraph>
                  Payment will be processed after the booking is confirmed.
                </Typography>

                {booking.status === "confirmed" && (
                  <Button
                    variant="contained"
                    fullWidth
                    disabled={booking.status !== "confirmed"}
                  >
                    Proceed to Payment
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Support Info */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Need Help?
                </Typography>
                <Typography variant="body2" paragraph>
                  If you have any questions or need to make changes to your
                  booking, please contact our support team.
                </Typography>
                <Button variant="outlined" fullWidth>
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Cancel Dialog */}
      <Dialog
        open={openCancelDialog}
        onClose={() => setOpenCancelDialog(false)}
      >
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel this booking? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenCancelDialog(false)}
            disabled={actionLoading}
          >
            No, Keep Booking
          </Button>
          <Button
            onClick={handleCancelBooking}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? "Cancelling..." : "Yes, Cancel Booking"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog
        open={openConfirmDialog}
        onClose={() => setOpenConfirmDialog(false)}
      >
        <DialogTitle>Confirm Booking</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to confirm this booking? The customer will be
            notified and payment will be requested.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setOpenConfirmDialog(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirmBooking}
            color="primary"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? "Confirming..." : "Confirm Booking"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success Snackbar */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default BookingDetails;
