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

ringgitpay_service = RinggitPayService()
