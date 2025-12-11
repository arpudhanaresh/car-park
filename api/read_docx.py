import zipfile
import xml.etree.ElementTree as ET
import os

def docx_to_txt(docx_path, txt_path):
    try:
        with zipfile.ZipFile(docx_path) as z:
            xml_content = z.read('word/document.xml')
        
        tree = ET.fromstring(xml_content)
        
        # Word XML namespace often uses 'w' for everything
        # We can iterate through all elements and look for 't' (text) tags 
        # inside 'p' (paragraph) tags to be more generic avoiding strict namespace matching issues
        
        text_content = []
        
        # Using a more generic iteration to capture text nodes
        for elem in tree.iter():
            if elem.tag.endswith('}p'): # paragraph
                para_text = []
                for child in elem.iter():
                    if child.tag.endswith('}t') and child.text:
                        para_text.append(child.text)
                if para_text:
                    text_content.append(''.join(para_text))
        
        full_text = '\n'.join(text_content)
        
        with open(txt_path, 'w', encoding='utf-8') as f:
            f.write(full_text)
            
        print(f"Successfully converted {docx_path} to {txt_path}")
        return True
    except Exception as e:
        print(f"Error converting docx: {e}")
        return False

if __name__ == "__main__":
    # Script is in api/, content is in docs/
    base_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(base_dir) # Go up from api/ to card-park/
    doc_path = os.path.join(project_root, "docs", "Ascertain_Parking_Lot_BRD_v2_Updated.docx")
    txt_path = os.path.join(project_root, "docs", "brd_content.txt")
    
    print(f"Looking for: {doc_path}")
    if os.path.exists(doc_path):
        docx_to_txt(doc_path, txt_path)
    else:
        print(f"File not found: {doc_path}")
