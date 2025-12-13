# ParkPro - Smart Parking Management System

**Project Documentation & Feature Overview**

## 1. Project Overview

ParkPro is a modern, full-stack parking management solution designed to streamline vehicle parking for customers and provide powerful management tools for administrators. It features a responsive, premium dark-themed UI (glassmorphism), real-time booking management, and comprehensive analytics.

---

## 2. Technology Stack

### Frontend

- **Framework**: React (Vite) + TypeScript
- **Styling**: Tailwind CSS (Custom Dark Theme, Glassmorphism effects)
- **Icons**: Lucide React
- **Charts**: Recharts (for Analytics)
- **State/Network**: Axios, React Hooks
- **Build Tool**: Vite

### Backend

- **Framework**: FastAPI (Python)
- **Database ORM**: SQLAlchemy
- **Authentication**: JWT (JSON Web Tokens) + OAuth2PasswordBearer
- **Security**: Passlib (Bcrypt) for password hashing
- **Server**: Uvicorn (ASGI)
- **Email**: SMTP with HTML Templates (Jinja2-style formatting)
- **PDF**: ReportLab for receipt generation

---

## 3. User Features (Customer Portal)

### **Authentication**

- **Secure Signup/Login**: Users can create accounts and log in securely.
- **Session Management**: JWT-based persistence.

### **Dashboard**

- **My Bookings**:
  - Tabbed view: **Active**, **Upcoming**, **Completed**, **Cancelled**.
  - **Booking Card**: Displays Spot Label, Date/Time, Cost, Vehicle, and status.
  - **Actions**:
    - **QR Code**: View entry QR code for active/upcoming bookings.
    - **Download Receipt**: Generate PDF receipt.
    - **Cancel Booking**: Users can cancel upcoming bookings (with refund calculation).
- **Stats Overview**: Personalized counters for Total Bookings, Active Bookings, and Total Spent.

### **Booking Process**

- **Interactive Map**:
  - Visual grid layout of the parking lot.
  - Real-time spot status: **Available** (Green), **Booked** (Red), **Your Selection** (Blue), **Maintenance** (Striped Red).
  - **Multilevel Support**: Filter spots by Floor (Ground, Level 1, Level 2, etc.).
  - **Spot Types**: Standard, EV (Electric Vehicle), VIP.
- **Vehicle Selection**:
  - **Quick Select**: Choose from saved "My Vehicles".
  - **New Entry**: Enter new license plate (auto-saves to profile).
- **Price Calculation**:
  - Real-time cost estimation based on duration and spot type multipliers (EV: 1.5x, VIP: 2.0x).
- **Promo Codes**: Apply codes (e.g., `SUMMER50`) for discounts.
- **Payment**: Simulated payment gateway (RinggitPay) with success/failure handling.

### **Vehicle Management (My Vehicles)**

- **List View**: See all registered vehicles with details (Make, Model, Color, Year).
- **Add/Edit**: detailed form to manage vehicle information.
- **Delete**: Soft-delete/Hard-delete logic (preserves history if bookings exist).
- **Auto-Save**: New license plates used in bookings are automatically added to this list.

### **Notifications**

- **Premium HTML Emails**:
  - **Booking Confirmation**: Detailed summary with cost and spot location.
  - **Expiry Alerts**: Warnings sent 15 mins before and at expiration.
  - **Overstay Notices**: Recurring alerts every 6 hours for overstayed vehicles with fee estimates.
  - **Password Reset**: Secure OTP delivery.
  - **Refunds**: Notifications for manual or automatic refunds.

---

## 4. Admin Features (Admin Dashboard)

### **Dashboard Overview**

- **Live Occupancy**: Real-time view of the parking lot status.
- **Key Metrics**: Total Revenue, Active Bookings, Occupancy Rate.

### **Spot Management**

- **Interactive Grid Editor**:
  - Click any spot to edit properties.
  - **Spot Labeling**: Rename spots (e.g., A1, B2).
  - **Spot Type**: Change between Standard, EV, and VIP.
  - **Maintenance Mode**: Toggle **"Block Spot"** to mark it as under maintenance (prevents user bookings).

