//
// Integration/validation script for MongoDB schema of Electronic City Commuter Service
//
// Usage: node test_mongodb_schema.js
//
// Reads MongoDB env vars from mongodb.env (must be sourced or similar, or specify in shell).
//

const { MongoClient, ObjectId } = require("mongodb");
const assert = require("assert");

// Load env (if run from shell with `source mongodb.env`)
const MONGODB_URL = process.env.MONGODB_URL || "mongodb://appuser:dbuser123@localhost:5000/?authSource=admin";
const MONGODB_DB = process.env.MONGODB_DB || "myapp";

function now() { return new Date(); }
function past(mins = 15) { return new Date(Date.now() - 1000 * 60 * mins); }

function result(ok, msg = "", details = "") {
  return { ok, msg, details };
}

function logResult(prefix, {ok, msg, details}, verbose = false) {
  if (ok) {
    console.log(`✅ ${prefix}: ${msg}`);
  } else {
    console.error(`❌ ${prefix}: ${msg}`);
    if (verbose && details) {
      console.error(details);
    }
  }
}

// Sample data producers and intentionally invalid data
const sampleData = {
  users: {
    valid: {
      email: "john.smith@example.com",
      name: "John Smith",
      role: "user",
      password_hash: "hashedpw",
      phone: "+919000000001",
      profile_picture: "http://example.com/avatar.png",
      active: true,
      created_at: now(),
      updated_at: now()
    },
    invalids: [
      // Missing required
      { name: "Incomplete NoEmail", role: "user", password_hash: "pw", created_at: now() },
      // Invalid role
      { email: "badrole@example.com", name: "Fail Role", role: "manager", password_hash: "pw", created_at: now() },
      // Non-string email
      { email: 44, name: "Bad Email", role: "user", password_hash: "pw", created_at: now() }
    ]
  },
  providers: (userId) => ({
    valid: {
      user_id: userId,
      provider_name: "ShuttlePro",
      contact: "+919123456789",
      vehicle_info: {
        registration: "KA51AB1234",
        model: "MinibusX",
        seats: 18
      },
      service_area: "Electronic City",
      active: true,
      created_at: now(),
      updated_at: now()
    },
    invalids: [
      // Missing required
      { provider_name: "NoUserId", contact: "noid", service_area: "ECity", created_at: now() },
      // user_id wrong type
      { user_id: "not_an_oid", provider_name: "Bad ID", contact: "c", service_area: "ECity", created_at: now() },
    ]
  }),
  subscriptions: (userId, provId) => ({
    valid: {
      user_id: userId,
      provider_id: provId,
      plan: "monthly",
      start_date: now(),
      end_date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 31),
      status: "active",
      payment_info: { payment_id: "pay1", method: "upi", amount: 1300.00, timestamp: now() },
      created_at: now(),
      updated_at: now()
    },
    invalids: [
      // Missing required
      { plan: "monthly", status: "active", created_at: now(), user_id: userId },
      // Bad enum
      { user_id: userId, provider_id: provId, plan: "custom", status: "invalid", start_date: now(), end_date: now(), created_at: now() }
    ]
  }),
  booking_schedules: (userId, provId, schedId) => ({
    valid: {
      user_id: userId,
      provider_id: provId,
      schedule_id: schedId,
      trip_date: now(),
      booking_status: "confirmed",
      boarding_point: "Metro East",
      drop_point: "EC Entrance",
      seat_number: "A3",
      created_at: now(),
      updated_at: now()
    },
    invalids: [
      // Missing required
      { user_id: userId, schedule_id: schedId, trip_date: now(), created_at: now(), booking_status: "confirmed" }, // missing provider_id (optional), but keep valid
      { user_id: userId, booking_status: "pending", created_at: now(), schedule_id: schedId }, // missing trip_date
      // Bad enum
      { user_id: userId, provider_id: provId, schedule_id: schedId, trip_date: now(), booking_status: "invalid_status", created_at: now() }
    ]
  }),
  trip_history: (userId, provId, serviceTimeId) => ({
    valid: {
      user_id: userId,
      provider_id: provId,
      service_time_id: serviceTimeId,
      date: past(80),
      boarding_point: "Metro",
      drop_point: "EC Gate 5",
      duration_minutes: 44,
      fare_amount: 255.0,
      status: "completed",
      created_at: now()
    },
    invalids: [
      { provider_id: provId, service_time_id: serviceTimeId, date: now(), status: "completed", created_at: now() }, // missing user_id
      { user_id: userId, provider_id: provId, service_time_id: serviceTimeId, status: "done", date: now(), created_at: now() } // bad enum
    ]
  }),
  service_timings: (provId) => ({
    valid: {
      provider_id: provId,
      direction: "morning",
      start_time: "07:15",
      end_time: "09:45",
      stops: ["Stop1", "Stop2"],
      active: true,
      notes: "Express route",
      created_at: now(),
      updated_at: now()
    },
    invalids: [
      { provider_id: provId, direction: "noon", start_time: "07:15", end_time: "09:45", stops: ["Stop1"], active: true, created_at: now() }, // bad enum
      { provider_id: provId, start_time: "07:15", end_time: "09:45", stops: ["Stop1"], active: true, created_at: now() } // missing required direction
    ]
  })
};

// Helper: attempt insert, expect success or failure
async function tryInsert(coll, doc, shouldSucceed = true, note = "") {
  try {
    await coll.insertOne(doc);
    if (!shouldSucceed) {
      return result(false, "Insert should have failed, but succeeded.", note ? JSON.stringify(doc) : "");
    }
    return result(true, "Insert succeeded", "");
  } catch (err) {
    if (shouldSucceed) {
      return result(false, `Insert failed: ${err.message}`, err.stack);
    } else {
      return result(true, "Insert rejected as expected", err.message);
    }
  }
}

