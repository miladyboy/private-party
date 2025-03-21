const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const dotenv = require("dotenv");
const fs = require("fs");

// Load environment variables from backend .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

// Validate Supabase credentials
if (!supabaseUrl || !supabaseKey) {
  console.error(
    "Supabase URL and key are required. Please set SUPABASE_URL and SUPABASE_KEY in your src/backend/.env file"
  );
  process.exit(1);
}

// Log for debugging (remove in production)
console.log(`Connecting to Supabase at: ${supabaseUrl}`);

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Creates a SQL migration file - to be run directly in the Supabase SQL editor
 */
async function setupDatabase() {
  console.log("Setting up database...");

  try {
    // Test connection to Supabase
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }
    console.log("Successfully connected to Supabase");

    // Create the migrations directory if it doesn't exist
    const migrationsDir = path.resolve(__dirname, "../migrations");
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }

    // SQL for creating tables
    const migrationSQL = `-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('host', 'dj', 'admin')),
  auth_id UUID,
  first_name TEXT,
  last_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create DJ profiles table
CREATE TABLE IF NOT EXISTS dj_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stage_name TEXT NOT NULL,
  hourly_rate DECIMAL(10, 2) NOT NULL,
  genres TEXT[] DEFAULT '{}',
  bio TEXT,
  experience TEXT,
  equipment TEXT,
  video_links TEXT[] DEFAULT '{}',
  languages TEXT[] DEFAULT '{English}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dj_profile_id UUID NOT NULL REFERENCES dj_profiles(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_hours DECIMAL(5, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_status TEXT NOT NULL CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create streams table
CREATE TABLE IF NOT EXISTS streams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  dj_profile_id UUID NOT NULL REFERENCES dj_profiles(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'live', 'ended', 'failed')),
  ivs_channel_arn TEXT NOT NULL,
  ivs_ingest_endpoint TEXT NOT NULL,
  ivs_playback_url TEXT NOT NULL,
  ivs_stream_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dj_profile_id UUID NOT NULL REFERENCES dj_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  payment_intent_id TEXT NOT NULL,
  payment_intent_client_secret TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_dj_profiles_user_id ON dj_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dj_profile_id ON bookings(dj_profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_streams_booking_id ON streams(booking_id);
CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_stream_id ON chat_messages(stream_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable row-level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dj_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;`;
    
    // Write the migration SQL to a file
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
    const migrationFile = path.join(migrationsDir, `${timestamp}_initial_schema.sql`);
    fs.writeFileSync(migrationFile, migrationSQL);
    
    console.log(`Migration file created at: ${migrationFile}`);
    console.log('\nTo set up your database:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log(`3. Copy the contents of the migration file (${migrationFile})`);
    console.log('4. Paste into the SQL Editor and run it');
    console.log('\nAlternatively, you can run the following command from the SQL Editor:');
    console.log(`\nimport '${migrationFile}';\n`);
    
    console.log("Database migration file created successfully!");
  } catch (error) {
    console.error("Error setting up database:", error.message);
    process.exit(1);
  }
}

// Run the setup
setupDatabase();

// Export for testing
module.exports = {
  setupDatabase,
};
