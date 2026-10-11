"""
Script to restore the official RRBM app logo across all web assets and Android native resources.
"""
import os
from PIL import Image, ImageDraw

SOURCE_LOGO_PATH = r"C:\Users\USER\.gemini\antigravity-ide\brain\5bc6176c-e4d5-4be6-8671-6f8498f69709\.user_uploaded\media_1791338441465.jpg"
WORKSPACE_DIR = r"c:\Users\USER\Desktop\RRBM APP"

def restore_logos():
    print(f"Loading source logo from: {SOURCE_LOGO_PATH}")
    src_img = Image.open(SOURCE_LOGO_PATH).convert("RGBA")
    
    # 1. Web and React assets
    web_asset_paths = [
        os.path.join(WORKSPACE_DIR, "src", "assets", "rrb_logo.png"),
        os.path.join(WORKSPACE_DIR, "src", "assets", "rrbm_logo.png"),
        os.path.join(WORKSPACE_DIR, "src", "assets", "official_rrbm_logo.png"),
        os.path.join(WORKSPACE_DIR, "src", "assets", "rrbm_brand_logo.png"),
        os.path.join(WORKSPACE_DIR, "public", "logo.png"),
        os.path.join(WORKSPACE_DIR, "public", "icons", "logo.png"),
    ]
    
    for path in web_asset_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        # Save exact full-resolution lossless PNG
        src_img.save(path, format="PNG", optimize=True)
        print(f"Saved web asset: {path} (1024x1024 PNG)")

    # 2. Android Mipmap Icons
    mipmap_configs = {
        "mipmap-mdpi": {"icon": 48, "fg": 108, "fg_logo": 72},
        "mipmap-hdpi": {"icon": 72, "fg": 162, "fg_logo": 108},
        "mipmap-xhdpi": {"icon": 96, "fg": 216, "fg_logo": 144},
        "mipmap-xxhdpi": {"icon": 144, "fg": 324, "fg_logo": 216},
        "mipmap-xxxhdpi": {"icon": 192, "fg": 432, "fg_logo": 288},
    }
    
    for folder, cfg in mipmap_configs.items():
        res_dir = os.path.join(WORKSPACE_DIR, "android", "app", "src", "main", "res", folder)
        os.makedirs(res_dir, exist_ok=True)
        
        # ic_launcher.png (square with subtle rounded corner or direct square)
        icon_size = (cfg["icon"], cfg["icon"])
        launcher_img = src_img.resize(icon_size, Image.Resampling.LANCZOS)
        launcher_img.save(os.path.join(res_dir, "ic_launcher.png"), format="PNG")
        
        # ic_launcher_round.png (circular mask for round icon launcher)
        round_img = Image.new("RGBA", icon_size, (0, 0, 0, 0))
        mask = Image.new("L", icon_size, 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, icon_size[0], icon_size[1]), fill=255)
        round_img.paste(launcher_img, (0, 0), mask=mask)
        round_img.save(os.path.join(res_dir, "ic_launcher_round.png"), format="PNG")
        
        # ic_launcher_foreground.png (Adaptive icon foreground on transparent canvas)
        fg_size = (cfg["fg"], cfg["fg"])
        fg_logo_size = (cfg["fg_logo"], cfg["fg_logo"])
        fg_img = Image.new("RGBA", fg_size, (0, 0, 0, 0))
        fg_logo = src_img.resize(fg_logo_size, Image.Resampling.LANCZOS)
        pos = ((fg_size[0] - fg_logo_size[0]) // 2, (fg_size[1] - fg_logo_size[1]) // 2)
        fg_img.paste(fg_logo, pos)
        fg_img.save(os.path.join(res_dir, "ic_launcher_foreground.png"), format="PNG")
        
        print(f"Generated launcher icons for {folder}: {icon_size[0]}px, fg: {fg_size[0]}px")

    # 3. Android Splash Screens
    splash_configs = {
        os.path.join("drawable", "splash.png"): (480, 320),
        os.path.join("drawable-land-mdpi", "splash.png"): (480, 320),
        os.path.join("drawable-land-hdpi", "splash.png"): (800, 480),
        os.path.join("drawable-land-xhdpi", "splash.png"): (1280, 720),
        os.path.join("drawable-land-xxhdpi", "splash.png"): (1600, 960),
        os.path.join("drawable-land-xxxhdpi", "splash.png"): (1920, 1280),
        os.path.join("drawable-port-mdpi", "splash.png"): (320, 480),
        os.path.join("drawable-port-hdpi", "splash.png"): (480, 800),
        os.path.join("drawable-port-xhdpi", "splash.png"): (720, 1280),
        os.path.join("drawable-port-xxhdpi", "splash.png"): (960, 1600),
        os.path.join("drawable-port-xxxhdpi", "splash.png"): (1280, 1920),
    }

    # Background color matching dark theme (#060B19 or pure black #000000 matching logo background)
    bg_color = (6, 11, 25, 255) # #060B19

    for rel_path, (w, h) in splash_configs.items():
        target_path = os.path.join(WORKSPACE_DIR, "android", "app", "src", "main", "res", rel_path)
        os.makedirs(os.path.dirname(target_path), exist_ok=True)
        
        splash_img = Image.new("RGBA", (w, h), bg_color)
        
        # Fit logo proportionally inside splash screen (max 45% of min dimension)
        max_logo_dim = int(min(w, h) * 0.45)
        logo_w = max_logo_dim
        logo_h = max_logo_dim
        
        scaled_logo = src_img.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
        paste_x = (w - logo_w) // 2
        paste_y = (h - logo_h) // 2
        
        splash_img.paste(scaled_logo, (paste_x, paste_y), mask=scaled_logo)
        splash_img.convert("RGB").save(target_path, format="PNG")
        print(f"Generated splash screen: {rel_path} ({w}x{h})")

    print("\nAll RRBM official logos restored successfully!")

if __name__ == "__main__":
    restore_logos()
