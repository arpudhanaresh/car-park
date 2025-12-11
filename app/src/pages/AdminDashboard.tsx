import React, { useEffect, useState } from 'react';
import { parking, admin } from '../services/api';
import { Settings, Save, LayoutGrid, List, Tag, Sliders, Plus, X, PieChart, Mail, Github, Eye } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Booking {
    id: number;
    spot_info: string;
    name: string;
    vehicle: {
        license_plate: string;
        make?: string;
        model?: string;
        color?: string;
    };
    start_time: string;
    end_time: string;
    status: string;
    payment_amount: number;
    email: string;
    phone?: string;
    excess_fee: number;
    cancellation_reason?: string;
    refund_amount?: number;
    refund_status?: string;
}

interface PromoCode {
    id: number;
    code: string;
    discount_type: string;
    discount_value: number;
    expiry_date: string;
    usage_limit: number;
    current_uses: number;
    is_active: boolean;
    description: string;
}

interface ConfigItem {
    key: string;
    value: string;
    description: string;
}

const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'layout' | 'bookings' | 'analytics' | 'promos' | 'settings'>('layout');


    // Data States
    const [layout, setLayout] = useState({ rows: 5, cols: 5 });
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [bookingsPage, setBookingsPage] = useState(1);
    const [bookingsTotal, setBookingsTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [configs, setConfigs] = useState<ConfigItem[]>([]);

    interface AnalyticsData {
        total_revenue: number;
        total_bookings: number;
        active_bookings: number;
        revenue_chart: { name: string; value: number }[];
        occupancy_chart: { name: string; value: number }[];
    }
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

    interface Spot {
        id: number;
        row: number;
        col: number;
        is_booked: boolean;
        is_blocked: boolean;
        label: string;
        spot_type: string;
    }
    const [spots, setSpots] = useState<Spot[]>([]);
    const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
    const [showSpotModal, setShowSpotModal] = useState(false);

    // Forms
    const [newPromo, setNewPromo] = useState<{
        code: string;
        discount_type: string;
        discount_value: number;
        expiry_date: string;
        usage_limit: number;
        is_active: boolean;
    }>({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        expiry_date: '',
        usage_limit: 100,
        is_active: true
    });
    const [showPromoModal, setShowPromoModal] = useState(false);
    const [editingPromoId, setEditingPromoId] = useState<number | null>(null);

    // Dialog State
    const [dialog, setDialog] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'confirm' | 'alert' | 'error';
        onConfirm?: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'alert'
    });

    const showDialog = (title: string, message: string, type: 'confirm' | 'alert' | 'error' = 'alert', onConfirm?: () => void) => {
        setDialog({ isOpen: true, title, message, type, onConfirm });
    };

    const closeDialog = () => {
        setDialog(prev => ({ ...prev, isOpen: false }));
    };

    const handleConfirm = () => {
        if (dialog.onConfirm) {
            dialog.onConfirm();
        }
        closeDialog();
    };

    // Exit / Checkout Logic
    const [exitModal, setExitModal] = useState<{
        isOpen: boolean;
        bookingId: number | null;
        data: any | null;
        loading: boolean;
    }>({ isOpen: false, bookingId: null, data: null, loading: false });


    // View Details Logic
    const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);


    const initiateExit = async (bookingId: number) => {
        setExitModal({ isOpen: true, bookingId, data: null, loading: true });
        try {
            const res = await admin.calculateExitFee(bookingId);
            setExitModal({ isOpen: true, bookingId, data: res.data, loading: false });
        } catch (error: any) {
            console.error("Exit Calculation Failed", error);
            setExitModal({ isOpen: false, bookingId: null, data: null, loading: false });
            showDialog("Error", error.response?.data?.detail || "Failed to calculate exit fees", "error");
        }
    };

    const handleCompleteExit = async (method: 'cash' | 'online') => {
        if (!exitModal.bookingId) return;
        try {
            const res = await admin.completeBooking(exitModal.bookingId, {
                payment_method: method,
                final_amount: exitModal.data?.total_amount || 0
            });
            setExitModal({ isOpen: false, bookingId: null, data: null, loading: false });
            showDialog("Success", `Booking completed! Total Paid: $${res.data.total_amount}`, "alert");
            fetchData();
        } catch (error: any) {
            showDialog("Error", error.response?.data?.detail || "Failed to complete booking", "error");
        }
    };

    const [isSendingReminder, setIsSendingReminder] = useState(false);

    const handleNotifyOverstay = async () => {
        if (!exitModal.bookingId) return;
        setIsSendingReminder(true);
        try {
            const res = await admin.notifyOverstay(exitModal.bookingId);
            showDialog("Success", `Email Sent! Excess Fee: $${res.data.excess_fee}`, "alert");
        } catch (error: any) {
            showDialog("Error", error.response?.data?.detail || "Failed to send notification", "error");
        } finally {
            setIsSendingReminder(false);
        }
    };

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [layoutRes, bookingsRes, promosRes, configsRes, analyticsRes] = await Promise.all([
                parking.getLayout(),
                parking.getAllBookings(bookingsPage, 10),
                admin.getPromos(),
                admin.getConfig(),
                admin.getAnalytics()
            ]);

            setLayout(prev => ({ ...prev, rows: layoutRes.data.rows, cols: layoutRes.data.cols }));
            setSpots(layoutRes.data.spots);
            setBookings(bookingsRes.data.items);
            setBookingsTotal(bookingsRes.data.total);
            setPromos(promosRes.data);
            setConfigs(configsRes.data);
            setAnalytics(analyticsRes.data);
            setAnalytics(analyticsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [bookingsPage]);

    const handleSaveLayout = async () => {
        try {
            await parking.updateLayout(layout);
            showDialog("Success", "Parking layout updated successfully!", "alert");
            fetchData();
        } catch (error) {
            console.error("Failed to update layout", error);
            showDialog("Error", "Failed to update layout", "error");
        }
    };

    const handleUpdateSpot = async () => {
        if (!editingSpot) return;
        try {
            await admin.updateSpot(editingSpot.id, {
                label: editingSpot.label,
                spot_type: editingSpot.spot_type
            });

            // Handle Block Status Change
            const originalSpot = spots.find(s => s.id === editingSpot.id);
            if (originalSpot && originalSpot.is_blocked !== editingSpot.is_blocked) {
                await admin.toggleSpotBlock(editingSpot.id);
            }

            setShowSpotModal(false);
            showDialog("Success", "Spot updated successfully!", "alert");
            fetchData();
        } catch (error) {
            console.error("Failed to update spot", error);
            showDialog("Error", "Failed to update spot", "error");
        }
    };

    const handleSaveConfig = async () => {
        try {
            await admin.updateConfig({ configs });
            showDialog("Success", "System configuration updated!", "alert");
            fetchData();
        } catch (error) {
            console.error("Failed to update config", error);
            showDialog("Error", "Failed to update configuration", "error");
        }
    };

    const handleAddPromo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPromoId) {
                await admin.updatePromo(editingPromoId, newPromo);
                showDialog("Success", "Promo code updated successfully!", "alert");
            } else {
                await admin.createPromo(newPromo);
                showDialog("Success", "Promo code created successfully!", "alert");
            }
            setShowPromoModal(false);
            setEditingPromoId(null);
            setNewPromo({
                code: '',
                discount_type: 'percentage',
                discount_value: 0,
                expiry_date: '',
                usage_limit: 100,
                is_active: true
            });
            fetchData();
        } catch (error: any) {
            showDialog("Error", error.response?.data?.detail || "Failed to save promo", "error");
        }
    };

    const handleDeletePromo = (id: number) => {
        showDialog(
            "Delete Promo Code",
            "Are you sure you want to delete this promo code? This action cannot be undone.",
            "confirm",
            async () => {
                try {
                    await admin.deletePromo(id);
                    showDialog("Success", "Promo code deleted successfully", "alert");
                    fetchData();
                } catch (error) {
                    console.error("Failed to delete promo", error);
                    showDialog("Error", "Failed to delete promo code", "error");
                }
            }
        );
    };




    const updateConfigValue = (key: string, value: string) => {
        const exists = configs.find(c => c.key === key);
        if (exists) {
            setConfigs(configs.map(c => c.key === key ? { ...c, value } : c));
        } else {
            setConfigs([...configs, { key, value, description: 'Added via Dashboard' }]);
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Admin Dashboard</h1>
                    <p className="text-gray-400 mt-1">Manage system settings and bookings</p>
                </div>
            </header>

            <div className="glass-card rounded-2xl overflow-hidden min-h-[600px] flex flex-col">
                <div className="border-b border-white/5 scrollbar-hide overflow-x-auto">
                    <nav className="flex gap-1 p-2 min-w-max">
                        {[
                            { id: 'layout', label: 'Layout', icon: LayoutGrid },
                            { id: 'bookings', label: 'Bookings', icon: List },
                            { id: 'analytics', label: 'Analytics', icon: PieChart },
                            { id: 'promos', label: 'Promo Codes', icon: Tag },
                            { id: 'settings', label: 'Settings', icon: Sliders },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center gap-2 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${activeTab === tab.id
                                    ? 'bg-indigo-600/20 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.15)]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                <div className="p-6 md:p-8 flex-1">
                    {activeTab === 'layout' && (
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

                            <button
                                onClick={handleSaveLayout}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                            >
                                <Save size={20} />
                                Save Configuration
                            </button>

                            <div className="mt-12 pt-8 border-t border-white/5">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Spot Management</h3>
                                        <p className="text-sm text-gray-400">Click a spot to configure custom labels and types</p>
                                    </div>
                                    <div className="flex gap-4 text-xs font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-gray-800 border border-gray-600 rounded-full"></div>
                                            <span className="text-gray-400">Standard</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-green-900/50 border border-green-500/50 rounded-full"></div>
                                            <span className="text-green-400">EV Station</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 bg-yellow-900/50 border border-yellow-500/50 rounded-full"></div>
                                            <span className="text-yellow-400">VIP</span>
                                        </div>
                                    </div>
                                </div>

                                <div
                                    className="grid gap-3 p-4 bg-gray-900/50 rounded-2xl border border-white/5"
                                    style={{
                                        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`
                                    }}
                                >
                                    {spots.map((spot, index) => (
                                        <button
                                            key={spot.id || `virtual-${index}-${spot.row}-${spot.col}`}
                                            onClick={() => {
                                                setEditingSpot(spot);
                                                setShowSpotModal(true);
                                            }}
                                            className={`
                                                aspect-square rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all duration-200
                                                border relative group hover:scale-105 overflow-hidden
                                                ${spot.is_blocked
                                                    ? 'bg-red-900/10 border-red-500/30 text-red-500 cursor-not-allowed opacity-75 stripe-pattern'
                                                    : spot.spot_type === 'ev'
                                                        ? 'bg-green-900/20 border-green-500/30 text-green-400 hover:bg-green-900/40 hover:border-green-500/50'
                                                        : spot.spot_type === 'vip'
                                                            ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-400 hover:bg-yellow-900/40 hover:border-yellow-500/50'
                                                            : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500 hover:text-white'
                                                }
                                            `}
                                        >
                                            {spot.is_blocked && (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                                    <div className="w-full h-0.5 bg-red-500 rotate-45 transform scale-150" />
                                                    <div className="w-full h-0.5 bg-red-500 -rotate-45 transform scale-150 absolute" />
                                                </div>
                                            )}
                                            {spot.spot_type === 'ev' && (
                                                <span className="absolute top-1 right-1 text-[8px] opacity-70">⚡</span>
                                            )}
                                            {spot.spot_type === 'vip' && (
                                                <span className="absolute top-1 right-1 text-[8px] opacity-70">👑</span>
                                            )}
                                            <span className="text-sm">{spot.label || `${spot.row}-${spot.col}`}</span>
                                            <span className="text-[10px] font-normal opacity-50 uppercase mt-0.5">{spot.spot_type}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'bookings' && (
                        <>
                            {isLoading ? (
                                <div className="text-center py-20">
                                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                                    <p className="text-gray-400">Loading bookings...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto -mx-6 md:mx-0 md:rounded-xl border border-white/5">
                                        <table className="w-full text-left border-collapse min-w-full">
                                            <thead>
                                                <tr className="border-b border-white/10 text-xs font-medium text-gray-400 uppercase tracking-wider bg-white/5">
                                                    <th className="py-4 px-6">ID</th>
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
                                                        <td className="py-4 px-6 font-mono">{booking.vehicle.license_plate}</td>
                                                        <td className="py-4 px-6 font-bold text-white">{booking.spot_info}</td>
                                                        <td className="py-4 px-6 text-xs text-gray-400">
                                                            <p>Start: {new Date(booking.start_time).toLocaleString()}</p>
                                                            <p>End: {new Date(booking.end_time).toLocaleString()}</p>
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider
                                                        ${booking.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                                    booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                                        booking.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                            'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                                                                {booking.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 px-6" title={`Initial: $${booking.payment_amount}\nExcess: $${booking.excess_fee || 0}`}>
                                                            ${(booking.payment_amount + (booking.excess_fee || 0)).toFixed(2)}
                                                        </td>
                                                        <td className="py-4 px-6">
                                                            <div className="flex items-center gap-2">
                                                                {/* View Details Button */}
                                                                <button
                                                                    onClick={() => setViewingBooking(booking)}
                                                                    className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                                    title="View Details"
                                                                >
                                                                    <Eye size={16} />
                                                                </button>

                                                                {booking.status === 'active' && (
                                                                    <button
                                                                        onClick={() => initiateExit(booking.id)}
                                                                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                                                                    >
                                                                        Exit
                                                                    </button>
                                                                )}
                                                                {booking.status === 'cancelled' && booking.refund_status === 'pending' && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            try {
                                                                                await admin.processRefund(booking.id);
                                                                                showDialog("Success", "Refund marked as processed!", "alert");
                                                                                fetchData();
                                                                            } catch (err: any) {
                                                                                showDialog("Error", err.response?.data?.detail || "Failed to process refund", "error");
                                                                            }
                                                                        }}
                                                                        className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-3 py-1.5 rounded-lg font-bold shadow-lg shadow-amber-500/10 transition-all hover:scale-105"
                                                                    >
                                                                        Refund
                                                                    </button>
                                                                )}
                                                                {booking.status === 'cancelled' && booking.refund_status === 'refunded' && (
                                                                    <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                                                        Refunded
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* View Booking Modal */}
                                    {viewingBooking && (
                                        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                            <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto">
                                                <button onClick={() => setViewingBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                                    <X size={20} />
                                                </button>

                                                <h3 className="text-xl font-bold text-white mb-1">Booking Details</h3>
                                                <p className="text-sm text-gray-400 mb-6 font-mono text-indigo-400">#{viewingBooking.id}</p>

                                                <div className="space-y-6">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Customer</h4>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <p className="text-xs text-gray-400">Name</p>
                                                                    <p className="font-medium text-white">{viewingBooking.name}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400">Email</p>
                                                                    <p className="font-medium text-white break-all">{viewingBooking.email}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400">Phone</p>
                                                                    <p className="font-medium text-white">{viewingBooking.phone || 'N/A'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Vehicle</h4>
                                                            <div className="space-y-2">
                                                                <div>
                                                                    <p className="text-xs text-gray-400">License Plate</p>
                                                                    <p className="font-mono font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded inline-block">
                                                                        {viewingBooking.vehicle.license_plate}
                                                                    </p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-gray-400">Details</p>
                                                                    <p className="font-medium text-white">
                                                                        {[viewingBooking.vehicle.color, viewingBooking.vehicle.make, viewingBooking.vehicle.model].filter(Boolean).join(' ') || 'Standard Vehicle'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Session</h4>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <p className="text-xs text-gray-400">Start Time</p>
                                                                <p className="font-medium text-white text-sm">{new Date(viewingBooking.start_time).toLocaleString()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-400">End Time</p>
                                                                <p className="font-medium text-white text-sm">{new Date(viewingBooking.end_time).toLocaleString()}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-400">Spot</p>
                                                                <p className="font-bold text-white">{viewingBooking.spot_info}</p>
                                                            </div>
                                                            <div>
                                                                <p className="text-xs text-gray-400">Status</p>
                                                                <div className="mt-1">
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider
                                                                        ${viewingBooking.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                                                                            viewingBooking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                                                viewingBooking.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                                                                    'bg-gray-700 text-gray-400 border border-gray-600'}`}>
                                                                        {viewingBooking.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="bg-indigo-500/10 p-4 rounded-xl border border-indigo-500/20">
                                                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Financial Overview</h4>
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                                                                <span className="text-gray-400 text-sm">Initial Payment</span>
                                                                <span className="font-mono text-white">${viewingBooking.payment_amount.toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg">
                                                                <span className="text-gray-400 text-sm">Overstay / Excess Fee</span>
                                                                <span className="font-mono text-orange-400">+${(viewingBooking.excess_fee || 0).toFixed(2)}</span>
                                                            </div>
                                                            <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                                                                <span className="text-white font-bold">Total Processed</span>
                                                                <span className="font-mono text-xl font-bold text-green-400">
                                                                    ${(viewingBooking.payment_amount + (viewingBooking.excess_fee || 0)).toFixed(2)}
                                                                </span>
                                                            </div>
                                                            {viewingBooking.status === 'cancelled' && (
                                                                <div className="mt-3 pt-3 border-t border-dashed border-white/10 text-xs">
                                                                    <div className="flex justify-between text-red-300">
                                                                        <span>Refund Amount:</span>
                                                                        <span>${(viewingBooking.refund_amount || 0).toFixed(2)}</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-gray-500 mt-1">
                                                                        <span>Status:</span>
                                                                        <span className="uppercase">{viewingBooking.refund_status}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex justify-between items-center mt-4 px-2">
                                        <div className="text-sm text-gray-400">
                                            Showing {bookings.length} of {bookingsTotal} bookings
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={bookingsPage === 1 || isLoading}
                                                onClick={() => setBookingsPage(p => Math.max(1, p - 1))}
                                                className="px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                disabled={bookingsPage * 10 >= bookingsTotal || isLoading}
                                                onClick={() => setBookingsPage(p => p + 1)}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-500 transition"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}


                        </>
                    )}

                    {activeTab === 'analytics' && analytics && (
                        <div className="space-y-8">
                            {/* KPI Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6 rounded-2xl border border-indigo-500/20">
                                    <h3 className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-1">Total Revenue</h3>
                                    <div className="text-3xl font-bold text-white">${analytics.total_revenue.toFixed(2)}</div>
                                </div>
                                <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 p-6 rounded-2xl border border-emerald-500/20">
                                    <h3 className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-1">Total Bookings</h3>
                                    <div className="text-3xl font-bold text-white">{analytics.total_bookings}</div>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-6 rounded-2xl border border-blue-500/20">
                                    <h3 className="text-gray-400 text-sm uppercase tracking-wider font-medium mb-1">Active Now</h3>
                                    <div className="text-3xl font-bold text-white">{analytics.active_bookings}</div>
                                </div>
                            </div>

                            {/* Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-gray-800/30 p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-6">Revenue (Last 7 Days)</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={analytics.revenue_chart}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                                                <Tooltip contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }} />
                                                <Line type="monotone" dataKey="value" stroke="#818cf8" strokeWidth={3} dot={{ r: 4, fill: '#818cf8' }} activeDot={{ r: 8 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                                <div className="bg-gray-800/30 p-6 rounded-2xl border border-white/5">
                                    <h3 className="text-lg font-bold text-white mb-6">Peak Hours</h3>
                                    <div className="h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.occupancy_chart}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} axisLine={false} />
                                                <Tooltip cursor={{ fill: '#374151' }} contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff', borderRadius: '0.5rem' }} />
                                                <Bar dataKey="value" fill="#34d399" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'promos' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Active Promo Codes</h3>
                                <button
                                    onClick={() => {
                                        setNewPromo({
                                            code: '',
                                            discount_type: 'percentage',
                                            discount_value: 0,
                                            expiry_date: '',
                                            usage_limit: 100,
                                            is_active: true
                                        });
                                        setEditingPromoId(null);
                                        setShowPromoModal(true);
                                    }}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                >
                                    <Plus size={18} />
                                    Add New
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {promos.map(promo => (
                                    <button
                                        key={promo.id}
                                        onClick={() => {
                                            setNewPromo({
                                                code: promo.code,
                                                discount_type: promo.discount_type,
                                                discount_value: promo.discount_value,
                                                expiry_date: promo.expiry_date ? promo.expiry_date.split('T')[0] : '',
                                                usage_limit: promo.usage_limit,
                                                is_active: promo.is_active
                                            });
                                            setEditingPromoId(promo.id);
                                            setShowPromoModal(true);
                                        }}
                                        className="p-4 bg-white/5 border border-white/10 rounded-xl relative group hover:bg-white/10 transition-all text-left w-full"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-lg font-bold text-indigo-400 tracking-wider">
                                                {promo.code}
                                            </div>
                                            <div className={`text-xs px-2 py-1 rounded-full border ${promo.is_active ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                {promo.is_active ? 'ACTIVE' : 'INACTIVE'}
                                            </div>
                                        </div>
                                        <div className="text-white font-bold text-2xl mb-1">
                                            {promo.description}
                                        </div>
                                        <div className="text-sm text-gray-400 space-y-1 mt-2">
                                            <p>Expires: {new Date(promo.expiry_date).toLocaleDateString()}</p>
                                            <p>Uses: {promo.current_uses} / {promo.usage_limit}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {showPromoModal && (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                                        <button onClick={() => setShowPromoModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                            <X size={20} />
                                        </button>
                                        <h3 className="text-xl font-bold text-white mb-6">
                                            {editingPromoId ? "Edit Promo Code" : "Create Promo Code"}
                                        </h3>
                                        <form onSubmit={handleAddPromo} className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Code</label>
                                                <input required type="text" value={newPromo.code} onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" placeholder="SUMMER2025" />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Type</label>
                                                    <select value={newPromo.discount_type} onChange={e => setNewPromo({ ...newPromo, discount_type: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white">
                                                        <option value="percentage">Percentage</option>
                                                        <option value="fixed">Fixed Amount</option>
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Value</label>
                                                    <input required type="number" value={newPromo.discount_value} onChange={e => setNewPromo({ ...newPromo, discount_value: parseFloat(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Expiry</label>
                                                    <input required type="date" value={newPromo.expiry_date} onChange={e => setNewPromo({ ...newPromo, expiry_date: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-400 uppercase mb-1">Limit</label>
                                                    <input required type="number" value={newPromo.usage_limit} onChange={e => setNewPromo({ ...newPromo, usage_limit: parseInt(e.target.value) })} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg border border-gray-700">
                                                <span className="text-sm text-gray-300 font-medium">Status</span>
                                                <button
                                                    type="button"
                                                    onClick={() => setNewPromo({ ...newPromo, is_active: !newPromo.is_active })}
                                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${newPromo.is_active ? 'bg-green-500' : 'bg-gray-600'}`}
                                                >
                                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newPromo.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                                </button>
                                            </div>

                                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl mt-4">
                                                {editingPromoId ? "Update Promo" : "Create Promo"}
                                            </button>

                                            {editingPromoId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleDeletePromo(editingPromoId);
                                                        setShowPromoModal(false);
                                                    }}
                                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-3 rounded-xl border border-red-500/20 transition-colors"
                                                >
                                                    Delete Promo Code
                                                </button>
                                            )}
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                                    <Github className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">System Configuration</h3>
                                    <p className="text-sm text-gray-400">Manage rates, cancellation rules, and notifications</p>
                                </div>
                            </div>

                            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
                                <h2 className="text-lg font-semibold mb-6 flex items-center gap-2 text-white">
                                    <Settings className="w-5 h-5 text-purple-400" />
                                    General Settings
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Hourly Rate (MYR)</label>
                                            <input
                                                type="number"
                                                value={configs.find(c => c.key === 'hourly_rate')?.value || ''}
                                                onChange={(e) => updateConfigValue('hourly_rate', e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Cancellation Rule 1 (Hours)</label>
                                            <input
                                                type="number"
                                                value={configs.find(c => c.key === 'cancellation_rule_1_hours')?.value || ''}
                                                onChange={(e) => updateConfigValue('cancellation_rule_1_hours', e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                                title="Hours before start for full refund"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Admin Notification Emails (Comma-separated)</label>
                                            <input
                                                type="text"
                                                placeholder="admin1@example.com, admin2@example.com"
                                                value={configs.find(c => c.key === 'admin_notification_emails')?.value || ''}
                                                onChange={(e) => updateConfigValue('admin_notification_emails', e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Receive alerts for cancellations and refunds.</p>
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-2">Cancellation Rule 2 (Refund %)</label>
                                            <input
                                                type="number"
                                                value={configs.find(c => c.key === 'cancellation_rule_2_percent')?.value || ''}
                                                onChange={(e) => updateConfigValue('cancellation_rule_2_percent', e.target.value)}
                                                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSaveConfig}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                                >
                                    <Save size={20} />
                                    Save System Configuration
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Spot Edit Modal */}
            {
                showSpotModal && editingSpot && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-xl">
                            <button
                                onClick={() => setShowSpotModal(false)}
                                className="absolute right-4 top-4 text-gray-400 hover:text-white"
                            >
                                <X size={20} />
                            </button>

                            <h2 className="text-xl font-bold text-white mb-6">Edit Spot {editingSpot.label || `#${editingSpot.id}`}</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Label</label>
                                    <input
                                        type="text"
                                        value={editingSpot.label}
                                        onChange={(e) => setEditingSpot({ ...editingSpot, label: e.target.value })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. A1, EV-1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Spot Type</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['standard', 'ev', 'vip'].map(type => (
                                            <button
                                                key={type}
                                                onClick={() => setEditingSpot({ ...editingSpot, spot_type: type })}
                                                className={`py-2 px-3 rounded-lg text-sm font-medium capitalize transition-all ${editingSpot.spot_type === type
                                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'
                                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                    }`}
                                            >
                                                {type}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-white/10">
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Maintenance Status</label>
                                    <select
                                        value={editingSpot.is_blocked ? 'blocked' : 'available'}
                                        onChange={(e) => setEditingSpot({ ...editingSpot, is_blocked: e.target.value === 'blocked' })}
                                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    >
                                        <option value="available">Available (Active)</option>
                                        <option value="blocked">Under Maintenance (Blocked)</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleUpdateSpot}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl mt-4"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Exit / Checkout Modal */}
            {
                exitModal.isOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                            <button onClick={() => setExitModal(prev => ({ ...prev, isOpen: false }))} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                <X size={20} />
                            </button>
                            <h3 className="text-xl font-bold text-white mb-6">Booking Exit & Checkout</h3>

                            {exitModal.loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                </div>
                            ) : exitModal.data ? (
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-gray-400 uppercase mb-1">Overstay</p>
                                            <p className="text-xl font-bold text-white">{exitModal.data.overstay_duration} hrs</p>
                                        </div>
                                        <div className="bg-gray-800/50 p-4 rounded-xl border border-white/5">
                                            <p className="text-xs text-gray-400 uppercase mb-1">Fee @ ${exitModal.data.hourly_rate_applied}/hr</p>
                                            <p className="text-xl font-bold text-red-400">+${exitModal.data.overstay_fee}</p>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-900/20 p-5 rounded-xl border border-indigo-500/30">
                                        <div className="flex justify-between items-center">
                                            <p className="text-indigo-300 font-medium">Total Amount Due</p>
                                            <p className="text-3xl font-bold text-white">${exitModal.data.total_amount}</p>
                                        </div>
                                        <p className="text-xs text-indigo-400/60 mt-2 text-center">Includes base fee + excess charges. No refunds for early exit.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-3">
                                        <button
                                            onClick={handleNotifyOverstay}
                                            disabled={isSendingReminder}
                                            className="w-full py-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 font-bold border border-amber-500/20 flex items-center justify-center gap-2 mb-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isSendingReminder ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-amber-500 border-t-transparent"></div>
                                                    Sending...
                                                </>
                                            ) : (
                                                <>
                                                    <Mail size={20} />
                                                    Send Payment Reminder
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => handleCompleteExit('cash')}
                                            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform flex items-center justify-center gap-2"
                                        >
                                            <span className="text-lg">💵</span> Cash Received & Complete
                                        </button>
                                        <button
                                            disabled
                                            onClick={() => handleCompleteExit('online')}
                                            className="w-full py-3 rounded-xl bg-gray-800 text-gray-400 font-medium border border-gray-700 cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
                                        >
                                            <span>💳</span> Online Payment (Coming Soon)
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-red-400 text-center">Failed to load checkout data.</p>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Custom Dialog */}
            {
                dialog.isOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                        <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm p-6 relative shadow-xl transform transition-all scale-100">
                            <h3 className={`text-xl font-bold mb-2 ${dialog.type === 'error' ? 'text-red-500' : 'text-white'}`}>
                                {dialog.title}
                            </h3>
                            <p className="text-gray-300 mb-6">
                                {dialog.message}
                            </p>
                            <div className="flex justify-end gap-3">
                                {dialog.type === 'confirm' && (
                                    <button
                                        onClick={closeDialog}
                                        className="px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    className={`px-6 py-2 rounded-lg font-bold text-white transition-colors ${dialog.type === 'error' ? 'bg-red-600 hover:bg-red-500' :
                                        dialog.type === 'confirm' ? 'bg-indigo-600 hover:bg-indigo-500' :
                                            'bg-indigo-600 hover:bg-indigo-500'
                                        }`}
                                >
                                    {dialog.type === 'confirm' ? 'Confirm' : 'OK'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >

    );
};

export default AdminDashboard;
