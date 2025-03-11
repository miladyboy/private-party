import React, { useState, useEffect } from "react";
import {
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Chip,
  InputAdornment,
  CircularProgress,
  Pagination,
  SelectChangeEvent,
  Container,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { djProfileApi } from "../services/api";
import { DJProfile } from "../types";

// Music genres for filter
const genres = [
  "Hip Hop",
  "House",
  "Techno",
  "EDM",
  "R&B",
  "Pop",
  "Latin",
  "Rock",
  "Top 40",
  "Reggaeton",
  "Afrobeats",
  "Other",
];

const DJList: React.FC = () => {
  const [djs, setDjs] = useState<DJProfile[]>([]);
  const [filteredDjs, setFilteredDjs] = useState<DJProfile[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchDJs = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await djProfileApi.getAll();
        setDjs(response.data);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching DJs:", err);
        setError("Failed to load DJs. Please try again later.");
        setIsLoading(false);
      }
    };

    fetchDJs();
  }, []);

  // Apply filters whenever filters or DJs data changes
  useEffect(() => {
    const applyFilters = () => {
      let result = [...djs];

      // Apply search term filter
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        result = result.filter(
          (dj) =>
            dj.name.toLowerCase().includes(term) ||
            dj.bio.toLowerCase().includes(term) ||
            dj.genre.toLowerCase().includes(term)
        );
      }

      // Apply genre filter
      if (selectedGenre) {
        result = result.filter(
          (dj) => dj.genre.toLowerCase() === selectedGenre.toLowerCase()
        );
      }

      // Apply price range filter
      if (priceRange) {
        const [min, max] = priceRange.split("-").map(Number);
        if (max) {
          result = result.filter((dj) => dj.rate >= min && dj.rate <= max);
        } else {
          result = result.filter((dj) => dj.rate >= min);
        }
      }

      // Update pagination based on filtered results
      setTotalPages(Math.ceil(result.length / itemsPerPage));

      // Reset to first page when filters change
      setPage(1);

      setFilteredDjs(result);
    };

    applyFilters();
  }, [djs, searchTerm, selectedGenre, priceRange]);

  // Get current page items
  const getCurrentPageItems = () => {
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredDjs.slice(startIndex, endIndex);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleGenreChange = (e: SelectChangeEvent) => {
    setSelectedGenre(e.target.value);
  };

  const handlePriceRangeChange = (e: SelectChangeEvent) => {
    setPriceRange(e.target.value);
  };

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedGenre("");
    setPriceRange("");
  };

  if (isLoading) {
    return (
      <Layout title="Find a DJ">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Find a DJ">
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Layout>
    );
  }

  return (
    <Layout title="Find a DJ">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Browse DJs
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Find the perfect DJ for your next private party
        </Typography>
      </Box>

      {/* Filters */}
      <Box
        component="form"
        sx={{
          mb: 4,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          alignItems: { xs: "stretch", md: "center" },
        }}
        noValidate
        autoComplete="off"
      >
        <TextField
          label="Search"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
          sx={{ flex: 2 }}
        />

        <FormControl variant="outlined" fullWidth sx={{ flex: 1 }}>
          <InputLabel>Genre</InputLabel>
          <Select
            value={selectedGenre}
            onChange={handleGenreChange}
            label="Genre"
          >
            <MenuItem value="">All Genres</MenuItem>
            {genres.map((genre) => (
              <MenuItem key={genre} value={genre}>
                {genre}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl variant="outlined" fullWidth sx={{ flex: 1 }}>
          <InputLabel>Price Range</InputLabel>
          <Select
            value={priceRange}
            onChange={handlePriceRangeChange}
            label="Price Range"
          >
            <MenuItem value="">Any Price</MenuItem>
            <MenuItem value="0-50">$0 - $50 / hour</MenuItem>
            <MenuItem value="50-100">$50 - $100 / hour</MenuItem>
            <MenuItem value="100-200">$100 - $200 / hour</MenuItem>
            <MenuItem value="200">$200+ / hour</MenuItem>
          </Select>
        </FormControl>

        <Button
          variant="outlined"
          onClick={clearFilters}
          sx={{ height: { md: "56px" } }}
        >
          Clear Filters
        </Button>
      </Box>

      {/* Results */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="body2" sx={{ mb: 2 }}>
          {filteredDjs.length} DJs found
        </Typography>

        {filteredDjs.length > 0 ? (
          <>
            <Grid container spacing={4}>
              {getCurrentPageItems().map((dj) => (
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
                      <Typography gutterBottom variant="h5" component="h2">
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

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            )}
          </>
        ) : (
          <Container sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" gutterBottom>
              No DJs match your filters
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Try adjusting your search criteria or clear the filters
            </Typography>
            <Button variant="contained" onClick={clearFilters}>
              Clear All Filters
            </Button>
          </Container>
        )}
      </Box>
    </Layout>
  );
};

export default DJList;
