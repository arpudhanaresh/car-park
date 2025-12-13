from io import BytesIO
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from utils.common import format_spot_id

def generate_booking_receipt(booking):
    """
    Generates a modern, premium PDF receipt for the given booking.
    Returns a BytesIO object containing the PDF data.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=40, leftMargin=40, topMargin=40, bottomMargin=40)
    elements = []
    
    # Custom Styles
    styles = getSampleStyleSheet()
    
    # Header Style
    styles.add(ParagraphStyle(
        name='BrandTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor("#4F46E5"), # Indigo-600
        spaceAfter=2,
        alignment=0 # Left
    ))

    styles.add(ParagraphStyle(
        name='ReceiptLabel',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.gray,
        alignment=0,
        spaceAfter=20
    ))
    
    styles.add(ParagraphStyle(
        name='SectionHeader',
        parent=styles['Heading3'],
        fontSize=14,
        textColor=colors.HexColor("#111827"), # Gray-900
        spaceBefore=15,
        spaceAfter=10
    ))
    
    styles.add(ParagraphStyle(
        name='ValueText',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor("#374151"), # Gray-700
    ))
    
    # --- HEADER ---
    # Ideally we'd have a logo here. For now, just text.
    elements.append(Paragraph("ParkPro", styles['BrandTitle']))
    elements.append(Paragraph(f"Receipt #{booking.id:06d}", styles['ReceiptLabel']))
    elements.append(Spacer(1, 0.2 * inch))
    
    # --- TOP INFO (2 Columns) ---
    # Left: Booking details, Right: Date
    
    date_str = booking.created_at.strftime('%B %d, %Y')
    
    # We use a table for layout, but invisible borders
    top_data = [
        [
            Paragraph(f"<b>Billed To:</b><br/>{booking.user.username}<br/>{booking.user.email}", styles["Normal"]),
            Paragraph(f"<b>Issue Date:</b><br/>{date_str}", styles["Normal"])
        ]
    ]
    
    top_table = Table(top_data, colWidths=[4*inch, 2.5*inch])
    top_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('RIGHTPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(top_table)
    elements.append(Spacer(1, 0.3 * inch))

    # --- BOOKING DETAILS TABLE ---
    
    def format_money(val):
        return f"MYR {float(val or 0):.2f}"

    vehicle_str = "N/A"
    if booking.vehicle:
        vehicle_str = f"{booking.vehicle.license_plate} ({booking.vehicle.make or ''})"

    spot_label = format_spot_id(booking.spot.row, booking.spot.col, booking.spot.floor) if booking.spot else "N/A"
    
    start_str = booking.start_time.strftime('%d %b %Y %I:%M %p')
    end_str = booking.end_time.strftime('%d %b %Y %I:%M %p')

    # Line Item Data
    # Header
    item_data = [
        ["Description", "Details", "Amount"]
    ]
    
    # Rows
    base_amount = float(booking.payment_amount or 0)
    item_data.append([
        f"Parking Reservation\n{start_str} to {end_str}\nSpot: {spot_label}\nVehicle: {vehicle_str}",
        "", # Middle column empty for wide description
        format_money(base_amount)
    ])
    
    excess = float(booking.excess_fee or 0)
    if excess > 0:
        item_data.append([
            "Overstay / Excess Fee",
            "",
            format_money(excess)
        ])
        
    # Refund check
    refund = float(booking.refund_amount or 0)
    if refund > 0:
        item_data.append([
            "Refund Processed",
            "",
            f"- {format_money(refund)}"
        ])
        
    # Spacer before total
    
    final_total = base_amount + excess - refund
    
    item_data.append(["", "TOTAL", format_money(final_total)])

    # Style the table
    # Description | Details | Amount
    # Widths
    col_widths = [4.0*inch, 1.0*inch, 1.5*inch]
    
    t = Table(item_data, colWidths=col_widths)
    
    # Modern Table Style
    t_style = [
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F3F4F6")), # Light Gray header
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor("#374151")),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'), # Amount align right
        ('PADDING', (0, 0), (-1, -1), 12),
        
        # Grid - Minimal horizontal lines
        ('LINEBELOW', (0, 0), (-1, 0), 1, colors.HexColor("#E5E7EB")), # Header underline
        ('LINEBELOW', (0, 1), (-1, -2), 1, colors.HexColor("#E5E7EB")), # Row lines
        
        # Total Row
        ('FONTNAME', (1, -1), (-1, -1), 'Helvetica-Bold'),
        ('TEXTCOLOR', (1, -1), (-1, -1), colors.HexColor("#4F46E5")),
        ('LINEABOVE', (1, -1), (-1, -1), 2, colors.HexColor("#E5E7EB")), # Stronger line above total
        ('SIZE', (1, -1), (-1, -1), 12),
    ]
    
    t.setStyle(TableStyle(t_style))
    elements.append(t)
    
    # --- FOOTER ---
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph("Thank you for choosing ParkPro.", styles['Normal']))
    elements.append(Paragraph("For support, contact help@parkpro.com", styles['ValueText']))

    # Secure & ID
    elements.append(Spacer(1, 0.5 * inch))
    elements.append(Paragraph(f"<font size=8 color='grey'>Generated automatically. Transaction ID: {booking.payment_method}-{booking.id}</font>", styles['Normal']))


    doc.build(elements)
    buffer.seek(0)
    return buffer