### **Booking Management**

- **Master List**: View all bookings from all users.
- **Search & Filter**: Find bookings by License Plate, Status, or Date.
- **Manual Actions**:
  - **Complete Booking**: Manually finish a booking if user forgets.
  - **Calculate Exit Fee**: accurately calculate fees for overstaying vehicles.
  - **Process Refund**: Issue manual refunds for cancelled/disputed bookings.
  - **Notify Overstay**: Trigger manual email reminders for violators.

### **Analytics & Revenue**

- **Revenue Chart**: Area chart showing revenue trends over the last 7 days.
- **Occupancy Chart**: Hourly bar chart showing peak usage times.
- **Export Data**: (Structure in place for future exports).

### **System Configuration**

- **Pricing**: Set the Base Hourly Rate globally.
- **Promo Codes**:
  - Create new codes with specific Discount % or Flat Amount.
  - Toggle Active/Inactive status.
  - Delete unused codes.

---

## 5. API Endpoints Summary

### **Auth**

- `POST /signup`: Create user.
- `POST /login`: Get Access Token.

### **Bookings**

- `GET /bookings`: Get current user's bookings.
- `POST /bookings`: Create new booking (with vehicle handling).
- `DELETE /bookings/{id}`: Cancel booking.
- `POST /bookings/{id}/receipt`: Generate receipt.

### **Vehicles**

- `GET /vehicles`: List user's vehicles.
- `POST /vehicles`: Add or Update vehicle.
- `PUT /vehicles/{id}`: Update specific vehicle.
- `DELETE /vehicles/{id}`: Delete vehicle.

### **Admin**

- `GET /admin/stats`: Get dashboard stats.
- `GET /admin/bookings`: Get all bookings.
- `GET /admin/analytics`: Get revenue and occupancy data.
- `PUT /admin/spots/{id}`: Update spot type/label.
- `PUT /admin/spots/{id}/toggle-block`: Toggle maintenance status.
- `POST /promos`, `GET /promos`, `DELETE /promos`: Manage promo codes.
- `POST /admin/bookings/{id}/calculate-exit`: Calculate final fee for overstay.
- `POST /admin/bookings/{id}/notify-overstay`: Send immediate email warning.
- `POST /admin/bookings/{id}/process-manual-refund`: Issue refund.
- `POST /admin/config`: Update system settings (hourly rate).

## 6. Payment Architecture (RinggitPay)

### **Overview**

ParkPro integrates with **RinggitPay**, a secure regional payment gateway, to handle checkout transactions. The integration is designed to be robust, secure, and user-friendly.

### **Integration Workflow**

1.  **Initiation**:
    - User clicks "Checkout" in the portal.
    - System calculates the final amount including overstay fees.
    - A unique `order_id` is generated (Format: `RP-{booking_id}-{timestamp}`).
2.  **Security Handshake**:
    - The backend generates a **SHA256 Signature** using the `MerchantSecret`, `order_id`, and `amount`.
    - This signature ensures the request payload cannot be tampered with.
3.  **Redirection**:
    - The user is redirected to the securely hosted RinggitPay payment page.
    - Supported methods: Credit/Debit Cards, FPX (Online Banking), and E-Wallets.
4.  **Completion & Callback**:
    - Upon success/failure, RinggitPay redirects the user back to ParkPro.
    - Simultaneously, a server-to-server **webhook/callback** confirms the transaction status independently of the user's browser, preventing fraud.

### **Features**

- **Environment Handling**: Seamless switching between **UAT (Sandbox)** for testing and **Production** for live payments.
- **Audit Trail**: Every payment attempt is logged in the `BookingAuditLog` with transaction IDs and raw response data.
- **Fail-Safe**: If a user closes the browser during payment, the system can query the status later to reconcile the booking.

## 7. Developer Tools (Maintenance)

- `api/create_admin.py`: Initialize admin user.
- `api/clear_bookings.py`: Reset system state (wipe bookings).
- `api/migrate_multilevel.py`: Apply database schema changes for floors.
- `api/check_routes.py`: Audit registered API endpoints.

---

_Generated by ParkPro Development Team_
