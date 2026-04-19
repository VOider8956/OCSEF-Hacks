import sys
import os
from PIL import Image
import pytesseract
import numpy as np

script_dir = os.path.dirname(os.path.abspath(__file__))

filename = sys.argv[1] if len(sys.argv) > 1 else 'Povray_hello_world.png'

# Search in multiple locations
search_paths = [
    filename,  # Current working directory
    os.path.join(script_dir, filename),  # Script directory
    os.path.join(script_dir, '..', 'TTimages', filename)  
]

found_file = None
for path in search_paths:
    if os.path.exists(path):
        found_file = path
        break

if not found_file:
    print(f"Error: File not found.")
    sys.exit(1)

filename = found_file

img1 = np.array(Image.open(filename))
text = pytesseract.image_to_string(img1)

print(text)

# sorry i dunno how to be able to "image to text" custom images, only the images in this folder
# example: python imagetotext/dudeee.py hey.jpg
