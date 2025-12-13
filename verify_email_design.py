from api.utils.email import get_html_template
import os

def generate_sample():
    # Sample Body with details table and button (simulating "Booking Confirmed")
    html_body = """
        <h1>Booking Confirmed!</h1>
        <p>Hello Naresh,</p>
        <p>Your parking spot has been successfully booked. Below are your booking details:</p>
        
        <table class="details-table">
            <tr>
                <th>Booking ID</th>
                <td>#12345</td>
            </tr>
            <tr>
                <th>Spot</th>
                <td><strong>Ground - A1</strong></td>
            </tr>
            <tr>
                <th>Vehicle</th>
                <td>ABC 1234</td>
            </tr>
            <tr>
                <th>Start Time</th>
                <td>2025-10-25 10:00:00</td>
            </tr>
            <tr>
                <th>End Time</th>
                <td>2025-10-25 12:00:00</td>
            </tr>
        </table>
        
        <div class="highlight-box">
            <span style="font-size: 14px; color: #4f46e5; font-weight: 700; text-transform: uppercase;">Total Paid</span><br>
            <span style="font-size: 24px; color: #111827; font-weight: 900;">MYR 15.00</span>
        </div>
        
        <p>Thank you for using ParkPro!</p>
        
        <center>
            <a href="#" class="btn">View My Bookings</a>
        </center>
    """
    
    full_html = get_html_template("Booking Confirmed - ParkPro", html_body, is_html=True)
    
    output_path = os.path.abspath("email_preview.html")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(full_html)
        
    print(f"Generated email preview at: {output_path}")

if __name__ == "__main__":
    generate_sample()
