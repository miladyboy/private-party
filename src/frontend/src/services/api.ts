import axios, {
  AxiosError,
  AxiosInstance,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";

// Create a base API instance with common configuration
const api: AxiosInstance = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15 seconds timeout
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log request for debugging
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);

    return config;
  },
  (error: AxiosError) => {
    console.error("API Request Error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling common error cases
api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log successful responses for debugging
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized errors (token expired/invalid)
    if (error.response?.status === 401) {
      // Clear stored tokens
      localStorage.removeItem("token");

      // Redirect to login if not already there
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    // Log the error for debugging
    console.error("API Response Error:", error);

    return Promise.reject(error);
  }
);

// Auth API methods
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),

  register: (userData: any) => api.post("/auth/register", userData),

  getProfile: () => api.get("/users/profile"),

  updateProfile: (profileData: any) => api.put("/users/profile", profileData),
};

// DJ Profile API methods
export const djProfileApi = {
  getAll: (filters?: any) => api.get("/dj-profiles", { params: filters }),

  getById: (id: string) => api.get(`/dj-profiles/${id}`),

  create: (profileData: any) => api.post("/dj-profiles", profileData),

  update: (id: string, profileData: any) =>
    api.put(`/dj-profiles/${id}`, profileData),
};

// Booking API methods
export const bookingApi = {
  getAll: (filters?: any) => api.get("/bookings", { params: filters }),

  getById: (id: string) => api.get(`/bookings/${id}`),

  create: (bookingData: any) => api.post("/bookings", bookingData),

  update: (id: string, bookingData: any) =>
    api.put(`/bookings/${id}`, bookingData),

  cancel: (id: string) => api.post(`/bookings/${id}/cancel`),

  getForDj: () => api.get("/bookings/dj"),

  confirmBooking: (id: string) => api.post(`/bookings/${id}/confirm`),
};

// Stream API methods
export const streamApi = {
  create: (streamData: any) => api.post("/streams", streamData),

  getById: (id: string) => api.get(`/streams/${id}`),

  getStream: (id: string) => api.get(`/streams/${id}`),

  endStream: (id: string) => api.put(`/streams/${id}/end`),

  getAllActive: () => api.get("/streams/active"),
};

// Payment API methods
export const paymentApi = {
  createPaymentIntent: (bookingId: string) =>
    api.post(`/payments/create-intent/${bookingId}`),

  getPaymentsByUser: () => api.get("/payments/user"),

  getPaymentsByDj: () => api.get("/payments/dj"),
};

// Chat API methods
export const chatApi = {
  getMessages: (streamId: string) => api.get(`/chat/${streamId}`),

  sendMessage: (streamId: string, content: string) =>
    api.post(`/chat/${streamId}`, { content }),
};

export default api;
