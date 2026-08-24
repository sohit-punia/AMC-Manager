const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error("Error connecting to database:", err.message);
  } else {
    console.log("Connected to SQLite database");
  }
});

db.run(`
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
    remarks TEXT
  )
`);

module.exports = db;