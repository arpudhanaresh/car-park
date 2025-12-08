from pypdf import PdfReader
import os

pdf_path = "../docs/RinggitPay_Payment Gateway Integration & Testing _Guide_v1.19.pdf"

try:
    reader = PdfReader(pdf_path)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    
    with open("pdf_content.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("Done writing to pdf_content.txt")
except Exception as e:
    print(f"Error reading PDF: {e}")
