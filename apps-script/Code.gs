const FOLDER_ID = "1axKHbvB-YbZdhZV9eKSzpm0oa8jqOjJX";
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

function doGet(e) {
  if (!e || !e.parameter || e.parameter.action !== "list") {
    return HtmlService.createHtmlOutput("Integração de fotos do casamento ativa.");
  }

  const callback = e.parameter.callback || "";
  if (!/^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/.test(callback)) {
    return ContentService.createTextOutput("Callback inválido.");
  }

  try {
    const photos = listPhotos_();
    return jsonp_(callback, { success: true, photos: photos });
  } catch (error) {
    console.error(error);
    return jsonp_(callback, {
      success: false,
      error: "Não foi possível acessar a pasta de fotos. Confira o ID e as permissões do Drive."
    });
  }
}

function doPost(e) {
  const requestId = e && e.parameter ? e.parameter.requestId || "" : "";
  let stage = "validating request";
  console.log("UPLOAD_STARTED " + JSON.stringify({ requestId: requestId }));
  try {
    if (!e || !e.parameter || e.parameter.action !== "upload") {
      throw new Error("Solicitação de envio inválida.");
    }
    if (!/^[0-9a-f-]{36}$/i.test(requestId)) {
      throw new Error("Identificador de envio inválido.");
    }

    const mimeType = e.parameter.mimeType;
    const encodedData = e.parameter.data || "";
    if (ALLOWED_MIME_TYPES.indexOf(mimeType) === -1) {
      throw new Error("Formato de imagem não permitido.");
    }
    if (!encodedData || encodedData.length > Math.ceil(MAX_FILE_BYTES * 4 / 3) + 8) {
      throw new Error("A imagem está vazia ou ultrapassa o limite de 8 MB.");
    }

    const bytes = Utilities.base64Decode(encodedData);
    if (bytes.length > MAX_FILE_BYTES) {
      throw new Error("A imagem ultrapassa o limite de 8 MB.");
    }
    stage = "validating image data";
    if (!hasValidImageSignature_(bytes, mimeType)) {
      throw new Error("O conteúdo do arquivo não corresponde ao formato informado.");
    }

    const filename = sanitizeFilename_(e.parameter.name, mimeType);
    const blob = Utilities.newBlob(bytes, mimeType, filename);
    stage = "opening Drive folder";
    const folder = DriveApp.getFolderById(FOLDER_ID);
    stage = "saving file to Drive";
    const file = folder.createFile(blob);
    console.log("UPLOAD_SUCCEEDED " + JSON.stringify({ requestId: requestId, fileId: file.getId() }));
    return uploadResult_(true, "Foto enviada! Obrigado por compartilhar esse momento com a gente.", requestId);
  } catch (error) {
    console.error("UPLOAD_FAILED " + JSON.stringify({
      requestId: requestId,
      stage: stage,
      error: String(error),
      stack: error && error.stack
    }));
    return uploadResult_(false, "Falha ao enviar ("
      + stage
      + "). Confira os registros de execução do Apps Script para ver o detalhe.", requestId);
  }
}

function listPhotos_() {
  const files = DriveApp.getFolderById(FOLDER_ID).getFiles();
  const photos = [];
  while (files.hasNext()) {
    const file = files.next();
    if (ALLOWED_MIME_TYPES.indexOf(file.getMimeType()) === -1) {
      continue;
    }
    photos.push({
      name: file.getName(),
      url: "https://drive.google.com/thumbnail?id=" + encodeURIComponent(file.getId()) + "&sz=w1600",
      updated: file.getLastUpdated().getTime()
    });
  }
  photos.sort(function (a, b) { return b.updated - a.updated; });
  return photos;
}

function sanitizeFilename_(name, mimeType) {
  const extensionByType = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
  };
  const safeName = (name || "foto")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[\r\n]/g, "")
    .slice(0, 100);
  const extension = extensionByType[mimeType];
  return safeName.toLowerCase().endsWith(extension) ? safeName : safeName + extension;
}

function hasValidImageSignature_(bytes, mimeType) {
  if (mimeType === "image/jpeg") {
    return bytes.length >= 3
      && unsignedByte_(bytes, 0) === 0xff
      && unsignedByte_(bytes, 1) === 0xd8
      && unsignedByte_(bytes, 2) === 0xff;
  }
  if (mimeType === "image/png") {
    return bytes.length >= 8
      && unsignedByte_(bytes, 0) === 0x89
      && unsignedByte_(bytes, 1) === 0x50
      && unsignedByte_(bytes, 2) === 0x4e
      && unsignedByte_(bytes, 3) === 0x47
      && unsignedByte_(bytes, 4) === 0x0d
      && unsignedByte_(bytes, 5) === 0x0a
      && unsignedByte_(bytes, 6) === 0x1a
      && unsignedByte_(bytes, 7) === 0x0a;
  }
  if (mimeType === "image/webp") {
    return bytes.length >= 12
      && unsignedByte_(bytes, 0) === 0x52
      && unsignedByte_(bytes, 1) === 0x49
      && unsignedByte_(bytes, 2) === 0x46
      && unsignedByte_(bytes, 3) === 0x46
      && unsignedByte_(bytes, 8) === 0x57
      && unsignedByte_(bytes, 9) === 0x45
      && unsignedByte_(bytes, 10) === 0x42
      && unsignedByte_(bytes, 11) === 0x50;
  }
  return false;
}

function unsignedByte_(bytes, index) {
  return bytes[index] & 0xff;
}

function jsonp_(callback, data) {
  const output = ContentService.createTextOutput(callback + "(" + JSON.stringify(data) + ");");
  return output.setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function uploadResult_(success, message, requestId) {
  const response = JSON.stringify({
    type: "wedding-photo-upload",
    success: success,
    message: message,
    requestId: requestId
  });
  const html = "<!doctype html><html><body><script>window.top.postMessage("
    + response
    + ", '*');</script></body></html>";
  return HtmlService.createHtmlOutput(html)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
