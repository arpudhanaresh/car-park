from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, Frame, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_JUSTIFY

# --- GLOBAL CONFIG ---
BRAND_COLOR = colors.HexColor("#4f46e5")  # Indigo
TEXT_COLOR = colors.HexColor("#374151")   # Gray
ACCENT_COLOR = colors.HexColor("#F3F4F6") # Light Gray for backgrounds

def add_header_footer(canvas, doc):
    """
    Draws a professional header and footer on every page.
    """
    canvas.saveState()
    
    # --- HEADER ---
    # Top colored strip
    canvas.setFillColor(BRAND_COLOR)
    canvas.rect(0, A4[1] - 20*mm, A4[0], 20*mm, fill=1, stroke=0)
    
    # Header Text
    canvas.setFont("Helvetica-Bold", 14)
    canvas.setFillColor(colors.white)
    canvas.drawString(20*mm, A4[1] - 14*mm, "ParkPro System")
    
    canvas.setFont("Helvetica", 10)
    canvas.drawRightString(A4[0] - 20*mm, A4[1] - 14*mm, "2025 Feature Brochure")

    # --- FOOTER ---
    # Bottom Line
    canvas.setStrokeColor(colors.lightgrey)
    canvas.line(20*mm, 15*mm, A4[0]-20*mm, 15*mm)
    
    # Footer Text
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(colors.gray)
    canvas.drawString(20*mm, 10*mm, "Confidential & Proprietary - ParkPro")
    
    # Page Number
    page_num = canvas.getPageNumber()
    canvas.drawRightString(A4[0]-20*mm, 10*mm, f"Page {page_num}")
    
    canvas.restoreState()

