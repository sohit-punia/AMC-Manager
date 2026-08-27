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
   DATABASE
========================= */

const databasePath = path.join(
  dataDir,
  "amc_manager_v2.db"
);

const db = new sqlite3.Database(
  databasePath,
  (err) => {
    if (err) {
      console.error(
        "Error connecting to SQLite database:",
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
   FOREIGN KEYS
========================= */

db.run(
  "PRAGMA foreign_keys = ON",
  (err) => {
    if (err) {
      console.error(
        "Error enabling foreign keys:",
        err.message
      );
    }
  }
);

/* =========================
   CREATE TABLES
========================= */

db.serialize(() => {

  /* =========================
     PROJECTS
  ========================= */

  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      projectNumber TEXT NOT NULL UNIQUE,

      companyName TEXT NOT NULL,

      companyAddress TEXT,

      contactPerson TEXT,

      phoneNumber TEXT,

      totalOrderAmount REAL NOT NULL DEFAULT 0,

      numberOfStations INTEGER NOT NULL DEFAULT 0,

      stationName TEXT,

      amcType TEXT NOT NULL,

      amcStartDate TEXT,

      amcEndDate TEXT,

      remarks TEXT,

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  /* =========================
     AMC VISITS
  ========================= */

  db.run(`
    CREATE TABLE IF NOT EXISTS amc_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      projectId INTEGER NOT NULL,

      visitNumber INTEGER NOT NULL,

      visitDate TEXT,

      employeeName TEXT,

      totalAmount REAL NOT NULL DEFAULT 0,

      invoicePdf TEXT,

      amountReceived REAL NOT NULL DEFAULT 0,

      amountReceivedDate TEXT,

      receivedReportPdf TEXT,

      tourAmountAllocated REAL NOT NULL DEFAULT 0,

      tourExpense REAL NOT NULL DEFAULT 0,

      expensePdf TEXT,

      remarks TEXT,

      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,

      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (projectId)
        REFERENCES projects(id)
        ON DELETE CASCADE,

      UNIQUE(projectId, visitNumber)
    )
  `);

  /* =========================
     PROJECT INDEX
  ========================= */

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_projects_project_number
    ON projects(projectNumber)
  `);

  /* =========================
     VISIT PROJECT INDEX
  ========================= */

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_visits_project_id
    ON amc_visits(projectId)
  `);

  /* =========================
     VISIT DATE INDEX
  ========================= */

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_visits_visit_date
    ON amc_visits(visitDate)
  `);

  /* =========================
     EMPLOYEE NAME INDEX
  ========================= */

  db.run(`
    CREATE INDEX IF NOT EXISTS
    idx_visits_employee_name
    ON amc_visits(employeeName)
  `);
});

/* =========================
   READY
========================= */

console.log(
  "AMC Manager v2 database initialized."
);

module.exports = db;