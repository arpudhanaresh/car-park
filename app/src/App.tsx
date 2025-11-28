import { useEffect, useState } from 'react';
import './App.css';
import { getLayout, updateLayout, bookSpot } from './services/api';
import type { ParkingState } from './services/api';
import ParkingLot from './components/ParkingLot';
import AdminPanel from './components/AdminPanel';
import BookingModal from './components/BookingModal';
import type { BookingDetails } from './components/BookingModal';
import MyBookings from './components/MyBookings';

type ViewTab = 'booking' | 'myBookings';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [parkingState, setParkingState] = useState<ParkingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('booking');
  const [selectedSpot, setSelectedSpot] = useState<{ row: number; col: number } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  const fetchLayout = async () => {
    try {
      const data = await getLayout();
      setParkingState(data);
    } catch (error) {
      console.error("Failed to fetch layout", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayout();
  }, []);

  const handleLayoutUpdate = async (rows: number, cols: number) => {
    try {
      const newState = await updateLayout({ rows, cols });
      setParkingState(newState);
      alert("Layout updated successfully!");
    } catch (error) {
      console.error("Failed to update layout", error);
      alert("Failed to update layout");
    }
  };

  const handleSpotClick = async (row: number, col: number) => {
    setSelectedSpot({ row, col });
    setShowBookingModal(true);
  };

  const handleBookingConfirm = async (_bookingDetails: BookingDetails) => {
    if (selectedSpot) {
      try {
        const newState = await bookSpot(selectedSpot.row, selectedSpot.col, true);
        setParkingState(newState);
        setShowBookingModal(false);
        setSelectedSpot(null);
        alert(`Booking confirmed for spot ${String.fromCharCode(65 + selectedSpot.row)}${selectedSpot.col + 1}!`);
      } catch (error) {
        console.error("Failed to book spot", error);
        alert("Failed to book spot. It may already be taken.");
      }
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading parking system...</p>
      </div>
    );
  }

  if (!parkingState) {
    return (
      <div className="error-container">
        <div className="error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p className="error-message">
          Unable to connect to the parking system. Please ensure the backend server is running.
        </p>
        <button className="retry-button" onClick={fetchLayout}>
          Retry Connection
        </button>
      </div>
    );
  }

  const availableSpots = parkingState.spots.filter(s => !s.is_booked).length;
  const bookedSpots = parkingState.spots.filter(s => s.is_booked).length;
  const totalSpots = parkingState.rows * parkingState.cols;
  const occupancyRate = totalSpots > 0 ? ((bookedSpots / totalSpots) * 100).toFixed(1) : 0;

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-branding">
            <div className="logo-icon">🅿️</div>
            <div className="header-title">
              <h1>Parking Lot Booking System</h1>
              <p className="header-subtitle">Malaysia | Powered by AWS Cloud</p>
            </div>
          </div>

          <div className="header-controls">
            <label className="mode-switcher">
              <span className="switch-label">
                {isAdmin ? '👨‍💼 Admin' : '👤 Customer'}
              </span>
              <div className="switch">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => setIsAdmin(e.target.checked)}
                />
                <span className="switch-slider"></span>
              </div>
            </label>
          </div>
        </div>
      </header>

      {!isAdmin && (
        <section className="hero-banner">
          <div className="hero-content">
            <h2>Welcome to Smart Parking System</h2>
            <p>Book your parking space in advance with instant confirmation and secure payment via RinggitPay</p>

            <div className="hero-features">
              <div className="feature-card">
                <div className="feature-icon">🕐</div>
                <h3>Real-time Availability</h3>
                <p>View available parking spots in real-time with instant updates</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💳</div>
                <h3>Secure Payments</h3>
                <p>Safe and secure transactions via RinggitPay gateway</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📱</div>
                <h3>Instant Confirmation</h3>
                <p>Get booking confirmation via email immediately</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🔄</div>
                <h3>Flexible Cancellation</h3>
                <p>Cancel bookings with our transparent refund policy</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <main className="main-content">
        {!isAdmin && (
          <div className="view-tabs">
            <button
              className={`tab-button ${activeTab === 'booking' ? 'active' : ''}`}
              onClick={() => setActiveTab('booking')}
            >
              🅿️ Book Parking
            </button>
            <button
              className={`tab-button ${activeTab === 'myBookings' ? 'active' : ''}`}
              onClick={() => setActiveTab('myBookings')}
            >
              📋 My Bookings
            </button>
          </div>
        )}

        {isAdmin ? (
          <div className="admin-section">
            <div className="stats-overview">
              <div className="stat-card">
                <div className="stat-label">Total Spots</div>
                <div className="stat-value">{totalSpots}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Available</div>
                <div className="stat-value">{availableSpots}</div>
                <div className="stat-trend trend-up">↑ Ready to book</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Booked</div>
                <div className="stat-value">{bookedSpots}</div>
                <div className="stat-trend trend-down">↓ Occupied</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Occupancy Rate</div>
                <div className="stat-value">{occupancyRate}%</div>
              </div>
            </div>

            <AdminPanel
              currentRows={parkingState.rows}
              currentCols={parkingState.cols}
              onUpdateLayout={handleLayoutUpdate}
            />

            <ParkingLot
              rows={parkingState.rows}
              cols={parkingState.cols}
              spots={parkingState.spots}
              onSpotClick={handleSpotClick}
              isCustomer={false}
            />
          </div>
        ) : (
          <div className="customer-section">
            {activeTab === 'booking' && (
              <>
                <div className="stats-overview">
                  <div className="stat-card">
                    <div className="stat-label">Available Spots</div>
                    <div className="stat-value">{availableSpots}</div>
                    <div className="stat-trend trend-up">Click to book</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Total Capacity</div>
                    <div className="stat-value">{totalSpots}</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">Current Status</div>
                    <div className="stat-value">{occupancyRate}%</div>
                    <div className="stat-trend">Occupied</div>
                  </div>
                </div>

                <div className="booking-info">
                  <h3>
                    <span>ℹ️</span> How to Book Your Parking Spot
                  </h3>
                  <div className="booking-steps">
                    <div className="booking-step">
                      <div className="step-number">1</div>
                      <div className="step-text">Select an available green parking spot from the grid below</div>
                    </div>
                    <div className="booking-step">
                      <div className="step-number">2</div>
                      <div className="step-text">Fill in your details and select your preferred time slot</div>
                    </div>
                    <div className="booking-step">
                      <div className="step-number">3</div>
                      <div className="step-text">Complete secure payment via RinggitPay</div>
                    </div>
                    <div className="booking-step">
                      <div className="step-number">4</div>
                      <div className="step-text">Receive instant confirmation via email</div>
                    </div>
                  </div>
                </div>

                <ParkingLot
                  rows={parkingState.rows}
                  cols={parkingState.cols}
                  spots={parkingState.spots}
                  onSpotClick={handleSpotClick}
                  isCustomer={true}
                  selectedSpot={selectedSpot}
                />
              </>
            )}

            {activeTab === 'myBookings' && <MyBookings />}
          </div>
        )}
      </main>

      {showBookingModal && selectedSpot && (
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false);
            setSelectedSpot(null);
          }}
          onConfirm={handleBookingConfirm}
          spotInfo={selectedSpot}
        />
      )}
    </div>
  );
}

export default App;
