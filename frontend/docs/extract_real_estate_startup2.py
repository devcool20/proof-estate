import pathlib
from pdfminer.high_level import extract_text

pdf_path = pathlib.Path(r"c:/Users/sharm/OneDrive/Documents/personal-projects/real-estate-using-solana/frontend/docs/Blockchain Real Estate Startup.pdf")
text = extract_text(str(pdf_path))
# Print first 5000 characters for overview
print(text[:5000])
