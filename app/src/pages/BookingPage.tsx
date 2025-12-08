import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { parking, vehicles } from '../services/api';
import { Clock, MapPin, Car, Check, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';

interface Spot {
    id: number;
    row: number;
    col: number;
    is_booked: boolean;
    label: string;
    spot_type: string;
    booked_by_username?: string;
}

interface Layout {
    rows: number;
    cols: number;
    spots: Spot[];
}

const BookingPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [layout, setLayout] = useState<Layout | null>(null);

    // Form State
    // Use local date for default value to avoid timezone issues (e.g. showing yesterday)
    const [date, setDate] = useState(() => {
        const d = new Date();
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().split('T')[0];
    });
    const [startTime, setStartTime] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 30); // Default to next 30 min slot approx
        return d.toTimeString().slice(0, 5);
    });

    // Default end time = start + 1 hour
    const [endDate, setEndDate] = useState(date);
    const [endTime, setEndTime] = useState(() => {
        const d = new Date();
        d.setMinutes(d.getMinutes() + 30 + 60); // Start (30 min from now) + 1 hour
        return d.toTimeString().slice(0, 5);
    });

    // Auto-update end time when start time changes if not manually set (simple logic: force 1 hour duration if end <= start)
    useEffect(() => {
        if (!startTime || !endTime) return;

        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);

        // If start time is pushed after end time, or if we want to enforce default 1h behavior on start change
        // Let's just say: if end <= start, bump end to start + 1h
        if (end <= start) {
            const newEnd = new Date(start.getTime() + 60 * 60 * 1000);

            // Handle date rollover
            const offset = newEnd.getTimezoneOffset() * 60000;
            const localISODate = new Date(newEnd.getTime() - offset).toISOString().split('T')[0];
            const localISOTime = newEnd.toTimeString().slice(0, 5);

            setEndDate(localISODate);
            setEndTime(localISOTime);
        }
    }, [startTime, date]);

    const [selectedSpot, setSelectedSpot] = useState<Spot | null>(null);

    const [vehicleData, setVehicleData] = useState({
        license_plate: '',
        name: user?.full_name || '',
        phone: user?.phone || '',
        email: user?.email || '',
        make: '',
        model: '',
        color: '',
    });

    const [myVehicles, setMyVehicles] = useState<any[]>([]);

    // Fetch layout and vehicles on mount
    useEffect(() => {
        // fetchLayout(); // Don't fetch layout immediately, wait for time selection
        fetchMyVehicles();
    }, []);

    // Fetch layout when entering step 2 with selected times
    useEffect(() => {
        if (step === 2) {
            const start = new Date(`${date}T${startTime}`);
            const end = new Date(`${endDate}T${endTime}`);

            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                fetchLayout(start.toISOString(), end.toISOString());
            }
        }
    }, [step, date, startTime, endDate, endTime]);

    // Update vehicle form defaults when user data loads
    useEffect(() => {
        if (user) {
            setVehicleData(prev => ({
                ...prev,
                name: prev.name || user.full_name || '',
                phone: prev.phone || user.phone || '',
                email: prev.email || user.email || '',
            }));
        }
    }, [user]);

    const fetchLayout = async (start?: string, end?: string) => {
        try {
            const response = await parking.getLayout(start, end);
            setLayout(response.data);
        } catch (error) {
            console.error("Failed to fetch layout", error);
        }
    };

    const fetchMyVehicles = async () => {
        try {
            const response = await vehicles.getMyVehicles();
            setMyVehicles(response.data);
        } catch (error) {
            console.error("Failed to fetch vehicles", error);
        }
    };

    const handleVehicleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const plate = e.target.value;
        if (!plate) return;

        const vehicle = myVehicles.find(v => v.license_plate === plate);
        if (vehicle) {
            setVehicleData(prev => ({
                ...prev,
                license_plate: vehicle.license_plate,
                // Do not overwrite contact info (name, phone, email) with vehicle owner info
                // This resolves issue where name becomes empty if vehicle.owner_name is missing
                // and keeps the booking under the logged-in user's name.
                make: vehicle.make || prev.make,
                model: vehicle.model || prev.model,
                color: vehicle.color || prev.color,
            }));
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

    const [baseRate, setBaseRate] = useState(10); // Default fallback

    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const response = await parking.getPublicConfig();
                if (response.data.hourly_rate) {
                    setBaseRate(Number(response.data.hourly_rate));
                }
            } catch (error) {
                console.error("Failed to fetch public config", error);
            }
        };
        fetchConfig();
    }, []);

    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number; type: string } | null>(null);
    const [promoError, setPromoError] = useState('');
    const [promoLoading, setPromoLoading] = useState(false);

    const handleApplyPromo = async () => {
        if (!promoCode) return;
        setPromoLoading(true);
        setPromoError('');
        try {
            const response = await parking.checkPromo(promoCode);
            setAppliedPromo({
                code: response.data.code,
                discount: response.data.discount_value,
                type: response.data.discount_type
            });
        } catch (error: any) {
            setPromoError(error.response?.data?.detail || 'Invalid promo code');
            setAppliedPromo(null);
        } finally {
            setPromoLoading(false);
        }
    };

    const getDurationHours = () => {
        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${endDate}T${endTime}`);
        const diffMs = end.getTime() - start.getTime();
        const diffHrs = diffMs / (1000 * 60 * 60);
        return diffHrs > 0 ? diffHrs : 0;
    };

    const calculateTotal = () => {
        const duration = Math.ceil(getDurationHours()); // Charge per hour started

        let multiplier = 1.0;
        if (selectedSpot?.spot_type === 'ev') multiplier = 1.5;
        if (selectedSpot?.spot_type === 'vip') multiplier = 2.0;

        const subtotal = duration * baseRate * multiplier; // Dynamic base rate with multiplier

        let discount = 0;
        if (appliedPromo) {
            if (appliedPromo.type === 'percentage') {
                discount = (subtotal * appliedPromo.discount) / 100;
            } else {
                discount = appliedPromo.discount;
            }
            // Cap discount
            discount = Math.min(discount, subtotal);
        }
        return { subtotal, discount, total: Math.max(0, subtotal - discount), duration, multiplier };
    };

    const totals = calculateTotal();

    const handleSubmit = async () => {
        if (!selectedSpot) return;
        setLoading(true);

        const localStartDateTime = new Date(`${date}T${startTime}`);
        const localEndDateTime = new Date(`${endDate}T${endTime}`);

        try {
            const response = await parking.createBooking({
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
                start_time: localStartDateTime.toISOString(),
                end_time: localEndDateTime.toISOString(),
                payment_method: 'credit_card',
                payment_amount: totals.subtotal,
                promo_code: appliedPromo?.code
            });

            // Initiate RinggitPay Payment
            const bookingId = response.data.id;
            const paymentResponse = await parking.initiatePayment(bookingId);
            const { action, fields } = paymentResponse.data;

            // Create and submit hidden form
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

        } catch (error: any) {
            console.error("Booking failed", error);
            alert(error.response?.data?.detail || "Booking failed");
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

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                            {/* Start */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Start</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-400">Date</label>
                                        <input
                                            type="date"
                                            value={date}
                                            min={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => {
                                                setDate(e.target.value);
                                                // Auto update end date if start > end logic needed, keeping simple for now
                                                if (e.target.value > endDate) setEndDate(e.target.value);
                                            }}
                                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-400">Time</label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* End */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">End</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-400">Date</label>
                                        <input
                                            type="date"
                                            value={endDate}
                                            min={date} // Cannot end before start date
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-xs font-medium text-gray-400">Time</label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Validation Feedback */}
                        {(() => {
                            const start = new Date(`${date}T${startTime}`);
                            const end = new Date(`${endDate}T${endTime}`);
                            const now = new Date();
                            // Create tolerance for "now" (e.g. 1 min buffer)
                            const nowBuffer = new Date(now.getTime() - 60000);

                            if (start < nowBuffer) {
                                return <div className="p-3 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-sm text-center">Start time cannot be in the past.</div>;
                            }
                            if (end <= start) {
                                return <div className="p-3 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-sm text-center">End time must be after start time.</div>;
                            }
                            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                            return <div className="p-3 bg-green-900/20 text-green-400 border border-green-900/30 rounded-lg text-sm text-center">Duration: {hours.toFixed(1)} Hours ({Math.ceil(hours)} chargeable)</div>;
                        })()}
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
                            <div className="flex justify-center overflow-auto pb-4 max-h-[60vh]">
                                <div
                                    className="grid gap-3 p-6 bg-gray-800/30 rounded-2xl border border-gray-700/50 min-w-max"
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
                                                    onClick={() => setSelectedSpot(spot || { row: r, col: c, id: 0, is_booked: false, label: '', spot_type: 'standard' })}
                                                    className={`
                            h-14 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 relative overflow-hidden ring-1 ring-inset
                            ${isBooked
                                                            ? 'bg-red-900/20 text-red-500/50 cursor-not-allowed border-red-900/20 ring-red-900/20'
                                                            : isSelected
                                                                ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)] ring-indigo-400 scale-110 z-10'
                                                                : spot?.spot_type === 'ev'
                                                                    ? 'bg-green-900/20 text-green-400 ring-green-500/50 hover:bg-green-900/40 hover:text-green-300'
                                                                    : spot?.spot_type === 'vip'
                                                                        ? 'bg-yellow-900/20 text-yellow-400 ring-yellow-500/50 hover:bg-yellow-900/40 hover:text-yellow-300'
                                                                        : 'bg-gray-800/50 text-gray-400 ring-gray-700 hover:ring-indigo-500/50 hover:text-indigo-300 hover:bg-gray-700/50'
                                                        }
                          `}
                                                >
                                                    {spot?.spot_type === 'ev' && <span className="absolute top-1 right-1 text-[8px]">⚡</span>}
                                                    {isBooked ? 'X' : (spot?.label || `${String.fromCharCode(65 + r)}${c + 1}`)}
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

                        <div className="flex justify-center flex-wrap gap-6 mt-6 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-gray-800 border border-gray-600 rounded-full"></div>
                                <span className="text-gray-400">Available</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-green-900/50 border border-green-500/50 rounded-full"></div>
                                <span className="text-gray-400">EV Station</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-yellow-900/50 border border-yellow-500/50 rounded-full"></div>
                                <span className="text-gray-400">VIP</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 bg-indigo-600 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"></div>
                                <span className="text-white font-medium">Selected</span>
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
                    <div className="overflow-y-auto max-h-[75vh]">
                        <div className="p-5 md:p-8">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-3 text-white">
                                <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                                    <Car size={24} />
                                </div>
                                Vehicle & Payment Details
                            </h2>

                            <div className="grid lg:grid-cols-2 gap-6 lg:gap-12">
                                <div className="space-y-4">
                                    {myVehicles.length > 0 && (
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Select Saved Vehicle</label>
                                            <select
                                                onChange={handleVehicleSelect}
                                                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all appearance-none"
                                            >
                                                <option value="">-- Select a vehicle --</option>
                                                {myVehicles.map(v => (
                                                    <option key={v.id} value={v.license_plate}>{v.license_plate} - {v.make} {v.model}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">License Plate</label>
                                        <input
                                            type="text"
                                            value={vehicleData.license_plate}
                                            onChange={(e) => setVehicleData({ ...vehicleData, license_plate: e.target.value.toUpperCase() })}
                                            onBlur={handleLicenseBlur}
                                            placeholder="ABC1234"
                                            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all font-mono uppercase"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Owner Name</label>
                                        <input
                                            type="text"
                                            value={vehicleData.name}
                                            onChange={(e) => setVehicleData({ ...vehicleData, name: e.target.value })}
                                            placeholder="Full Name"
                                            className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Phone</label>
                                            <input
                                                type="tel"
                                                value={vehicleData.phone}
                                                onChange={(e) => setVehicleData({ ...vehicleData, phone: e.target.value })}
                                                placeholder="+60 12-345 6789"
                                                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="block text-[10px] font-medium text-gray-400 uppercase tracking-wider">Email</label>
                                            <input
                                                type="email"
                                                value={vehicleData.email}
                                                onChange={(e) => setVehicleData({ ...vehicleData, email: e.target.value })}
                                                placeholder="email@example.com"
                                                className="w-full px-3 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 text-white outline-none transition-all"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-gradient-to-br from-indigo-900/20 to-purple-900/20 p-6 rounded-2xl border border-indigo-500/20">
                                        <h3 className="font-bold text-lg text-white mb-4">Booking Summary</h3>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between py-2 border-b border-white/10">
                                                <span className="text-gray-400">Spot</span>
                                                <span className="font-mono font-bold text-indigo-300">
                                                    {selectedSpot?.label || `${String.fromCharCode(65 + (selectedSpot?.row || 0))}${((selectedSpot?.col || 0) + 1)}`}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-white/10">
                                                <span className="text-gray-400">Start Time</span>
                                                <span className="font-medium text-white">{date} {startTime}</span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-white/10">
                                                <span className="text-gray-400">End Time</span>
                                                <span className="font-medium text-white">
                                                    {endDate} {endTime}
                                                </span>
                                            </div>
                                            <div className="flex justify-between py-2 border-b border-white/10">
                                                <span className="text-gray-400">Duration</span>
                                                <span className="font-medium text-white">{totals.duration} Hours</span>
                                            </div>
                                            {totals.multiplier > 1 && (
                                                <div className="flex justify-between py-2 border-b border-white/10">
                                                    <span className="text-gray-400">Spot Type</span>
                                                    <span className="font-medium text-yellow-400">
                                                        {selectedSpot?.spot_type.toUpperCase()} ({totals.multiplier}x)
                                                    </span>
                                                </div>
                                            )}

                                            {/* Promo Code Section */}
                                            <div className="pt-2">
                                                <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Promo Code</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={promoCode}
                                                        onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                                                        placeholder="Enter code"
                                                        disabled={!!appliedPromo}
                                                        className="flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                                                    />
                                                    {appliedPromo ? (
                                                        <button
                                                            onClick={() => {
                                                                setAppliedPromo(null);
                                                                setPromoCode('');
                                                            }}
                                                            className="px-3 py-2 bg-red-900/30 text-red-400 border border-red-900/50 rounded-lg text-xs font-bold hover:bg-red-900/50 transition-colors"
                                                        >
                                                            Remove
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={handleApplyPromo}
                                                            disabled={!promoCode || promoLoading}
                                                            className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 transition-colors disabled:opacity-50"
                                                        >
                                                            {promoLoading ? 'Checking...' : 'Apply'}
                                                        </button>
                                                    )}
                                                </div>
                                                {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
                                                {appliedPromo && <p className="text-green-400 text-xs mt-1">Code applied! {appliedPromo.type === 'percentage' ? `${appliedPromo.discount}% OFF` : `RM ${appliedPromo.discount} OFF`}</p>}
                                            </div>

                                            <div className="pt-4 space-y-2">
                                                <div className="flex justify-between items-center text-gray-400 text-sm">
                                                    <span>Subtotal</span>
                                                    <span>RM {totals.subtotal.toFixed(2)}</span>
                                                </div>
                                                {totals.discount > 0 && (
                                                    <div className="flex justify-between items-center text-green-400 text-sm">
                                                        <span>Discount</span>
                                                        <span>- RM {totals.discount.toFixed(2)}</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                                                    <span className="font-bold text-gray-200">Total</span>
                                                    <span className="text-2xl font-bold text-indigo-400 text-glow">RM {totals.total.toFixed(2)}</span>
                                                </div>
                                            </div>
                                        </div>
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
                                if (step === 1) {
                                    // Validate time
                                    const start = new Date(`${date}T${startTime}`);
                                    const end = new Date(`${endDate}T${endTime}`);
                                    const now = new Date();
                                    const nowBuffer = new Date(now.getTime() - 60000);

                                    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                                        alert("Please enter valid dates and times");
                                        return;
                                    }
                                    if (start < nowBuffer) {
                                        alert("Cannot book in the past!");
                                        return;
                                    }
                                    if (end <= start) {
                                        alert("End time must be after start time");
                                        return;
                                    }
                                }

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
        </div >
    );
};

export default BookingPage;
