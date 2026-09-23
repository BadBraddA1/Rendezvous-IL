FROM runpod/pytorch:2.4.0-py3.11-cuda12.4.1-devel-ubuntu22.04

# System libs PaddleOCR / OpenCV often need
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /workspace
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY batch_book_ocr.py segment_match.py postprocess.py ./

# Default: wait for operator to mount scan + run batch
CMD ["bash", "-lc", "echo 'SFP book OCR image ready. Run: python -u batch_book_ocr.py --help'; sleep infinity"]
