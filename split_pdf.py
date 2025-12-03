#!/usr/bin/env python3
"""Split PDF files into smaller chunks for processing."""

import sys
from pypdf import PdfReader, PdfWriter
from pathlib import Path

def split_pdf(input_path, pages_per_chunk=20):
    """Split a PDF into smaller chunks."""
    input_path = Path(input_path)
    reader = PdfReader(input_path)
    total_pages = len(reader.pages)

    print(f"Processing: {input_path.name}")
    print(f"Total pages: {total_pages}")

    # Create output directory
    output_dir = input_path.parent / f"{input_path.stem}_split"
    output_dir.mkdir(exist_ok=True)

    # Split into chunks
    chunk_num = 1
    for start_page in range(0, total_pages, pages_per_chunk):
        end_page = min(start_page + pages_per_chunk, total_pages)

        writer = PdfWriter()
        for page_num in range(start_page, end_page):
            writer.add_page(reader.pages[page_num])

        output_path = output_dir / f"{input_path.stem}_part{chunk_num}_pages{start_page+1}-{end_page}.pdf"
        with open(output_path, 'wb') as output_file:
            writer.write(output_file)

        print(f"  Created: {output_path.name} (pages {start_page+1}-{end_page})")
        chunk_num += 1

    print(f"Split complete! {chunk_num-1} chunks created in {output_dir}")
    return output_dir

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python split_pdf.py <pdf_file> [pages_per_chunk]")
        sys.exit(1)

    input_file = sys.argv[1]
    pages_per_chunk = int(sys.argv[2]) if len(sys.argv) > 2 else 20

    split_pdf(input_file, pages_per_chunk)
