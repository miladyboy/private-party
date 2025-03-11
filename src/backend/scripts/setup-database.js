const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

// If no environment variables, try to load from config file
let config;
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  try {
    const configPath = path.join(__dirname, "../../config/config.json");
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (error) {
    console.error("Error loading config file:", error.message);
    process.exit(1);
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || config.database.url,
  process.env.SUPABASE_KEY || config.database.key
);

/**
 * Set up database tables
 */
async function setupDatabase() {
  console.log("Setting up database...");

  try {
    // Create users table
    console.log("Creating users table...");
    const { error: usersError } = await supabase.rpc(
      "create_table_if_not_exists",
      {
        table_name: "users",
        columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('host', 'dj', 'admin')),
        auth_id UUID,
        first_name TEXT,
        last_name TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE
      `,
      }
    );

    if (usersError) {
      throw new Error(`Error creating users table: ${usersError.message}`);
    }

    // Create DJ profiles table
    console.log("Creating dj_profiles table...");
    const { error: djProfilesError } = await supabase.rpc(
      "create_table_if_not_exists",
      {
        table_name: "dj_profiles",
        columns: `
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
      `,
      }
    );

    if (djProfilesError) {
      throw new Error(
        `Error creating dj_profiles table: ${djProfilesError.message}`
      );
    }

    // Create bookings table
    console.log("Creating bookings table...");
    const { error: bookingsError } = await supabase.rpc(
      "create_table_if_not_exists",
      {
        table_name: "bookings",
        columns: `
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
      `,
      }
    );

    if (bookingsError) {
      throw new Error(
        `Error creating bookings table: ${bookingsError.message}`
      );
    }

    // Create streams table
    console.log("Creating streams table...");
    const { error: streamsError } = await supabase.rpc(
      "create_table_if_not_exists",
      {
        table_name: "streams",
        columns: `
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
      `,
      }
    );

    if (streamsError) {
      throw new Error(`Error creating streams table: ${streamsError.message}`);
    }

    // Create payments table
    console.log("Creating payments table...");
    const { error: paymentsError } = await supabase.rpc(
      "create_table_if_not_exists",
      {
        table_name: "payments",
        columns: `
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
      `,
      }
    );

    if (paymentsError) {
      throw new Error(
        `Error creating payments table: ${paymentsError.message}`
      );
    }

    // Create chat_messages table
    console.log("Creating chat_messages table...");
    const { error: chatMessagesError } = await supabase.rpc(
      "create_table_if_not_exists",
      {
        table_name: "chat_messages",
        columns: `
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        stream_id UUID NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      `,
      }
    );

    if (chatMessagesError) {
      throw new Error(
        `Error creating chat_messages table: ${chatMessagesError.message}`
      );
    }

    // Create stored procedure for creating tables if they don't exist
    console.log("Creating stored procedure...");
    const { error: procedureError } = await supabase.rpc("execute_sql", {
      sql: `
        CREATE OR REPLACE FUNCTION create_table_if_not_exists(
          table_name TEXT,
          columns TEXT
        ) RETURNS VOID AS $$
        BEGIN
          IF NOT EXISTS (
            SELECT FROM pg_tables
            WHERE schemaname = 'public'
            AND tablename = table_name
          ) THEN
            EXECUTE format('CREATE TABLE %I (%s)', table_name, columns);
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `,
    });

    if (procedureError) {
      console.log("Stored procedure might already exist, continuing...");
    }

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
      const { error: indexError } = await supabase.rpc("execute_sql", {
        sql: indexSql,
      });
      if (indexError) {
        console.error(`Error creating index: ${indexError.message}`);
      }
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
      const { error: rlsError } = await supabase.rpc("execute_sql", {
        sql: rlsSql,
      });
      if (rlsError) {
        console.error(`Error enabling RLS: ${rlsError.message}`);
      }
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
