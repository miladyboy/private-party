const chai = require("chai");
const chaiHttp = require("chai-http");
const { app } = require("../../server");
const { createClient } = require("@supabase/supabase-js");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const configPath = path.join(__dirname, "../../../config/config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

// Configure chai
chai.use(chaiHttp);
chai.should();
const expect = chai.expect;

// Supabase client for test data setup
const supabase = createClient(
  process.env.SUPABASE_URL || config.database.url,
  process.env.SUPABASE_KEY || config.database.key
);

describe("Booking and Streaming Integration Tests", function () {
  // This test suite might take longer to run
  this.timeout(10000);

  // Test users
  let hostUser;
  let djUser;
  let hostToken;
  let djToken;
  let djProfile;
  let booking;
  let stream;

  // Setup test data before running tests
  before(async function () {
    try {
      // Create test host user
      const hostResponse = await supabase.auth.signUp({
        email: `host_${Date.now()}@test.com`,
        password: "Password123!",
      });

      hostUser = hostResponse.data.user;

      // Create host user record in our database
      const { data: hostData } = await supabase
        .from("users")
        .insert([
          {
            id: hostUser.id,
            email: hostUser.email,
            username: `host_${Date.now()}`,
            role: "host",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      hostUser = hostData[0];

      // Create JWT token for host user
      hostToken = jwt.sign(
        { user: { id: hostUser.id, role: hostUser.role } },
        process.env.JWT_SECRET || config.jwt.secret,
        { expiresIn: "1h" }
      );

      // Create test DJ user
      const djResponse = await supabase.auth.signUp({
        email: `dj_${Date.now()}@test.com`,
        password: "Password123!",
      });

      djUser = djResponse.data.user;

      // Create DJ user record in our database
      const { data: djData } = await supabase
        .from("users")
        .insert([
          {
            id: djUser.id,
            email: djUser.email,
            username: `dj_${Date.now()}`,
            role: "dj",
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      djUser = djData[0];

      // Create JWT token for DJ user
      djToken = jwt.sign(
        { user: { id: djUser.id, role: djUser.role } },
        process.env.JWT_SECRET || config.jwt.secret,
        { expiresIn: "1h" }
      );

      // Create DJ profile
      const { data: profileData } = await supabase
        .from("dj_profiles")
        .insert([
          {
            user_id: djUser.id,
            name: "Test DJ",
            genre: "Electronic",
            bio: "Test DJ for integration tests",
            hourly_rate: 100,
            created_at: new Date().toISOString(),
          },
        ])
        .select();

      djProfile = profileData[0];

      console.log("Test data setup completed successfully");
    } catch (error) {
      console.error("Error setting up test data:", error);
      throw error;
    }
  });

  // Clean up test data after tests
  after(async function () {
    try {
      // Delete stream if created
      if (stream) {
        await supabase.from("streams").delete().eq("id", stream.id);
      }

      // Delete booking if created
      if (booking) {
        await supabase.from("bookings").delete().eq("id", booking.id);
      }

      // Delete DJ profile
      await supabase.from("dj_profiles").delete().eq("id", djProfile.id);

      // Delete users
      await supabase.from("users").delete().eq("id", hostUser.id);

      await supabase.from("users").delete().eq("id", djUser.id);

      // Delete auth users (if supported by your Supabase instance)
      await supabase.auth.admin.deleteUser(hostUser.id);
      await supabase.auth.admin.deleteUser(djUser.id);

      console.log("Test data cleanup completed successfully");
    } catch (error) {
      console.error("Error cleaning up test data:", error);
    }
  });

  describe("Booking Flow", function () {
    it("should create a new booking", function (done) {
      // Set start time to 2 hours from now, and end time to 4 hours from now
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);

      const endTime = new Date();
      endTime.setHours(endTime.getHours() + 4);

      chai
        .request(app)
        .post("/api/bookings")
        .set("Authorization", `Bearer ${hostToken}`)
        .send({
          dj_profile_id: djProfile.id,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          notes: "Test booking for integration test",
        })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(201);
          expect(res.body.status).to.equal("success");
          expect(res.body.data).to.have.property("booking");
          expect(res.body.data.booking).to.have.property("id");
          expect(res.body.data.booking.status).to.equal("pending");
          expect(res.body.data.booking.host_id).to.equal(hostUser.id);
          expect(res.body.data.booking.dj_profile_id).to.equal(djProfile.id);

          // Save booking for later tests
          booking = res.body.data.booking;

          done();
        });
    });

    it("should confirm the booking as the DJ", function (done) {
      chai
        .request(app)
        .patch(`/api/bookings/${booking.id}/status`)
        .set("Authorization", `Bearer ${djToken}`)
        .send({
          status: "confirmed",
        })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.status).to.equal("success");
          expect(res.body.data).to.have.property("booking");
          expect(res.body.data.booking.status).to.equal("confirmed");

          // Update booking for later tests
          booking = res.body.data.booking;

          done();
        });
    });
  });

  describe("Streaming Flow", function () {
    it("should create a stream for the booking as the DJ", function (done) {
      chai
        .request(app)
        .post("/api/streams")
        .set("Authorization", `Bearer ${djToken}`)
        .send({
          booking_id: booking.id,
        })
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(201);
          expect(res.body.status).to.equal("success");
          expect(res.body.data).to.have.property("stream");
          expect(res.body.data.stream).to.have.property("id");
          expect(res.body.data.stream.status).to.equal("created");
          expect(res.body.data.stream.booking_id).to.equal(booking.id);
          expect(res.body.data.stream.dj_profile_id).to.equal(djProfile.id);
          expect(res.body.data.stream.host_id).to.equal(hostUser.id);
          expect(res.body.data.stream).to.have.property("rtmp_url");
          expect(res.body.data.stream).to.have.property("stream_key");

          // Save stream for later tests
          stream = res.body.data.stream;

          done();
        });
    });

    it("should start the stream as the DJ", function (done) {
      chai
        .request(app)
        .patch(`/api/streams/${stream.id}/start`)
        .set("Authorization", `Bearer ${djToken}`)
        .send({})
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.status).to.equal("success");
          expect(res.body.data).to.have.property("stream");
          expect(res.body.data.stream.status).to.equal("active");
          expect(res.body.data.stream).to.have.property("start_time");

          // Update stream for later tests
          stream = res.body.data.stream;

          done();
        });
    });

    it("should get stream by ID as the host", function (done) {
      chai
        .request(app)
        .get(`/api/streams/${stream.id}`)
        .set("Authorization", `Bearer ${hostToken}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.status).to.equal("success");
          expect(res.body.data).to.have.property("stream");
          expect(res.body.data.stream.id).to.equal(stream.id);
          expect(res.body.data.stream.status).to.equal("active");
          expect(res.body.data.stream).to.have.property("playback_url");

          // Host should not receive stream key and RTMP URL
          expect(res.body.data.stream).to.not.have.property("stream_key");
          expect(res.body.data.stream).to.not.have.property("rtmp_url");

          done();
        });
    });

    it("should end the stream as the DJ", function (done) {
      chai
        .request(app)
        .patch(`/api/streams/${stream.id}/end`)
        .set("Authorization", `Bearer ${djToken}`)
        .send({})
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.status).to.equal("success");
          expect(res.body.data).to.have.property("stream");
          expect(res.body.data.stream.status).to.equal("ended");
          expect(res.body.data.stream).to.have.property("end_time");

          // Update stream for later tests
          stream = res.body.data.stream;

          done();
        });
    });

    it("should mark the booking as completed after ending the stream", function (done) {
      chai
        .request(app)
        .get(`/api/bookings/${booking.id}`)
        .set("Authorization", `Bearer ${hostToken}`)
        .end((err, res) => {
          expect(err).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.status).to.equal("success");
          expect(res.body.data).to.have.property("booking");
          expect(res.body.data.booking.status).to.equal("completed");

          done();
        });
    });
  });
});
