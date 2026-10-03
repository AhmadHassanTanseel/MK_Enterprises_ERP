import hashlib
import sys

SALT = "MK_ENTERPRISES_SECURE_SALT_2026_TANSEEL"

def generate_key(hwid):
    raw = f"{hwid}-{SALT}"
    key = hashlib.md5(raw.encode('utf-8')).hexdigest().upper()
    return key

if __name__ == "__main__":
    print("=========================================")
    print("MK Enterprises - License Key Generator")
    print("=========================================")
    
    hwid = input("Enter the client's Hardware ID: ").strip()
    
    if not hwid:
        print("Error: Hardware ID cannot be empty.")
        sys.exit(1)
        
    key = generate_key(hwid)
    
    print("\n[SUCCESS] License Key Generated!")
    print(f"Hardware ID : {hwid}")
    print(f"License Key : {key}")
    print("=========================================")
    input("Press Enter to exit...")
