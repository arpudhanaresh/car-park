import { useEffect, useState } from 'react';
import './App.css';
import { getLayout, updateLayout, bookSpot } from './services/api';
import type { ParkingState } from './services/api';
import ParkingLot from './components/ParkingLot';
import AdminPanel from './components/AdminPanel';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [parkingState, setParkingState] = useState<ParkingState | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLayout = async () => {
    try {
      const data = await getLayout();
      setParkingState(data);
    } catch (error) {
      console.error("Failed to fetch layout", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLayout();
  }, []);

  const handleLayoutUpdate = async (rows: number, cols: number) => {
    try {
      const newState = await updateLayout({ rows, cols });
      setParkingState(newState);
      alert("Layout updated successfully!");
    } catch (error) {
      console.error("Failed to update layout", error);
      alert("Failed to update layout");
    }
  };

  const handleSpotClick = async (row: number, col: number, currentStatus: boolean) => {
    try {
      const newState = await bookSpot(row, col, !currentStatus);
      setParkingState(newState);
    } catch (error) {
      console.error("Failed to book spot", error);
      alert("Failed to book spot (maybe already taken?)");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!parkingState) return <div>Error loading parking state. Is backend running?</div>;

  return (
    <div className="app-container">
      <header>
        <h1>Car Parking System</h1>
        <div className="role-switcher">
          <label>
            <input
              type="checkbox"
              checked={isAdmin}
              onChange={(e) => setIsAdmin(e.target.checked)}
            />
            Admin Mode
          </label>
        </div>
      </header>

      <main>
        {isAdmin ? (
          <AdminPanel
            currentRows={parkingState.rows}
            currentCols={parkingState.cols}
            onUpdateLayout={handleLayoutUpdate}
          />
        ) : (
          <div className="customer-view">
            <p>Welcome, Customer! Click a spot to book/unbook.</p>
          </div>
        )}

        <ParkingLot
          rows={parkingState.rows}
          cols={parkingState.cols}
          spots={parkingState.spots}
          onSpotClick={handleSpotClick}
          isCustomer={!isAdmin}
        />
      </main>
    </div>
  );
}

export default App;
