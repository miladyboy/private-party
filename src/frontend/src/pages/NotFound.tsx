import React from "react";
import { Box, Typography, Button, Container } from "@mui/material";
import { Link } from "react-router-dom";

const NotFound: React.FC = () => {
  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          textAlign: "center",
          py: 4,
        }}
      >
        <Typography
          variant="h1"
          color="primary"
          sx={{ fontSize: "8rem", fontWeight: 700 }}
        >
          404
        </Typography>

        <Typography variant="h4" gutterBottom>
          Page Not Found
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ mb: 4, maxWidth: 500 }}
        >
          The page you're looking for doesn't exist or has been moved. Please
          check the URL or return to the homepage.
        </Typography>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="contained" component={Link} to="/" size="large">
            Go Home
          </Button>

          <Button variant="outlined" component={Link} to="/djs" size="large">
            Browse DJs
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default NotFound;
