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

def send_email(to_email: str, subject: str, body: str):
    """
    Sends an email using the configured SMTP server.
    """
    if not MAIL_USERNAME or not MAIL_PASSWORD:
        print(f"Mock Email to {to_email}: {subject}\n{body}")
        return

    try:
        msg = MIMEMultipart()
        msg['From'] = MAIL_FROM
        msg['To'] = to_email
        msg['Subject'] = subject

        msg.attach(MIMEText(body, 'plain'))

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
