import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parking } from '../services/api';
import { Calendar, Clock, MapPin, Car, Plus, Trash2 } from 'lucide-react';

interface Booking {
    id: number;
    spot_info: string;
    name: string;
    vehicle: { license_plate: string; make?: string; model?: string };
    start_time: string;
    end_time: string;
    status: string;
    payment_amount: number;
    can_cancel: boolean;
}

const CustomerDashboard: React.FC = () => {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
    const [cancellationReason, setCancellationReason] = useState('');
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
                  ${booking.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                        booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                            'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                                    {booking.status}
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

                            <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="font-bold text-xl text-white text-glow">
                                    RM {booking.payment_amount}
                                </span>
                                {booking.can_cancel && (
                                    <button
                                        onClick={() => handleCancelClick(booking.id)}
                                        className="flex items-center gap-2 text-xs font-medium text-red-400 hover:text-red-300 transition-colors bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/20"
                                    >
                                        <Trash2 size={14} />
                                        Cancel
                                    </button>
                                )}
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
        </div>
    );
};

export default CustomerDashboard;
