// Load environment variables first
require('dotenv').config();

const { supabase, TABLES, logger } = require("../utils/database");

/**
 * Temporarily disable Row Level Security for the users table
 */
async function disableRLS() {
  try {
    console.log("Generating SQL to temporarily disable RLS on users table...");
    
    const sql = `
    -- Temporarily disable RLS on users table for testing
    ALTER TABLE ${TABLES.USERS} DISABLE ROW LEVEL SECURITY;
    
    -- SQL to re-enable RLS when you're ready to use it properly
    -- ALTER TABLE ${TABLES.USERS} ENABLE ROW LEVEL SECURITY;
    `;
    
    console.log("SQL for disabling RLS generated:");
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
    const filename = `${migrationsDir}/${timestamp}_disable_rls.sql`;
    
    fs.writeFileSync(filename, sql);
    console.log(`\nSQL has been saved to: ${filename}`);
    
    console.log("\nFollow these steps:");
    console.log("1. Go to your Supabase dashboard");
    console.log("2. Open the SQL Editor");
    console.log("3. Copy and paste the SQL above");
    console.log("4. Run the SQL to temporarily disable RLS on the users table");
    console.log("5. Test your user registration again");
    console.log("6. Once everything is working, we can properly configure RLS policies");
  } catch (error) {
    console.error("Error generating disable RLS script:", error.message);
    process.exit(1);
  }
}

// Run the function
disableRLS();
