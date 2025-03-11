import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  Stack,
} from "@mui/material";
import { styled } from "@mui/material/styles";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { djProfileApi } from "../services/api";
import { DJProfile } from "../types";

const HeroSection = styled(Box)(({ theme }) => ({
  backgroundImage: "linear-gradient(to right, #7209b7, #3a0ca3)",
  color: "#ffffff",
  padding: theme.spacing(10, 2),
  borderRadius: theme.spacing(2),
  marginBottom: theme.spacing(6),
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  textAlign: "center",
  [theme.breakpoints.up("md")]: {
    padding: theme.spacing(12, 6),
  },
}));

const Home: React.FC = () => {
  const [featuredDJs, setFeaturedDJs] = useState<DJProfile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeaturedDJs = async () => {
      try {
        setLoading(true);
        const response = await djProfileApi.getAll();

        // For now, we'll just use the first 4 DJs as featured
        setFeaturedDJs(response.data.slice(0, 4));
        setLoading(false);
      } catch (err) {
        console.error("Error fetching featured DJs:", err);
        setError("Failed to load featured DJs. Please try again later.");
        setLoading(false);
      }
    };

    fetchFeaturedDJs();
  }, []);

  return (
    <Layout title="PartyStream - Book Your Party DJ">
      <HeroSection>
        <Typography variant="h2" component="h1" gutterBottom>
          Book Your Private Party DJ
        </Typography>
        <Typography
          variant="h5"
          component="h2"
          gutterBottom
          sx={{ maxWidth: 800, mb: 4 }}
        >
          Stream live music for your private party with professional DJs from
          around the world
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          component={Link}
          to="/djs"
          sx={{
            borderRadius: 4,
            py: 1.5,
            px: 4,
            fontSize: "1.1rem",
            fontWeight: 600,
          }}
        >
          Find a DJ
        </Button>
      </HeroSection>

      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 4 }}>
          Featured DJs
        </Typography>

        {loading ? (
          <Typography>Loading featured DJs...</Typography>
        ) : error ? (
          <Typography color="error">{error}</Typography>
        ) : (
          <Grid container spacing={4}>
            {featuredDJs.map((dj) => (
              <Grid item key={dj.id} xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={
                      dj.imageUrl ||
                      "https://via.placeholder.com/400x200?text=DJ+Profile"
                    }
                    alt={dj.name}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="h3">
                      {dj.name}
                    </Typography>
                    <Chip
                      label={dj.genre}
                      size="small"
                      color="primary"
                      sx={{ mb: 2 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      {dj.bio.length > 120
                        ? `${dj.bio.substring(0, 120)}...`
                        : dj.bio}
                    </Typography>
                    <Typography variant="h6" sx={{ mt: 2 }}>
                      ${dj.rate}/hour
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      variant="outlined"
                      component={Link}
                      to={`/djs/${dj.id}`}
                      fullWidth
                    >
                      View Profile
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <Box sx={{ mb: 6 }}>
        <Typography variant="h4" component="h2" gutterBottom sx={{ mb: 3 }}>
          How It Works
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <Typography variant="h2" color="primary" sx={{ mb: 2 }}>
                1
              </Typography>
              <Typography variant="h5" gutterBottom>
                Browse DJs
              </Typography>
              <Typography variant="body1">
                Explore our catalog of professional DJs across various genres
                and styles
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <Typography variant="h2" color="primary" sx={{ mb: 2 }}>
                2
              </Typography>
              <Typography variant="h5" gutterBottom>
                Book Your Session
              </Typography>
              <Typography variant="body1">
                Choose your date, time, and duration - then secure your booking
                with payment
              </Typography>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ height: "100%", textAlign: "center", p: 2 }}>
              <Typography variant="h2" color="primary" sx={{ mb: 2 }}>
                3
              </Typography>
              <Typography variant="h5" gutterBottom>
                Stream Your Party
              </Typography>
              <Typography variant="body1">
                Stream high-quality audio and interact with your DJ during your
                event
              </Typography>
            </Card>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ textAlign: "center", py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Ready to Get Started?
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, maxWidth: 700, mx: "auto" }}>
          Join PartyStream today and bring professional DJs to your next
          gathering
        </Typography>
        <Stack direction="row" spacing={2} justifyContent="center">
          <Button
            variant="contained"
            color="primary"
            size="large"
            component={Link}
            to="/register"
          >
            Sign Up
          </Button>
          <Button
            variant="outlined"
            color="primary"
            size="large"
            component={Link}
            to="/djs"
          >
            Browse DJs
          </Button>
        </Stack>
      </Box>
    </Layout>
  );
};

export default Home;
