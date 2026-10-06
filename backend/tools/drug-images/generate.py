"""Tạo ảnh minh họa thuốc (PNG 512x512) theo dạng bào chế và nhóm thuốc.

Chạy: py backend/tools/drug-images/generate.py
Đọc backend/Pharmacy.Core/Data/Seed/catalog.json, ghi backend/Pharmacy.Core/Data/Assets/drugs/<drugId>.png.
Ảnh do nhóm tự vẽ bằng hình khối đơn giản, không dùng ảnh sản phẩm của bên thứ ba.
"""
import json
import math
import textwrap
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[3]
CATALOG = ROOT / "backend/Pharmacy.Core/Data/Seed/catalog.json"
OUT = ROOT / "backend/Pharmacy.Core/Data/Assets/drugs"
S = 4  # supersampling
W = H = 512 * S

# Màu theo nhóm: (nền nhạt, màu chính, màu đậm)
GROUPS = {
    "pain": ((254, 236, 236), (229, 72, 77), (153, 27, 27)),
    "antibiotic": ((232, 240, 254), (59, 130, 246), (30, 64, 175)),
    "digestive": ((231, 248, 238), (22, 163, 74), (20, 83, 45)),
    "respiratory": ((228, 247, 247), (13, 148, 136), (17, 94, 89)),
    "allergy": ((243, 236, 254), (139, 92, 246), (91, 33, 182)),
    "vitamin": ((255, 243, 224), (245, 140, 20), (154, 52, 18)),
    "chronic": ((236, 238, 254), (79, 70, 229), (55, 48, 163)),
    "skin": ((253, 236, 246), (219, 39, 119), (131, 24, 67)),
    "eyenose": ((230, 246, 253), (14, 165, 233), (7, 89, 133)),
    "controlled": ((238, 240, 243), (71, 85, 105), (30, 41, 59)),
}
WHITE = (255, 255, 255)
SILVER = (214, 220, 228)
SHADOW = (0, 0, 0, 40)


def font(size, bold=False):
    names = ["segoeuib.ttf", "arialbd.ttf"] if bold else ["segoeui.ttf", "arial.ttf"]
    for name in names:
        path = Path("C:/Windows/Fonts") / name
        if path.exists():
            return ImageFont.truetype(str(path), size * S)
    return ImageFont.load_default()


def r(v):
    return int(v * S)


def rect(d, box, radius, fill, outline=None, width=0):
    d.rounded_rectangle([r(x) for x in box], radius=r(radius), fill=fill, outline=outline, width=r(width))


def ellipse(d, box, fill, outline=None, width=0):
    d.ellipse([r(x) for x in box], fill=fill, outline=outline, width=r(width))


def shadow(img, box, radius=24):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    x0, y0, x1, y1 = box
    ld.rounded_rectangle([r(x0 + 6), r(y0 + 10), r(x1 + 6), r(y1 + 10)], radius=r(radius), fill=SHADOW)
    img.alpha_composite(layer)


