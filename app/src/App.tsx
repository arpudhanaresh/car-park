import { useState, useEffect } from 'react';
import { getLayout, updateLayout, bookSpot, apiService } from './services/api';
import type { ParkingState, User } from './services/api';
import ParkingLot from './components/ParkingLot';
import AdminPanel from './components/AdminPanel';
import BookingModal from './components/BookingModal';
import type { BookingDetails } from './components/BookingModal';
import MyBookings from './components/MyBookings';
import Login from './components/Login';
import Signup from './components/Signup';

type ViewTab = 'booking' | 'myBookings';
type AuthView = 'login' | 'signup';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authView, setAuthView] = useState<AuthView>('login');
  const [parkingState, setParkingState] = useState<ParkingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ViewTab>('booking');
  const [selectedSpot, setSelectedSpot] = useState<{ row: number; col: number } | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      apiService.setAuthToken(token);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const fetchLayout = async () => {
    try {
      const data = await getLayout();
      setParkingState(data);
    } catch (error) {
      console.error("Failed to fetch layout", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLayout();
    }
  }, [user]);

  const handleLoginSuccess = (token: string, role: string, username: string) => {
    const userData = { username, role };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    apiService.setAuthToken(token);
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    apiService.setAuthToken(null);
    setUser(null);
    setParkingState(null);
  };

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

  if (!user) {
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
          </div>
        </header>
        <main className="main-content auth-wrapper">
          {authView === 'login' ? (
            <Login
              onLoginSuccess={handleLoginSuccess}
              onSwitchToSignup={() => setAuthView('signup')}
            />
          ) : (
            <Signup
              onSignupSuccess={handleLoginSuccess}
              onSwitchToLogin={() => setAuthView('login')}
            />
          )}
        </main>
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
        <button className="retry-button" onClick={handleLogout} style={{ marginTop: '10px', backgroundColor: '#666' }}>
          Logout
        </button>
      </div>
    );
  }

  const availableSpots = parkingState.spots.filter(s => !s.is_booked).length;
  const bookedSpots = parkingState.spots.filter(s => s.is_booked).length;
  const totalSpots = parkingState.rows * parkingState.cols;
  const occupancyRate = totalSpots > 0 ? ((bookedSpots / totalSpots) * 100).toFixed(1) : 0;
  const isAdmin = user.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="text-4xl">🅿️</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
                Parking Lot Booking System
              </h1>
              <p className="text-sm text-gray-500 font-medium">Malaysia | Powered by AWS Cloud</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden md:flex items-center gap-4 mr-4 text-sm font-medium text-gray-700">
                <span>Welcome, <span className="text-blue-600">{user.username}</span> ({user.role})</span>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Logout
                </button>
              </div>
            )}
            <label className="flex items-center gap-3 cursor-pointer bg-gray-100 px-4 py-2 rounded-full hover:bg-gray-200 transition-colors">
              <span className="text-sm font-medium text-gray-700">
                {isAdmin ? '👨‍💼 Admin' : '👤 Customer'}
              </span>
              <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  checked={isAdmin}
                  onChange={(e) => {
                    if (user) {
                      setUser({ ...user, role: e.target.checked ? 'admin' : 'customer' });
                    }
                  }}
                  className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-4 checked:border-blue-600"
                />
                <span className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer transition-colors duration-200 ease-in-out peer-checked:bg-blue-600"></span>
              </div>
            </label>
          </div>
        </div>
      </header>

      {!isAdmin && (
        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 tracking-tight">
              Welcome to Smart Parking System
            </h2>
            <p className="text-xl md:text-2xl text-blue-100 mb-12 max-w-3xl mx-auto">
              Book your parking space in advance with instant confirmation and secure payment via RinggitPay
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: '🕐', title: 'Real-time Availability', desc: 'View available parking spots in real-time with instant updates' },
                { icon: '💳', title: 'Secure Payments', desc: 'Safe and secure transactions via RinggitPay gateway' },
                { icon: '📱', title: 'Instant Confirmation', desc: 'Get booking confirmation via email immediately' },
                { icon: '🔄', title: 'Flexible Cancellation', desc: 'Cancel bookings with our transparent refund policy' }
              ].map((feature, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300">
                  <div className="text-4xl mb-4">{feature.icon}</div>
                  <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-blue-100 leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAdmin && (
          <div className="flex justify-center gap-4 mb-8">
            <button
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === 'booking'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                }`}
              onClick={() => setActiveTab('booking')}
            >
              🅿️ Book Parking
            </button>
            <button
              className={`px-6 py-3 rounded-full font-semibold transition-all duration-200 flex items-center gap-2 ${activeTab === 'myBookings'
                ? 'bg-blue-600 text-white shadow-lg scale-105'
                : 'bg-white text-gray-600 hover:bg-gray-50 shadow-sm'
                }`}
              onClick={() => setActiveTab('myBookings')}
            >
              📋 My Bookings
            </button>
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Total Spots</div>
                <div className="text-3xl font-bold text-gray-900">{totalSpots}</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Available</div>
                <div className="text-3xl font-bold text-green-600">{availableSpots}</div>
                <div className="text-xs font-medium text-green-600 mt-2 flex items-center gap-1">
                  ↑ Ready to book
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Booked</div>
                <div className="text-3xl font-bold text-red-600">{bookedSpots}</div>
                <div className="text-xs font-medium text-red-600 mt-2 flex items-center gap-1">
                  ↓ Occupied
                </div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <div className="text-sm font-medium text-gray-500 mb-1">Occupancy Rate</div>
                <div className="text-3xl font-bold text-blue-600">{occupancyRate}%</div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Configuration</h3>
              <AdminPanel
                currentRows={parkingState.rows}
                currentCols={parkingState.cols}
                onUpdateLayout={handleLayoutUpdate}
              />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Live Layout</h3>
              <ParkingLot
                rows={parkingState.rows}
                cols={parkingState.cols}
                spots={parkingState.spots}
                onSpotClick={handleSpotClick}
                isCustomer={false}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {activeTab === 'booking' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-1">Available Spots</div>
                    <div className="text-3xl font-bold text-green-600">{availableSpots}</div>
                    <div className="text-xs font-medium text-green-600 mt-2">Click to book</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-1">Total Capacity</div>
                    <div className="text-3xl font-bold text-gray-900">{totalSpots}</div>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-sm font-medium text-gray-500 mb-1">Current Status</div>
                    <div className="text-3xl font-bold text-blue-600">{occupancyRate}%</div>
                    <div className="text-xs font-medium text-gray-500 mt-2">Occupied</div>
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
                  <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2">
                    <span>ℹ️</span> How to Book Your Parking Spot
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      "Select an available green parking spot from the grid below",
                      "Fill in your details and select your preferred time slot",
                      "Complete secure payment via RinggitPay",
                      "Receive instant confirmation via email"
                    ].map((step, idx) => (
                      <div key={idx} className="flex gap-3 items-start">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
                          {idx + 1}
                        </div>
                        <p className="text-sm text-blue-800 leading-snug">{step}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 md:p-8">
                  <ParkingLot
                    rows={parkingState.rows}
                    cols={parkingState.cols}
                    spots={parkingState.spots}
                    onSpotClick={handleSpotClick}
                    isCustomer={true}
                    selectedSpot={selectedSpot}
                  />
                </div>
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
