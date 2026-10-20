#!/bin/bash

# PWA Icon Generator for meetCITAD
# Generates all required icon sizes from logo-symbol.png
# Requires ImageMagick (install with: sudo apt install imagemagick)

echo "meetCITAD PWA Icon Generator"
echo "============================"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "Install it with: sudo apt install imagemagick"
    exit 1
fi

# Source file
SOURCE="./src/assets/images/logo-symbol.png"
OUTPUT_DIR="./public/icons"

# Check if source file exists
if [ ! -f "$SOURCE" ]; then
    echo "❌ Source file not found: $SOURCE"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Icon sizes required for PWA
SIZES=(72 96 128 144 152 180 192 384 512)

echo "Generating PWA icons from logo-symbol.png..."
echo ""

# Generate each icon size
for SIZE in "${SIZES[@]}"; do
    OUTPUT_FILE="$OUTPUT_DIR/icon-${SIZE}x${SIZE}.png"
    
    convert "$SOURCE" \
        -resize ${SIZE}x${SIZE} \
        -background transparent \
        -gravity center \
        -extent ${SIZE}x${SIZE} \
        "$OUTPUT_FILE"
    
    if [ -f "$OUTPUT_FILE" ]; then
        echo "✅ Generated: icon-${SIZE}x${SIZE}.png"
    else
        echo "❌ Failed to generate: icon-${SIZE}x${SIZE}.png"
    fi
done

echo ""
echo "============================"
echo "✅ PWA icon generation complete!"
echo ""
echo "Generated icons are in: $OUTPUT_DIR"
echo ""
echo "Next steps:"
echo "1. Verify icons look good at all sizes"
echo "2. Ensure manifest.json is linked in index.html"
echo "3. Test PWA installation on mobile device"
echo ""
