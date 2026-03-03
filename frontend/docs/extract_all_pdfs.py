import pathlib, sys
from PyPDF2 import PdfReader

def extract(path, limit=2000):
    p = pathlib.Path(path)
    if not p.is_file():
        return f'File not found: {path}'
    try:
        reader = PdfReader(str(p))
    except Exception as e:
        return f'Error reading {p.name}: {e}'
    text = ''
    for page in reader.pages:
        txt = page.extract_text()
        if txt:
            text += txt + '\n'
    return text[:limit]

if __name__ == '__main__':
    docs_dir = pathlib.Path(r"c:/Users/sharm/OneDrive/Documents/personal-projects/real-estate-using-solana/frontend/docs")
    for pdf in docs_dir.glob('*.pdf'):
        print('---', pdf.name, '---')
        print(extract(pdf, 3000))
        print('\n')
