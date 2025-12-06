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

const ParkingLot = ({ cols, spots, onSpotClick, isCustomer, selectedSpot }: ParkingLotProps) => {
    const getSpotStatus = (spot: Spot) => {
        if (spot.is_booked) return 'booked';
        if (selectedSpot && selectedSpot.row === spot.row && selectedSpot.col === spot.col) return 'selected';
        return 'available';
    };

    return (
        <div className="w-full overflow-x-auto pb-4 flex justify-center">
            <div
                className="grid gap-4 p-4"
                style={{
                    gridTemplateColumns: `repeat(${cols}, minmax(90px, 100px))`
                }}
            >
                {spots.map((spot) => {
                    const status = getSpotStatus(spot);
                    let spotColorClass = 'bg-green-100 border-green-300 text-green-700 hover:bg-green-200 hover:scale-105 shadow-sm';

                    if (status === 'booked') {
                        spotColorClass = 'bg-red-100 border-red-300 text-red-700 cursor-not-allowed opacity-80';
                    } else if (status === 'selected') {
                        spotColorClass = 'bg-blue-500 border-blue-600 text-white shadow-md scale-105 ring-2 ring-blue-300';
                    }

                    return (
                        <div
                            key={`${spot.row}-${spot.col}`}
                            className={`
                h-24 rounded-xl border-2 flex flex-col items-center justify-center 
                cursor-pointer transition-all duration-200 font-bold text-lg relative
                ${spotColorClass}
              `}
                            onClick={() => {
                                if (!spot.is_booked && isCustomer) {
                                    onSpotClick(spot.row, spot.col);
                                }
                            }}
                        >
                            <span className="text-2xl mb-1">
                                {status === 'booked' ? '🚗' : status === 'selected' ? '✅' : '🅿️'}
                            </span>
                            <span>
                                {String.fromCharCode(65 + spot.row)}{spot.col + 1}
                            </span>
                            {status === 'available' && isCustomer && (
                                <span className="text-xs font-normal opacity-75 mt-1">Free</span>
                            )}
                            {status === 'booked' && spot.booked_by_username && (
                                <span className="text-xs font-normal opacity-75 mt-1">{spot.booked_by_username}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ParkingLot;
