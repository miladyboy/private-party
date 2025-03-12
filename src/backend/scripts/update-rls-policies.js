// Load environment variables first
require('dotenv').config();

const { supabase, TABLES, logger } = require("../utils/database");

/**
 * Update Row Level Security policies for the database
 */
async function updateRLSPolicies() {
  try {
    console.log("Updating Row Level Security policies...");
    
    // Create or replace SQL for the policies
    // This will be executed in the Supabase SQL editor
    const sql = `
    -- Allow service role to perform all operations on all tables
    
    -- Users table policies
    CREATE POLICY "Enable all operations for service role" ON ${TABLES.USERS}
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Allow users to read their own profile
    CREATE POLICY "Users can read their own profile" ON ${TABLES.USERS}
      FOR SELECT
      USING (auth.uid() = auth_id);
      
    -- Allow users to update their own profile
    CREATE POLICY "Users can update their own profile" ON ${TABLES.USERS}
      FOR UPDATE
      USING (auth.uid() = auth_id)
      WITH CHECK (auth.uid() = auth_id);
      
    -- DJ profiles policies
    CREATE POLICY "Enable all operations for service role" ON ${TABLES.DJ_PROFILES}
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Bookings policies
    CREATE POLICY "Enable all operations for service role" ON ${TABLES.BOOKINGS}
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Streams policies
    CREATE POLICY "Enable all operations for service role" ON ${TABLES.STREAMS}
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Payments policies
    CREATE POLICY "Enable all operations for service role" ON ${TABLES.PAYMENTS}
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Chat messages policies
    CREATE POLICY "Enable all operations for service role" ON ${TABLES.CHAT_MESSAGES}
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
    `;
    
    console.log("SQL for RLS policies generated. To apply these policies:");
    console.log("1. Go to Supabase dashboard");
    console.log("2. Open SQL Editor");
    console.log("3. Paste the following SQL and run it:");
    console.log("\n" + sql);
    
    // Optionally save the SQL to a file for reference
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, '../migrations');
    
    // Create migrations directory if it doesn't exist
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
    const filename = `${migrationsDir}/${timestamp}_rls_policies.sql`;
    
    fs.writeFileSync(filename, sql);
    console.log(`\nSQL has been saved to: ${filename}`);
    
    // Important: Make sure service role key is used
    console.log("\nIMPORTANT: Ensure you're using the service role key in your .env file:");
    console.log("SUPABASE_KEY should be the 'service_role' key, not the 'anon' key");
    console.log("Get this from Supabase Dashboard > Project Settings > API > Project API keys");
  } catch (error) {
    console.error("Error updating RLS policies:", error.message);
    process.exit(1);
  }
}

// Run the update
updateRLSPolicies();
