# Private Party - Application Context

This document provides an overview of the current state of the Private Party application, a platform for booking DJs and streaming live performances.

## Application Structure

The application follows a client-server architecture:

- **Frontend**: React application with TypeScript and Material-UI
- **Backend**: Node.js/Express API with Supabase (PostgreSQL) database

## Frontend Components

### Pages

1. **Home** (`src/frontend/src/pages/Home.tsx`)

   - Landing page with hero section and featured DJs
   - Provides navigation to DJ listings and user registration

2. **Login/Register** (`src/frontend/src/pages/Login.tsx`, `src/frontend/src/pages/Register.tsx`)

   - User authentication forms with validation
   - Support for both regular users and DJ accounts

3. **Dashboard** (`src/frontend/src/pages/Dashboard.tsx`)

   - User-specific dashboard showing bookings and streams
   - Different views for regular users and DJs

4. **DJ List** (`src/frontend/src/pages/DJList.tsx`)

   - Browsable and searchable list of available DJs
   - Filtering by genre, price range, and search terms

5. **DJ Profile** (`src/frontend/src/pages/DJProfile.tsx`)

   - Detailed DJ profile with bio, rates, and booking form
   - Reviews and availability information

6. **Booking Details** (`src/frontend/src/pages/BookingDetails.tsx`)

   - View and manage booking details
   - Actions for confirming, canceling, and modifying bookings

7. **Stream View** (`src/frontend/src/pages/StreamView.tsx`)

   - Live streaming interface with video player
   - Real-time chat functionality

8. **Not Found** (`src/frontend/src/pages/NotFound.tsx`)
   - 404 error page

### Contexts

1. **AuthContext** (`src/frontend/src/contexts/AuthContext.tsx`)

   - Manages user authentication state
   - Provides login, register, and logout functionality

2. **SocketContext** (`src/frontend/src/contexts/SocketContext.tsx`)
   - Manages Socket.io connection for real-time features
   - Handles connection state and authentication

### Services

1. **API Service** (`src/frontend/src/services/api.ts`)
   - Axios-based API client for backend communication
   - Endpoints for users, DJs, bookings, and streams

## Data Models

### User

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "dj" | "admin";
  createdAt: string;
  updatedAt: string;
}
```

### DJ Profile

```typescript
interface DJProfile {
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
```

### Booking

```typescript
interface Booking {
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
```

### Stream

```typescript
interface Stream {
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
```

### Chat Message

```typescript
interface ChatMessage {
  id: string;
  streamId: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}
```

## Current Implementation Status

### Completed Features

- User authentication (login/register)
- DJ profile browsing and filtering
- Booking form and management
- Basic streaming interface with chat

### In Progress

- Payment integration
- Real-time notifications
- DJ availability calendar
- Rating and review system

### Planned Features

- Mobile application
- Advanced analytics for DJs
- Subscription model for premium features
- Social sharing and integration

## Configuration

Application configuration is stored in `@config.json` and includes:

- API endpoints and timeouts
- Streaming settings
- UI theme configuration
- Validation rules
- Feature flags

## Development Workflow

1. Frontend development is done using Vite for fast development and building
2. Backend API is developed with Express.js and connected to Supabase
3. Authentication is handled via JWT tokens
4. Real-time features use Socket.io
5. Streaming is implemented with Amazon IVS

## Deployment

The application is designed to be deployed as:

- Frontend: Static files served from CDN or hosting service
- Backend: Node.js application on cloud provider (AWS, Heroku, etc.)
- Database: Supabase (PostgreSQL)
- Streaming: Amazon IVS

## Next Steps

1. Complete the payment integration
2. Enhance the streaming experience
3. Implement the rating and review system
4. Add comprehensive testing
5. Optimize for mobile devices
