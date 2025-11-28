from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
from models import LayoutConfig, BookingRequest, ParkingState, Spot

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory state
current_layout = LayoutConfig(rows=5, cols=5)
booked_spots: List[Spot] = []

def get_current_state() -> ParkingState:
    spots = []
    for r in range(current_layout.rows):
        for c in range(current_layout.cols):
            is_booked = any(s.row == r and s.col == c and s.is_booked for s in booked_spots)
            spots.append(Spot(row=r, col=c, is_booked=is_booked))
    return ParkingState(rows=current_layout.rows, cols=current_layout.cols, spots=spots)

@app.get("/layout", response_model=ParkingState)
def get_layout():
    return get_current_state()

@app.post("/admin/layout")
def update_layout(config: LayoutConfig):
    global current_layout, booked_spots
    current_layout = config
    # Reset bookings if layout changes significantly (optional, but safer for this demo)
    booked_spots = [s for s in booked_spots if s.row < config.rows and s.col < config.cols]
    return get_current_state()

@app.post("/book")
def book_spot(request: BookingRequest):
    global booked_spots
    
    if request.row >= current_layout.rows or request.col >= current_layout.cols:
        raise HTTPException(status_code=400, detail="Invalid spot coordinates")

    # Check if already booked
    existing_spot = next((s for s in booked_spots if s.row == request.row and s.col == request.col), None)
    
    if request.is_booked:
        if existing_spot and existing_spot.is_booked:
             raise HTTPException(status_code=400, detail="Spot already booked")
        if not existing_spot:
             booked_spots.append(Spot(row=request.row, col=request.col, is_booked=True))
    else:
        # Unbook
        if existing_spot:
            booked_spots = [s for s in booked_spots if not (s.row == request.row and s.col == request.col)]
            
    return get_current_state()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
