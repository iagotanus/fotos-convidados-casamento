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
const uploadFrame = document.querySelector("#upload-frame");

photoInput.addEventListener("change", () => {
  fileName.textContent = photoInput.files[0]?.name || "JPG, PNG ou WebP, até 8 MB";
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
  const file = photoInput.files[0];
  if (!file) {
    showUploadStatus("Escolha uma foto antes de enviar.", "error");
    return;
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    showUploadStatus("Escolha uma imagem JPEG, PNG ou WebP.", "error");
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showUploadStatus("A foto precisa ter até 8 MB.", "error");
    return;
  }
  if (!APPS_SCRIPT_URL) {
    showUploadStatus("O envio ainda não está configurado. A URL do Apps Script precisa ser adicionada ao app.js.", "error");
    return;
  }

  uploadButton.disabled = true;
  uploadButton.textContent = "Preparando foto…";
  showUploadStatus("Preparando sua foto para o envio…", "");

  try {
    const dataUrl = await readFileAsDataUrl(file);
    const requestId = crypto.randomUUID();
    const receiveMessage = (messageEvent) => {
      if (messageEvent.data?.type !== "wedding-photo-upload" || messageEvent.data.requestId !== requestId) {
        return;
      }
      window.clearTimeout(responseTimeout);
      window.removeEventListener("message", receiveMessage);
      uploadButton.disabled = false;
      uploadButton.innerHTML = 'Enviar foto <span aria-hidden="true">↗</span>';
      showUploadStatus(messageEvent.data.message, messageEvent.data.success ? "success" : "error");
      if (messageEvent.data.success) {
        uploadForm.reset();
        fileName.textContent = "JPG, PNG ou WebP, até 8 MB";
        window.setTimeout(loadGallery, 2500);
      }
    };

    const responseTimeout = window.setTimeout(() => {
      window.removeEventListener("message", receiveMessage);
      uploadButton.disabled = false;
      uploadButton.innerHTML = 'Enviar foto <span aria-hidden="true">↗</span>';
      showUploadStatus("Não foi possível confirmar o envio. Confira a implantação do Apps Script e tente novamente.", "error");
    }, 45000);
    window.addEventListener("message", receiveMessage);
    const formData = new FormData();
    formData.append("action", "upload");
    formData.append("requestId", requestId);
    formData.append("name", file.name);
    formData.append("mimeType", file.type);
    formData.append("data", dataUrl.split(",")[1]);

    const form = document.createElement("form");
    form.method = "post";
    form.action = APPS_SCRIPT_URL;
    form.target = "upload-frame";
    form.hidden = true;
    for (const [name, value] of formData) {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = name;
      input.value = value;
      form.append(input);
    }
    document.body.append(form);
    form.submit();
    form.remove();
    uploadButton.textContent = "Enviando…";
    showUploadStatus("Enviando sua foto para o Drive…", "");
  } catch (error) {
    uploadButton.disabled = false;
    uploadButton.innerHTML = 'Enviar foto <span aria-hidden="true">↗</span>';
    showUploadStatus(`Não foi possível preparar a foto: ${error.message}`, "error");
  }
});

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(new Error("falha ao ler o arquivo.")));
    reader.readAsDataURL(file);
  });
}

loadGallery();
