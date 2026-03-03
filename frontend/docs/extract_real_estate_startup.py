import pathlib, sys
from PyPDF2 import PdfReader

pdf_path = pathlib.Path(r"c:/Users/sharm/OneDrive/Documents/personal-projects/real-estate-using-solana/frontend/docs/Blockchain Real Estate Startup.pdf")
reader = PdfReader(str(pdf_path))
text = "\n".join(page.extract_text() or "" for page in reader.pages)
print(text[:5000])
