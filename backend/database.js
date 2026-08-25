// const sqlite3 = require("sqlite3").verbose();
// const path = require("path");
// const fs = require("fs");

// // Electron will provide this path.
// // During normal development, it falls back to backend/.
// const dataDir =
//   process.env.AMC_DATA_DIR ||
//   __dirname;

// if (!fs.existsSync(dataDir)) {
//   fs.mkdirSync(dataDir, {
//     recursive: true,
//   });
// }

// const databasePath = path.join(
//   dataDir,
//   "database.db"
// );

// const db = new sqlite3.Database(
//   databasePath,
//   (err) => {
//     if (err) {
//       console.error(
//         "Error connecting to database:",
//         err.message
//       );
//     } else {
//       console.log(
//         "Connected to SQLite database:"
//       );
//       console.log(databasePath);
//     }
//   }
// );

// db.run(`
//   CREATE TABLE IF NOT EXISTS records (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     projectNumber TEXT NOT NULL,
//     companyName TEXT NOT NULL,
//     companyAddress TEXT,
//     contactPerson TEXT,
//     phoneNumber TEXT,
//     amcType TEXT NOT NULL,
//     amcStartDate TEXT,
//     amcEndDate TEXT,
//     lastAMCDate TEXT,
//     nextAMCDate TEXT,
//     remarks TEXT
//   )
// `, (err) => {
//   if (err) {
//     console.error(
//       "Error creating records table:",
//       err.message
//     );
//     return;
//   }

//   db.all(
//     "PRAGMA table_info(records)",
//     [],
//     (err, columns) => {
//       if (err) {
//         console.error(
//           "Error checking table structure:",
//           err.message
//         );
//         return;
//       }

//       const documentColumnExists =
//         columns.some(
//           (column) =>
//             column.name === "document"
//         );

//       if (!documentColumnExists) {
//         db.run(
//           "ALTER TABLE records ADD COLUMN document TEXT",
//           (err) => {
//             if (err) {
//               console.error(
//                 "Error adding document column:",
//                 err.message
//               );
//             } else {
//               console.log(
//                 "Document column added successfully"
//               );
//             }
//           }
//         );
//       }
//     }
//   );
// });

// module.exports = db;





const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

/* =========================
   DATA DIRECTORY
========================= */

const dataDir =
  process.env.AMC_DATA_DIR ||
  __dirname;

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, {
    recursive: true,
  });
}

/* =========================
   DATABASE PATH
========================= */

const databasePath = path.join(
  dataDir,
  "database.db"
);

/* =========================
   CONNECT DATABASE
========================= */

const db = new sqlite3.Database(
  databasePath,
  (err) => {
    if (err) {
      console.error(
        "Error connecting to database:",
        err.message
      );
    } else {
      console.log(
        "Connected to SQLite database:"
      );

      console.log(
        databasePath
      );
    }
  }
);

/* =========================
   CREATE TABLE
========================= */

db.run(
  `
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectNumber TEXT NOT NULL,
      companyName TEXT NOT NULL,
      companyAddress TEXT,
      contactPerson TEXT,
      phoneNumber TEXT,
      amcType TEXT NOT NULL,
      amcStartDate TEXT,
      amcEndDate TEXT,
      lastAMCDate TEXT,
      nextAMCDate TEXT,
      remarks TEXT,
      document TEXT
    )
  `,
  (err) => {
    if (err) {
      console.error(
        "Error creating records table:",
        err.message
      );

      return;
    }

    /*
      Existing databases created before the
      document column existed will be upgraded.
    */

    db.all(
      "PRAGMA table_info(records)",
      [],
      (err, columns) => {
        if (err) {
          console.error(
            "Error checking table structure:",
            err.message
          );

          return;
        }

        const documentColumnExists =
          columns.some(
            (column) =>
              column.name ===
              "document"
          );

        if (
          !documentColumnExists
        ) {
          db.run(
            `
              ALTER TABLE records
              ADD COLUMN document TEXT
            `,
            (err) => {
              if (err) {
                console.error(
                  "Error adding document column:",
                  err.message
                );
              } else {
                console.log(
                  "Document column added successfully"
                );
              }
            }
          );
        } else {
          console.log(
            "Document column already exists"
          );
        }
      }
    );
  }
);

module.exports = db;