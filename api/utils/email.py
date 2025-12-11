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

def get_html_template(subject: str, body: str) -> str:
    # Convert newlines to breaks for HTML
    html_body = body.replace("\n", "<br>")
    
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }}
            .container {{ max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }}
            .header {{ background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 30px; text-align: center; }}
            .header h1 {{ margin: 0; color: white; font-size: 24px; letter-spacing: 1px; }}
            .content {{ padding: 40px; color: #374151; line-height: 1.6; font-size: 16px; }}
            .footer {{ background: #f9fafb; padding: 20px; text-align: center; color: #9ca3af; font-size: 12px; }}
            .button {{ display: inline-block; padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; font-weight: bold; }}
            strong {{ color: #111827; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>PARKPRO</h1>
            </div>
            <div class="content">
                <h2 style="margin-top:0; color:#111827;">{subject}</h2>
                <p>{html_body}</p>
                <br>
                <p style="font-size: 14px; color: #6b7280;">If you have any questions, please contact support.</p>
            </div>
            <div class="footer">
                &copy; 2025 ParkPro Systems. All rights reserved.<br>
                Automated Notification System
            </div>
        </div>
    </body>
    </html>
    """

def send_email(to_email: str, subject: str, body: str):
    """
    Sends an email using the configured SMTP server with HTML template.
    """
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print(f"Mock Email to {to_email}: {subject}\n{body}")
        return

    try:
        msg = MIMEMultipart("alternative")
        msg['From'] = f"ParkPro Support <{MAIL_FROM}>"
        msg['To'] = to_email
        msg['Subject'] = subject

        # Plain text version
        part1 = MIMEText(body, 'plain')
        
        # HTML version
        html_content = get_html_template(subject, body)
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