def generate_brochure():
    doc = SimpleDocTemplate(
        "ParkPro_HighLevel_Brochure.pdf", 
        pagesize=A4,
        rightMargin=72, leftMargin=72,
        topMargin=80, bottomMargin=72
    )
    
    styles = getSampleStyleSheet()
    
    # --- CUSTOM STYLES ---
    # Title Page Styles
    style_cover_title = ParagraphStyle(
        'CoverTitle', parent=styles['Title'], fontSize=32, leading=40,
        textColor=BRAND_COLOR, spaceAfter=20, alignment=TA_CENTER
    )
    style_cover_sub = ParagraphStyle(
        'CoverSub', parent=styles['Normal'], fontSize=16, textColor=colors.gray, 
        alignment=TA_CENTER, spaceAfter=50
    )
    
    # Content Styles
    style_section_header = ParagraphStyle(
        'SectionHeader', parent=styles['Heading2'], fontSize=18, 
        textColor=BRAND_COLOR, spaceBefore=20, spaceAfter=10, 
        borderPadding=5, borderColor=BRAND_COLOR, borderWidth=0
    )
    
    style_h3 = ParagraphStyle(
        'CustomH3', parent=styles['Heading3'], fontSize=13, 
        textColor=colors.black, spaceBefore=12, spaceAfter=4
    )
    
    style_normal = ParagraphStyle(
        'CustomNormal', parent=styles['Normal'], fontSize=10.5, leading=14, 
        textColor=TEXT_COLOR, alignment=TA_JUSTIFY
    )
    
    style_bullet = ParagraphStyle(
        'CustomBullet', parent=style_normal, leftIndent=15, bulletIndent=5,
        spaceAfter=3
    )

    story = []

    # ==========================
    # 1. COVER PAGE
    # ==========================
    story.append(Spacer(1, 2*inch))
    story.append(Paragraph("ParkPro", style_cover_title))
    story.append(Paragraph("Smart Parking Management System", style_cover_sub))
    
    # Visual Separator
    story.append(Paragraph("_______________________________________", 
                           ParagraphStyle('Sep', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.lightgrey)))
    story.append(Spacer(1, 0.5*inch))
    
    story.append(Paragraph("<b>Product Overview & Technical Specification</b>", 
                           ParagraphStyle('BoldInfo', parent=styles['Normal'], alignment=TA_CENTER)))
    story.append(Paragraph("Generated for Internal Review", 
                           ParagraphStyle('Info', parent=styles['Normal'], alignment=TA_CENTER, textColor=colors.gray)))
    
    story.append(PageBreak())

    # ==========================
    # 2. EXECUTIVE SUMMARY
    # ==========================
    story.append(Paragraph("1. Executive Summary", style_section_header))
    story.append(Paragraph(
        "ParkPro is a cutting-edge, full-stack parking management solution designed to modernize the parking experience. "
        "It combines a premium, responsive user interface with a robust backend to streamline vehicle booking, "
        "manage layouts, and provide real-time analytics for administrators.", style_normal))

    story.append(Spacer(1, 0.3*inch))

    # ==========================
    # 3. PAYMENT ARCHITECTURE
    # ==========================
    story.append(Paragraph("2. Payment Architecture (RinggitPay)", style_section_header))
    
    # Intro
    story.append(Paragraph("ParkPro integrates with RinggitPay for a secure checkout, using robust checksum validation and auto-reconciliation.", style_normal))
    story.append(Spacer(1, 0.1*inch))

    # Flow Table (Using a Table for better alignment than simple text)
    flow_data = [
        ["Step", "Feature", "Description"],
        ["1", "Checkout", "Seamless RinggitPay integration for secure payments."],
        ["2", "Security", "Uses **Checksum (SHA256)** to validate all transaction data."],
        ["3", "Redirect", "User sent to secure Gateway (Credit Card, FPX, E-Wallet)."],
        ["4", "Callback", "Server-to-Server webhook confirms payment instantly."],
        ["5", "Retry", "Users can easily **retry** payments if the transaction fails."],
        ["6", "Auto-Update", "System checks status **every 5 mins** (Auto-Reconciliation)."],
        ["7", "Refund", "Automated and manual refund support for cancellations."]
    ]
    
    flow_table = Table(flow_data, colWidths=[0.5*inch, 1.2*inch, 4.3*inch])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), ACCENT_COLOR),
        ('TEXTCOLOR', (0,0), (-1,0), BRAND_COLOR),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('BOTTOMPADDING', (0,0), (-1,0), 8),
        ('GRID', (0,0), (-1,-1), 0.5, colors.lightgrey),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(flow_table)
    
    story.append(Spacer(1, 0.2*inch))
    story.append(Paragraph("<b>Highlights:</b> Secure Checksum, Retry Capabilities, Auto Background Updates, and Full Refund Support.", style_normal))

    story.append(PageBreak())

    # ==========================
    # 4. CUSTOMER PORTAL
    # ==========================
    story.append(Paragraph("3. Customer Portal Features", style_section_header))
    
    # Feature 1
    story.append(Paragraph("Real-Time Interactive Booking", style_h3))
    story.append(Paragraph("• <b>Visual Parking Map:</b> View available spots (Green), booked (Red), and maintenance (Striped).", style_bullet))
    story.append(Paragraph("• <b>Multilevel Support:</b> Seamlessly switch between different parking floors.", style_bullet))
    story.append(Paragraph("• <b>Spot Types:</b> Standard, EV (Electric), or VIP spots with pricing differentiators.", style_bullet))

    # Feature 2
    story.append(Paragraph("Seamless User Experience", style_h3))
    story.append(Paragraph("• <b>Vehicle Management:</b> Save and manage multiple vehicles (Make, Model, Plate).", style_bullet))
    story.append(Paragraph("• <b>Smart Pricing:</b> Automatic calculation based on duration and spot multipliers.", style_bullet))
    
    # Feature 3
    story.append(Paragraph("Notifications & History", style_h3))
    story.append(Paragraph("• <b>Premium Emails:</b> HTML confirmations, alerts, and receipts.", style_bullet))
    story.append(Paragraph("• <b>PDF Receipts:</b> Instant generation of transaction records.", style_bullet))

    story.append(Spacer(1, 0.2*inch))

    # ==========================
    # 5. ADMINISTRATION
    # ==========================
    story.append(Paragraph("4. Administration & Management", style_section_header))
    
    story.append(Paragraph("Dashboard & Analytics", style_h3))
    story.append(Paragraph("• <b>Live Occupancy:</b> Real-time visual tracking of lot usage.", style_bullet))
    story.append(Paragraph("• <b>Revenue Intelligence:</b> 7-day revenue trends and occupancy heatmaps.", style_bullet))
    
    story.append(Paragraph("Operational Control", style_h3))
    story.append(Paragraph("• <b>Grid Editor:</b> Click-to-edit interface for changing spot types.", style_bullet))
    story.append(Paragraph("• <b>Maintenance Mode:</b> Block specific spots instantly for repairs.", style_bullet))
    story.append(Paragraph("• <b>Overstay Management:</b> Identify violators and calculate exit fees.", style_bullet))

    story.append(PageBreak())

    # ==========================
    # 6. TECH STACK
    # ==========================
    story.append(Paragraph("5. Technology Stack", style_section_header))
    story.append(Paragraph("ParkPro is built on a high-performance modern stack ensuring scalability and security.", style_normal))
    story.append(Spacer(1, 0.2*inch))
    
    tech_data = [
        ['Component', 'Technology', 'Details'],
        ['Frontend', 'React (Vite)', 'TypeScript, Glassmorphism UI'],
        ['Styling', 'Tailwind CSS', 'Responsive Design System'],
        ['Backend', 'FastAPI', 'Python High Performance Async'],
        ['Database', 'MySQL', 'SQLAlchemy ORM'],
        ['Security', 'JWT + OAuth2', 'Secure Session Management'],
        ['Payments', 'RinggitPay', 'External Gateway Integration']
    ]
    
    tech_table = Table(tech_data, colWidths=[1.5*inch, 2*inch, 2.5*inch])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), BRAND_COLOR),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('TOPPADDING', (0, 0), (-1, 0), 10),
        
        # Zebra striping
        ('BACKGROUND', (0, 1), (-1, -1), colors.white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, ACCENT_COLOR]),
        
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e5e7eb")),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(tech_table)

    # Build PDF
    # onFirstPage and onLaterPages triggers the header/footer function
    doc.build(story, onFirstPage=add_header_footer, onLaterPages=add_header_footer)
    print("High-Level PDF Generated Successfully: ParkPro_HighLevel_Brochure.pdf")

if __name__ == "__main__":
    generate_brochure()