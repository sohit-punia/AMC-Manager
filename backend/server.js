const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const db = require("./database");

app.use(cors());
app.use(express.json());

const PORT = 5000;

/* =========================
   UPLOADS FOLDER
========================= */

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* =========================
   MULTER
========================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    files: 10,
  },
});

/* =========================
   SERVE UPLOADED FILES
========================= */

app.use(
  "/uploads",
  express.static(uploadDir)
);

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
  res.send("AMC Record Manager Backend is Running");
});

/* =========================
   CREATE RECORD
========================= */

app.post(
  "/api/records",
  upload.array("documents", 10),
  (req, res) => {
    const {
      projectNumber,
      companyName,
      companyAddress,
      contactPerson,
      phoneNumber,
      amcType,
      amcStartDate,
      amcEndDate,
      lastAMCDate,
      nextAMCDate,
      remarks,
    } = req.body;

    const documents = (req.files || []).map((file) => ({
      name: file.originalname,
      path: `/uploads/${file.filename}`,
    }));

    const sql = `
      INSERT INTO records (
        projectNumber,
        companyName,
        companyAddress,
        contactPerson,
        phoneNumber,
        amcType,
        amcStartDate,
        amcEndDate,
        lastAMCDate,
        nextAMCDate,
        remarks,
        document
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      projectNumber,
      companyName,
      companyAddress,
      contactPerson,
      phoneNumber,
      amcType,
      amcStartDate,
      amcEndDate,
      lastAMCDate,
      nextAMCDate,
      remarks,
      JSON.stringify(documents),
    ];

    db.run(sql, values, function (err) {
      if (err) {
        console.error(
          "Create record error:",
          err.message
        );

        return res.status(500).json({
          message: "Failed to save record",
        });
      }

      res.status(201).json({
        message: "Record saved successfully",
        id: this.lastID,
      });
    });
  }
);

/* =========================
   GET ALL RECORDS
========================= */

app.get("/api/records", (req, res) => {
  const sql = `
    SELECT *
    FROM records
    ORDER BY id DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(
        "Get records error:",
        err.message
      );

      return res.status(500).json({
        error: err.message,
      });
    }

    res.json(rows);
  });
});

/* =========================
   UPDATE RECORD
========================= */

app.put(
  "/api/records/:id",
  upload.array("documents", 10),
  (req, res) => {
    const { id } = req.params;

    const {
      projectNumber,
      companyName,
      companyAddress,
      contactPerson,
      phoneNumber,
      amcType,
      amcStartDate,
      amcEndDate,
      lastAMCDate,
      nextAMCDate,
      remarks,
    } = req.body;

    // First get existing document paths
    db.get(
      "SELECT document FROM records WHERE id = ?",
      [id],
      (err, record) => {
        if (err) {
          console.error(
            "Get existing document error:",
            err.message
          );

          return res.status(500).json({
            message: err.message,
          });
        }

        if (!record) {
          return res.status(404).json({
            message: "Record not found",
          });
        }

        let existingDocuments = [];

        if (record.document) {
          try {
            existingDocuments = JSON.parse(
              record.document
            );
          } catch {
            existingDocuments = [];
          }
        }

        const newDocuments = (req.files || []).map(
          (file) => ({
            name: file.originalname,
            path: `/uploads/${file.filename}`,
          })
        );

        const allDocuments = [
          ...existingDocuments,
          ...newDocuments,
        ];

        const sql = `
          UPDATE records
          SET
            projectNumber = ?,
            companyName = ?,
            companyAddress = ?,
            contactPerson = ?,
            phoneNumber = ?,
            amcType = ?,
            amcStartDate = ?,
            amcEndDate = ?,
            lastAMCDate = ?,
            nextAMCDate = ?,
            remarks = ?,
            document = ?
          WHERE id = ?
        `;

        const values = [
          projectNumber,
          companyName,
          companyAddress,
          contactPerson,
          phoneNumber,
          amcType,
          amcStartDate,
          amcEndDate,
          lastAMCDate,
          nextAMCDate,
          remarks,
          JSON.stringify(allDocuments),
          id,
        ];

        db.run(
          sql,
          values,
          function (err) {
            if (err) {
              console.error(
                "Update record error:",
                err.message
              );

              return res.status(500).json({
                message: err.message,
              });
            }

            res.json({
              message:
                "Record updated successfully",
            });
          }
        );
      }
    );
  }
);

/* =========================
   DELETE RECORD
========================= */

app.delete(
  "/api/records/:id",
  (req, res) => {
    const { id } = req.params;

    db.get(
      "SELECT document FROM records WHERE id = ?",
      [id],
      (findError, record) => {
        if (findError) {
          return res.status(500).json({
            message: findError.message,
          });
        }

        db.run(
          "DELETE FROM records WHERE id = ?",
          [id],
          function (err) {
            if (err) {
              return res.status(500).json({
                message: err.message,
              });
            }

            if (record && record.document) {
              try {
                const documents = JSON.parse(
                  record.document
                );

                documents.forEach((document) => {
                  if (!document.path) return;

                  const filePath =
                    path.join(
                      __dirname,
                      document.path.replace(
                        /^\/uploads[\\/]/,
                        ""
                      )
                    );

                  if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                  }
                });
              } catch {
                // Ignore old/invalid document data
              }
            }

            res.json({
              message:
                "Record deleted successfully",
            });
          }
        );
      }
    );
  }
);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `Server is running on port ${PORT}`
  );
});