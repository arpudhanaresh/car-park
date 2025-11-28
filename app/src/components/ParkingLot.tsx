import React from 'react';
import type { Spot } from '../services/api';

interface ParkingLotProps {
    rows: number;
    cols: number;
    spots: Spot[];
    onSpotClick: (row: number, col: number, currentStatus: boolean) => void;
    isCustomer: boolean;
}

const ParkingLot: React.FC<ParkingLotProps> = ({ rows, cols, spots, onSpotClick, isCustomer }) => {
    const gridStyle = {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, 50px)`,
        gap: '10px',
        marginTop: '20px'
    };

    const renderSpots = () => {
        const grid = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const spot = spots.find(s => s.row === r && s.col === c);
                const isBooked = spot ? spot.is_booked : false;

                grid.push(
                    <div
                        key={`${r}-${c}`}
                        onClick={() => isCustomer && onSpotClick(r, c, isBooked)}
                        className={`parking-spot ${isBooked ? 'booked' : 'free'} ${isCustomer ? 'clickable' : ''}`}
                    >
                        {r},{c}
                    </div>
                );
            }
        }
        return grid;
    };

    return (
        <div className="parking-lot-container">
            <h3>Parking Lot ({rows}x{cols})</h3>
            <div style={gridStyle}>
                {renderSpots()}
            </div>
        </div>
    );
};

export default ParkingLot;
