# -*- coding: utf-8 -*-
"""
core/slide_loader.py
Загрузка слайдов из PDF или папки с изображениями.
"""

import os
import sys
import glob
import numpy as np
import cv2

try:
    import fitz   # PyMuPDF
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False

SLIDE_W, SLIDE_H = 1280, 720
PDF_DPI          = 150
SLIDE_EXTS       = ("*.png", "*.jpg", "*.jpeg", "*.bmp")


def load_pdf(pdf_path: str,
             width: int = SLIDE_W,
             height: int = SLIDE_H,
             dpi: int = PDF_DPI) -> list[np.ndarray]:
    """Загружает PDF и возвращает список BGR-изображений."""
    if not PDF_SUPPORT:
        print("❌ PyMuPDF не установлен: pip install pymupdf")
        return []
    if not os.path.isfile(pdf_path):
        print(f"❌ Файл не найден: {pdf_path}")
        return []

    doc  = fitz.open(pdf_path)
    zoom = dpi / 72.0
    mat  = fitz.Matrix(zoom, zoom)
    slides = []

    print(f"📄 {os.path.basename(pdf_path)}  ({len(doc)} стр.)")
    for i in range(len(doc)):
        page = doc.load_page(i)
        pix  = page.get_pixmap(matrix=mat, alpha=False)
        img  = np.frombuffer(pix.samples, dtype=np.uint8).reshape(pix.height, pix.width, 3)
        img  = cv2.cvtColor(img, cv2.COLOR_RGB2BGR)
        img  = cv2.resize(img, (width, height))
        slides.append(img)
        sys.stdout.write(f"\r  {i+1}/{len(doc)}")
        sys.stdout.flush()
    doc.close()
    print(f"\n✅ Загружено {len(slides)} слайдов")
    return slides


def load_folder(folder: str,
                width: int = SLIDE_W,
                height: int = SLIDE_H) -> list[np.ndarray]:
    """Загружает изображения из папки."""
    paths = []
    for ext in SLIDE_EXTS:
        paths.extend(glob.glob(os.path.join(folder, ext)))
    paths.sort()
    slides = []
    for p in paths:
        img = cv2.imread(p)
        if img is not None:
            slides.append(cv2.resize(img, (width, height)))
    print(f"✅ Загружено {len(slides)} слайдов из '{folder}/'")
    return slides


def create_demo_slides(width: int = SLIDE_W,
                       height: int = SLIDE_H) -> list[np.ndarray]:
    """Создаёт 4 демо-слайда."""
    data = [
        ("Slide 1: Introduction",  (50,  50,  120)),
        ("Slide 2: Main Points",   (50,  100, 50)),
        ("Slide 3: Data & Charts", (120, 60,  40)),
        ("Slide 4: Conclusion",    (80,  50,  120)),
    ]
    slides = []
    for title, color in data:
        img = np.full((height, width, 3), color, dtype=np.uint8)
        cv2.putText(img, title, (100, height // 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 2.2, (255, 255, 255), 4)
        slides.append(img)
    return slides
