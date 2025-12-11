from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

def generate_booking_receipt(booking):
    """
    Generates a PDF receipt for the given booking.
    Returns a BytesIO object containing the PDF data.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    normal_style = styles["Normal"]
    
    # Title
    elements.append(Paragraph("ParkPro Receipt", title_style))
    elements.append(Spacer(1, 20))
    
    # Booking Info
    booking_id_text = f"<b>Booking ID:</b> #{booking.id}"
    date_text = f"<b>Date:</b> {booking.created_at.strftime('%Y-%m-%d %H:%M:%S')}"
    elements.append(Paragraph(booking_id_text, normal_style))
    elements.append(Paragraph(date_text, normal_style))
    elements.append(Spacer(1, 20))
    
    # User & Vehicle Info
    # Check if vehicle exists (handle deleted vehicle case ideally, but assuming relation holds)
    vehicle_info = "N/A"
    if booking.vehicle:
        vehicle_info = f"{booking.vehicle.license_plate} ({booking.vehicle.make or ''} {booking.vehicle.model or ''})".strip()
        
    user_info = f"{booking.user.username} ({booking.user.email})"
    
    # Table Data
    def safe_date(dt):
        return dt.strftime('%Y-%m-%d %H:%M:%S') if dt else "N/A"

    data = [
        ["Description", "Details"],
        ["Customer", user_info],
        ["Vehicle", vehicle_info],
        ["Parking Spot", booking.spot.label if booking.spot else "N/A"],
        ["Start Time", safe_date(booking.start_time)],
        ["End Time", safe_date(booking.end_time)],
        ["Status", booking.status.title()],
    ]
    
    # Financials
    elements.append(Spacer(1, 10))
    
    # Payment Breakdown
    data.append(["", ""]) # Spacer Row
    payment_amount = float(booking.payment_amount or 0)
    data.append(["Payment Amount", f"MYR {payment_amount:.2f}"])
    
    excess_fee = float(booking.excess_fee or 0)
    if excess_fee > 0:
        data.append(["Overstay Fee", f"MYR {excess_fee:.2f}"])
        
    total_paid = payment_amount + excess_fee
    
    # Check Refund
    refund_status = booking.refund_status or "none"
    if refund_status in ["processed", "pending", "refunded"]:
        data.append(["Refund Status", refund_status.title()])
        
        refund_amount = float(booking.refund_amount or 0)
        if refund_amount > 0:
             data.append(["Refund Amount", f"- MYR {refund_amount:.2f}"])
             total_paid -= refund_amount
             
    data.append(["TOTAL PAID", f"MYR {total_paid:.2f}"])
    
    # Create Table
    table = Table(data, colWidths=[150, 300])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (1, 0), colors.HexColor("#4F46E5")), # Indigo Header
        ('TEXTCOLOR', (0, 0), (1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        # Total Row Style
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.lightgrey),
    ]))
    
    elements.append(table)
    
    # Footer
    elements.append(Spacer(1, 40))
    footer_text = "Thank you for using ParkPro. <br/> This is a computer generated receipt."
    elements.append(Paragraph(footer_text, styles["Italic"]))
    
    doc.build(elements)
    buffer.seek(0)
    return buffer
