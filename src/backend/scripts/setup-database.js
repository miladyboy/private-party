const { createClient } = require("@supabase/supabase-js");
const path = require("path");
const dotenv = require("dotenv");

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
 * Execute SQL query
 * @param {string} sql - SQL query to execute
 * @param {string} description - Description of the query for logging
 * @returns {Promise<void>}
 */
async function executeSql(sql, description) {
  try {
    const { data, error } = await supabase
      .from("_dummy_")
      .select("*")
      .limit(1)
      .then(
        () => ({ data: null, error: null }),
        (err) => ({ data: null, error: err })
      );

    if (error && !error.message.includes('relation "_dummy_" does not exist')) {
      throw new Error(`Failed to connect to Supabase: ${error.message}`);
    }

    // Use the REST API to execute SQL (this is a workaround since we don't have RPC functions)
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        query: sql,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error executing SQL (${description}): ${errorText}`);
    }

    console.log(`Successfully executed: ${description}`);
  } catch (error) {
    console.error(`Error executing SQL (${description}):`, error.message);
    throw error;
  }
}

/**
 * Set up database tables
 */
async function setupDatabase() {
  console.log("Setting up database...");

  try {
    // First check if we can connect to Supabase
    try {
      // Try a simple query to test connection
      const { error } = await supabase.from("users").select("*").limit(1);

      // If we get a "relation does not exist" error, that's actually good - it means we're connected
      // but the table doesn't exist yet (which is expected)
      if (error) {
        if (
          error.message.includes('relation "users" does not exist') ||
          error.message.includes('relation "public.users" does not exist')
        ) {
          console.log(
            "Successfully connected to Supabase (users table doesn't exist yet, which is expected)"
          );
        } else {
          // This is an actual error we should handle
          throw error;
        }
      } else {
        console.log(
          "Successfully connected to Supabase (users table already exists)"
        );
      }
    } catch (connectionError) {
      // Only throw if it's not the expected "relation does not exist" error
      if (
        !connectionError.message.includes('relation "users" does not exist') &&
        !connectionError.message.includes(
          'relation "public.users" does not exist'
        )
      ) {
        throw new Error(
          `Failed to connect to Supabase: ${connectionError.message}`
        );
      }
      console.log(
        "Successfully connected to Supabase (users table doesn't exist yet, which is expected)"
      );
    }

    // Create users table
    console.log("Creating users table...");
    await supabase.query(`
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
      )
    `);

    // Create DJ profiles table
    console.log("Creating dj_profiles table...");
    await supabase.query(`
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
      )
    `);

    // Create bookings table
    console.log("Creating bookings table...");
    await supabase.query(`
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
      )
    `);

    // Create streams table
    console.log("Creating streams table...");
    await supabase.query(`
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
      )
    `);

    // Create payments table
    console.log("Creating payments table...");
    await supabase.query(`
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
      )
    `);

    // Create chat_messages table
    console.log("Creating chat_messages table...");
    await supabase.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create indexes for performance
    console.log("Creating indexes...");
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
      "CREATE INDEX IF NOT EXISTS idx_dj_profiles_user_id ON dj_profiles(user_id)",
      "CREATE INDEX IF NOT EXISTS idx_bookings_host_id ON bookings(host_id)",
      "CREATE INDEX IF NOT EXISTS idx_bookings_dj_profile_id ON bookings(dj_profile_id)",
      "CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)",
      "CREATE INDEX IF NOT EXISTS idx_streams_booking_id ON streams(booking_id)",
      "CREATE INDEX IF NOT EXISTS idx_streams_status ON streams(status)",
      "CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id)",
      "CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_stream_id ON chat_messages(stream_id)",
      "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)",
    ];

    for (const indexSql of indexes) {
      await supabase.query(indexSql);
    }

    // Enable row-level security
    console.log("Enabling row-level security...");
    const rlsPolicies = [
      `ALTER TABLE users ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE dj_profiles ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE bookings ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE streams ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE payments ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY`,
    ];

    for (const rlsSql of rlsPolicies) {
      await supabase.query(rlsSql);
    }

    console.log("Database setup completed successfully!");
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
