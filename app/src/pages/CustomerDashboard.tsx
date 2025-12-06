import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { parking } from '../services/api';
import { Calendar, Clock, MapPin, Car, Plus } from 'lucide-react';

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

    const handleCancel = async (id: number) => {
        if (!window.confirm("Are you sure you want to cancel this booking?")) return;
        try {
            await parking.cancelBooking(id, "User requested cancellation");
            fetchBookings(); // Refresh list
        } catch (error) {
            console.error("Failed to cancel booking", error);
            alert("Failed to cancel booking");
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Bookings</h1>
                    <p className="text-gray-500 mt-1">View and manage your parking reservations</p>
                </div>
                <button
                    onClick={() => navigate('/book')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-200 hover:scale-105"
                >
                    <Plus size={20} />
                    Book New Spot
                </button>
            </header>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading your bookings...</p>
                </div>
            ) : bookings.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {bookings.map((booking) => (
                        <div key={booking.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Car size={24} />
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize
                  ${booking.status === 'active' ? 'bg-green-100 text-green-800' :
                                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'}`}>
                                    {booking.status}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <MapPin size={18} className="text-gray-400" />
                                    <span className="font-medium text-gray-900">{booking.spot_info}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Calendar size={18} className="text-gray-400" />
                                    <span className="text-sm">
                                        {new Date(booking.start_time).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Clock size={18} className="text-gray-400" />
                                    <span className="text-sm">
                                        {new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                        {new Date(booking.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                        LP
                                    </div>
                                    <span className="text-sm font-mono bg-gray-50 px-2 py-0.5 rounded">
                                        {booking.vehicle.license_plate}
                                    </span>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
                                <span className="font-bold text-lg text-gray-900">
                                    ${booking.payment_amount}
                                </span>
                                {booking.can_cancel && (
                                    <button
                                        onClick={() => handleCancel(booking.id)}
                                        className="text-sm text-red-600 hover:text-red-700 font-medium hover:underline"
                                    >
                                        Cancel Booking
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                        <Car size={32} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings found</h3>
                    <p className="text-gray-500 mb-6">You haven't made any parking reservations yet.</p>
                    <button
                        onClick={() => navigate('/book')}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
                    >
                        Book Your First Spot
                    </button>
                </div>
            )}
        </div>
    );
};

export default CustomerDashboard;
