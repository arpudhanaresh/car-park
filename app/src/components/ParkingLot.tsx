import React from 'react';
import type { Spot } from '../services/api';
import './ParkingLot.css';

interface ParkingLotProps {
  rows: number;
  cols: number;
  spots: Spot[];
  onSpotClick: (row: number, col: number) => void;
  isCustomer: boolean;
  selectedSpot?: { row: number; col: number } | null;
}

const ParkingLot: React.FC<ParkingLotProps> = ({
  rows,
  cols,
  spots,
  onSpotClick,
  isCustomer,
  selectedSpot
}) => {
  const gridStyle = {
    gridTemplateColumns: `repeat(${cols}, minmax(70px, 1fr))`
  };

  const renderSpots = () => {
    const grid = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const spot = spots.find(s => s.row === r && s.col === c);
        const isBooked = spot ? spot.is_booked : false;
        const isSelected = selectedSpot?.row === r && selectedSpot?.col === c;

        grid.push(
          <div
            key={`${r}-${c}`}
            onClick={() => isCustomer && !isBooked && onSpotClick(r, c)}
            className={`parking-spot ${
              isSelected ? 'selected' : isBooked ? 'booked' : 'available'
            } ${isCustomer && !isBooked ? '' : 'disabled'}`}
          >
            <div className="spot-icon">
              {isBooked ? '🚗' : '🅿️'}
            </div>
            <div className="spot-label">
              {String.fromCharCode(65 + r)}{c + 1}
            </div>
            <div className={`spot-status ${isBooked ? 'booked' : 'available'}`}></div>
          </div>
        );
      }
    }
    return grid;
  };

  const availableCount = spots.filter(s => !s.is_booked).length;
  const bookedCount = spots.filter(s => s.is_booked).length;
  const totalSpots = rows * cols;

  return (
    <div className="parking-lot-wrapper">
      <div className="parking-lot-header">
        <div className="lot-title">
          <span>🅿️</span>
          <h3>Parking Layout ({rows}×{cols})</h3>
        </div>
        <div className="parking-legend">
          <div className="legend-item">
            <div className="legend-color available"></div>
            <span>Available ({availableCount})</span>
          </div>
          <div className="legend-item">
            <div className="legend-color booked"></div>
            <span>Booked ({bookedCount})</span>
          </div>
          {selectedSpot && (
            <div className="legend-item">
              <div className="legend-color selected"></div>
              <span>Selected</span>
            </div>
          )}
        </div>
      </div>

      {totalSpots > 0 ? (
        <div className="parking-grid" style={gridStyle}>
          {renderSpots()}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon">🅿️</div>
          <p>No parking spots configured. Admin can set up the layout.</p>
        </div>
      )}
    </div>
  );
};

export default ParkingLot;