def pill(d, cx, cy, w, h, angle, c1, c2):
    """Viên nang hai màu, xoay theo góc."""
    layer = Image.new("RGBA", (r(w) + 8, r(h) + 8), (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle([4, 4, r(w) + 4, r(h) + 4], radius=r(h) // 2, fill=c1)
    ld.rounded_rectangle([4 + r(w) // 2, 4, r(w) + 4, r(h) + 4], radius=r(h) // 2, fill=c2)
    ld.rectangle([4 + r(w) // 2, 4, 4 + r(w) // 2 + r(h) // 2, r(h) + 4], fill=c2)
    layer = layer.rotate(angle, expand=True, resample=Image.BICUBIC)
    d._image.alpha_composite(layer, (r(cx) - layer.width // 2, r(cy) - layer.height // 2))


def draw_blister(img, d, g, capsule=False):
    shadow(img, (116, 70, 396, 350))
    rect(d, (116, 70, 396, 350), 26, SILVER, outline=(190, 198, 208), width=3)
    for row in range(3):
        for col in range(2):
            cx, cy = 186 + col * 140, 120 + row * 90
            ellipse(d, (cx - 52, cy - 34, cx + 52, cy + 34), (236, 240, 245), outline=(200, 206, 214), width=2)
            if capsule:
                pill(d, cx, cy, 84, 34, 0, g[1], WHITE)
            else:
                ellipse(d, (cx - 36, cy - 24, cx + 36, cy + 24), WHITE, outline=g[1], width=4)
                d.line([r(cx - 20), r(cy), r(cx + 20), r(cy)], fill=g[1], width=r(3))


def draw_effervescent(img, d, g):
    shadow(img, (176, 60, 336, 360), 30)
    rect(d, (176, 92, 336, 360), 30, WHITE, outline=g[1], width=4)
    rect(d, (168, 60, 344, 104), 16, g[1])
    rect(d, (176, 170, 336, 270), 0, g[1])
    for i, (x, y) in enumerate([(220, 140), (290, 130), (250, 310), (300, 300)]):
        ellipse(d, (x - 10, y - 10, x + 10, y + 10), (*g[0], 255), outline=g[1], width=2)
    ellipse(d, (360, 250, 440, 330), WHITE, outline=g[1], width=4)
    d.line([r(372), r(290), r(428), r(290)], fill=g[1], width=r(4))


def draw_sachet(img, d, g):
    shadow(img, (136, 70, 376, 350))
    rect(d, (136, 70, 376, 350), 18, g[1])
    for x in range(144, 372, 12):
        d.polygon([(r(x), r(70)), (r(x + 6), r(60)), (r(x + 12), r(70))], fill=g[1])
        d.polygon([(r(x), r(350)), (r(x + 6), r(360)), (r(x + 12), r(350))], fill=g[1])
    rect(d, (166, 130, 346, 290), 14, WHITE)
    ellipse(d, (226, 160, 286, 220), g[0], outline=g[1], width=4)
    rect(d, (196, 236, 316, 252), 8, g[0])
    rect(d, (216, 262, 296, 274), 6, g[0])


def draw_patch(img, d, g):
    shadow(img, (96, 120, 416, 320))
    rect(d, (96, 120, 416, 320), 40, (246, 226, 206), outline=(220, 190, 160), width=3)
    rect(d, (186, 150, 326, 290), 20, (250, 238, 226))
    for i in range(3):
        for j in range(3):
            ellipse(d, (206 + i * 40, 170 + j * 40, 214 + i * 40, 178 + j * 40), (220, 190, 160))
    rect(d, (96, 196, 136, 244), 8, g[1])
    rect(d, (376, 196, 416, 244), 8, g[1])


def draw_capsule(img, d, g):
    draw_blister(img, d, g, capsule=True)


def draw_pillbottle(img, d, g):
    shadow(img, (156, 80, 356, 360), 30)
    rect(d, (166, 60, 346, 112), 14, g[2])
    for x in range(176, 340, 16):
        d.line([r(x), r(66), r(x), r(106)], fill=g[1], width=r(3))
    rect(d, (156, 108, 356, 360), 30, WHITE, outline=g[1], width=4)
    rect(d, (156, 170, 356, 300), 0, g[1])
    pill(d, 256, 235, 96, 40, 20, WHITE, g[0])


def draw_vial(img, d, g):
    for i, x in enumerate([186, 256, 326]):
        shadow(img, (x - 28, 90, x + 28, 350), 24)
        rect(d, (x - 28, 120, x + 28, 350), 24, WHITE, outline=g[1], width=4)
        rect(d, (x - 20, 90, x + 20, 126), 8, g[1])
        rect(d, (x - 28, 230, x + 28, 330), 0, (*g[0], 255))
        rect(d, (x - 28, 230, x + 28, 244), 0, g[1])


def draw_syrup(img, d, g):
    shadow(img, (166, 60, 346, 360), 34)
    rect(d, (210, 60, 302, 104), 10, g[2])
    rect(d, (226, 100, 286, 130), 6, (120, 70, 40))
    rect(d, (166, 126, 346, 360), 40, (150, 86, 46))
    rect(d, (176, 140, 336, 350), 34, (176, 106, 60))
    rect(d, (186, 190, 326, 310), 12, WHITE)
    rect(d, (186, 190, 326, 222), 12, g[1])
    rect(d, (206, 240, 306, 252), 6, g[0])
    rect(d, (216, 266, 296, 278), 6, g[0])
    # Muỗng đong
    rect(d, (356, 270, 426, 300), 14, g[1])
    ellipse(d, (346, 250, 396, 320), g[1])


def draw_inhaler(img, d, g):
    shadow(img, (156, 70, 326, 350), 40)
    rect(d, (176, 60, 286, 250), 30, g[1])
    rect(d, (186, 70, 276, 110), 12, g[2])
    rect(d, (156, 210, 366, 330), 40, WHITE, outline=g[1], width=5)
    rect(d, (306, 236, 400, 304), 18, g[2])


def draw_box(img, d, g):
    shadow(img, (116, 90, 396, 350))
    d.polygon([(r(116), r(120)), (r(176), r(70)), (r(436), r(70)), (r(396), r(120))], fill=g[2])
    d.polygon([(r(396), r(120)), (r(436), r(70)), (r(436), r(300)), (r(396), r(350))], fill=g[1])
    rect(d, (116, 120, 396, 350), 6, WHITE, outline=g[1], width=4)
    rect(d, (116, 120, 396, 180), 0, g[1])
    pill(d, 256, 255, 120, 48, -18, g[1], g[0])
    rect(d, (146, 310, 366, 324), 6, g[0])


def draw_tube(img, d, g):
    layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ld = ImageDraw.Draw(layer)
    ld.rounded_rectangle([r(150), r(150), r(400), r(270)], radius=r(26), fill=WHITE, outline=g[1], width=r(4))
    ld.polygon([(r(150), r(150)), (r(110), r(140)), (r(110), r(280)), (r(150), r(270))], fill=g[1])
    ld.rectangle([r(240), r(150), r(310), r(270)], fill=g[1])
    ld.rounded_rectangle([r(400), r(185), r(436), r(235)], radius=r(8), fill=g[2])
    ld.rounded_rectangle([r(430), r(178), r(470), r(242)], radius=r(10), fill=g[2])
    layer = layer.rotate(18, resample=Image.BICUBIC, center=(r(290), r(210)))
    shadow(img, (130, 160, 440, 300), 30)
    img.alpha_composite(layer)


def draw_bottle(img, d, g):
    shadow(img, (166, 70, 346, 360), 34)
    rect(d, (216, 60, 296, 110), 12, g[2])
    rect(d, (196, 104, 316, 134), 10, g[1])
    rect(d, (166, 128, 346, 360), 36, WHITE, outline=g[1], width=4)
    rect(d, (166, 190, 346, 310), 0, g[1])
    d.line([r(256), r(215), r(256), r(285)], fill=WHITE, width=r(14))
    d.line([r(221), r(250), r(291), r(250)], fill=WHITE, width=r(14))


def draw_dropper(img, d, g):
    shadow(img, (186, 60, 326, 360), 30)
    d.polygon([(r(236), r(60)), (r(276), r(60)), (r(266), r(120)), (r(246), r(120))], fill=g[2])
    rect(d, (216, 112, 296, 160), 10, g[1])
    rect(d, (186, 154, 326, 360), 30, WHITE, outline=g[1], width=4)
    rect(d, (186, 220, 326, 300), 0, g[0])
    ellipse(d, (236, 236, 276, 284), g[1])
    ellipse(d, (360, 140, 392, 180), g[1])
    d.polygon([(r(376), r(118)), (r(362), r(148)), (r(390), r(148))], fill=g[1])


def draw_spray(img, d, g):
    shadow(img, (186, 60, 326, 360), 30)
    d.polygon([(r(236), r(56)), (r(276), r(56)), (r(270), r(110)), (r(242), r(110))], fill=g[2])
    rect(d, (206, 104, 306, 146), 12, g[1])
    rect(d, (186, 140, 326, 360), 30, WHITE, outline=g[1], width=4)
    rect(d, (186, 200, 326, 300), 0, g[1])
    for i in range(5):
        a = math.radians(-60 + i * 12)
        x, y = 290 + math.cos(a) * 70, 70 + math.sin(a) * 40
        ellipse(d, (x - 5, y - 5, x + 5, y + 5), g[1])


DRAW = {
    "blister": draw_blister, "effervescent": draw_effervescent, "sachet": draw_sachet,
    "patch": draw_patch, "capsule": draw_capsule, "pillbottle": draw_pillbottle,
    "vial": draw_vial, "syrup": draw_syrup, "inhaler": draw_inhaler, "box": draw_box,
    "tube": draw_tube, "bottle": draw_bottle, "dropper": draw_dropper, "spray": draw_spray,
}


def render(name, form, group):
    g = GROUPS[group]
    img = Image.new("RGBA", (W, H), (*g[0], 255))
    d = ImageDraw.Draw(img)
    ellipse(d, (76, 30, 436, 390), (*[min(255, c + 8) for c in g[0]], 255))
    DRAW[form](img, d, g)
    # Nhãn tên thuốc
    rect(d, (36, 396, 476, 488), 22, WHITE)
    lines = textwrap.wrap(name, width=26)[:2]
    f = font(30 if len(lines) == 1 else 25, bold=True)
    total = len(lines)
    for i, line in enumerate(lines):
        y = 442 + (i - (total - 1) / 2) * 32
        d.text((r(256), r(y)), line, font=f, fill=g[2], anchor="mm")
    return img.resize((512, 512), Image.LANCZOS).convert("RGB")


def main():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    legacy_names = {
        "PARA500": "Paracetamol 500mg", "DEMO02": "Vitamin C", "DEMO03": "Nước muối sinh lý",
        "DEMO04": "Oresol", "DEMO05": "Cetirizine", "DEMO06": "Kẽm", "DEMO07": "Amoxicillin",
        "DEMO08": "Cefixime", "DEMO09": "Metformin", "DEMO10": "Amlodipine", "DEMO11": "Diazepam",
        "DEMO12": "Thuốc ngừng bán",
    }
    count = 0
    for drug_id, spec in catalog["legacyImages"].items():
        render(legacy_names[drug_id], spec["form"], spec["group"]).save(OUT / f"{drug_id}.png", optimize=True)
        count += 1
    for drug in catalog["drugs"]:
        render(drug["name"], drug["form"], drug["group"]).save(OUT / f"{drug['id']}.png", optimize=True)
        count += 1
    print(f"Đã tạo {count} ảnh trong {OUT}")


if __name__ == "__main__":
    main()
