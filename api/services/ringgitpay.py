import hashlib
import os

class RinggitPayService:
    def __init__(self):
        self.app_id = os.getenv("RINGGITPAY_APP_ID")
        self.request_key = os.getenv("RINGGITPAY_REQUEST_KEY")
        self.response_key = os.getenv("RINGGITPAY_RESPONSE_KEY")
        self.env = os.getenv("RINGGITPAY_ENV", "UAT")
        self.payment_url = os.getenv("RINGGITPAY_UAT_URL", "https://ringgitpay.co/payment")
        
        if self.env == "PRODUCTION":
            self.payment_url = "https://ringgitpay.com/payment"

    def generate_request_checksum(self, currency: str, amount: str, order_id: str) -> str:
        """
        Format: appId|currency|amount|orderId|REQUESTKEY
        """
        # Ensure exact format: 2 decimal places for amount is usually required, but string is safer if already formatted
        # PDF Example: 5000.00
        
        # Source string construction
        source_string = f"{self.app_id}|{currency}|{amount}|{order_id}|{self.request_key}"
        
        # SHA256 and Uppercase
        checksum = hashlib.sha256(source_string.encode('utf-8')).hexdigest().upper()
        return checksum

    def verify_response_checksum(self, rp_app_id, rp_currency, rp_amount, rp_status_code, rp_order_id, rp_transaction_ref, rp_checksum):
        """
        Format: rp_appId|rp_currency|rp_amount|rp_statusCode|rp_orderId|rp_transactionRef|RESPONSEKEY
        """
        source_string = f"{rp_app_id}|{rp_currency}|{rp_amount}|{rp_status_code}|{rp_order_id}|{rp_transaction_ref}|{self.response_key}"
        
        calculated_checksum = hashlib.sha256(source_string.encode('utf-8')).hexdigest().upper()
        
        return calculated_checksum == rp_checksum

    def generate_enquiry_checksum(self, order_id: str, transaction_ref: str = None) -> str:
        """
        Format: appId|orderId|Transaction reference|REQUESTKEY
        (If no transaction_ref, do not include it in the pipe sequence as per examples, 
         BUT checking PDF example 'RPA...|RP...||KEY' it means empty string if missing)
        """
        tr_ref = transaction_ref if transaction_ref else ""
        source_string = f"{self.app_id}|{order_id}|{tr_ref}|{self.request_key}"
        checksum = hashlib.sha256(source_string.encode('utf-8')).hexdigest().upper()
        return checksum

    def check_status(self, order_id: str, transaction_ref: str = None):
        import requests
        
        checksum = self.generate_enquiry_checksum(order_id, transaction_ref)
        
        # Determine URL based on env
        enquiry_url = "https://ringgitpay.co/transactionenquiry"
        if self.env == "PRODUCTION":
            enquiry_url = "https://ringgitpay.com/transactionenquiry"
            
        payload = {
            "appId": self.app_id,
            "orderId": order_id,
            "checkSum": checksum
        }
        if transaction_ref:
            payload["transactionRef"] = transaction_ref
            
        try:
            # Using content-type application/x-www-form-urlencoded as per PDF req likely? 
            # PDF says "Name-Value Pair (NVP) format" and "via HTML form elements".
            # requests.post(data=...) sends form-encoded.
            response = requests.post(enquiry_url, data=payload)
            response.raise_for_status()
            
            # Response is supposedly NVP (could be JSON judging by PDF sample response brackets? PDF sample shows JSON format {})
            # Sample Response in PDF shows JSON-like structure: { "rp_appId": ... }
            # Let's try parsing JSON.
            try:
                return response.json()
            except ValueError:
                # Fallback if it returns plain text NVP? But PDF sample has {}, so JSON is likely.
                # If not JSON, we might need manual parsing. 
                # Given modern gateways logic and PDF sample, assuming JSON first.
                return response.text
                
        except Exception as e:
            print(f"Error checking RinggitPay status: {e}")
            return None

ringgitpay_service = RinggitPayService()
