import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parking } from '../services/api';
import { Calendar, Clock, MapPin, Car, Plus, Trash2 } from 'lucide-react';

import QRCode from 'react-qr-code';
import { QrCode, X } from 'lucide-react';

interface Booking {
    id: number;
    booking_uuid?: string;
    spot_info: string;
    name: string;
    vehicle: { license_plate: string; make?: string; model?: string };
    start_time: string;
    end_time: string;
    status: string;
    payment_status: string;
    payment_amount: number;
    can_cancel: boolean;
    latest_order_id?: string;
    refund_status?: string;
}

const CustomerDashboard: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [showQRModal, setShowQRModal] = useState(false);
    const [qrBooking, setQrBooking] = useState<Booking | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const response = await parking.getUserBookings();
            setBookings(response.data);
        } catch (error) {
            console.error("Failed to fetch bookings", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClick = (id: number) => {
        setSelectedBookingId(id);
        setCancellationReason('');
        setIsCancelModalOpen(true);
    };

    const [config, setConfig] = useState({
        rule1Hours: 24,
        rule2Hours: 2,
        rule2Percent: 50
    });

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await parking.getPublicConfig();
                if (response.data) {
                    setConfig({
                        rule1Hours: Number(response.data.cancellation_rule_1_hours) || 24,
                        rule2Hours: Number(response.data.cancellation_rule_2_hours) || 2,
                        rule2Percent: Number(response.data.cancellation_rule_2_percent) || 50
                    });
                }
            } catch (error) {
                console.error("Failed to fetch config", error);
            }
        };
        fetchConfig();
    }, []);

    const calculateRefundPreview = (booking: Booking | undefined) => {
        if (!booking) return { percentage: 0, amount: 0, note: "Unknown" };
        const start = new Date(booking.start_time);
        const now = new Date();
        const diffMs = start.getTime() - now.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);

        if (diffHrs >= config.rule1Hours) {
            return { percentage: 100, amount: booking.payment_amount, note: `Full Refund (> ${config.rule1Hours}h notice)` };
        } else if (diffHrs >= config.rule2Hours) {
            const refundAmount = (booking.payment_amount * config.rule2Percent) / 100;
            return { percentage: config.rule2Percent, amount: refundAmount, note: `${config.rule2Percent}% Refund (${config.rule2Hours}-${config.rule1Hours}h notice)` };
        } else {
            return { percentage: 0, amount: 0, note: `No Refund (< ${config.rule2Hours}h notice)` };
        }
    };

    const confirmCancel = async () => {
        if (!selectedBookingId) return;

        try {
            await parking.cancelBooking(selectedBookingId, cancellationReason);
            setIsCancelModalOpen(false);
            fetchBookings(); // Refresh list
        } catch (error) {
            console.error("Failed to cancel booking", error);
            alert("Failed to cancel booking");
        }
    };

    const handleRetry = async (bookingId: number) => {
        try {
            const response = await parking.initiatePayment(bookingId);
            const { action, fields } = response.data;

            const form = document.createElement('form');
            form.method = 'POST';
            form.action = action;

            Object.keys(fields).forEach(key => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = key;
                input.value = fields[key];
                form.appendChild(input);
            });

            document.body.appendChild(form);
            form.submit();
        } catch (e) {
            alert('Failed to retry payment. Please try again.');
        }
    };

    const handleCheckStatus = async (bookingId: number, orderId?: string) => {
        if (!orderId) {
            alert("Order ID not found for this booking. Cannot check status.");
            return;
        }
        try {
            const response = await parking.checkPaymentStatus(bookingId, orderId);
            const newStatus = response.data.status;
            // map newStatus to readable
            let msg = newStatus;
            if (newStatus === 'paid') msg = 'Payment Successful! Refreshing...';
            else if (newStatus === 'failed') msg = 'Payment Failed. Please retry.';
            else msg = 'Payment still pending.';

            alert(msg);
            fetchBookings(); // Refresh UI
        } catch (e) {
            alert('Error checking status. Please try again.');
        }
    };

    return (
        <div className="space-y-8 relative">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">My Bookings</h1>
                    <p className="text-gray-400 mt-1">View and manage your parking reservations</p>
                </div>
                <button
                    onClick={() => navigate('/book')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5"
                >
                    <Plus size={20} />
                    Book New Spot
                </button>
            </header>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading your bookings...</p>
                </div>
            ) : bookings.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="glass-card rounded-2xl p-6 hover:bg-gray-800/50 transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
                                    <Car size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                  ${booking.status === 'cancelled' ? (
                                        booking.refund_status === 'pending' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                            booking.refund_status === 'completed' ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' :
                                                'bg-gray-700 text-red-400 border border-red-500/20'
                                    ) :
                                        booking.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                            booking.payment_status === 'failed' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                booking.payment_status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                                                    'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                                    {booking.status === 'cancelled' ? (
                                        booking.refund_status === 'pending' ? 'Refund Pending' :
                                            booking.refund_status === 'completed' ? 'Refunded' :
                                                'Cancelled'
                                    ) :
                                        booking.status === 'active' ? 'Active' :
                                            booking.payment_status === 'failed' ? 'Payment Failed' :
                                                booking.payment_status === 'pending' ? 'Payment Pending' :
                                                    booking.status}
                                </span>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex items-center gap-3 text-gray-300">
                                    <MapPin size={18} className="text-indigo-400" />
                                    <span className="font-bold text-lg">{booking.spot_info}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Calendar size={18} className="text-gray-500" />
                                    <span className="text-sm">
                                        {new Date(booking.start_time).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <Clock size={18} className="text-gray-500" />
                                    <span className="text-sm">
                                        {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                        {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400">
                                    <div className="w-5 h-5 rounded bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                        LP
                                    </div>
                                    <span className="text-sm font-mono bg-gray-800/50 px-2 py-0.5 rounded border border-gray-700/50 text-gray-300">
                                        {booking.vehicle.license_plate}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <span className="font-bold text-xl text-white text-glow whitespace-nowrap">
                                    RM {booking.payment_amount}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    {booking.status === 'active' && (
                                        <button
                                            onClick={() => {
                                                setQrBooking(booking);
                                                setShowQRModal(true);
                                            }}
                                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/20"
                                        >
                                            <QrCode size={14} />
                                            Show QR
                                        </button>
                                    )}
                                    {booking.can_cancel && (
                                        <button
                                            onClick={() => handleCancelClick(booking.id)}
                                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20"
                                        >
                                            <Trash2 size={14} />
                                            Cancel <span className="hidden sm:inline opacity-50 ml-1 text-[10px]">(Fee Applies)</span>
                                            <span className="sm:hidden opacity-50 ml-1 text-[10px]">(Fee)</span>
                                        </button>
                                    )}
                                    {booking.payment_status === 'failed' && booking.status !== 'cancelled' && (
                                        <button
                                            onClick={() => handleRetry(booking.id)}
                                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 text-xs font-medium text-white hover:text-white transition-colors bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg shadow-lg shadow-indigo-500/20"
                                        >
                                            <Clock size={14} />
                                            Retry Payment
                                        </button>
                                    )}
                                    {booking.payment_status === 'pending' && booking.status !== 'cancelled' && (
                                        <button
                                            onClick={() => handleCheckStatus(booking.id, booking.latest_order_id)}
                                            className="flex-1 sm:flex-none justify-center flex items-center gap-2 text-xs font-medium text-yellow-400 hover:text-yellow-300 transition-colors bg-yellow-500/10 hover:bg-yellow-500/20 px-3 py-1.5 rounded-lg border border-yellow-500/20"
                                        >
                                            <Clock size={14} />
                                            Check Status
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 glass-card rounded-3xl border-dashed border-2 border-gray-700">
                    <div className="w-20 h-20 bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600 border border-gray-700">
                        <Car size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">No bookings found</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">You haven't made any parking reservations yet. Start by booking a spot for your vehicle.</p>
                    <button
                        onClick={() => navigate('/book')}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Book Your First Spot
                    </button>
                </div>
            )}

            {/* Cancellation Modal */}
            {isCancelModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-md rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10">
                            <h2 className="text-xl font-bold text-white">Cancel Booking</h2>
                            <p className="text-sm text-gray-400 mt-1">Please provide a reason for cancellation.</p>

                            {/* Refund Preview */}
                            {(() => {
                                const booking = bookings.find(b => b.id === selectedBookingId);
                                const refund = calculateRefundPreview(booking);
                                return (
                                    <div className={`mt-4 p-4 rounded-xl border ${refund.percentage > 0 ? 'bg-green-900/20 border-green-900/30' : 'bg-red-900/20 border-red-900/30'}`}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs uppercase font-bold text-gray-400 tracking-wider">Estimated Refund</span>
                                            <span className={`font-bold ${refund.percentage > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                RM {refund.amount.toFixed(2)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-300">{refund.note}</p>
                                    </div>
                                );
                            })()}
                        </div>
                        <div className="p-6 space-y-4">
                            <textarea
                                value={cancellationReason}
                                onChange={(e) => setCancellationReason(e.target.value)}
                                placeholder="Reason for cancellation..."
                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all min-h-[100px]"
                            />
                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    onClick={() => setIsCancelModalOpen(false)}
                                    className="px-4 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Keep Booking
                                </button>
                                <button
                                    onClick={confirmCancel}
                                    disabled={!cancellationReason.trim()}
                                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Confirm Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && qrBooking && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-md">
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full relative transform transition-all scale-100 shadow-[0_0_50px_rgba(255,255,255,0.2)]">
                        <button
                            onClick={() => setShowQRModal(false)}
                            className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="text-center">
                            <h3 className="text-2xl font-bold text-gray-900 mb-1">Scan for Entry</h3>
                            <p className="text-gray-500 text-sm mb-8">Present this QR code at the gate</p>

                            <div className="bg-white p-4 rounded-xl border-2 border-gray-100 inline-block shadow-sm">
                                <QRCode value={qrBooking.booking_uuid || qrBooking.id.toString()} size={200} />
                            </div>

                            <div className="mt-8 space-y-2">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">Booking UUID</div>
                                <div className="font-mono text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 inline-block select-all break-all max-w-full">
                                    {qrBooking.booking_uuid || `BK-${qrBooking.id}`}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
