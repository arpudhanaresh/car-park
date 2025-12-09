# ParkPro - Modern Smart Parking System

![ParkPro Banner](https://placehold.co/1200x400/1e1e2e/6366f1?text=ParkPro+System)

ParkPro is a comprehensive, full-stack parking management solution designed to provide a premium user experience for customers and powerful tools for administrators. Built with a modern tech stack, it features real-time availability, interactive mapping, role-based access control, and revenue analytics.

## 🚀 Features

### For Customers
*   **Interactive Booking**: Visual parking lot map with real-time spot availability.
*   **Smart Pricing**: Dynamic pricing based on vehicle type (EV, VIP) and duration.
*   **Vehicle Management**: Save multiple vehicles for quick booking; auto-save on new entries.
*   **Dashboard**: Track active, upcoming, and completed bookings.
*   **Digital Receipts**: Download booking receipts and view QR codes for entry.

### For Administrators
*   **Real-time Dashboard**: Live occupancy stats and revenue metrics.
*   **Spot Management**: Block spots for maintenance, change spot types (EV/VIP), and rename labels interactively.
*   **Revenue Analytics**: Visual charts for revenue trends and peak occupancy hours.
*   **Booking Oversight**: View, manage, and force-close any active bookings.
*   **Configuration**: Update base parking rates and manage promo codes dynamically.

## 🛠️ Technology Stack

### Frontend
*   **React** (Vite) + **TypeScript**
*   **Tailwind CSS** (Custom Dark Theme + Glassmorphism)
*   **Lucide React** (Icons)
*   **Recharts** (Data Visualization)
*   **Axios** (API Communication)

### Backend
*   **FastAPI** (Python 3.9+)
*   **SQLAlchemy** (ORM) & **PyMySQL**
*   **Pydantic** (Data Validation)
*   **JWT** (Authentication)

### Database
*   **MySQL** (Relational Database)

## 📦 Installation & Setup

### Prerequisites
*   Node.js (v16+)
*   Python (v3.9+)
*   MySQL Server (Running locally or remotely)

### 1. Database Setup
Create a MySQL database named `car_parking`.
Update your environment variables with the credentials.

### 2. Backend Setup
Navigate to the `api` directory:
```bash
cd api
```

Create a virtual environment and activate it:
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# Mac/Linux
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Run the server:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
The API will be available at `http://localhost:8000`. API Docs at `http://localhost:8000/docs`.

### 3. Frontend Setup
Navigate to the `app` directory (in a new terminal):
```bash
cd app
```

Install dependencies:
```bash
npm install
```

Run the development server:
```bash
npm run dev
```
The application will launch at `http://localhost:5173`.

## ⚙️ Environment Variables

### Backend (`api/.env`)
```env
DB_USER=root
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
DB_NAME=car_parking
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

### Frontend (`app/.env`)
```env
VITE_API_URL=http://localhost:8000
```

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ by ParkPro Team*
