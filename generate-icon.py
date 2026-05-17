from PIL import Image, ImageDraw, ImageFilter
import math

SIZE = 1024
img = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 255))
draw = ImageDraw.Draw(img)

# Dark space gradient background (top: deep navy → bottom: electric purple)
for y in range(SIZE):
    t = y / SIZE
    r = int(8  + (58  - 8)  * t)
    g = int(8  + (14  - 8)  * t)
    b = int(32 + (130 - 32) * t)
    draw.line([(0, y), (SIZE-1, y)], fill=(r, g, b, 255))

# Electric glow rings (layered circles for depth)
cx, cy = SIZE // 2, SIZE // 2
glow_layer = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
gd = ImageDraw.Draw(glow_layer)
for i in range(8, 0, -1):
    r_val = 260 + i * 12
    alpha = int(18 * i)
    gd.ellipse([cx-r_val, cy-r_val, cx+r_val, cy+r_val], fill=(120, 80, 255, alpha))
glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(30))
img = Image.alpha_composite(img, glow_layer)
draw = ImageDraw.Draw(img)

# Outer circle (bright purple ring)
ring_r = 390
draw.ellipse([cx-ring_r, cy-ring_r, cx+ring_r, cy+ring_r],
             outline=(160, 100, 255, 200), width=6)

# Inner circle (dimmer)
draw.ellipse([cx-310, cy-310, cx+310, cy+310],
             outline=(100, 60, 200, 100), width=3)

# Lightning bolt ⚡ — large, centered, electric yellow
bolt = [
    (cx+30,  cy-280),   # top-right
    (cx-20,  cy-30),    # mid-left
    (cx+60,  cy-30),    # mid-right
    (cx-50,  cy+280),   # bottom-left
    (cx+10,  cy+10),    # mid-right lower
    (cx-40,  cy+10),    # mid-left lower
    (cx+30,  cy-280),   # back to top
]
# Glow behind bolt
glow2 = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
gd2 = ImageDraw.Draw(glow2)
for offset, alpha in [(12, 40), (8, 60), (4, 90)]:
    expanded = [(x + offset if x > cx else x - offset,
                 y + offset if y > cy else y - offset) for x, y in bolt]
    gd2.polygon(expanded, fill=(255, 220, 50, alpha))
glow2 = glow2.filter(ImageFilter.GaussianBlur(15))
img = Image.alpha_composite(img, glow2)
draw = ImageDraw.Draw(img)

# Main bolt — electric yellow-white
draw.polygon(bolt, fill=(255, 235, 60, 255))
# Highlight (inner lighter stripe)
inner = [(x - 10 if x > cx else x + 10, y) for x, y in bolt]
draw.polygon(inner, fill=(255, 255, 200, 180))

# Cyan spark dots around bolt (ADHD visual excitement)
sparks = [
    (cx+200, cy-180, 14, (0, 230, 255)),
    (cx-190, cy-150, 10, (180, 100, 255)),
    (cx+220, cy+140, 12, (0, 230, 255)),
    (cx-200, cy+160, 8,  (255, 180, 50)),
    (cx+100, cy-270, 8,  (180, 100, 255)),
    (cx-120, cy+250, 10, (0, 230, 255)),
]
for sx, sy, sr, sc in sparks:
    draw.ellipse([sx-sr, sy-sr, sx+sr, sy+sr], fill=sc + (255,))

# "NF" text at bottom (bold, white)
# Use basic text rendering
try:
    from PIL import ImageFont
    font_lg = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 130)
    font_sm = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 52)
except:
    font_lg = ImageFont.load_default()
    font_sm = font_lg

# "NF" monogram
bbox = draw.textbbox((0,0), "NF", font=font_lg)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
tx = cx - tw // 2
ty = cy + 320

# Shadow
draw.text((tx+4, ty+4), "NF", font=font_lg, fill=(0, 0, 80, 150))
# Main text
draw.text((tx, ty), "NF", font=font_lg, fill=(255, 255, 255, 255))

# "NeuroFocus" subtitle
try:
    bbox2 = draw.textbbox((0,0), "NeuroFocus", font=font_sm)
    tw2 = bbox2[2] - bbox2[0]
    draw.text((cx - tw2//2, ty + th + 8), "NeuroFocus", font=font_sm, fill=(180, 160, 255, 220))
except:
    pass

# Convert to RGB for saving
final = Image.new('RGB', (SIZE, SIZE), (0,0,0))
final.paste(img, mask=img.split()[3])
final.save('/Users/farhanapervin/Desktop/NeuroFocus/assets/icon.png')
final.save('/Users/farhanapervin/Desktop/NeuroFocus/assets/adaptive-icon.png')

# Splash screen — wider, centered bolt on dark bg
splash = Image.new('RGB', (2048, 2048), (13, 8, 43))
sd = ImageDraw.Draw(splash)
sc2 = 1024
for y in range(2048):
    t = y / 2048
    r = int(8  + (58  - 8)  * t)
    g = int(8  + (14  - 8)  * t)
    b = int(32 + (130 - 32) * t)
    sd.line([(0, y), (2047, y)], fill=(r, g, b))

bolt_s = [(sc2+45, sc2-320), (sc2-25, sc2-40), (sc2+75, sc2-40),
          (sc2-60, sc2+320), (sc2+15, sc2+20), (sc2-45, sc2+20), (sc2+45, sc2-320)]
sd.polygon(bolt_s, fill=(255, 235, 60))
try:
    font_sp = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 180)
    bbox_s = sd.textbbox((0,0), "NeuroFocus", font=font_sp)
    tw_s = bbox_s[2] - bbox_s[0]
    sd.text((sc2 - tw_s//2, sc2 + 380), "NeuroFocus", font=font_sp, fill=(255,255,255))
except:
    pass
splash.save('/Users/farhanapervin/Desktop/NeuroFocus/assets/splash.png')

print("✓ icon.png, adaptive-icon.png, splash.png generated")
