
    -- Allow service role to perform all operations on all tables
    
    -- Users table policies
    CREATE POLICY "Enable all operations for service role" ON users
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Allow users to read their own profile
    CREATE POLICY "Users can read their own profile" ON users
      FOR SELECT
      USING (auth.uid() = auth_id);
      
    -- Allow users to update their own profile
    CREATE POLICY "Users can update their own profile" ON users
      FOR UPDATE
      USING (auth.uid() = auth_id)
      WITH CHECK (auth.uid() = auth_id);
      
    -- DJ profiles policies
    CREATE POLICY "Enable all operations for service role" ON dj_profiles
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Bookings policies
    CREATE POLICY "Enable all operations for service role" ON bookings
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Streams policies
    CREATE POLICY "Enable all operations for service role" ON streams
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Payments policies
    CREATE POLICY "Enable all operations for service role" ON payments
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
      
    -- Chat messages policies
    CREATE POLICY "Enable all operations for service role" ON chat_messages
      USING (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role')
      WITH CHECK (auth.jwt() -> 'app_metadata' ->> 'provider' = 'service_role');
    