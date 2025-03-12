// Load environment variables first
require('dotenv').config();

const { supabase, db, TABLES, logger } = require("../utils/database");

/**
 * Cleanup duplicate user records
 */
async function cleanupDuplicateUsers() {
  try {
    console.log("Checking for duplicate users...");
    
    // Get all users from the database
    const { data: users, error } = await supabase
      .from(TABLES.USERS)
      .select("*");
      
    if (error) {
      console.error("Error fetching users:", error.message);
      process.exit(1);
    }
    
    // Group users by email
    const usersByEmail = {};
    users.forEach(user => {
      if (!usersByEmail[user.email]) {
        usersByEmail[user.email] = [];
      }
      usersByEmail[user.email].push(user);
    });
    
    // Find emails with more than one user
    const duplicateEmails = Object.keys(usersByEmail).filter(
      email => usersByEmail[email].length > 1
    );
    
    if (duplicateEmails.length === 0) {
      console.log("No duplicate users found.");
      return;
    }
    
    console.log(`Found ${duplicateEmails.length} emails with duplicate accounts:`);
    
    // Print and clean up duplicates
    for (const email of duplicateEmails) {
      const dupes = usersByEmail[email];
      console.log(`\nEmail: ${email} has ${dupes.length} accounts:`);
      
      // Sort by creation date - newest first
      dupes.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      // Keep the newest account, delete the rest
      const keepUser = dupes[0];
      const deleteUsers = dupes.slice(1);
      
      console.log(`Keeping account created at ${keepUser.created_at} (ID: ${keepUser.id})`);
      
      for (const user of deleteUsers) {
        console.log(`Deleting duplicate account created at ${user.created_at} (ID: ${user.id})`);
        
        // Delete the user
        const { error: deleteError } = await supabase
          .from(TABLES.USERS)
          .delete()
          .eq("id", user.id);
        
        if (deleteError) {
          console.error(`Error deleting user ${user.id}:`, deleteError.message);
        } else {
          console.log(`Successfully deleted user ${user.id}`);
        }
      }
    }
    
    console.log("\nDuplicate user cleanup completed!");
  } catch (error) {
    console.error("Error cleaning up duplicate users:", error.message);
    process.exit(1);
  }
}

// Run the cleanup
cleanupDuplicateUsers();
