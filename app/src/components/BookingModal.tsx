import React, { useState } from 'react';
import './BookingModal.css';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingDetails: BookingDetails) => void;
  spotInfo: { row: number; col: number };
}

export interface BookingDetails {
  name: string;
  email: string;
  phone: string;
  vehicleNumber: string;
  startDate: string;
  endDate: string;
  paymentMethod: string;
}

const BookingModal: React.FC<BookingModalProps> = ({ isOpen, onClose, onConfirm, spotInfo }) => {
  const [formData, setFormData] = useState<BookingDetails>({
    name: '',
    email: '',
    phone: '',
    vehicleNumber: '',
    startDate: '',
    endDate: '',
    paymentMethod: 'ringgitpay'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(formData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>Reserve Parking Spot</h2>
            <p className="modal-subtitle">Spot: Row {spotInfo.row}, Column {spotInfo.col}</p>
          </div>
          <button className="close-button" onClick={onClose}>
            <span>✕</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="booking-form">
          <div className="form-section">
            <h3 className="section-title">
              <span>👤</span> Personal Information
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Full Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email Address *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Phone Number *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+60 12-345 6789"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="vehicleNumber">Vehicle Number *</label>
                <input
                  type="text"
                  id="vehicleNumber"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleChange}
                  placeholder="ABC 1234"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <span>📅</span> Booking Details
            </h3>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="startDate">Start Date & Time *</label>
                <input
                  type="datetime-local"
                  id="startDate"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="endDate">End Date & Time *</label>
                <input
                  type="datetime-local"
                  id="endDate"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3 className="section-title">
              <span>💳</span> Payment Method
            </h3>
            <div className="payment-options">
              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="ringgitpay"
                  checked={formData.paymentMethod === 'ringgitpay'}
                  onChange={handleChange}
                />
                <div className="payment-card">
                  <div className="payment-icon">💰</div>
                  <div className="payment-details">
                    <div className="payment-name">RinggitPay</div>
                    <div className="payment-desc">Secure online payment</div>
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="cancellation-policy">
            <h4>Cancellation Policy</h4>
            <ul>
              <li>Free cancellation up to 24 hours before booking start time</li>
              <li>50% refund for cancellations within 24 hours</li>
              <li>No refund for cancellations within 2 hours of start time</li>
            </ul>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <span>🔒</span> Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
