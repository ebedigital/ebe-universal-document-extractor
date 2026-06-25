# EBE Universal Document Extractor

A small browser-based invoice text extractor for selectable-text PDFs. It previews the first PDF page, extracts text with PDF.js, parses common invoice fields, and copies a tab-separated row for Excel.

## Run locally

```sh
python3 -m http.server 8001
```

Then open `http://localhost:8001/`.

PDF.js is vendored in `vendor/`, so PDF preview and extraction work without a runtime CDN request.

## Test

```sh
node tests/invoice-parser.test.js
```
