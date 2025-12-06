import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { parking, vehicles } from '../services/api';
import { Clock, MapPin, Car, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

interface Spot {
    id: number;
    row: number;
    col: number;
    is_booked: boolean;
    booked_by_username?: string;
}

interface Layout {
    rows: number;
    cols: number;
    spots: Spot[];
}

const BookingPage: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [layout, setLayout] = useState<Layout | null>(null);

    // Form State
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [duration, setDuration] = useState(2);
    const [selectedSpot, setSelectedSpot] = useState<{ row: number, col: number } | null>(null);

    const [vehicleData, setVehicleData] = useState({
        license_plate: '',
        name: '',
        phone: '',
        email: '',
        make: '',
        model: '',
        color: '',
    });

    // Fetch layout on mount
    useEffect(() => {
        fetchLayout();
    }, []);

    const fetchLayout = async () => {
        try {
            const response = await parking.getLayout();
            setLayout(response.data);
        } catch (error) {
            console.error("Failed to fetch layout", error);
        }
    };

    const handleLicenseBlur = async () => {
        if (vehicleData.license_plate.length < 3) return;

        try {
            const response = await vehicles.getByLicense(vehicleData.license_plate);
            const vehicle = response.data;
            setVehicleData(prev => ({
                ...prev,
                name: vehicle.owner_name || prev.name,
                phone: vehicle.phone || prev.phone,
                email: vehicle.email || prev.email,
                make: vehicle.make || prev.make,
                model: vehicle.model || prev.model,
                color: vehicle.color || prev.color,
            }));
        } catch (error) {
            // Vehicle not found, that's okay
        }
    };

    const handleSubmit = async () => {
        if (!selectedSpot) return;
        setLoading(true);

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60 * 60 * 1000);

        try {
            await parking.createBooking({
                row: selectedSpot.row,
                col: selectedSpot.col,
                license_plate: vehicleData.license_plate,
                vehicle_data: {
                    license_plate: vehicleData.license_plate,
                    owner_name: vehicleData.name,
                    make: vehicleData.make,
                    model: vehicleData.model,
                    color: vehicleData.color,
                    phone: vehicleData.phone,
                    email: vehicleData.email
                },
                name: vehicleData.name,
                email: vehicleData.email,
                phone: vehicleData.phone,
                start_time: startDateTime.toISOString(),
                end_time: endDateTime.toISOString(),
                payment_method: 'credit_card', // Mock
                payment_amount: duration * 10, // Mock $10/hr
            });
            navigate('/dashboard');
        } catch (error: any) {
            console.error("Booking failed", error);
            alert(error.response?.data?.detail || "Booking failed");
        } finally {
            setLoading(false);
        }
    };

    const renderStepIndicator = () => (
        <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2
            ${step === s ? 'bg-indigo-600 border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' :
                            step > s ? 'bg-green-500 border-green-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-500'}`}>
                        {step > s ? <Check size={18} /> : s}
                    </div>
                    {s < 3 && (
                        <div className={`w-16 h-0.5 mx-2 transition-colors duration-300 ${step > s ? 'bg-green-500' : 'bg-gray-800'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto px-4">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Book a Parking Spot</h1>
                <p className="text-gray-400">Complete the steps to reserve your premium space</p>
            </div>

            {renderStepIndicator()}

            <div className="glass-card rounded-2xl overflow-hidden">
                {/* Step 1: Time Selection */}
                {step === 1 && (
                    <div className="p-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <Clock size={24} />
                            </div>
                            Select Date & Time
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all appearance-none"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 12, 24].map(h => (
                                        <option key={h} value={h} className="bg-gray-900">{h} Hour{h > 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Spot Selection */}
                {step === 2 && (
                    <div className="p-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <MapPin size={24} />
                            </div>
                            Select a Spot
                        </h2>

                        {layout ? (
                            <div className="flex justify-center overflow-x-auto pb-4">
                                <div
                                    className="grid gap-3 p-6 bg-gray-800/30 rounded-2xl border border-gray-700/50"
                                    style={{
                                        gridTemplateColumns: `repeat(${layout.cols}, minmax(50px, 1fr))`
                                    }}
                                >
                                    {Array.from({ length: layout.rows }).map((_, r) => (
                                        Array.from({ length: layout.cols }).map((_, c) => {
                                            const spot = layout.spots.find(s => s.row === r && s.col === c);
                                            const isSelected = selectedSpot?.row === r && selectedSpot?.col === c;
                                            const isBooked = spot?.is_booked;

                                            return (
                                                <button
                                                    key={`${r}-${c}`}
                                                    disabled={isBooked}
                                                    onClick={() => setSelectedSpot({ row: r, col: c })}
                                                    className={`
                            h-14 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 relative overflow-hidden
                            ${isBooked
                                                            ? 'bg-red-900/20 text-red-500/50 cursor-not-allowed border border-red-900/20'
                                                            : isSelected
                                                                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] border border-indigo-400 scale-110 z-10'
                                                                : 'bg-gray-800/50 text-gray-400 border border-gray-700 hover:border-indigo-500/50 hover:text-indigo-300 hover:bg-gray-700/50'
                                                        }
                          `}
                                                >
                                                    {isBooked ? 'X' : `${String.fromCharCode(65 + r)}${c + 1}`}
                                                </button>
                                            );
                                        })
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                <Loader2 className="animate-spin mx-auto mb-2" />
                                Loading layout...
                            </div>
                        )}

                        <div className="flex justify-center gap-6 mt-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-800 border border-gray-600 rounded-full"></div>
                                <span className="text-gray-400">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.8)]"></div>
                                <span className="text-gray-300">Selected</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-red-900/50 border border-red-900 rounded-full"></div>
                                <span className="text-gray-500">Occupied</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Details & Payment */}
                {step === 3 && (
                    <div className="p-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white">
                            <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                <Car size={24} />
                            </div>
                            Vehicle & Payment Details
                        </h2>

                        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">License Plate</label>
                                    <input
                                        type="text"
                                        value={vehicleData.license_plate}
                                        onChange={(e) => setVehicleData({ ...vehicleData, license_plate: e.target.value.toUpperCase() })}
                                        onBlur={handleLicenseBlur}
                                        placeholder="ABC1234"
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all font-mono uppercase"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Owner Name</label>
                                    <input
                                        type="text"
                                        value={vehicleData.name}
                                        onChange={(e) => setVehicleData({ ...vehicleData, name: e.target.value })}
                                        placeholder="Full Name"
                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Phone</label>
                                        <input
                                            type="tel"
                                            value={vehicleData.phone}
                                            onChange={(e) => setVehicleData({ ...vehicleData, phone: e.target.value })}
                                            placeholder="+60 12-345 6789"
                                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider">Email</label>
                                        <input
                                            type="email"
                                            value={vehicleData.email}
                                            onChange={(e) => setVehicleData({ ...vehicleData, email: e.target.value })}
                                            placeholder="email@example.com"
                                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-2xl border border-indigo-500/20">
                                <h3 className="font-bold text-lg text-white mb-4">Booking Summary</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Spot</span>
                                        <span className="font-mono font-bold text-indigo-300">{String.fromCharCode(65 + selectedSpot?.row!)}{selectedSpot?.col! + 1}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Date</span>
                                        <span className="font-medium text-white">{date}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-white/10">
                                        <span className="text-gray-400">Time</span>
                                        <span className="font-medium text-white">{startTime} ({duration} hrs)</span>
                                    </div>
                                    <div className="pt-4 flex justify-between items-center">
                                        <span className="font-bold text-gray-200">Total</span>
                                        <span className="text-2xl font-bold text-indigo-400 text-glow">RM {duration * 10}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="bg-gray-900/50 px-8 py-6 border-t border-white/5 flex justify-between gap-4">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                        <ChevronLeft size={18} />
                        Back
                    </button>

                    {step < 3 ? (
                        <button
                            onClick={() => {
                                if (step === 2 && !selectedSpot) {
                                    alert("Please select a spot");
                                    return;
                                }
                                setStep(s => Math.min(3, s + 1));
                            }}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5"
                        >
                            Next
                            <ChevronRight size={18} />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !vehicleData.license_plate || !vehicleData.name}
                            className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <span>Confirm Booking</span>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingPage;
