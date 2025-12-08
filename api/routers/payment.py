from fastapi import APIRouter, Depends, HTTPException, Request, Form
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Booking, BookingStatus
from services.ringgitpay import ringgitpay_service
from datetime import datetime
import os

router = APIRouter(prefix="/payment", tags=["payment"])

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

@router.post("/initiate/{booking_id}")
def initiate_payment(booking_id: int, db: Session = Depends(get_db)):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
        
    order_id = f"RP-{booking.id}"
    amount_str = f"{float(booking.payment_amount):.2f}"
    
    checksum = ringgitpay_service.generate_request_checksum(
        currency="MYR",
        amount=amount_str,
        order_id=order_id
    )
    
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

@router.post("/return")
async def payment_return(request: Request, db: Session = Depends(get_db)):
    # Handle Return URL (POST from Gateway) -> Redirect to Frontend
    form_data = await request.form()
    rp_data = {k: v for k, v in form_data.items() if k.startswith('rp_')}
    
    status_code = rp_data.get('rp_statusCode')
    
    # Attempt to update DB immediately for better UX
    try:
        order_id = rp_data.get('rp_orderId')
        if order_id:
            booking_id = int(order_id.replace("RP-", ""))
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if booking:
                if status_code == 'RP00':
                    if booking.payment_status != 'paid':
                        booking.payment_status = 'paid'
                        db.commit()
                else:
                    if booking.payment_status != 'failed':
                        booking.payment_status = 'failed'
                        db.commit()
    except Exception as e:
        print(f"Error updating DB in return: {e}")

    if status_code == 'RP00':
        return RedirectResponse(url=f"{FRONTEND_URL}/payment-status?status=success", status_code=303)
    else:
        return RedirectResponse(url=f"{FRONTEND_URL}/payment-status?status=failed&code={status_code}", status_code=303)

@router.post("/callback")
async def payment_callback(request: Request, db: Session = Depends(get_db)):
    # RinggitPay sends NVP via FORM POST
    form_data = await request.form()
    
    rp_data = {k: v for k, v in form_data.items() if k.startswith('rp_')}
    
    # Verify Checksum
    # specific fields for checksum: rp_appId|rp_currency|rp_amount|rp_statusCode|rp_orderId|rp_transactionRef
    
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
        # Depending on guide, maybe return 200 anyway to stop retries, but log error
        return "OK" 
        
    # Update Booking Logic
    try:
        order_id = rp_data.get('rp_orderId')
        booking_id = int(order_id.replace("RP-", ""))
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        
        if booking:
            status_code = rp_data.get('rp_statusCode')
            transaction_ref = rp_data.get('rp_transactionRef')
            
            if status_code == 'RP00':
                if booking.payment_status != 'paid':
                    booking.payment_status = 'paid'
                    # Log audit if possible or simple print for now
                    print(f"Payment confirmed for Booking {booking_id}. Ref: {transaction_ref}")
            else:
                if booking.payment_status != 'failed':
                    booking.payment_status = 'failed'
                    print(f"Payment failed for Booking {booking_id}. Code: {status_code}")
            
            db.commit()

    except Exception as e:
        print(f"Error processing callback: {e}")

    # Must return 200 OK
    return "OK"
