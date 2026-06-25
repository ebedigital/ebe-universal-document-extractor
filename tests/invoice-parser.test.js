const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function createElement() {
  return {
    classList: { add() {}, remove() {} },
    clientWidth: 600,
    disabled: false,
    hidden: false,
    parentElement: { clientWidth: 600 },
    style: {},
    textContent: "",
    value: "",
    addEventListener() {},
    click() {},
    focus() {},
    getContext() {
      return { clearRect() {} };
    },
    removeAttribute(name) {
      delete this[name];
    },
    select() {},
    setSelectionRange() {}
  };
}

const elements = new Map();
const context = {
  URL: {
    createObjectURL() {
      return "blob:test";
    },
    revokeObjectURL() {}
  },
  document: {
    execCommand() {
      return true;
    },
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, createElement());
      }

      return elements.get(id);
    }
  },
  navigator: { clipboard: { async writeText() {} } },
  window: {
    pdfjsLib: {
      getDocument() {}
    },
    setTimeout(callback) {
      callback();
    }
  }
};

context.globalThis = context;
vm.createContext(context);

const scriptPath = path.join(__dirname, "..", "script.js");
vm.runInContext(fs.readFileSync(scriptPath, "utf8"), context, { filename: scriptPath });

const invoiceText = `
Invoice INV-1042
Invoice Date: 04/15/2026
Due Date: 05/15/2026
Balance Due: $1,250.00
PO Number: POTSW98765
Bill To
North Valley School District
CA
`;

context.parseInvoice(invoiceText);

assert.equal(elements.get("invoiceNo").textContent, "INV-1042");
assert.equal(elements.get("invoiceDate").textContent, "04/15/2026");
assert.equal(elements.get("dueDate").textContent, "05/15/2026");
assert.equal(elements.get("balanceDue").textContent, "1,250.00");
assert.equal(elements.get("invoiceAmount").textContent, "1,250.00");
assert.equal(elements.get("poNumber").textContent, "POTSW98765");
assert.equal(elements.get("state").textContent, "CA");
assert.equal(elements.get("school").textContent, "North Valley School District");
assert.equal(elements.get("poPaid").textContent, "Pending");

const row = context.getExcelRow().split("\t");
assert.equal(row[0], "CA");
assert.equal(row[1], "North Valley School District");
assert.equal(row[4], "1,250.00");
assert.equal(row[10], "POTSW98765");
assert.equal(row[11], "INV-1042");
assert.equal(row[12], "04/15/2026");
assert.equal(row[13], "Pending");

context.clearAll();
assert.equal(elements.get("copyBtn").disabled, true);
assert.equal(elements.get("extractBtn").disabled, true);

console.log("invoice-parser tests passed");
