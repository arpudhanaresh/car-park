from pydantic import BaseModel
from typing import List, Optional

class LayoutConfig(BaseModel):
    rows: int
    cols: int

class BookingRequest(BaseModel):
    row: int
    col: int
    is_booked: bool

class Spot(BaseModel):
    row: int
    col: int
    is_booked: bool

class ParkingState(BaseModel):
    rows: int
    cols: int
    spots: List[Spot]
