const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
} = require("electron");

const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");

let mainWindow;
let backendProcess;

const isDev = !app.isPackaged;

/* =========================
   DATA DIRECTORY
========================= */

function getDataDir() {
  const dataDir = path.join(
    app.getPath("userData"),
    "data"
  );

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, {
      recursive: true,
    });
  }

  return dataDir;
}

/* =========================
   START BACKEND
========================= */

function startBackend() {
  const serverPath = path.join(
    __dirname,
    "..",
    "backend",
    "server.js"
  );

  const dataDir = getDataDir();

  console.log("Backend server path:");
  console.log(serverPath);

  console.log("Backend data path:");
  console.log(dataDir);

  backendProcess = spawn(
    process.execPath,
    [serverPath],
    {
      cwd: dataDir,

      windowsHide: true,

      env: {
        ...process.env,

        /*
          Make the packaged Electron executable
          behave like Node when starting server.js.
        */
        ELECTRON_RUN_AS_NODE: "1",

        AMC_DATA_DIR: dataDir,
      },
    }
  );

  backendProcess.stdout.on(
    "data",
    (data) => {
      console.log(
        `Backend: ${data}`
      );
    }
  );

  backendProcess.stderr.on(
    "data",
    (data) => {
      console.error(
        `Backend Error: ${data}`
      );
    }
  );

  backendProcess.on(
    "error",
    (error) => {
      console.error(
        "Backend process error:",
        error
      );
    }
  );

  backendProcess.on(
    "exit",
    (code, signal) => {
      console.log(
        `Backend exited. code=${code}, signal=${signal}`
      );
    }
  );
}

/* =========================
   OPEN DOCUMENT
========================= */

ipcMain.handle(
  "open-document",
  async (event, filePath) => {
    try {
      if (
        !filePath ||
        typeof filePath !== "string"
      ) {
        return "Invalid file path";
      }

      const dataDir = getDataDir();

      let cleanPath = filePath;

      cleanPath = cleanPath.replace(
        /^\/uploads[\\/]/,
        ""
      );

      cleanPath = cleanPath.replace(
        /^uploads[\\/]/,
        ""
      );

      cleanPath = cleanPath.replace(
        /\\/g,
        path.sep
      );

      cleanPath = cleanPath.replace(
        /\//g,
        path.sep
      );

      const uploadsDir = path.join(
        dataDir,
        "uploads"
      );

      const fullPath = path.join(
        uploadsDir,
        cleanPath
      );

      const normalizedPath =
        path.normalize(fullPath);

      const normalizedUploadsDir =
        path.normalize(uploadsDir);

      /*
        Security check:
        file must remain inside uploads/
      */
      if (
        !normalizedPath.startsWith(
          normalizedUploadsDir +
            path.sep
        )
      ) {
        return "Invalid file path";
      }

      if (
        !fs.existsSync(
          normalizedPath
        )
      ) {
        return "File not found";
      }

      /*
        Open using Windows default application.
      */
      const result =
        await shell.openPath(
          normalizedPath
        );

      return result || "";
    } catch (error) {
      console.error(
        "Open document error:",
        error
      );

      return error.message;
    }
  }
);

/* =========================
   CREATE WINDOW
========================= */

function createWindow() {
  mainWindow =
    new BrowserWindow({
      width: 1400,
      height: 900,

      minWidth: 1000,
      minHeight: 700,

      webPreferences: {
        preload: path.join(
          __dirname,
          "preload.cjs"
        ),

        contextIsolation: true,
        nodeIntegration: false,
      },
    });

  if (isDev) {
    mainWindow.loadURL(
      "http://localhost:5173"
    );

    /*
      Useful during development.
    */
    mainWindow.webContents.openDevTools();
  } else {
    const indexPath = path.join(
      __dirname,
      "..",
      "dist",
      "index.html"
    );

    console.log(
      "Loading production UI:"
    );
    console.log(indexPath);

    mainWindow.loadFile(indexPath);
  }

  mainWindow.on(
    "closed",
    () => {
      mainWindow = null;
    }
  );
}

/* =========================
   APP READY
========================= */

app.whenReady().then(() => {
  startBackend();

  createWindow();

  app.on(
    "activate",
    () => {
      if (
        BrowserWindow
          .getAllWindows()
          .length === 0
      ) {
        createWindow();
      }
    }
  );
});

/* =========================
   CLOSE APP
========================= */

app.on(
  "before-quit",
  () => {
    if (
      backendProcess &&
      !backendProcess.killed
    ) {
      backendProcess.kill();
    }
  }
);

app.on(
  "window-all-closed",
  () => {
    if (
      process.platform !== "darwin"
    ) {
      app.quit();
    }
  }
);