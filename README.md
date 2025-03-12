# Private Party - DJ Booking & Streaming Platform

Private Party is a web application that connects users with DJs for private events and allows for live streaming performances.

## Features

- **DJ Booking**: Browse and book DJs for private events
- **Live Streaming**: Watch live DJ performances with sub-300ms latency using Amazon IVS
- **User Dashboard**: Manage bookings and view upcoming events
- **DJ Profiles**: Detailed profiles with genres, rates, and reviews
- **Real-time Chat**: Interact with DJs during live streams

## Tech Stack

### Frontend

- React with TypeScript
- Material-UI for UI components
- React Router for navigation
- Socket.io for real-time communication
- Axios for API requests

### Backend

- Node.js with Express.js
- Supabase (PostgreSQL)
- JWT for authentication
- Socket.io for real-time features
- Amazon IVS for low-latency streaming
- Stripe for payment processing

## Project Structure

```
src/
├── frontend/           # Frontend React application
│   ├── public/         # Static assets
│   └── src/
│       ├── components/ # Reusable UI components
│       ├── contexts/   # React contexts (Auth, Socket)
│       ├── pages/      # Page components
│       ├── services/   # API services
│       ├── types/      # TypeScript type definitions
│       ├── utils/      # Utility functions
│       ├── App.tsx     # Main application component
│       └── main.tsx    # Application entry point
├── backend/            # Backend Node.js application
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Express middleware
│   ├── models/         # Data models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── server.js       # Server entry point
├── config/             # Configuration files
├── @CONTEXT.md         # Application context and state
└── @config.json        # Configuration value pairs
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Supabase account
- AWS account with IVS access
- Stripe account

### Installation

1. Clone the repository

   ```
   git clone https://github.com/yourusername/private-party.git
   cd private-party
   ```

2. Install dependencies

   ```
   # Install frontend dependencies
   cd src/frontend
   npm install

   # Install backend dependencies
   cd ../backend
   npm install
   ```

3. Set up environment variables

   - Create `.env` files in both frontend and backend directories
   - Backend `.env` should include:
     ```
     PORT=4000
     NODE_ENV=development
     JWT_SECRET=your_jwt_secret
     SUPABASE_URL=your_supabase_url
     SUPABASE_KEY=your_supabase_key
     STRIPE_SECRET_KEY=your_stripe_secret_key
     STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
     AWS_REGION=us-east-1
     AWS_ACCESS_KEY_ID=your_aws_access_key
     AWS_SECRET_ACCESS_KEY=your_aws_secret_key
     ```

4. Start the development servers

   ```
   # Start backend server
   cd src/backend
   npm run dev

   # Start frontend server
   cd src/frontend
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login a user

### User Management

- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/change-password` - Change user password

### DJ Profiles

- `GET /api/dj-profiles` - Get all DJ profiles
- `GET /api/dj-profiles/search` - Search for DJ profiles
- `GET /api/dj-profiles/profile` - Get current user's DJ profile
- `POST /api/dj-profiles` - Create a new DJ profile
- `PUT /api/dj-profiles/:id` - Update DJ profile
- `GET /api/dj-profiles/:id` - Get DJ profile by ID
- `GET /api/dj-profiles/:id/availability` - Get DJ availability

### Bookings

- `GET /api/bookings` - Get all bookings for current user
- `POST /api/bookings` - Create a new booking
- `GET /api/bookings/:id` - Get booking by ID
- `PUT /api/bookings/:id` - Update booking
- `POST /api/bookings/:id/cancel` - Cancel booking
- `POST /api/bookings/:id/confirm` - Confirm booking
- `GET /api/bookings/dj` - Get all bookings for current DJ

### Streaming

- `POST /api/streams` - Create a new stream
- `GET /api/streams/:id` - Get stream details
- `PUT /api/streams/:id/end` - End stream
- `GET /api/streams/active` - Get all active streams

### Payments

- `POST /api/payments/create-intent/:bookingId` - Create a payment intent
- `GET /api/payments/user` - Get payments for current user
- `GET /api/payments/dj` - Get payments for current DJ
- `POST /api/payments/webhook` - Handle Stripe webhook events

### Chat

- `GET /api/chat/:streamId` - Get chat messages for a stream
- `POST /api/chat/:streamId` - Create a new chat message

## Real-time Communication

Socket.io is integrated for real-time communication, supporting:

- Real-time chat during streams
- User join/leave notifications
- Stream status updates
- Viewer count tracking

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Material-UI](https://mui.com/) for the UI components
- [Socket.io](https://socket.io/) for real-time features
- [Amazon IVS](https://aws.amazon.com/ivs/) for streaming capabilities
- [Supabase](https://supabase.io/) for database and authentication
- [Stripe](https://stripe.com/) for payment processing
