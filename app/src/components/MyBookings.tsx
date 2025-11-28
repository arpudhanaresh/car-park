import React, { useState } from 'react';

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
      active: { label: 'Active', class: 'bg-green-100 text-green-800 border-green-200' },
      completed: { label: 'Completed', class: 'bg-gray-100 text-gray-800 border-gray-200' },
      cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-800 border-red-200' }
    };
    const badge = badges[status as keyof typeof badges];
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.class}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">My Bookings</h2>
          <p className="text-gray-500">Manage your parking reservations</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">Active</span>
            <span className="text-2xl font-bold text-blue-900">{bookings.filter(b => b.status === 'active').length}</span>
          </div>
          <div className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider block">Total</span>
            <span className="text-2xl font-bold text-gray-900">{bookings.length}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all hover:shadow-md ${booking.status === 'cancelled' ? 'opacity-75 grayscale' : ''
              }`}
          >
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🅿️</span>
                <span className="font-semibold text-gray-900">{booking.spotInfo}</span>
              </div>
              {getStatusBadge(booking.status)}
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">👤</span>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">Name</div>
                    <div className="font-medium text-gray-900">{booking.name}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">🚗</span>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">Vehicle</div>
                    <div className="font-medium text-gray-900">{booking.vehicleNumber}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">💳</span>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">Payment</div>
                    <div className="font-medium text-gray-900">{booking.paymentMethod}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">📅</span>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">Start</div>
                    <div className="font-medium text-gray-900">{formatDateTime(booking.startDate)}</div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="text-xl mt-1">🏁</span>
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">End</div>
                    <div className="font-medium text-gray-900">{formatDateTime(booking.endDate)}</div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end border-t border-gray-100 pt-4">
                {booking.canCancel && booking.status === 'active' && (
                  <button
                    className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-medium transition-colors flex items-center gap-2"
                    onClick={() => handleCancelClick(booking)}
                  >
                    <span>❌</span> Cancel Booking
                  </button>
                )}
                {!booking.canCancel && booking.status === 'active' && (
                  <div className="text-sm text-yellow-600 bg-yellow-50 px-3 py-2 rounded-lg flex items-center gap-2">
                    <span>⚠️</span> Cannot cancel within 2 hours of start time
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {bookings.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
          <div className="text-4xl mb-4 opacity-50">📋</div>
          <h3 className="text-lg font-semibold text-gray-900">No Bookings Yet</h3>
          <p className="text-gray-500">You haven't made any parking reservations yet.</p>
        </div>
      )}

      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCancelModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Cancel Booking</h3>
              <button className="text-gray-400 hover:text-gray-600" onClick={() => setShowCancelModal(false)}>✕</button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex gap-3">
                <span className="text-xl">⚠️</span>
                <div className="text-sm text-yellow-800">
                  <strong>Cancellation Policy:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>More than 24 hours before: 100% refund</li>
                    <li>Within 24 hours: 50% refund</li>
                    <li>Within 2 hours: No refund</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 text-sm">
                <p className="mb-1"><strong className="text-gray-700">Booking:</strong> {selectedBooking.spotInfo}</p>
                <p><strong className="text-gray-700">Date:</strong> {formatDateTime(selectedBooking.startDate)}</p>
              </div>

              <div>
                <label htmlFor="cancelReason" className="block text-sm font-medium text-gray-700 mb-2">Reason for Cancellation (Optional)</label>
                <textarea
                  id="cancelReason"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Let us know why you're cancelling..."
                  rows={4}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
              <button className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 font-medium transition-colors" onClick={() => setShowCancelModal(false)}>
                Keep Booking
              </button>
              <button className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 font-medium transition-colors shadow-sm" onClick={handleCancelConfirm}>
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
