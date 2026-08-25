const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db", (err) => {
  if (err) {
    console.error(
      "Error connecting to database:",
      err.message
    );
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
`, (err) => {
  if (err) {
    console.error(
      "Error creating records table:",
      err.message
    );
    return;
  }

  // Check whether document column already exists
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
            column.name === "document"
        );

      if (!documentColumnExists) {
        db.run(
          "ALTER TABLE records ADD COLUMN document TEXT",
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
});

module.exports = db;