# MongoDB Schema for Electronic City Commuter Service

## Overview

This schema serves as the foundation for storing and managing all data related to:
- Users (commuters, providers, admins)
- Transport providers and vehicle information
- Subscription and payment records
- Trip schedules, real-time/advance bookings
- Detailed trip history
- Service timings and route schedules

Designed for seamless backend (Flask API) and frontend (Flutter) integration, and efficient querying.

---

## Collections & Structure

### 1. users

Commuter, provider, or admin profiles.

| Field           | Type      | Description / Example                  |
|-----------------|-----------|----------------------------------------|
| email           | string    | Unique email (`user@email.com`)        |
| name            | string    | Full name                              |
| role            | string    | `"user"`, `"provider"`, or `"admin"`   |
| phone           | string    | Optional, phone number                 |
| password_hash   | string    | Hashed password                        |
| profile_picture | string    | Optional URL/base64 for avatar         |
| active          | bool      | User active status                     |
| created_at      | date      | Date of registration                   |
| updated_at      | date      | Last update time                       |

### 2. providers

Transport providers and driver/company info.

| Field           | Type      | Description                            |
|-----------------|-----------|----------------------------------------|
| user_id         | ObjectId  | Reference to `users._id`               |
| provider_name   | string    | Display/company name                   |
| contact         | string    | Contact number                         |
| vehicle_info    | object    | Registration/model/seats (optional)    |
| service_area    | string    | Area/route served                      |
| active          | bool      | Provider status                        |
| created_at      | date      | Join date                              |
| updated_at      | date      | Last update                            |

### 3. subscriptions

Tracks monthly subscriptions per user/provider.

| Field           | Type      | Description                            |
|-----------------|-----------|----------------------------------------|
| user_id         | ObjectId  | Reference to `users._id`               |
| provider_id     | ObjectId  | Reference to `providers._id`           |
| plan            | string    | Plan type (monthly/custom)             |
| start_date      | date      | Subscription start                     |
| end_date        | date      | Subscription end                       |
| status          | string    | `"active"`, `"expired"`, etc.          |
| payment_info    | object    | Payment metadata                       |
| created_at      | date      | Record created                         |
| updated_at      | date      | Last update                            |

### 4. booking_schedules

All user bookings and reservations.

| Field           | Type      | Description                            |
|-----------------|-----------|----------------------------------------|
| user_id         | ObjectId  | Reference to `users._id`               |
| provider_id     | ObjectId  | Reference to `providers._id`           |
| schedule_id     | ObjectId  | Reference to `service_timings._id`     |
| trip_date       | date      | Date of the journey                    |
| booking_status  | string    | `"pending"`, `"confirmed"`, etc.       |
| boarding_point  | string    | Boarding stop                          |
| drop_point      | string    | Drop stop                              |
| seat_number     | string    | Seat assigned                          |
| created_at      | date      | Reservation created                    |
| updated_at      | date      | Last update                            |

### 5. trip_history

Completed and cancelled trips for audit/history.

| Field           | Type      | Description                            |
|-----------------|-----------|----------------------------------------|
| user_id         | ObjectId  | Reference to `users._id`               |
| provider_id     | ObjectId  | Reference to `providers._id`           |
| service_time_id | ObjectId  | Reference to `service_timings._id`     |
| date            | date      | Trip date                              |
| boarding_point  | string    | Start point                            |
| drop_point      | string    | End point                              |
| duration_minutes| int       | Duration in minutes                    |
| fare_amount     | double    | Fare paid                              |
| status          | string    | `"completed"`, `"cancelled"`           |
| created_at      | date      | Time logged                            |

### 6. service_timings

Providers' AM/PM available time slots and stops.

| Field     | Type      | Description/Example                        |
|-----------|-----------|--------------------------------------------|
| provider_id| ObjectId | Reference to `providers._id`               |
| direction | string    | `"morning"` or `"evening"`                 |
| start_time| string    | E.g., `"06:30"`                            |
| end_time  | string    | E.g., `"12:30"`                            |
| stops     | [string]  | List of stops                              |
| active    | bool      | Is schedule active                         |
| notes     | string    | Optional notes                             |
| created_at| date      |                                           |
| updated_at| date      |                                           |

---

## Indexes

- users: `{ email: 1 }` (unique)
- subscriptions: `{ user_id: 1, status: 1 }`
- booking_schedules: `{ user_id: 1, trip_date: 1 }`
- trip_history: `{ user_id: 1, date: -1 }`
- service_timings: `{ provider_id: 1, direction: 1, start_time: 1 }`
- All foreign key fields indexed for performance.

---

## Validation

All collections use `$jsonSchema` for type and required fields.
Best practice: application layer also validates and escapes all inputs!

---

## Integration Notes

- Use ObjectId for cross-collection references.
- Dates should be UTC and handled consistently backend <-> frontend.
- Data is designed for direct mapping to API DTOs/serializers and Flutter models.
- All relationships are "soft" (no database joins, use queries).
- Backend/API should handle creation times and updating `updated_at`.

---

## Script Usage

To initialize the database, run:

```
mongosh mongodb://appuser:dbuser123@localhost:5000/myapp?authSource=admin mongodb_schema.js
```

This will create all collections, validation, and indexes.

---

## Contact

See backend and mobile frontend projects for business logic and API layer details.

"Safe and efficient design for scale and transparency."
