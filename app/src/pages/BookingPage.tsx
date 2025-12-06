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
        <div className="flex items-center justify-center mb-4 sm:mb-8">
            {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm transition-all
            ${step === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-300' :
                            step > s ? 'bg-green-500 text-white' : 'bg-gray-300 text-gray-600'}`}>
                        {step > s ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : s}
                    </div>
                    {s < 3 && (
                        <div className={`w-8 sm:w-16 h-0.5 mx-1 sm:mx-2 ${step > s ? 'bg-green-500' : 'bg-gray-300'}`} />
                    )}
                </div>
            ))}
        </div>
    );

    return (
        <div className="max-w-3xl mx-auto px-3 sm:px-4">
            <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Book a Parking Spot</h1>
                <p className="text-xs sm:text-sm text-gray-500">Complete the steps to reserve your space</p>
            </div>

            {renderStepIndicator()}

            <div className="bg-white rounded-lg sm:rounded-xl shadow-lg border border-gray-200">
                {/* Step 1: Time Selection */}
                {step === 1 && (
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-gray-900">
                            <Clock className="text-indigo-600" size={18} />
                            Select Date & Time
                        </h2>

                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    min={new Date().toISOString().split('T')[0]}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Start Time</label>
                                <input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Duration (Hours)</label>
                                <select
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value))}
                                    className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white"
                                >
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 12, 24].map(h => (
                                        <option key={h} value={h}>{h} Hour{h > 1 ? 's' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Spot Selection */}
                {step === 2 && (
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-gray-900">
                            <MapPin className="text-indigo-600" size={18} />
                            Select a Spot
                        </h2>

                        {layout ? (
                            <div className="flex justify-center overflow-x-auto pb-4">
                                <div
                                    className="grid gap-1.5 sm:gap-2 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200"
                                    style={{
                                        gridTemplateColumns: `repeat(${layout.cols}, minmax(40px, 1fr))`
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
                            h-10 sm:h-12 rounded-md sm:rounded-lg flex items-center justify-center text-[10px] sm:text-xs font-semibold transition-all
                            ${isBooked
                                                            ? 'bg-red-100 text-red-400 cursor-not-allowed'
                                                            : isSelected
                                                                ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300'
                                                                : 'bg-white border border-green-400 text-green-700 hover:border-green-600 hover:bg-green-50'
                                                        }
                          `}
                                                >
                                                    {isBooked ? 'X' : `${r + 1}-${c + 1}`}
                                                </button>
                                            );
                                        })
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 sm:py-8 text-gray-500 text-xs sm:text-sm">Loading layout...</div>
                        )}

                        <div className="flex justify-center gap-2 sm:gap-4 mt-3 sm:mt-4 text-[10px] sm:text-xs flex-wrap">
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white border border-green-400 rounded"></div>
                                <span className="text-gray-600">Available</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-600 rounded"></div>
                                <span className="text-gray-600">Selected</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-100 rounded"></div>
                                <span className="text-gray-600">Occupied</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 3: Details & Payment */}
                {step === 3 && (
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2 text-gray-900">
                            <Car className="text-indigo-600" size={18} />
                            Vehicle & Payment Details
                        </h2>

                        <div className="space-y-4 sm:space-y-6">
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">License Plate</label>
                                    <input
                                        type="text"
                                        value={vehicleData.license_plate}
                                        onChange={(e) => setVehicleData({ ...vehicleData, license_plate: e.target.value.toUpperCase() })}
                                        onBlur={handleLicenseBlur}
                                        placeholder="ABC1234"
                                        className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none font-mono uppercase"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Auto-fill if registered</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">Owner Name</label>
                                    <input
                                        type="text"
                                        value={vehicleData.name}
                                        onChange={(e) => setVehicleData({ ...vehicleData, name: e.target.value })}
                                        placeholder="Full Name"
                                        className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Phone</label>
                                        <input
                                            type="tel"
                                            value={vehicleData.phone}
                                            onChange={(e) => setVehicleData({ ...vehicleData, phone: e.target.value })}
                                            placeholder="+60 12-345 6789"
                                            className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email</label>
                                        <input
                                            type="email"
                                            value={vehicleData.email}
                                            onChange={(e) => setVehicleData({ ...vehicleData, email: e.target.value })}
                                            placeholder="email@example.com"
                                            className="w-full px-3 py-2 sm:py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-50 to-violet-50 p-3 sm:p-4 rounded-lg border border-indigo-200">
                                <h3 className="font-semibold text-xs sm:text-sm text-gray-900 mb-2 sm:mb-3">Booking Summary</h3>
                                <div className="space-y-1.5 sm:space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Spot</span>
                                        <span className="font-semibold text-gray-900">Row {selectedSpot?.row! + 1}, Col {selectedSpot?.col! + 1}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Date</span>
                                        <span className="font-semibold text-gray-900">{date}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Time</span>
                                        <span className="font-semibold text-gray-900">{startTime} ({duration} hrs)</span>
                                    </div>
                                    <div className="pt-2 border-t border-indigo-200 flex justify-between items-center">
                                        <span className="font-bold text-sm text-gray-900">Total</span>
                                        <span className="text-lg sm:text-xl font-bold text-indigo-600">RM {duration * 10}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="bg-gray-50 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex justify-between gap-2">
                    <button
                        onClick={() => setStep(s => Math.max(1, s - 1))}
                        disabled={step === 1}
                        className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft size={16} className="sm:w-[18px] sm:h-[18px]" />
                        <span className="hidden sm:inline">Back</span>
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
                            className="flex items-center gap-1 sm:gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-md"
                        >
                            <span>Next</span>
                            <ChevronRight size={16} className="sm:w-[18px] sm:h-[18px]" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !vehicleData.license_plate || !vehicleData.name}
                            className="flex items-center gap-1 sm:gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 sm:px-6 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" /> : <span>Confirm</span>}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default BookingPage;
