const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxueILP7LDvkwXNIyuEyPwX5Os0vYQPaN2cro6Xr47DZliIs_gGfWuydnxXM90iRasV/exec";
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const galleryGrid = document.querySelector("#gallery-grid");
const galleryStatus = document.querySelector("#gallery-status");
const uploadForm = document.querySelector("#upload-form");
const photoInput = document.querySelector("#photo-file");
const fileName = document.querySelector("#file-name");
const uploadButton = document.querySelector("#upload-button");
const uploadStatus = document.querySelector("#upload-status");

photoInput.addEventListener("change", () => {
  const files = Array.from(photoInput.files);
  fileName.textContent = files.length === 0
    ? "JPG, PNG ou WebP, até 8 MB"
    : files.length === 1
      ? files[0].name
      : `${files.length} fotos selecionadas`;
});

function showUploadStatus(message, state) {
  uploadStatus.textContent = message;
  uploadStatus.dataset.state = state;
}

function loadGallery() {
  if (!APPS_SCRIPT_URL) {
    galleryStatus.textContent = "A galeria aparecerá aqui depois que a integração com o Google Drive for configurada.";
    return;
  }

  const callbackName = `galleryCallback${Date.now()}`;
  const script = document.createElement("script");
  const timeout = window.setTimeout(() => {
    cleanup();
    galleryStatus.textContent = "Não foi possível carregar as fotos. Confira a configuração da integração e tente novamente.";
  }, 15000);

  function cleanup() {
    window.clearTimeout(timeout);
    script.remove();
    delete window[callbackName];
  }

  window[callbackName] = (result) => {
    cleanup();
    if (!result.success) {
      galleryStatus.textContent = result.error || "Não foi possível carregar as fotos.";
      return;
    }

    galleryGrid.replaceChildren();
    result.photos.forEach((photo) => {
      const card = document.createElement("figure");
      const image = document.createElement("img");
      const caption = document.createElement("figcaption");
      image.src = photo.url;
      image.alt = photo.name;
      image.loading = "lazy";
      caption.textContent = photo.name;
      card.className = "photo-card";
      card.append(image, caption);
      galleryGrid.append(card);
    });
    galleryStatus.textContent = result.photos.length
      ? `${result.photos.length} ${result.photos.length === 1 ? "foto" : "fotos"} compartilhada${result.photos.length === 1 ? "" : "s"}`
      : "Ainda não há fotos na galeria. Envie a primeira!";
  };

  script.onerror = () => {
    cleanup();
    galleryStatus.textContent = "Não foi possível conectar ao Google Drive. Confira a URL do Apps Script.";
  };
  script.src = `${APPS_SCRIPT_URL}?action=list&callback=${callbackName}`;
  document.head.append(script);
}

uploadForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const files = Array.from(photoInput.files);
  if (files.length === 0) {
    showUploadStatus("Escolha pelo menos uma foto antes de enviar.", "error");
    return;
  }

  const invalidFiles = files.filter((file) => !ALLOWED_TYPES.has(file.type) || file.size > MAX_FILE_SIZE);
  if (invalidFiles.length > 0) {
    const invalidNames = invalidFiles.map((file) => file.name).join(", ");
    showUploadStatus(`Confira estas fotos: ${invalidNames}. Use imagens JPEG, PNG ou WebP de até 8 MB cada.`, "error");
    return;
  }
  if (!APPS_SCRIPT_URL) {
    showUploadStatus("O envio ainda não está configurado. A URL do Apps Script precisa ser adicionada ao app.js.", "error");
    return;
  }

  uploadButton.disabled = true;
  photoInput.disabled = true;
  const failures = [];

  for (const [index, file] of files.entries()) {
    uploadButton.textContent = `Enviando ${index + 1} de ${files.length}…`;
    showUploadStatus(`Enviando ${file.name} (${index + 1} de ${files.length})…`, "");
    try {
      const result = await uploadFile(file);
      if (!result.success) {
        failures.push(`${file.name}: ${result.message}`);
      }
    } catch (error) {
      failures.push(`${file.name}: ${error.message}`);
    }
  }

  uploadButton.disabled = false;
  photoInput.disabled = false;
  uploadButton.innerHTML = 'Enviar fotos <span aria-hidden="true">↗</span>';
  uploadForm.reset();
  fileName.textContent = "JPG, PNG ou WebP, até 8 MB";

  const successCount = files.length - failures.length;
  if (failures.length > 0) {
    showUploadStatus(
      `${successCount} de ${files.length} fotos enviadas. Falhas: ${failures.join(" | ")}`,
      successCount > 0 ? "" : "error"
    );
  } else {
    showUploadStatus(`${successCount} ${successCount === 1 ? "foto enviada" : "fotos enviadas"} com sucesso!`, "success");
  }
  if (successCount > 0) {
    window.setTimeout(loadGallery, 2500);
  }
});

function uploadFile(file) {
  return readFileAsDataUrl(file).then((dataUrl) => new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const uploadFrame = document.querySelector("#upload-frame");
    let responseTimeout;

    const cleanup = () => {
      window.clearTimeout(responseTimeout);
      window.removeEventListener("message", receiveMessage);
    };

    const receiveMessage = (messageEvent) => {
      if (messageEvent.data?.type !== "wedding-photo-upload" || messageEvent.data.requestId !== requestId) {
        return;
      }
      cleanup();
      resolve(messageEvent.data);
    };

    responseTimeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Não foi possível confirmar o envio. Confira a implantação do Apps Script."));
    }, 45000);
    window.addEventListener("message", receiveMessage);

    const form = document.createElement("form");
    form.method = "post";
    form.action = APPS_SCRIPT_URL;
    form.target = uploadFrame.name;
    form.hidden = true;
    const fields = {
      action: "upload",
      requestId,
      name: file.name,
      mimeType: file.type,
      data: dataUrl.split(",")[1],
    };
    for (const [name, value] of Object.entries(fields)) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.append(input);
    }
    document.body.append(form);
    try {
      form.submit();
    } catch (error) {
      cleanup();
      reject(error);
    } finally {
      form.remove();
    }
  }));
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("falha ao ler o arquivo.")));
    reader.readAsDataURL(file);
  });
}

loadGallery();
