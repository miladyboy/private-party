// User types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "dj" | "admin";
  createdAt?: string;
  updatedAt?: string;
}

// DJ Profile types
export interface DJProfile {
  id: string;
  name: string;
  email: string;
  bio: string;
  genre: string;
  rate: number;
  imageUrl?: string;
  coverImageUrl?: string;
  experience?: string;
  location?: string;
  createdAt: string;
  updatedAt: string;
}

// Booking types
export interface Booking {
  id: string;
  userId: string;
  djId: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  notes?: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Stream types
export interface Stream {
  id: string;
  djId: string;
  title: string;
  description?: string;
  streamUrl: string;
  thumbnailUrl?: string;
  genre?: string;
  isActive: boolean;
  startTime: string;
  endTime?: string;
  viewerCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt: string;
}

// Payment types
export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  status: "pending" | "completed" | "failed" | "refunded";
  paymentIntentId?: string;
  createdAt?: string;
  updatedAt?: string;
  booking?: Booking;
}

// Chat types
export interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

// Form types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: "user" | "dj";
}

export interface DJProfileFormData {
  name: string;
  genre: string;
  bio: string;
  rate: number;
  availability: string[];
  imageUrl?: string;
}

export interface BookingFormData {
  djProfileId: string;
  startTime: string;
  endTime: string;
  notes?: string;
}
