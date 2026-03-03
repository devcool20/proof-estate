import pathlib, sys
from PyPDF2 import PdfReader

def extract(path):
    p = pathlib.Path(path)
    if not p.is_file():
        print(f'File not found: {path}')
        return
    reader = PdfReader(str(p))
    text = ''
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            text += txt + '\n'
    print(text[:5000])

if __name__ == '__main__':
    if len(sys.argv) > 1:
        pdf_path = sys.argv[1]
    else:
        pdf_path = r"c:/Users/sharm/OneDrive/Documents/personal-projects/real-estate-using-solana/frontend/docs/Blockchain & Real Estate in India_ Startup Opportunities.pdf"
    extract(pdf_path)
