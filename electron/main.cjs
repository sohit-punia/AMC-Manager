// const {
//   app,
//   BrowserWindow,
//   ipcMain,
//   shell,
// } = require("electron");

// const path = require("path");
// const fs = require("fs");
// const { spawn } = require("child_process");

// let mainWindow;
// let backendProcess;

// const isDev = !app.isPackaged;

// /* =========================
//    DATA DIRECTORY
// ========================= */

// function getDataDir() {
//   const dataDir = path.join(
//     app.getPath("userData"),
//     "data"
//   );

//   if (!fs.existsSync(dataDir)) {
//     fs.mkdirSync(dataDir, {
//       recursive: true,
//     });
//   }

//   return dataDir;
// }

// /* =========================
//    START BACKEND
// ========================= */

// function startBackend() {
//   const serverPath = path.join(
//     __dirname,
//     "..",
//     "backend",
//     "server.js"
//   );

//   const dataDir = getDataDir();

//   console.log("Backend server path:");
//   console.log(serverPath);

//   console.log("Backend data path:");
//   console.log(dataDir);

//   backendProcess = spawn(
//     process.execPath,
//     [serverPath],
//     {
//       cwd: dataDir,

//       windowsHide: true,

//       env: {
//         ...process.env,

//         /*
//           Make the packaged Electron executable
//           behave like Node when starting server.js.
//         */
//         ELECTRON_RUN_AS_NODE: "1",

//         AMC_DATA_DIR: dataDir,
//       },
//     }
//   );

//   backendProcess.stdout.on(
//     "data",
//     (data) => {
//       console.log(
//         `Backend: ${data}`
//       );
//     }
//   );

//   backendProcess.stderr.on(
//     "data",
//     (data) => {
//       console.error(
//         `Backend Error: ${data}`
//       );
//     }
//   );

//   backendProcess.on(
//     "error",
//     (error) => {
//       console.error(
//         "Backend process error:",
//         error
//       );
//     }
//   );

//   backendProcess.on(
//     "exit",
//     (code, signal) => {
//       console.log(
//         `Backend exited. code=${code}, signal=${signal}`
//       );
//     }
//   );
// }

// /* =========================
//    OPEN DOCUMENT
// ========================= */

// ipcMain.handle(
//   "open-document",
//   async (event, filePath) => {
//     try {
//       if (
//         !filePath ||
//         typeof filePath !== "string"
//       ) {
//         return "Invalid file path";
//       }

//       const dataDir = getDataDir();

//       let cleanPath = filePath;

//       cleanPath = cleanPath.replace(
//         /^\/uploads[\\/]/,
//         ""
//       );

//       cleanPath = cleanPath.replace(
//         /^uploads[\\/]/,
//         ""
//       );

//       cleanPath = cleanPath.replace(
//         /\\/g,
//         path.sep
//       );

//       cleanPath = cleanPath.replace(
//         /\//g,
//         path.sep
//       );
      

//       const uploadsDir = path.join(
//         dataDir,
//         "uploads"
//       );

//       const fullPath = path.join(
//         uploadsDir,
//         cleanPath
//       );

//       const normalizedPath =
//         path.normalize(fullPath);

//       const normalizedUploadsDir =
//         path.normalize(uploadsDir);

//       /*
//         Security check:
//         file must remain inside uploads/
//       */
//       if (
//         !normalizedPath.startsWith(
//           normalizedUploadsDir +
//             path.sep
//         )
//       ) {
//         return "Invalid file path";
//       }

//       if (
//         !fs.existsSync(
//           normalizedPath
//         )
//       ) {
//         return "File not found";
//       }

//       /*
//         Open using Windows default application.
//       */
//       const result =
//         await shell.openPath(
//           normalizedPath
//         );

//       return result || "";
//     } catch (error) {
//       console.error(
//         "Open document error:",
//         error
//       );

//       return error.message;
//     }
//   }
// );

