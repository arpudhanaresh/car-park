import React, { useState } from 'react';
import './MyBookings.css';

interface Booking {
  id: string;
  spotInfo: string;
  name: string;
  vehicleNumber: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  paymentMethod: string;
  canCancel: boolean;
}

const mockBookings: Booking[] = [
  {
    id: '1',
    spotInfo: 'Row 2, Col 3',
    name: 'John Doe',
    vehicleNumber: 'ABC 1234',
    startDate: '2025-12-01T09:00',
    endDate: '2025-12-01T17:00',
    status: 'active',
    paymentMethod: 'RinggitPay',
    canCancel: true
  },
  {
    id: '2',
    spotInfo: 'Row 1, Col 5',
    name: 'John Doe',
    vehicleNumber: 'ABC 1234',
    startDate: '2025-11-25T10:00',
    endDate: '2025-11-25T15:00',
    status: 'completed',
    paymentMethod: 'RinggitPay',
    canCancel: false
  }
];

const MyBookings: React.FC = () => {
  const [bookings] = useState<Booking[]>(mockBookings);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelModal(true);
  };

  const handleCancelConfirm = () => {
    if (selectedBooking) {
      alert(`Booking ${selectedBooking.id} cancelled. Reason: ${cancelReason}`);
      setShowCancelModal(false);
      setCancelReason('');
      setSelectedBooking(null);
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-MY', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: { label: 'Active', class: 'status-active' },
      completed: { label: 'Completed', class: 'status-completed' },
      cancelled: { label: 'Cancelled', class: 'status-cancelled' }
    };
    const badge = badges[status as keyof typeof badges];
    return <span className={`status-badge ${badge.class}`}>{badge.label}</span>;
  };

  return (
    <div className="my-bookings">
      <div className="bookings-header">
        <div>
          <h2>My Bookings</h2>
          <p className="bookings-subtitle">Manage your parking reservations</p>
        </div>
        <div className="bookings-stats">
          <div className="stat-pill">
            <span className="stat-pill-label">Active</span>
            <span className="stat-pill-value">{bookings.filter(b => b.status === 'active').length}</span>
          </div>
          <div className="stat-pill">
            <span className="stat-pill-label">Total</span>
            <span className="stat-pill-value">{bookings.length}</span>
          </div>
        </div>
      </div>

      <div className="bookings-grid">
        {bookings.map((booking) => (
          <div key={booking.id} className={`booking-card booking-${booking.status}`}>
            <div className="booking-card-header">
              <div className="booking-spot">
                <span className="spot-icon">🅿️</span>
                <span className="spot-info">{booking.spotInfo}</span>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            <div className="booking-details">
              <div className="detail-row">
                <span className="detail-icon">👤</span>
                <div className="detail-content">
                  <div className="detail-label">Name</div>
                  <div className="detail-value">{booking.name}</div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">🚗</span>
                <div className="detail-content">
                  <div className="detail-label">Vehicle</div>
                  <div className="detail-value">{booking.vehicleNumber}</div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">📅</span>
                <div className="detail-content">
                  <div className="detail-label">Start</div>
                  <div className="detail-value">{formatDateTime(booking.startDate)}</div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">🏁</span>
                <div className="detail-content">
                  <div className="detail-label">End</div>
                  <div className="detail-value">{formatDateTime(booking.endDate)}</div>
                </div>
              </div>

              <div className="detail-row">
                <span className="detail-icon">💳</span>
                <div className="detail-content">
                  <div className="detail-label">Payment</div>
                  <div className="detail-value">{booking.paymentMethod}</div>
                </div>
              </div>
            </div>

            <div className="booking-actions">
              {booking.canCancel && booking.status === 'active' && (
                <button
                  className="btn-cancel"
                  onClick={() => handleCancelClick(booking)}
                >
                  <span>❌</span> Cancel Booking
                </button>
              )}
              {!booking.canCancel && booking.status === 'active' && (
                <div className="cannot-cancel-notice">
                  <span>⚠️</span> Cannot cancel within 2 hours of start time
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="empty-bookings">
          <div className="empty-icon">📋</div>
          <h3>No Bookings Yet</h3>
          <p>You haven't made any parking reservations yet.</p>
        </div>
      )}

      {showCancelModal && selectedBooking && (
        <div className="cancel-modal-overlay" onClick={() => setShowCancelModal(false)}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <div className="cancel-modal-header">
              <h3>Cancel Booking</h3>
              <button className="close-btn" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>

            <div className="cancel-modal-content">
              <div className="warning-box">
                <span className="warning-icon">⚠️</span>
                <div className="warning-text">
                  <strong>Cancellation Policy:</strong>
                  <ul>
                    <li>More than 24 hours before: 100% refund</li>
                    <li>Within 24 hours: 50% refund</li>
                    <li>Within 2 hours: No refund</li>
                  </ul>
                </div>
              </div>

              <div className="cancel-booking-info">
                <p><strong>Booking:</strong> {selectedBooking.spotInfo}</p>
                <p><strong>Date:</strong> {formatDateTime(selectedBooking.startDate)}</p>
              </div>

              <div className="form-group">
                <label htmlFor="cancelReason">Reason for Cancellation (Optional)</label>
                <textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Let us know why you're cancelling..."
                  rows={4}
                />
              </div>
            </div>

            <div className="cancel-modal-actions">
              <button className="btn-secondary" onClick={() => setShowCancelModal(false)}>
                Keep Booking
              </button>
              <button className="btn-danger" onClick={handleCancelConfirm}>
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookings;
