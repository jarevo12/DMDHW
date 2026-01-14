#!/usr/bin/env python3
"""
Generate PNG icons from SVG source for Axiom Forge PWA
Creates all required icon sizes for iOS, Android, and web manifest
"""

import cairosvg
import os

# Icon sizes needed for the PWA
ICON_SIZES = [72, 96, 128, 144, 152, 180, 192, 384, 512]

# Paths
SVG_SOURCE = 'assets/logo-white-back.svg'
OUTPUT_DIR = 'assets/icons'

def generate_icons():
    """Generate all PNG icons from the SVG source"""

    # Ensure output directory exists
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"🎨 Generating PNG icons from {SVG_SOURCE}")
    print(f"📁 Output directory: {OUTPUT_DIR}\n")

    # Generate each size
    for size in ICON_SIZES:
        output_file = f'{OUTPUT_DIR}/icon-{size}.png'

        try:
            cairosvg.svg2png(
                url=SVG_SOURCE,
                write_to=output_file,
                output_width=size,
                output_height=size
            )
            print(f"✅ Generated {output_file} ({size}x{size})")
        except Exception as e:
            print(f"❌ Failed to generate {output_file}: {e}")

    # Also update the base icon.svg to match the new logo
    print(f"\n📝 Note: Remember to manually update {OUTPUT_DIR}/icon.svg with the new logo")
    print(f"✨ Icon generation complete!")

if __name__ == '__main__':
    generate_icons()
