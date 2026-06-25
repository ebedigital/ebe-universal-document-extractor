const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const output = document.getElementById("output");
const imagePreview = document.getElementById("imagePreview");
const pdfPreview = document.getElementById("pdfPreview");
const extractBtn = document.getElementById("extractBtn");
const copyBtn = document.getElementById("copyBtn");
const clearBtn = document.getElementById("clearBtn");

const fields = {
  state: document.getElementById("state"),
  school: document.getElementById("school"),
  balanceDue: document.getElementById("balanceDue"),
  poNumber: document.getElementById("poNumber"),
  invoiceNo: document.getElementById("invoiceNo"),
  poPaid: document.getElementById("poPaid"),
  invoiceDate: document.getElementById("invoiceDate"),
  invoiceAmount: document.getElementById("invoiceAmount"),
  dueDate: document.getElementById("dueDate")
};

let currentFile = null;
let currentObjectUrl = null;
let hasExtractedInvoice = false;

function setStatus(message) {
  output.value = message;
}

function isPdfJsReady() {
  return Boolean(window.pdfjsLib?.getDocument);
}

function updateActions() {
  extractBtn.disabled = !currentFile || !isPdf(currentFile);
  copyBtn.disabled = !hasExtractedInvoice;
}

function setBusy(isBusy) {
  if (isBusy) {
    extractBtn.disabled = true;
    copyBtn.disabled = true;
  } else {
    updateActions();
  }

  extractBtn.textContent = isBusy ? "Extracting..." : "Extract Text";
}

function showCopyFeedback(message) {
  const originalText = copyBtn.textContent;
  copyBtn.textContent = message;

  window.setTimeout(() => {
    copyBtn.textContent = originalText;
  }, 1600);
}

function clearInvoiceFields() {
  Object.values(fields).forEach((field) => {
    field.textContent = "";
  });

  hasExtractedInvoice = false;
  updateActions();
}

function resetPreview() {
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }

  imagePreview.removeAttribute("src");
  imagePreview.hidden = true;

  const ctx = pdfPreview.getContext("2d");
  ctx.clearRect(0, 0, pdfPreview.width, pdfPreview.height);
  pdfPreview.width = 0;
  pdfPreview.height = 0;
  pdfPreview.hidden = true;
}

function clearAll() {
  currentFile = null;
  fileInput.value = "";
  output.value = "";
  clearInvoiceFields();
  resetPreview();
  updateActions();
}

function isPdf(file) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

function isImage(file) {
  return file.type.startsWith("image/");
}

async function handleFile(file) {
  if (!file) {
    return;
  }

  clearAll();
  currentFile = file;

  try {
    if (isImage(file)) {
      currentObjectUrl = URL.createObjectURL(file);
      imagePreview.src = currentObjectUrl;
      imagePreview.hidden = false;
      setStatus("Image preview loaded. Text extraction currently supports selectable-text PDFs.");
      updateActions();
      return;
    }

    if (isPdf(file)) {
      if (!isPdfJsReady()) {
        currentFile = null;
        setStatus("PDF support could not load. Check your connection and refresh the page.");
        updateActions();
        return;
      }

      pdfPreview.hidden = false;
      setStatus("PDF loaded. Click Extract Text to parse the document.");
      await previewPDF(file);
      updateActions();
      return;
    }

    currentFile = null;
    setStatus("Unsupported file type. Please choose a PDF or image file.");
    updateActions();
  } catch (error) {
    currentFile = null;
    resetPreview();
    setStatus(`Could not load file: ${error.message}`);
    updateActions();
  }
}

async function previewPDF(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const page = await pdf.getPage(1);
  const containerWidth = Math.max(280, pdfPreview.parentElement.clientWidth - 40);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(1.5, Math.max(0.5, containerWidth / baseViewport.width));
  const viewport = page.getViewport({ scale });

  pdfPreview.height = viewport.height;
  pdfPreview.width = viewport.width;

  await page.render({
    canvasContext: pdfPreview.getContext("2d"),
    viewport
  }).promise;
}

