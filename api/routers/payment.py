from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Booking, BookingStatus
from services.ringgitpay import ringgitpay_service
from datetime import datetime
import os
from utils.email import send_email
from utils.common import format_spot_id

router = APIRouter(prefix="/payment", tags=["payment"])

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.post("/initiate/{booking_id}")
def initiate_payment(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    # Generate unique order ID for retry support: RP-{booking_id}-{timestamp}
    import time
    timestamp = int(time.time())
    order_id = f"RP-{booking.id}-{timestamp}"
    
    amount_str = f"{float(booking.payment_amount):.2f}"
    
    checksum = ringgitpay_service.generate_request_checksum(
        currency="MYR",
        amount=amount_str,
        order_id=order_id
    )
    
    # Update status to pending and save order ID
    old_payment_status = booking.payment_status
    booking.payment_status = 'pending'
    booking.latest_order_id = order_id
    
    # Log the action if it's a retry (or even first time)
    from main import log_booking_audit # Import here to avoid circular dependency if possible, or move log function to specific service
    # Assuming log_booking_audit is importable or we replicate valid logic. 
    # Actually, main.py imports routers, so router importing main is circular. 
    # Better to just manipulate DB manually for audit log here to be safe and quick.
    from models import BookingAuditLog
    audit_log = BookingAuditLog(
        booking_id=booking.id,
        user_id=booking.user_id,
        action="payment_initiated",
        old_status=old_payment_status,
        new_status="pending",
        details=f"Payment initiated. Order ID: {order_id}"
    )
    db.add(audit_log)

    db.commit()
    
    return {
        "action": ringgitpay_service.payment_url,
        "fields": {
            "appId": ringgitpay_service.app_id,
            "currency": "MYR",
            "amount": amount_str,
            "orderId": order_id,
            "checkSum": checksum,
            "buyerEmail": booking.email,
            "accName": booking.name,
            "returnURL": f"{API_BASE_URL}/payment/return",
            "ref1": f"Booking #{booking.id}",
            "ref2": booking.vehicle.license_plate if booking.vehicle else ""
        }
    }

def extract_booking_id(rp_order_id: str) -> int:
    # Format: RP-{booking_id}-{timestamp} or RP-{booking_id} (legacy)
    try:
        parts = rp_order_id.split('-')
        if len(parts) >= 2:
            return int(parts[1])
        return int(rp_order_id.replace("RP-", ""))
    except:
        return None

def update_booking_status_logic(db: Session, booking: Booking, status_code: str, transaction_ref: str = None):
    if status_code == 'RP00':
        booking.payment_status = 'paid'
        # Ensure status is active only on success (as requested)
        booking.status = 'active'
        
        # Send Confirmation Email (Moved from main.py)
        try:
            if booking.email:
                 # Need to format times clearly
                 start_str = booking.start_time.strftime("%Y-%m-%d %H:%M:%S")
                 end_str = booking.end_time.strftime("%Y-%m-%d %H:%M:%S")
                 
                 spot_label = format_spot_id(booking.spot.row, booking.spot.col, booking.spot.floor) if booking.spot else "N/A"
                 vehicle_plate = booking.vehicle.license_plate if booking.vehicle else "N/A"
                 
                 # Create HTML Body
                 html_body = f"""
                    <h1>Booking Confirmed!</h1>
                    <p>Hello {booking.name},</p>
                    <p>Your parking spot has been successfully booked. Below are your booking details:</p>
                    
                    <table class="details-table">
                        <tr>
                            <th>Booking ID</th>
                            <td>#{booking.id}</td>
                        </tr>
                        <tr>
                            <th>Spot</th>
                            <td><strong>{spot_label}</strong></td>
                        </tr>
                        <tr>
                            <th>Vehicle</th>
                            <td>{vehicle_plate}</td>
                        </tr>
                        <tr>
                            <th>Start Time</th>
                            <td>{start_str}</td>
                        </tr>
                        <tr>
                            <th>End Time</th>
                            <td>{end_str}</td>
                        </tr>
                    </table>
                    
                    <div class="highlight-box">
                        <span style="font-size: 14px; color: #4f46e5; font-weight: 700; text-transform: uppercase;">Total Paid</span><br>
                        <span style="font-size: 24px; color: #111827; font-weight: 900;">MYR {float(booking.payment_amount):.2f}</span>
                    </div>
                    
                    <p>Thank you for using ParkPro!</p>
                    
                    <center>
                        <a href="http://localhost:5173/my-bookings" class="btn">View My Bookings</a>
                    </center>
                 """
                 
                 send_email(
                    booking.email,
                    "Booking Confirmed - ParkPro",
                    html_body,
                    is_html=True
                 )
        except Exception as e:
            print(f"Failed to send confirmation email from payment callback: {e}")

    elif status_code == 'RP09':
        if booking.payment_status != 'paid':
            booking.payment_status = 'pending'
    else:
        # Failure (RP91, RP100, etc.)
        if booking.payment_status != 'paid':
             booking.payment_status = 'failed'
             
    db.commit()

@router.post("/check-status/{booking_id}")
def check_payment_status(booking_id: int, order_id: str = None, transaction_ref: str = None, db: Session = Depends(get_db)):
    # Manual trigger to check status via Enquiry API
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    # If order_id not provided, we might need to store the last generated order_id in DB?
    # For now, we assume frontend provides the order_id used.
    # If not, we can't reliably check status without order_id as it changes on retry.
    if not order_id:
         raise HTTPException(status_code=400, detail="Order ID required to check status")

    result = ringgitpay_service.check_status(order_id, transaction_ref)
    
    if result:
        # result is likely a dict or NVP string. RinggitPay docs unclear on exact JSON vs NVP response body.
        # Assuming dict from service.
        if isinstance(result, dict):
             rp_status = result.get('rp_statusCode')
             rp_ref = result.get('rp_transactionRef')
             if rp_status:
                 update_booking_status_logic(db, booking, rp_status, rp_ref)
                 return {"status": booking.payment_status, "rp_statusCode": rp_status, "raw": result}
    
    return {"status": booking.payment_status, "message": "Could not verify with gateway"}

@router.post("/return")
async def payment_return(request: Request, db: Session = Depends(get_db)):
    form_data = await request.form()
    rp_data = {k: v for k, v in form_data.items() if k.startswith('rp_')}
    
    status_code = rp_data.get('rp_statusCode')
    order_id = rp_data.get('rp_orderId')
    transaction_ref = rp_data.get('rp_transactionRef')
    
    if order_id:
        booking_id = extract_booking_id(order_id)
        if booking_id:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if booking:
                update_booking_status_logic(db, booking, status_code, transaction_ref)

    if status_code == 'RP00':
        return RedirectResponse(url=f"{FRONTEND_URL}/payment-status?status=success", status_code=303)
    elif status_code == 'RP09':
        return RedirectResponse(url=f"{FRONTEND_URL}/payment-status?status=pending&code={status_code}", status_code=303)
    else:
        return RedirectResponse(url=f"{FRONTEND_URL}/payment-status?status=failed&code={status_code}&orderId={order_id}", status_code=303)

@router.post("/callback")
async def payment_callback(request: Request, db: Session = Depends(get_db)):
    form_data = await request.form()
    rp_data = {k: v for k, v in form_data.items() if k.startswith('rp_')}
    
    # Verify Checksum
    is_valid = ringgitpay_service.verify_response_checksum(
        rp_app_id=rp_data.get('rp_appId'),
        rp_currency=rp_data.get('rp_currency'),
        rp_amount=rp_data.get('rp_amount'),
        rp_status_code=rp_data.get('rp_statusCode'),
        rp_order_id=rp_data.get('rp_orderId'),
        rp_transaction_ref=rp_data.get('rp_transactionRef'),
        rp_checksum=rp_data.get('rp_checkSum')
    )
    
    if not is_valid:
        print(f"Invalid checksum for order {rp_data.get('rp_orderId')}")
        return "OK"
        
    order_id = rp_data.get('rp_orderId')
    status_code = rp_data.get('rp_statusCode')
    transaction_ref = rp_data.get('rp_transactionRef')
    
    booking_id = extract_booking_id(order_id)
    if booking_id:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if booking:
            update_booking_status_logic(db, booking, status_code, transaction_ref)

    return "OK"
