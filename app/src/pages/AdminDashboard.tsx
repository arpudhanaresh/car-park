import React, { useEffect, useState } from 'react';
import { parking } from '../services/api';
import { Settings, Save, Users, Calendar, AlertCircle } from 'lucide-react';

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
}

const AdminDashboard: React.FC = () => {
    const [layout, setLayout] = useState({ rows: 5, cols: 5 });
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
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
        } finally {
            setLoading(false);
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
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
                    <p className="text-gray-500">Manage parking layout and view system status</p>
                </div>
            </header>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b border-gray-100">
                    <nav className="flex gap-4 px-6">
                        <button
                            onClick={() => setActiveTab('layout')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'layout'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Layout Configuration
                        </button>
                        <button
                            onClick={() => setActiveTab('bookings')}
                            className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${activeTab === 'bookings'
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            All Bookings
                        </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'layout' ? (
                        <div className="max-w-xl">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                                    <Settings size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900">Parking Grid Dimensions</h3>
                                    <p className="text-sm text-gray-500">Set the number of rows and columns</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mb-8">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Rows</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={layout.rows}
                                        onChange={(e) => setLayout({ ...layout, rows: parseInt(e.target.value) || 0 })}
                                        className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Columns</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={layout.cols}
                                        onChange={(e) => setLayout({ ...layout, cols: parseInt(e.target.value) || 0 })}
                                        className="block w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-8 flex gap-3">
                                <AlertCircle className="text-yellow-600 shrink-0" size={20} />
                                <p className="text-sm text-yellow-700">
                                    Reducing dimensions will permanently delete any parking spots (and associated active bookings) that fall outside the new grid.
                                </p>
                            </div>

                            <button
                                onClick={handleSaveLayout}
                                disabled={saving}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-70"
                            >
                                <Save size={20} />
                                {saving ? 'Saving...' : 'Save Configuration'}
                            </button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-gray-100 text-sm text-gray-500">
                                        <th className="py-4 px-4 font-medium">Booking ID</th>
                                        <th className="py-4 px-4 font-medium">Customer</th>
                                        <th className="py-4 px-4 font-medium">Vehicle</th>
                                        <th className="py-4 px-4 font-medium">Spot</th>
                                        <th className="py-4 px-4 font-medium">Time</th>
                                        <th className="py-4 px-4 font-medium">Status</th>
                                        <th className="py-4 px-4 font-medium">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm text-gray-900">
                                    {bookings.map((booking) => (
                                        <tr key={booking.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-4 font-medium">#{booking.id}</td>
                                            <td className="py-4 px-4">
                                                <div>
                                                    <p className="font-medium">{booking.name}</p>
                                                    <p className="text-xs text-gray-500">{booking.email}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="px-2 py-1 bg-gray-100 rounded text-xs font-mono font-medium">
                                                        {booking.vehicle.license_plate}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">{booking.spot_info}</td>
                                            <td className="py-4 px-4">
                                                <div className="text-xs">
                                                    <p>Start: {new Date(booking.start_time).toLocaleString()}</p>
                                                    <p className="text-gray-500">End: {new Date(booking.end_time).toLocaleString()}</p>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                          ${booking.status === 'active' ? 'bg-green-100 text-green-800' :
                                                        booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-gray-100 text-gray-800'}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 font-medium">${booking.payment_amount}</td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-8 text-center text-gray-500">
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