// Helper: attempt insert duplicates to check unique index
async function tryUniqueInsert(coll, doc, expectedSuccess, note) {
  try {
    await coll.insertOne(doc);
    if (!expectedSuccess) {
      return result(false, "Duplicate insert succeeded but should have failed!", JSON.stringify(doc));
    }
    return result(true, "Insert/unique OK", "");
  } catch (err) {
    if (expectedSuccess) {
      return result(false, `Insert failed unexpectedly: ${err.message}`, err.stack);
    }
    return result(true, "Duplicate rejected as expected", err.message);
  }
}

async function main() {
  const client = new MongoClient(MONGODB_URL, { useUnifiedTopology: true });
  await client.connect();
  const db = client.db(MONGODB_DB);

  // Clean up any existing sample docs before test (to avoid index collisions)
  await db.collection("users").deleteMany({ email: /@example\.com$/ });
  await db.collection("providers").deleteMany({ provider_name: /^ShuttlePro/ });
  await db.collection("subscriptions").deleteMany({ plan: /^monthly/ });
  await db.collection("service_timings").deleteMany({ notes: /^Express/ });
  await db.collection("booking_schedules").deleteMany({ boarding_point: "Metro East" });
  await db.collection("trip_history").deleteMany({ boarding_point: /^Metro/ });

  let results = [];

  // 1. USERS collection: test required fields, enums, type, and uniqueness
  const usersColl = db.collection('users');
  // Insert a valid user
  results.push(["users:valid", await tryInsert(usersColl, sampleData.users.valid, true)]);
  // Invalid: missing required/email
  for (let [i, inval] of sampleData.users.invalids.entries()) {
    results.push([`users:invalid${i+1}`, await tryInsert(usersColl, inval, false)]);
  }
  // Duplicate test
  results.push(["users:duplicate", await tryUniqueInsert(usersColl, sampleData.users.valid, false, "Duplicate user email")]);

  // 2. PROVIDERS
  const userDoc = await usersColl.findOne({ email: sampleData.users.valid.email });
  assert(userDoc, "Seed user not found");
  const providersColl = db.collection("providers");
  const provTemplates = sampleData.providers(userDoc._id);
  results.push(["providers:valid", await tryInsert(providersColl, provTemplates.valid, true)]);
  for (let [i, inval] of provTemplates.invalids.entries()) {
    results.push([`providers:invalid${i+1}`, await tryInsert(providersColl, inval, false)]);
  }

  // 3. SUBSCRIPTIONS
  const provDoc = await providersColl.findOne({ provider_name: provTemplates.valid.provider_name });
  assert(provDoc, "Seed provider not found");
  const subscriptionsColl = db.collection("subscriptions");
  const subTemplates = sampleData.subscriptions(userDoc._id, provDoc._id);
  results.push(["subscriptions:valid", await tryInsert(subscriptionsColl, subTemplates.valid, true)]);
  for (let [i, inval] of subTemplates.invalids.entries()) {
    results.push([`subscriptions:invalid${i+1}`, await tryInsert(subscriptionsColl, inval, false)]);
  }

  // 4. SERVICE_TIMINGS
  const serviceTimingsColl = db.collection("service_timings");
  const stTemplates = sampleData.service_timings(provDoc._id);
  results.push(["service_timings:valid", await tryInsert(serviceTimingsColl, stTemplates.valid, true)]);
  for (let [i, inval] of stTemplates.invalids.entries()) {
    results.push([`service_timings:invalid${i+1}`, await tryInsert(serviceTimingsColl, inval, false)]);
  }

  // 5. BOOKING_SCHEDULES
  const schedDoc = await serviceTimingsColl.findOne({ notes: stTemplates.valid.notes });
  assert(schedDoc, "Seed schedule not found");
  const bookingSchedulesColl = db.collection("booking_schedules");
  const bookTemplates = sampleData.booking_schedules(userDoc._id, provDoc._id, schedDoc._id);
  results.push(["booking_schedules:valid", await tryInsert(bookingSchedulesColl, bookTemplates.valid, true)]);
  for (let [i, inval] of bookTemplates.invalids.entries()) {
    results.push([`booking_schedules:invalid${i+1}`, await tryInsert(bookingSchedulesColl, inval, false)]);
  }

  // 6. TRIP_HISTORY
  const tripHistoryColl = db.collection("trip_history");
  const thTemplates = sampleData.trip_history(userDoc._id, provDoc._id, schedDoc._id);
  results.push(["trip_history:valid", await tryInsert(tripHistoryColl, thTemplates.valid, true)]);
  for (let [i, inval] of thTemplates.invalids.entries()) {
    results.push([`trip_history:invalid${i+1}`, await tryInsert(tripHistoryColl, inval, false)]);
  }

  // Print summary
  console.log("\n=== SCHEMA VALIDATION INTEGRATION RESULTS ===\n");
  let success = 0, fail = 0;
  for (let [label, res] of results) {
    logResult(label, res, true);
    if (res.ok) success++;
    else fail++;
  }
  console.log(`\n✔ Completed: ${success + fail} assertions: ${success} succeeded, ${fail} failed.\n`);
  await client.close();
  process.exit(fail ? 1 : 0);
}

main().catch(err => {
  console.error("Critical error:", err);
  process.exit(2);
});
