import hashlib

LICENSE_SALT = "ZAWAR_TRADERS_SECURE_SALT_2026_TANSEEL"
LEGACY_LICENSE_SALT = "MK_ENTERPRISES_SECURE_SALT_2026_TANSEEL"

def generate_key():
    print("="*50)
    print("   Zawar Traders - Secure License Key Generator")
    print("="*50)
    
    hwid = input("Enter the customer's Hardware ID: ").strip()
    
    if not hwid:
        print("Hardware ID cannot be empty.")
        return
        
    raw_string = f"{hwid}-{LICENSE_SALT}"
    hashed = hashlib.md5(raw_string.encode('utf-8')).hexdigest().upper()
    
    print("\n" + "-"*50)
    print(f"Generated License Key (Zawar Traders): {hashed}")
    print("-" * 50 + "\n")

if __name__ == "__main__":
    generate_key()
    input("Press Enter to exit...")
