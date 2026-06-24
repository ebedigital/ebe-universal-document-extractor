const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");

const output = document.getElementById("output");

const imagePreview = document.getElementById("imagePreview");
const pdfPreview = document.getElementById("pdfPreview");

const ctx = pdfPreview.getContext("2d");

let currentFile;


// =========================
// HANDLE FILE
// =========================

function handleFile(file){

currentFile = file;

if(file.type.includes("image")){

imagePreview.src = URL.createObjectURL(file);

imagePreview.style.display = "block";
pdfPreview.style.display = "none";

}

else if(file.type==="application/pdf"){

imagePreview.style.display = "none";
pdfPreview.style.display = "block";

previewPDF(file);

}

}


// =========================
// FILE INPUT
// =========================

fileInput.addEventListener("change",(e)=>{

handleFile(e.target.files[0]);

});


// =========================
// DRAG DROP
// =========================

dropZone.addEventListener("click",()=>{

fileInput.click();

});

dropZone.addEventListener("dragover",(e)=>{

e.preventDefault();

dropZone.classList.add("dragover");

});

dropZone.addEventListener("dragleave",()=>{

dropZone.classList.remove("dragover");

});

dropZone.addEventListener("drop",(e)=>{

e.preventDefault();

dropZone.classList.remove("dragover");

const file = e.dataTransfer.files[0];

handleFile(file);

});


// =========================
// PDF PREVIEW
// =========================

async function previewPDF(file){

const arrayBuffer = await file.arrayBuffer();

const pdf = await pdfjsLib.getDocument({

data:arrayBuffer

}).promise;

const page = await pdf.getPage(1);

const viewport = page.getViewport({

scale:1

});

pdfPreview.height = viewport.height;

pdfPreview.width = viewport.width;

await page.render({

canvasContext:ctx,

viewport

}).promise;

}


// =========================
// EXTRACT BUTTON
// =========================

document.getElementById("extractBtn")

.addEventListener("click",async()=>{


if(!currentFile){

alert("Choose file first");

return;

}


const arrayBuffer = await currentFile.arrayBuffer();

const pdf = await pdfjsLib.getDocument({

data:arrayBuffer

}).promise;


let finalText="";


for(let i=1;i<=pdf.numPages;i++){

const page = await pdf.getPage(i);

const textContent = await page.getTextContent();


textContent.items.forEach(item=>{

finalText += item.str + "\n";

});

}


output.value = finalText;


// Invoice Number

const invoiceMatch =

finalText.match(/INV-\d+-\d+/);

if(invoiceMatch){

invoiceNo.textContent = invoiceMatch[0];

}


// Invoice Date

const dateMatch =

finalText.match(/\d{2}-\d{2}-\d{2}/);

if(dateMatch){

invoiceDate.textContent = dateMatch[0];

}


// Due Date

const dueDateMatch =

finalText.match(/Due Date\s+(\d{2}-\d{2}-\d{2})/i);

if(dueDateMatch){

dueDate.textContent = dueDateMatch[1];

}


// Balance Due

const amountMatch =

finalText.match(/Balance Due\s+\$?([\d,]+\.\d{2})/i);

if(amountMatch){

balanceDue.textContent = amountMatch[1];

invoiceAmount.textContent = amountMatch[1];

}


// PO Number

const poMatch =

finalText.match(/POTSW\d+/);

if(poMatch){

poNumber.textContent = poMatch[0];

}


// School

const schoolMatch =

finalText.match(/Bill To([\s\S]*?)Ship To/i);

if(schoolMatch){

const school = schoolMatch[1]

.split("\n")

.find(line=>line.trim().length>5);

if(school){

document.getElementById("school").textContent =

school.trim();

}

}


// State

const stateMatch =

finalText.match(/\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b/);

if(stateMatch){

state.textContent = stateMatch[0];

}


// PO Paid

poPaid.textContent = "Pending";


});


document.getElementById("copyBtn")
.addEventListener("click",()=>{

const row = [

document.getElementById("state")?.textContent || "",

document.getElementById("school")?.textContent || "",

"", // Contact Name

"", // Contact Info

document.getElementById("invoiceAmount")?.textContent || "",

"Pending Payment",

"", // Print Digital

"", // PO

"", // Q-Rec

"", // Quote #

document.getElementById("poNumber")?.textContent || "",

document.getElementById("invoiceNo")?.textContent || "",

document.getElementById("invoiceDate")?.textContent || "",

document.getElementById("poPaid")?.textContent || ""

].join("\t");


console.log(row);

navigator.clipboard.writeText(row);

alert("Copied");

});

document.getElementById("clearBtn")
.addEventListener("click",()=>{

output.value="";

pdfPreview.width=0;
pdfPreview.height=0;

imagePreview.src="";

document.getElementById("state").textContent="";

document.getElementById("school").textContent="";

document.getElementById("balanceDue").textContent="";

document.getElementById("poNumber").textContent="";

document.getElementById("invoiceNo").textContent="";

document.getElementById("poPaid").textContent="";

document.getElementById("invoiceDate").textContent="";

document.getElementById("invoiceAmount").textContent="";

document.getElementById("dueDate").textContent="";

});