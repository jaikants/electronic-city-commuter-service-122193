//
// MongoDB Schema initialization script for Electronic City Commuter Service
// Run this using: mongosh mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin mongodb_schema.js
//

/*
 * COLLECTION: users
 * Stores commuter profiles.
 */
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "name", "role", "password_hash", "created_at"],
      properties: {
        email: {
          bsonType: "string",
          description: "User's unique email address"
        },
        name: {
          bsonType: "string",
          description: "Full name"
        },
        role: {
          bsonType: "string",
          enum: ["user", "provider", "admin"],
          description: "Role of the user: user, provider or admin"
        },
        phone: {
          bsonType: "string",
          description: "Phone number (optional)"
        },
        password_hash: {
          bsonType: "string",
          description: "Hashed password"
        },
        profile_picture: {
          bsonType: "string",
          description: "Link or base64 of profile picture (optional)"
        },
        active: {
          bsonType: "bool",
          description: "Whether user is active",
          default: true
        },
        created_at: {
          bsonType: "date",
          description: "Date of registration"
        },
        updated_at: {
          bsonType: "date",
          description: "Last update"
        }
      }
    }
  }
});
db.users.createIndex({ email: 1 }, { unique: true });

/*
 * COLLECTION: providers
 * Stores transport provider company or driver details.
 */
db.createCollection("providers", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "provider_name", "contact", "service_area", "created_at"],
      properties: {
        user_id: {
          bsonType: "objectId",
          description: "Reference to users._id"
        },
        provider_name: {
          bsonType: "string",
          description: "Transport provider/company or driver name"
        },
        contact: {
          bsonType: "string",
          description: "Provider's contact number"
        },
        vehicle_info: {
          bsonType: "object",
          description: "Vehicle registration & model (optional)",
          properties: {
            registration: { bsonType: "string" },
            model: { bsonType: "string" },
            seats: { bsonType: "int", description: "Number of seats" }
          }
        },
        service_area: {
          bsonType: "string",
          description: "Provider's operating area"
        },
        active: {
          bsonType: "bool", 
          description: "Provider availability",
          default: true
        },
        created_at: {
          bsonType: "date",
          description: "Date of joining"
        },
        updated_at: {
          bsonType: "date",
          description: "Last update"
        }
      }
    }
  }
});
db.providers.createIndex({ user_id: 1 });
db.providers.createIndex({ provider_name: 1 });

/*
 * COLLECTION: subscriptions
 * Monthly user subscription records
 */
db.createCollection("subscriptions", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["user_id", "start_date", "end_date", "status", "plan", "created_at"],
      properties: {
        user_id: {
          bsonType: "objectId",
          description: "Reference to users._id"
        },
        provider_id: {
          bsonType: "objectId",
          description: "Reference to providers._id"
        },
        plan: {
          bsonType: "string",
          description: "Plan name (monthly, custom, etc.)"
        },
        start_date: {
          bsonType: "date"
        },
        end_date: {
          bsonType: "date"
        },
        status: {
          bsonType: "string",
          enum: ["active", "expired", "pending", "cancelled"],
          description: "Subscription status"
        },
        payment_info: {
          bsonType: "object",
          description: "Payment metadata",
          properties: {
            payment_id: { bsonType: "string" },
            method: { bsonType: "string" },
            amount: { bsonType: "double" },
            timestamp: { bsonType: "date" }
          }
        },
        created_at: {
          bsonType: "date"
        },
        updated_at: {
          bsonType: "date"
        }
      }
    }
  }
});
db.subscriptions.createIndex({ user_id: 1, status: 1 });
db.subscriptions.createIndex({ provider_id: 1 });

/*
 * COLLECTION: booking_schedules
 * Requested and confirmed trip bookings; tracks status changes.
 */
db.createCollection("booking_schedules", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "user_id",
        "schedule_id",
        "trip_date",
        "created_at",
        "booking_status"
      ],
      properties: {
        user_id: {
          bsonType: "objectId",
          description: "Reference to users._id"
        },
        provider_id: {
          bsonType: "objectId",
          description: "Reference to providers._id"
        },
        schedule_id: {
          bsonType: "objectId",
          description: "Reference to service_timings._id"
        },
        trip_date: {
          bsonType: "date",
          description: "Date of the trip"
        },
        booking_status: {
          bsonType: "string",
          enum: ["pending", "confirmed", "cancelled", "completed"],
          description: "Booking status"
        },
        boarding_point: {
          bsonType: "string"
        },
        drop_point: {
          bsonType: "string"
        },
        seat_number: {
          bsonType: "string"
        },
        created_at: {
          bsonType: "date"
        },
        updated_at: {
          bsonType: "date"
        }
      }
    }
  }
});
db.booking_schedules.createIndex({ user_id: 1, trip_date: 1 }, { unique: false });
db.booking_schedules.createIndex({ provider_id: 1 });

/*
 * COLLECTION: trip_history
 * Completed trips history for each commuter; can be large.
 */
db.createCollection("trip_history", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: [
        "user_id",
        "provider_id",
        "service_time_id",
        "date",
        "status",
        "created_at"
      ],
      properties: {
        user_id: {
          bsonType: "objectId"
        },
        provider_id: {
          bsonType: "objectId"
        },
        service_time_id: {
          bsonType: "objectId"
        },
        date: {
          bsonType: "date"
        },
        boarding_point: {
          bsonType: "string"
        },
        drop_point: {
          bsonType: "string"
        },
        duration_minutes: {
          bsonType: "int"
        },
        fare_amount: {
          bsonType: "double"
        },
        status: {
          bsonType: "string",
          enum: ["completed", "cancelled"]
        },
        created_at: {
          bsonType: "date"
        }
      }
    }
  }
});
db.trip_history.createIndex({ user_id: 1, date: -1 });
db.trip_history.createIndex({ provider_id: 1, date: -1 });

/*
 * COLLECTION: service_timings
 * Defines all service time windows and stops for routes (AM and PM schedules).
 */
db.createCollection("service_timings", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["provider_id", "direction", "start_time", "end_time", "stops", "active", "created_at"],
      properties: {
        provider_id: {
          bsonType: "objectId"
        },
        direction: {
          bsonType: "string",
          enum: ["morning", "evening"]
        },
        start_time: {
          bsonType: "string",
          description: "Start time, e.g. '06:30'"
        },
        end_time: {
          bsonType: "string",
          description: "End time, e.g. '12:30'"
        },
        stops: {
          bsonType: "array",
          items: { bsonType: "string" },
          description: "List of stops on route"
        },
        active: {
          bsonType: "bool"
        },
        notes: {
          bsonType: "string"
        },
        created_at: {
          bsonType: "date"
        },
        updated_at: {
          bsonType: "date"
        }
      }
    }
  }
});
db.service_timings.createIndex({ provider_id: 1, direction: 1, start_time: 1 });

/*
 * (Optionally add an admin or support collection as needed)
 */

// END OF SCHEMA INITIALIZATION
print("✔ MongoDB schema successfully created (core collections, indexes, and validation rules).");
