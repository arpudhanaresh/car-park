import { Car, Check, Lock } from 'lucide-react';

interface Spot {
    id: number;
    row: number;
    col: number;
    is_booked: boolean;
    booked_by_username?: string;
}

interface ParkingLotProps {
    rows: number;
    cols: number;
    spots: Spot[];
    onSpotClick: (row: number, col: number) => void;
    isCustomer: boolean;
    selectedSpot?: { row: number; col: number } | null;
}

const ParkingLot = ({ spots, onSpotClick, isCustomer, selectedSpot }: ParkingLotProps) => {
    const getSpotStatus = (spot: Spot) => {
        if (spot.is_booked) return 'booked';
        if (selectedSpot && selectedSpot.row === spot.row && selectedSpot.col === spot.col) return 'selected';
        return 'available';
    };

    return (
        <div className="w-full flex justify-center">
            <div
                className="grid gap-4 p-4 w-full max-w-5xl"
                style={{
                    gridTemplateColumns: `repeat(auto-fit, minmax(100px, 1fr))`
                }}
            >
                {spots.map((spot) => {
                    const status = getSpotStatus(spot);

                    // Base styles
                    let containerClass = 'relative h-32 rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center group overflow-hidden';
                    let iconClass = 'transition-transform duration-300 group-hover:scale-110';
                    let textClass = 'font-bold text-lg z-10';


                    if (status === 'booked') {
                        containerClass += ' bg-red-900/10 border-red-500/20 cursor-not-allowed opacity-60 grayscale-[0.5]';
                        iconClass += ' text-red-500/50';
                        textClass += ' text-red-400/50';
                    } else if (status === 'selected') {
                        containerClass += ' bg-indigo-600/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] scale-105 z-10 ring-1 ring-indigo-400';
                        iconClass += ' text-indigo-400';
                        textClass += ' text-indigo-100';
                    } else {
                        // Available
                        containerClass += ' bg-gray-800/40 border-gray-700/50 hover:bg-gray-700/50 hover:border-indigo-500/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.15)] cursor-pointer';
                        iconClass += ' text-gray-600 group-hover:text-indigo-400';
                        textClass += ' text-gray-500 group-hover:text-gray-200';
                    }

                    return (
                        <div
                            key={`${spot.row}-${spot.col}`}
                            className={containerClass}
                            onClick={() => {
                                if (!spot.is_booked && isCustomer) {
                                    onSpotClick(spot.row, spot.col);
                                }
                            }}
                        >
                            {/* Background Glow for Available/Selected */}
                            {status !== 'booked' && (
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/10 group-hover:to-purple-500/10 transition-all duration-300" />
                            )}

                            {/* Status Icon */}
                            <div className={`mb-2 ${iconClass}`}>
                                {status === 'booked' ? (
                                    <Car size={32} />
                                ) : status === 'selected' ? (
                                    <Check size={32} className="drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]" />
                                ) : (
                                    <div className="w-8 h-8 rounded-lg border-2 border-dashed border-current opacity-50" />
                                )}
                            </div>

                            {/* Spot ID */}
                            <span className={textClass}>
                                {String.fromCharCode(65 + spot.row)}{spot.col + 1}
                            </span>

                            {/* Status Label */}
                            {status === 'available' && isCustomer && (
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-600 group-hover:text-indigo-400 mt-1 transition-colors">
                                    Free
                                </span>
                            )}
                            {status === 'booked' && (
                                <div className="absolute top-2 right-2 text-red-500/50">
                                    <Lock size={12} />
                                </div>
                            )}
                            {status === 'booked' && spot.booked_by_username && (
                                <span className="text-[10px] text-red-400/50 mt-1 truncate max-w-[80%] px-1">
                                    {spot.booked_by_username}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ParkingLot;
