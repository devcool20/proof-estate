import re

path = r"c:\Users\sharm\OneDrive\Documents\personal-projects\real-estate-using-solana\frontend\src\app\explore\[id]\page.tsx"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix modal image in the acquisition modal - line 231 area
old = 'property.images[0] : "https://images.unsplash.com/photo-1600607687920-4e2a868f0bbb?q=80&w=800&auto=format&fit=crop"} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />'
new = 'property.images[0]) : (property.image_url ? getDocUrl(property.image_url) : "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=800&auto=format&fit=crop")} alt={property.name} className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-luminosity" />'

if old in content:
    content = content.replace(old, new)
    print("Replaced modal image!")
else:
    # Try partial match to see what's there
    if 'photo-1600607687920' in content:
        # find the relevant line
        for i, line in enumerate(content.split('\n')):
            if 'photo-1600607687920' in line and 'opacity-30' in line:
                print(f"Line {i+1}: {repr(line[:120])}")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done.")
