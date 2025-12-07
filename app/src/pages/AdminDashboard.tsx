import React, { useEffect, useState } from 'react';
import { parking, admin } from '../services/api';
import { Settings, Save, AlertCircle, LayoutGrid, List, Tag, Sliders, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react';

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
    const [activeTab, setActiveTab] = useState<'layout' | 'bookings' | 'promos' | 'settings'>('layout');
    const [loading, setLoading] = useState(false);

    // Data States
    const [layout, setLayout] = useState({ rows: 5, cols: 5 });
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [promos, setPromos] = useState<PromoCode[]>([]);
    const [configs, setConfigs] = useState<ConfigItem[]>([]);

    // Forms
    const [newPromo, setNewPromo] = useState({
        code: '',
        discount_type: 'percentage',
        discount_value: 0,
        expiry_date: '',
        usage_limit: 100
    });
    const [showPromoModal, setShowPromoModal] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [layoutRes, bookingsRes, promosRes, configsRes] = await Promise.all([
                parking.getLayout(),
                parking.getAllBookings(),
                admin.getPromos(),
                admin.getConfig()
            ]);
            setLayout({ rows: layoutRes.data.rows, cols: layoutRes.data.cols });
            setBookings(bookingsRes.data);
            setPromos(promosRes.data);
            setConfigs(configsRes.data);
        } catch (error) {
            console.error("Failed to fetch data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveLayout = async () => {
        try {
            await parking.updateLayout(layout);
            alert("Layout updated!");
            fetchData();
        } catch (error) {
            console.error("Failed to update layout", error);
        }
    };

    const handleSaveConfig = async () => {
        try {
            await admin.updateConfig({ configs });
            alert("Settings updated!");
            fetchData();
        } catch (error) {
            console.error("Failed to update config", error);
        }
    };

    const handleAddPromo = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await admin.createPromo(newPromo);
            setShowPromoModal(false);
            setNewPromo({
                code: '',
                discount_type: 'percentage',
                discount_value: 0,
                expiry_date: '',
                usage_limit: 100
            });
            fetchData();
        } catch (error: any) {
            alert(error.response?.data?.detail || "Failed to create promo");
        }
    };

    const handleTogglePromo = async (id: number) => {
        try {
            await admin.togglePromo(id);
            fetchData();
        } catch (error) {
            console.error("Failed to toggle promo", error);
        }
    };

    const updateConfigValue = (key: string, value: string) => {
        setConfigs(configs.map(c => c.key === key ? { ...c, value } : c));
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
                        </div>
                    )}

                    {activeTab === 'bookings' && (
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
                                            <td className="py-4 px-6">${booking.payment_amount}</td>
                                            <td className="py-4 px-6">
                                                {booking.status === 'active' && (
                                                    <button
                                                        onClick={async () => {
                                                            if (window.confirm("Close booking?")) {
                                                                try {
                                                                    const res = await parking.closeBooking(booking.id);
                                                                    alert(res.data.excess_fee > 0 ? `Closed. Fee: ${res.data.excess_fee}` : "Closed.");
                                                                    fetchData();
                                                                } catch (e) { alert("Error closing"); }
                                                            }
                                                        }}
                                                        className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg"
                                                    >
                                                        Close
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'promos' && (
                        <div>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Active Promo Codes</h3>
                                <button
                                    onClick={() => setShowPromoModal(true)}
                                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
                                >
                                    <Plus size={18} />
                                    Add New
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {promos.map(promo => (
                                    <div key={promo.id} className="p-4 bg-white/5 border border-white/10 rounded-xl relative group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-mono text-lg font-bold text-indigo-400 tracking-wider">
                                                {promo.code}
                                            </div>
                                            <button
                                                onClick={() => handleTogglePromo(promo.id)}
                                                className={`text-2xl transition-colors ${promo.is_active ? 'text-green-400' : 'text-gray-600'}`}
                                            >
                                                {promo.is_active ? <ToggleRight /> : <ToggleLeft />}
                                            </button>
                                        </div>
                                        <div className="text-white font-bold text-2xl mb-1">
                                            {promo.description}
                                        </div>
                                        <div className="text-sm text-gray-400 space-y-1 mt-2">
                                            <p>Expires: {new Date(promo.expiry_date).toLocaleDateString()}</p>
                                            <p>Uses: {promo.current_uses} / {promo.usage_limit}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {showPromoModal && (
                                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                    <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 relative">
                                        <button onClick={() => setShowPromoModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                                            <X size={20} />
                                        </button>
                                        <h3 className="text-xl font-bold text-white mb-6">Create Promo Code</h3>
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
                                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl mt-4">Create Promo</button>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                                    <Sliders size={24} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">System Configuration</h3>
                                    <p className="text-sm text-gray-400">Manage cancellation rules and fees</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {configs.map((config) => (
                                    <div key={config.key} className="bg-white/5 p-4 rounded-xl border border-white/10">
                                        <label className="block text-sm font-medium text-indigo-300 mb-1">{config.key}</label>
                                        <p className="text-xs text-gray-400 mb-3">{config.description}</p>
                                        <input
                                            type="text"
                                            value={config.value}
                                            onChange={(e) => updateConfigValue(config.key, e.target.value)}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleSaveConfig}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                            >
                                <Save size={20} />
                                Save Changes
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
