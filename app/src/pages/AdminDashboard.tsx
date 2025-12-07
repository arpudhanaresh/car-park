import React, { useEffect, useState } from 'react';
import { parking } from '../services/api';
import { Settings, Save, AlertCircle, LayoutGrid, List } from 'lucide-react';

interface Booking {
    id: number;
    spot_info: string;
    name: string;
    vehicle: { license_plate: string };
    start_time: string;
    end_time: string;
    status: string;
    payment_amount: number;
    email: string;
    excess_fee: number;
}

const AdminDashboard: React.FC = () => {
    const [layout, setLayout] = useState({ rows: 5, cols: 5 });
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'layout' | 'bookings'>('layout');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [layoutRes, bookingsRes] = await Promise.all([
                parking.getLayout(),
                parking.getAllBookings(),
            ]);
            setLayout({ rows: layoutRes.data.rows, cols: layoutRes.data.cols });
            setBookings(bookingsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        }
    };

    const handleSaveLayout = async () => {
        setSaving(true);
        try {
            await parking.updateLayout(layout);
            // Show success message
        } catch (error) {
            console.error("Failed to update layout", error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
                    <p className="text-gray-400 mt-1">Manage parking layout and view system status</p>
                </div>
            </header>

            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="border-b border-white/5">
                    <nav className="flex gap-1 p-2">
                        <button
                            onClick={() => setActiveTab('layout')}
                            className={`flex items-center gap-2 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'layout'
                                ? 'bg-indigo-600/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <LayoutGrid size={18} />
                            Layout Configuration
                        </button>
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`flex items-center gap-2 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === 'bookings'
                                ? 'bg-indigo-600/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <List size={18} />
                            All Bookings
                        </button>
                    </nav>
                </div>

                <div className="p-6 md:p-8">
                    {activeTab === 'layout' ? (
                        <div className="max-w-2xl mx-auto">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                                    <Settings size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Parking Grid Dimensions</h3>
                                    <p className="text-sm text-gray-400">Set the number of rows and columns</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 mb-8">
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Rows</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={layout.rows}
                                        onChange={(e) => setLayout({ ...layout, rows: parseInt(e.target.value) || 0 })}
                                        className="block w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Columns</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={layout.cols}
                                        onChange={(e) => setLayout({ ...layout, cols: parseInt(e.target.value) || 0 })}
                                        className="block w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4 mb-8 flex gap-3">
                                <AlertCircle className="text-yellow-500 shrink-0" size={20} />
                                <p className="text-sm text-yellow-200/80">
                                    Reducing dimensions will permanently delete any parking spots (and associated active bookings) that fall outside the new grid.
                                </p>
                            </div>

                            <button
                                onClick={handleSaveLayout}
                                disabled={saving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 disabled:opacity-70"
                            >
                                <Save size={20} />
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto -mx-6 md:mx-0 md:rounded-xl border border-white/5">
                            <table className="w-full text-left border-collapse min-w-full">
                                <thead>
                                    <tr className="border-b border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider bg-white/5">
                                        <th className="py-4 px-6">Booking ID</th>
                                        <th className="py-4 px-6">Customer</th>
                                        <th className="py-4 px-6">Vehicle</th>
                                        <th className="py-4 px-6">Spot</th>
                                        <th className="py-4 px-6">Time</th>
                                        <th className="py-4 px-6">Status</th>
                                        <th className="py-4 px-6">Amount</th>
                                        <th className="py-4 px-6">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-gray-300 divide-y divide-white/5">
                                    {bookings.map((booking) => (
                                        <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-6 font-mono text-indigo-400">#{booking.id}</td>
                                            <td className="py-4 px-6">
                                                <div>
                                                    <p className="font-medium text-white">{booking.name}</p>
                                                    <p className="text-xs text-gray-500">{booking.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-1 bg-gray-800 rounded text-xs font-mono font-medium text-gray-300 border border-gray-700">
                                                        {booking.vehicle.license_plate}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-bold text-white">{booking.spot_info}</td>
                                            <td className="py-4 px-6">
                                                <div className="text-xs text-gray-400">
                                                    <p>Start: {new Date(booking.start_time).toLocaleString()}</p>
                                                    <p className="text-gray-600">End: {new Date(booking.end_time).toLocaleString()}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                          ${booking.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                        booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                            'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 font-medium text-white">${booking.payment_amount}</td>
                                            <td className="py-4 px-6">
                                                {booking.status === 'active' && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Are you sure you want to close this booking?")) {
                                                                try {
                                                                    const res = await parking.closeBooking(booking.id);
                                                                    const updatedBooking = res.data;
                                                                    if (updatedBooking.excess_fee > 0) {
                                                                        alert(`Booking Closed. Excess Fee Applied: RM ${updatedBooking.excess_fee}`);
                                                                    } else {
                                                                        alert("Booking Closed Successfully.");
                                                                    }
                                                                    fetchData();
                                                                } catch (err: any) {
                                                                    alert(err.response?.data?.detail || "Failed to close booking");
                                                                }
                                                            }
                                                        }}
                                                        className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg transition-colors border border-indigo-500/50 shadow-lg shadow-indigo-500/20"
                                                    >
                                                        Close
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-gray-500">
                                                No bookings found
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
