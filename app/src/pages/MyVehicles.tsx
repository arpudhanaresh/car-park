import React, { useEffect, useState } from 'react';
import { vehicles } from '../services/api';
import { Car, Plus, Edit2, X, Trash2 } from 'lucide-react';

interface Vehicle {
    id: number;
    license_plate: string;
    owner_name: string;
    make?: string;
    model?: string;
    color?: string;
    year?: number;
    phone?: string;
    email?: string;
}

const MyVehicles: React.FC = () => {
    const [myVehicles, setMyVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        license_plate: '',
        owner_name: '',
        make: '',
        model: '',
        color: '',
        year: new Date().getFullYear(),
        phone: '',
        email: ''
    });
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const response = await vehicles.getMyVehicles();
            setMyVehicles(response.data);
        } catch (error) {
            console.error("Failed to fetch vehicles", error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (vehicle?: Vehicle) => {
        if (vehicle) {
            setEditingVehicle(vehicle);
            setFormData(vehicle);
        } else {
            setEditingVehicle(null);
            setFormData({
                license_plate: '',
                owner_name: '',
                make: '',
                model: '',
                color: '',
                year: new Date().getFullYear(),
                phone: '',
                email: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await vehicles.createOrUpdate(formData);
            fetchVehicles();
            setIsModalOpen(false);
        } catch (error) {
            console.error("Failed to save vehicle", error);
            alert("Failed to save vehicle. Please check the details.");
        }
    };

    return (
        <div className="space-y-8">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">My Vehicles</h1>
                    <p className="text-gray-400 mt-1">Manage your registered vehicles for quick booking</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] hover:-translate-y-0.5"
                >
                    <Plus size={20} />
                    Add Vehicle
                </button>
            </header>

            {loading ? (
                <div className="text-center py-20">
                    <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-400">Loading your vehicles...</p>
                </div>
            ) : myVehicles.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {myVehicles.map((vehicle) => (
                        <div key={vehicle.id} className="glass-card rounded-2xl p-6 hover:bg-gray-800/50 transition-all duration-300 group relative">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
                                    <Car size={24} />
                                </div>
                                <button
                                    onClick={() => handleOpenModal(vehicle)}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                    title="Edit Vehicle"
                                >
                                    <Edit2 size={16} />
                                </button>
                                <button
                                    onClick={async () => {
                                        if (window.confirm('Are you sure you want to remove this vehicle?')) {
                                            try {
                                                await vehicles.delete(vehicle.id);
                                                fetchVehicles();
                                            } catch (error) {
                                                console.error("Failed to delete vehicle", error);
                                                alert("Failed to delete vehicle.");
                                            }
                                        }
                                    }}
                                    className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Remove Vehicle"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>

                            <div className="space-y-2 mb-4">
                                <h3 className="text-xl font-bold text-white font-mono">{vehicle.license_plate}</h3>
                                <p className="text-gray-400">{vehicle.make} {vehicle.model}</p>
                            </div>

                            <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wider">Color</span>
                                    <span className="text-gray-300">{vehicle.color || '-'}</span>
                                </div>
                                <div>
                                    <span className="block text-gray-500 text-xs uppercase tracking-wider">Year</span>
                                    <span className="text-gray-300">{vehicle.year || '-'}</span>
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
                    <h3 className="text-xl font-bold text-white mb-2">No vehicles found</h3>
                    <p className="text-gray-400 mb-8 max-w-md mx-auto">Add your vehicles to speed up the booking process.</p>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                    >
                        Add Your First Vehicle
                    </button>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card w-full max-w-lg rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white">
                                {editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">License Plate</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.license_plate}
                                    onChange={(e) => setFormData({ ...formData, license_plate: e.target.value.toUpperCase() })}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all font-mono uppercase"
                                    placeholder="ABC1234"
                                />
                            </div>

                            <div className="pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                                >
                                    {showDetails ? 'Hide' : 'Add'} Optional Details
                                </button>
                            </div>

                            {showDetails && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Make</label>
                                            <input
                                                type="text"
                                                value={formData.make}
                                                onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                                placeholder="Toyota"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Model</label>
                                            <input
                                                type="text"
                                                value={formData.model}
                                                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                                placeholder="Camry"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Color</label>
                                            <input
                                                type="text"
                                                value={formData.color}
                                                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                                placeholder="Silver"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Year</label>
                                            <input
                                                type="number"
                                                value={formData.year}
                                                onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                                                className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-6 py-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2 rounded-xl font-bold transition-all shadow-lg shadow-indigo-500/20"
                                >
                                    Save Vehicle
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyVehicles;
