import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
MAIL_FROM = os.getenv("MAIL_FROM")
MAIL_PORT = int(os.getenv("MAIL_PORT", 587))
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")

# Premium Email Template with Dark Mode support (via media queries) and responsive design
def get_html_template(subject: str, body: str, is_html: bool = False) -> str:
    # Process body content
    if is_html:
        content_html = body
    else:
        # Convert text to HTML paragraphs safely
        # Split by double newlines for paragraphs, single for breaks
        paragraphs = body.split("\n\n")
        formatted_paragraphs = []
        for p in paragraphs:
            if p.strip():
                formatted_paragraphs.append(f"<p>{p.replace(chr(10), '<br>')}</p>")
        content_html = "".join(formatted_paragraphs)

    return f"""
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>{subject}</title>
        <style>
            /* Reset & Base */
            body {{ font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased; }}
            a {{ color: #4f46e5; text-decoration: none; }}
            
            /* Container */
            .email-wrapper {{ width: 100%; background-color: #f3f4f6; padding: 40px 0; }}
            .container {{ max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); }}
            
            /* Header */
            .header {{ background-color: #111827; padding: 32px; text-align: center; background-image: linear-gradient(to right, #111827, #1f2937); }}
            .brand {{ color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 0; }}
            .brand span {{ color: #6366f1; }} /* Accent color for 'PRO' */
            
            /* Content */
            .content {{ padding: 40px 32px; }}
            h1 {{ margin-top: 0; font-size: 20px; font-weight: 600; color: #111827; margin-bottom: 16px; }}
            p {{ margin-bottom: 16px; line-height: 1.6; color: #4b5563; font-size: 16px; }}
            
            /* Data Table for Details */
            .details-table {{ width: 100%; border-collapse: collapse; margin: 24px 0; background: #f9fafb; border-radius: 8px; overflow: hidden; }}
            .details-table th {{ text-align: left; padding: 12px 16px; color: #6b7280; font-size: 13px; font-weight: 600; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; background: #f3f4f6; }}
            .details-table td {{ padding: 12px 16px; color: #1f2937; font-size: 15px; font-weight: 500; border-bottom: 1px solid #e5e7eb; }}
            .details-table tr:last-child td {{ border-bottom: none; }}
            
            /* Highlight/Alert Styles */
            .highlight-box {{ background-color: #eef2ff; border-left: 4px solid #4f46e5; padding: 16px; border-radius: 4px; margin: 24px 0; }}
            .alert-box {{ background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 4px; margin: 24px 0; }}
            .alert-title {{ color: #991b1b; font-weight: 700; display: block; margin-bottom: 4px; }}
            
            /* Footer */
            .footer {{ background-color: #f9fafb; padding: 32px; text-align: center; border-top: 1px solid #e5e7eb; }}
            .footer p {{ font-size: 13px; color: #9ca3af; margin: 6px 0; }}
            .social-links {{ margin-top: 16px; }}
            .social-links a {{ display: inline-block; margin: 0 8px; color: #9ca3af; }}
            
            /* Buttons */
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; padding: 12px 24px; border-radius: 8px; font-weight: 600; font-size: 16px; text-align: center; margin-top: 24px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); transition: background-color 0.2s; }}
            .btn:hover {{ background-color: #4338ca; }}
            
            /* Responsive */
            @media only screen and (max-width: 600px) {{
                .container {{ border-radius: 0; width: 100% !important; }}
                .content {{ padding: 24px; }}
            }}
        </style>
    </head>
    <body>
        <div class="email-wrapper">
            <div class="container">
                <div class="header">
                    <h1 class="brand">Park<span>Pro</span></h1>
                </div>
                <div class="content">
                    {content_html}
                </div>
                <div class="footer">
                    <p>&copy; 2025 ParkPro Systems. All rights reserved.</p>
                    {"" if "ParkPro" in body else "<p>Automated Notification System</p>"}
                    <p style="font-size: 11px; margin-top: 12px;">You are receiving this email because of your activity on ParkPro.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """

def send_email(to_email: str, subject: str, body: str, is_html: bool = False):
    """
    Sends an email using the configured SMTP server with premium HTML template.
    """
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print(f"Mock Email to {to_email}: {subject}\n{body}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg['From'] = f"ParkPro Support <{MAIL_FROM}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        # Plain text version (stripping HTML tags if html provided? For now just use body as is if text, or simple strip if html)
        # Actually proper mime requires plain text. If is_html, we should ideally strip tags.
        plain_text_body = body
        if is_html:
            # Very basic strip for fallback
            import re
            plain_text_body = re.sub('<[^<]+?>', '', body)
            
        part1 = MIMEText(plain_text_body, 'plain')
        
        # HTML version
        html_content = get_html_template(subject, body, is_html)
        part2 = MIMEText(html_content, 'html')

        msg.attach(part1)
        msg.attach(part2)

        # Use SMTP_SSL for port 465 (or implicit SSL)
        if MAIL_PORT == 465 or os.getenv("MAIL_USE_SSL", "False") == "True":
             server = smtplib.SMTP_SSL(MAIL_SERVER, MAIL_PORT)
        else:
             server = smtplib.SMTP(MAIL_SERVER, MAIL_PORT)
             server.starttls()
             
        server.login(MAIL_USERNAME, MAIL_PASSWORD)
        text = msg.as_string()
        server.sendmail(MAIL_FROM, to_email, text)
        server.quit()
        print(f"Email sent to {to_email}")
    except Exception as e:
        print(f"Failed to send email: {e}")
