const fileInput = document.getElementById("file-input");
const uploadArea = document.getElementById("upload-area");
const preview = document.getElementById("preview");
const convertBtn = document.getElementById("convert-btn");
const pageSizeSelect = document.getElementById("page-size");
const orientationSelect = document.getElementById("orientation");
const compressCheckbox = document.getElementById("compress");
const progressContainer = document.getElementById("progress-container");
const progressBar = document.getElementById("progress-bar");

let images = [];

// File handling
fileInput.addEventListener("change", (e) => handleFiles(e.target.files));
uploadArea.addEventListener("click", () => fileInput.click());
uploadArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadArea.style.background = "rgba(255,255,255,0.2)";
});
uploadArea.addEventListener("dragleave", () => {
  uploadArea.style.background = "rgba(255,255,255,0.1)";
});
uploadArea.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadArea.style.background = "rgba(255,255,255,0.1)";
  handleFiles(e.dataTransfer.files);
});

function handleFiles(files) {
  for (let file of files) {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        images.push(e.target.result);
        displayImages();
      };
      reader.readAsDataURL(file);
    }
  }
}

function displayImages() {
  preview.innerHTML = "";

  images.forEach((src, index) => {
    const wrapper = document.createElement("div");
    wrapper.classList.add("preview-item");

    const img = document.createElement("img");
    img.src = src;
    img.dataset.index = index;

    const delBtn = document.createElement("button");
    delBtn.classList.add("delete-btn");
    delBtn.innerHTML = "×";
    delBtn.title = "Remove Image";
    delBtn.addEventListener("click", () => deleteImage(index, wrapper));

    wrapper.appendChild(img);
    wrapper.appendChild(delBtn);
    preview.appendChild(wrapper);
  });

  convertBtn.disabled = images.length === 0;
  enableReordering();
}

function deleteImage(index, wrapper) {
  wrapper.classList.add("fade-out");

  setTimeout(() => {
    images.splice(index, 1);
    displayImages();
  }, 300);
}

function enableReordering() {
  new Sortable(preview, {
    animation: 150,
    onEnd: () => {
      const newOrder = [];
      preview.querySelectorAll("img").forEach((img) => {
        newOrder.push(images[img.dataset.index]);
      });
      images = newOrder;
    },
  });
}

// Convert to PDF (same as before)
convertBtn.addEventListener("click", async () => {
  if (images.length === 0) return;

  convertBtn.disabled = true;
  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF({
    orientation: orientationSelect.value,
    format: pageSizeSelect.value,
  });

  for (let i = 0; i < images.length; i++) {
    const img = new Image();
    img.src = images[i];
    await new Promise((res) => (img.onload = res));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let width = img.width;
    let height = img.height;

    if (compressCheckbox.checked) {
      width *= 0.7;
      height *= 0.7;
    }

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(img, 0, 0, width, height);

    const compressedData = canvas.toDataURL("image/jpeg", compressCheckbox.checked ? 0.7 : 1.0);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const ratio = Math.min(pageWidth / width, pageHeight / height);
    const x = (pageWidth - width * ratio) / 2;
    const y = (pageHeight - height * ratio) / 2;

    if (i > 0) pdf.addPage();
    pdf.addImage(compressedData, "JPEG", x, y, width * ratio, height * ratio);

    progressBar.style.width = `${((i + 1) / images.length) * 100}%`;
  }

  pdf.save("converted.pdf");
  progressBar.style.width = "100%";
  setTimeout(() => {
    progressContainer.style.display = "none";
    progressBar.style.width = "0%";
    convertBtn.disabled = false;
  }, 1000);
});
