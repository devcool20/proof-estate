import zipfile
import xml.etree.ElementTree as ET

try:
    with zipfile.ZipFile(r'c:\Users\sharm\OneDrive\Documents\personal-projects\real-estate-using-solana\ProofEstate_ Comprehensive Market Validation Report — India Real Estate Tokenization on Solana (1).docx') as doc:
        xml_content = doc.read('word/document.xml')
        root = ET.fromstring(xml_content)
        namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        text_list = []
        for t in root.findall('.//w:t', namespaces):
            if t.text:
                text_list.append(t.text)
        
        with open('text_utf8.txt', 'w', encoding='utf-8') as f:
            f.write(''.join(text_list))
except Exception as e:
    print('ERROR', e)