async function extractPdfText(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];

  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    pages.push(textContent.items.map((item) => item.str).join("\n"));
  }

  return pages.join("\n\n");
}

function getFirstMatch(text, regex, group = 0) {
  const match = text.match(regex);
  return match?.[group] ? match[group].trim() : "";
}

function parseInvoice(text) {
  clearInvoiceFields();

  fields.invoiceNo.textContent = getFirstMatch(text, /\bINV[-\s]?\d+(?:[-\s]?\d+)?\b/i).toUpperCase();
  fields.invoiceDate.textContent = getFirstMatch(text, /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/);
  fields.dueDate.textContent = getFirstMatch(text, /Due Date\s*:?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i, 1);

  const balanceDue = getFirstMatch(text, /Balance Due\s*:?\s*\$?\s*([\d,]+\.\d{2})/i, 1);
  fields.balanceDue.textContent = balanceDue;
  fields.invoiceAmount.textContent = balanceDue || getFirstMatch(text, /Invoice Amount\s*:?\s*\$?\s*([\d,]+\.\d{2})/i, 1);

  fields.poNumber.textContent = (
    getFirstMatch(text, /\bPO(?:\s*Number|\s*#)?\s*:?\s*(POTSW\d+|\d{4,})\b/i, 1) ||
    getFirstMatch(text, /\bPOTSW\d+\b/i)
  ).toUpperCase();
  fields.state.textContent = getFirstMatch(text, /\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/);
  fields.poPaid.textContent = text.trim() ? "Pending" : "";

  const schoolBlock = text.match(/Bill To\s*([\s\S]*?)(?:Ship To|Invoice|Due Date|$)/i);
  if (schoolBlock) {
    const school = schoolBlock[1]
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 5 && !/^\d/.test(line));

    fields.school.textContent = school || "";
  }

  hasExtractedInvoice = Boolean(text.trim());
  updateActions();
}

function getExcelRow() {
  return [
    fields.state.textContent,
    fields.school.textContent,
    "",
    "",
    fields.invoiceAmount.textContent,
    "Pending Payment",
    "",
    "",
    "",
    "",
    fields.poNumber.textContent,
    fields.invoiceNo.textContent,
    fields.invoiceDate.textContent,
    fields.poPaid.textContent
  ].join("\t");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  output.focus();
  output.select();
  const previousValue = output.value;
  output.value = text;
  output.select();

  try {
    if (!document.execCommand("copy")) {
      throw new Error("Clipboard copy was blocked.");
    }
  } finally {
    output.value = previousValue;
    output.setSelectionRange(output.value.length, output.value.length);
  }
}

fileInput.addEventListener("change", (event) => {
  handleFile(event.target.files[0]);
});

dropZone.addEventListener("click", () => {
  fileInput.click();
});

dropZone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  handleFile(event.dataTransfer.files[0]);
});

extractBtn.addEventListener("click", async () => {
  if (!currentFile) {
    setStatus("Choose a file first.");
    return;
  }

  if (!isPdfJsReady()) {
    setStatus("PDF support could not load. Check your connection and refresh the page.");
    return;
  }

  if (!isPdf(currentFile)) {
    setStatus("Text extraction currently supports selectable-text PDFs. Image OCR is not enabled in this project.");
    return;
  }

  setBusy(true);

  try {
    const finalText = await extractPdfText(currentFile);
    output.value = finalText || "No selectable text was found in this PDF.";
    parseInvoice(finalText);
  } catch (error) {
    setStatus(`Could not extract text: ${error.message}`);
  } finally {
    setBusy(false);
  }
});

copyBtn.addEventListener("click", async () => {
  if (!hasExtractedInvoice) {
    setStatus("Extract invoice text before copying to Excel.");
    return;
  }

  const row = getExcelRow();

  try {
    await copyText(row);
    showCopyFeedback("Copied");
  } catch (error) {
    setStatus(`Could not copy to clipboard. Row:\n${row}`);
  }
});

clearBtn.addEventListener("click", clearAll);
updateActions();