// /* =========================
//    CREATE WINDOW
// ========================= */

// function createWindow() {
//   mainWindow =
//     new BrowserWindow({
//       width: 1400,
//       height: 900,

//       minWidth: 1000,
//       minHeight: 700,

//       webPreferences: {
//         preload: path.join(
//           __dirname,
//           "preload.cjs"
//         ),

//         contextIsolation: true,
//         nodeIntegration: false,
//       },
//     });

//   if (isDev) {
//     mainWindow.loadURL(
//       "http://localhost:5173"
//     );

//     /*
//       Useful during development.
//     */
//     mainWindow.webContents.openDevTools();
//   } else {
//     const indexPath = path.join(
//       __dirname,
//       "..",
//       "dist",
//       "index.html"
//     );

//     console.log(
//       "Loading production UI:"
//     );
//     console.log(indexPath);

//     mainWindow.loadFile(indexPath);
//   }

// mainWindow.webContents.on("did-finish-load", () => {
//   if (!mainWindow) return;

//   mainWindow.show();
//   mainWindow.focus();
//   mainWindow.webContents.focus();
// });

// mainWindow.on(
//   "closed",
//   () => {
//     mainWindow = null;
//   }
// );
// }

// /* =========================
//    APP READY
// ========================= */

// app.whenReady().then(() => {
//   startBackend();

//   createWindow();

//   app.on(
//     "activate",
//     () => {
//       if (
//         BrowserWindow
//           .getAllWindows()
//           .length === 0
//       ) {
//         createWindow();
//       }
//     }
//   );
// });

// /* =========================
//    CLOSE APP
// ========================= */

// app.on(
//   "before-quit",
//   () => {
//     if (
//       backendProcess &&
//       !backendProcess.killed
//     ) {
//       backendProcess.kill();
//     }
//   }
// );

// app.on(
//   "window-all-closed",
//   () => {
//     if (
//       process.platform !== "darwin"
//     ) {
//       app.quit();
//     }
//   }
// );



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
   DISABLE AUTOFILL POPUP
========================= */

/*
  Electron's bundled Chromium implements autofill/autocomplete
  LOGIC but not the popup UI for it. When a text input matches
  Chromium's autofill heuristics (field names like "name",
  "amount", "date" all qualify), typing into it can trigger an
  invisible native suggestion popup. Electron never renders or
  dismisses this popup, so it can be left sitting on top of
  that exact input, silently swallowing all future clicks on
  it — while everything else on the page (buttons, other
  elements) keeps working fine, because the popup only covers
  that one input's area. Reloading the page destroys and
  recreates it, which is why a refresh "fixes" it once.

  Fix: disable the Autofill domain via Chrome DevTools Protocol
  so Chromium never creates the popup in the first place.
*/
function disableAutofillPopup(win) {
  try {
    if (!win.webContents.debugger.isAttached()) {
      win.webContents.debugger.attach("1.3");
    }
  } catch (err) {
    console.error("[autofill-fix] debugger attach failed:", err);
    return;
  }

  win.webContents.debugger
    .sendCommand("Autofill.disable")
    .catch((err) => {
      console.error("[autofill-fix] Autofill.disable failed:", err);
    });

  win.webContents.debugger.on("detach", (event, reason) => {
    console.log("[autofill-fix] debugger detached:", reason);
  });
}

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

mainWindow.webContents.on("did-finish-load", () => {
  if (!mainWindow) return;

  mainWindow.show();
  mainWindow.focus();
  mainWindow.webContents.focus();

  disableAutofillPopup(mainWindow);
});

/*
  Also reclaim renderer input focus whenever the OS window
  regains focus (e.g. after alt-tabbing back in, or after
  the file opened via shell.openPath loses focus). Belt and
  suspenders alongside the autofill fix above.
*/
mainWindow.on("focus", () => {
  if (!mainWindow) return;
  mainWindow.webContents.focus();
});

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