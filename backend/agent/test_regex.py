import re

def enhance_sinhala_pronunciation(text: str) -> str:
    # 1. Convert any currency prefix to "රුපියල්"
    # This handles Rs., LKR, රු., රුපියල් with optional spaces.
    text = re.sub(r'(Rs\.?|LKR|රු\.|රුපියල්)\s*([\d,]+)\.(\d{1,2})', r'රුපියල් \2 යි සත \3', text, flags=re.IGNORECASE)
    
    # 1.2 Convert whole rupees (no cents)
    text = re.sub(r'(Rs\.?|LKR|රු\.|රුපියල්)\s*([\d,]+)(?!\.)', r'රුපියල් \2', text, flags=re.IGNORECASE)
    
    # 1.7 Fix Decimals with commas support (for anything left over)
    def replace_decimals(match):
        return f"{match.group(1).replace(',', '')} දශම {match.group(2)}"
    text = re.sub(r'([\d,]+)\.(\d+)', replace_decimals, text)
    
    return text

print(enhance_sinhala_pronunciation("Rs. 500.25"))
print(enhance_sinhala_pronunciation("LKR 1000.50"))
print(enhance_sinhala_pronunciation("රු. 1,500.75"))
print(enhance_sinhala_pronunciation("රුපියල් 200.00"))
print(enhance_sinhala_pronunciation("රු. 500"))
print(enhance_sinhala_pronunciation("10.5"))
