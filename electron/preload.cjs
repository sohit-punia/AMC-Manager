const {
  contextBridge,
  ipcRenderer,
} = require("electron");

contextBridge.exposeInMainWorld(
  "electronAPI",
  {
    openDocument: (filePath) =>
      ipcRenderer.invoke(
        "open-document",
        filePath
      ),
  }
);