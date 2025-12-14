# ParkPro - Master Implementation Plan

**Project Status**: Production Ready (Simulated Payment Integration)
**Version**: 1.1.0
**Last Updated**: December 2025

This document outlines the comprehensive implementation roadmap for the ParkPro Smart Parking Management System, including technical specifications, database schema changes, and API contracts.

---

## 1. Core Foundation & Booking Logic

### 1.1 Booking Validation

- **Objective**: Ensure robust booking constraints.
- **Tech Stack**: React (DateRangePicker), FastAPI (Pydantic Validators).
- **Implementation**:
  - [x] **Frontend**: Replace Duration selector with Start/End DateTime picker.
  - [x] **Validation**: Enforce `End Time > Start Time` and `Start Time > Now`.
  - [x] **Pricing**: Dynamic calculation (`Duration (hours) * Hourly Rate`).
- **Database Schema**:
  - `bookings`: `start_time` (DateTime), `end_time` (DateTime), `total_amount` (Float).

### 1.2 Cancellation Policy

- **Objective**: Transparent fee structure for cancellations.
- **Logic**:
  - > 24 hours: 100% Refund
  - 2 - 24 hours: 50% Refund
  - < 2 hours: 0% Refund
- **API Endpoints**:
  - `POST /bookings/{id}/cancel`: Trigger cancellation logic.

### 1.3 Production Readiness

- [x] **Timezones**: Standardize frontend to ISO8601, backend to UTC.
- [x] **Overlap Protection**: Race condition checks for double-booking (`start_a < end_b AND end_a > start_b`).

---

## 2. User Experience (Customer Portal)

### 2.1 Vehicle Management

- **Objective**: Allow users to save and reuse vehicles.
- **Database Schema**:
  - **Table**: `UserVehicles`
  - **Columns**: `id`, `user_id`, `license_plate`, `make`, `model`, `is_default`.
- **API Endpoints**:
  - `GET /vehicles`: List all user vehicles.
  - `POST /vehicles`: Add new vehicle.
  - `DELETE /vehicles/{id}`: Remove vehicle (soft delete).
- **Features**:
  - [x] **Auto-Save**: New plates used during guest checkout are auto-saved to profile.

### 2.2 Interactive Map & Spot Selection

- **Objective**: Visual parking selection.
- **Data Model**:
  - `parking_spots`: `id`, `label`, `type` (standard, ev, vip), `status` (available, booked, maintenance).
- **Frontend**:
  - [x] **Grid View**: CSS Grid layout with color-coded status.
  - [x] **Spot Types**: Visual indicators for EV (Charge Icon), VIP (Star), Standard.

### 2.3 Notifications

- **Tech Stack**: `fastapi-mail` (SMTP), Jinja2 templates.
- **Templates**:
  - `booking_confirmation.html`: Sent on successful payment.
  - `expiry_warning.html`: Sent 15 mins before end time.
  - `overstay_alert.html`: Sent every 6 hours if overdue.

---

## 3. Administration & Analytics

### 3.1 Admin Dashboard

- **Objective**: Complete operational control.
- **Features**:
  - [x] **Live Occupancy**: Real-time view of all slots.
  - [x] **Maintenance Mode**: Toggle `is_blocked` flag on spots.
  - [x] **Booking Management**: `GET /admin/bookings` with filters (active, completed, cancelled).

### 3.2 Analytics Suite

- **Tech Stack**: `recharts` (Frontend), `sqlalchemy` (Aggregations).
- **Endpoints**:
  - `GET /admin/analytics`: Returns aggregated data for:
    - `revenue_trend`: List of `{date, amount}` for last 7 days.
    - `occupancy_stats`: Hourly usage breakdown.
  - **Datadog**: Full APM tracing and RUM session recording.

### 3.3 Dynamic Configuration

- **Objective**: Change business rules without code deploys.
- **Database Schema**:
  - **Table**: `SystemConfig`
  - **Columns**: `key` (PK), `value`, `description`.
- **Configurable Keys**:
  - `hourly_rate`: Base parking cost (Default: 10.0).
  - `cancellation_policy`: JSON rules for refunds.
  - `admin_emails`: CSV of notification recipients.

---

## 4. Payment System (RinggitPay)

### 4.1 Payment Architecture

- **Objective**: Secure, bank-grade payments.
- **Gateway**: RinggitPay (Simulated Environment).
- **File Reference**: `api/routers/payment.py`
- **Security**:
  - **Checksum**: `SHA256(merchant_secret + order_id + amount + currency)`.
  - **Validation**: Incoming callbacks are verified against the generated signature.

### 4.2 Integration Workflow

1.  **Initiate (`POST /payment/initiate`)**:
    - Create Booking (Status: `pending`).
    - Generate `order_id` and Checksum.
    - Return Redirect URL.
2.  **Gateway Processing**: User enters card details on RinggitPay.
3.  **Callback (`POST /payment/callback`)**:
    - Server-to-Server webhook.
    - Verify Checksum.
    - Update Booking Status (`confirmed` or `failed`).
    - Send Confirmation Email.
4.  **Return (`GET /payment/return`)**: Frontend redirect to Success/Failure page.

---

## 5. Advanced Features

### 5.1 Overstay Management

- **Objective**: Monetize violations.
- **Logic**:
  - Background Job (`asyncio.create_task`) runs every minute.
  - Checks `booking.end_time < now` AND `status == 'active'`.
- **Features**:
  - **Alerts**: Email user every 6 hours.
  - **Exit Fee**: `POST /admin/bookings/{id}/calculate-exit` returns `(Actual Duration - Booked Duration) * Rate * Multiplier`.

### 5.2 Multi-Level Parking (In Progress)

- **Objective**: Support multi-story complexes.
- **Proposed Schema**:
  - Alter `parking_spots` ADD COLUMN `floor` VARCHAR(20) DEFAULT 'Ground'.
- **UI Changes**:
  - Add "Floor Switcher" tabs above the Parking Grid.
- **API Updates**:
  - `GET /layout` accepts `?floor=L1`.

### 5.3 PDF Receipts

- **Tech Stack**: `reportlab` (Python).
- **Endpoint**: `GET /bookings/{id}/receipt`.
- **Content**: ParkPro Logo, Booking ID, Spot, Duration, Total cost, Payment Ref.

### 5.4 Security & Auth

- **Auth**: OAuth2 with Password Flow (Bearer Token).
- **Role-Based Access Control (RBAC)**:
  - `Depends(get_current_admin_user)` for `/admin` routes.
- **Forgot Password**:
  - `POST /forgot-password`: Generates 6-digit OTP (valid for 10 mins).
  - `POST /verify-otp`: Validates OTP.
  - `POST /reset-password`: Updates password hash.

---

## Future Roadmap

1.  **Mobile App Deep Linking**: Refine redirect handling for native apps (Android Intents).
2.  **Hardware Integration**: MQTT hooks for physical boom barriers.
3.  **Subscription Models**: Monthly pass management.
