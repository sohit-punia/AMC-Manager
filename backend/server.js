// const express = require("express");
// const cors = require("cors");
// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const app = express();
// const db = require("./database");

// app.use(cors());
// app.use(express.json());

// const PORT = 5000;

// /* =========================
//    DATA DIRECTORY
// ========================= */

// const dataDir =
//   process.env.AMC_DATA_DIR ||
//   __dirname;

// if (!fs.existsSync(dataDir)) {
//   fs.mkdirSync(dataDir, {
//     recursive: true,
//   });
// }

// /* =========================
//    UPLOAD DIRECTORY
// ========================= */

// const uploadDir = path.join(
//   dataDir,
//   "uploads"
// );

// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, {
//     recursive: true,
//   });
// }

// /* =========================
//    MULTER
// ========================= */

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, uploadDir);
//   },

//   filename: (req, file, cb) => {
//     const uniqueName =
//       Date.now() +
//       "-" +
//       Math.round(Math.random() * 1e9) +
//       path.extname(file.originalname);

//     cb(null, uniqueName);
//   },
// });

// const upload = multer({
//   storage,
//   limits: {
//     files: 10,
//   },
// });

// /* =========================
//    SERVE UPLOADED FILES
// ========================= */

// app.use(
//   "/uploads",
//   express.static(uploadDir)
// );

// /* =========================
//    HOME
// ========================= */

// app.get("/", (req, res) => {
//   res.send(
//     "AMC Record Manager Backend is Running"
//   );
// });

// /* =========================
//    CREATE RECORD
// ========================= */

// app.post(
//   "/api/records",
//   upload.array("documents", 10),
//   (req, res) => {
//     const {
//       projectNumber,
//       companyName,
//       companyAddress,
//       contactPerson,
//       phoneNumber,
//       amcType,
//       amcStartDate,
//       amcEndDate,
//       lastAMCDate,
//       nextAMCDate,
//       remarks,
//     } = req.body;

//     const documents = (
//       req.files || []
//     ).map((file) => ({
//       name: file.originalname,
//       path: `/uploads/${file.filename}`,
//     }));

//     const sql = `
//       INSERT INTO records (
//         projectNumber,
//         companyName,
//         companyAddress,
//         contactPerson,
//         phoneNumber,
//         amcType,
//         amcStartDate,
//         amcEndDate,
//         lastAMCDate,
//         nextAMCDate,
//         remarks,
//         document
//       )
//       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//     `;

//     const values = [
//       projectNumber,
//       companyName,
//       companyAddress,
//       contactPerson,
//       phoneNumber,
//       amcType,
//       amcStartDate,
//       amcEndDate,
//       lastAMCDate,
//       nextAMCDate,
//       remarks,
//       JSON.stringify(documents),
//     ];

//     db.run(
//       sql,
//       values,
//       function (err) {
//         if (err) {
//           console.error(
//             "Create record error:",
//             err.message
//           );

//           return res.status(500).json({
//             message:
//               "Failed to save record",
//           });
//         }

//         res.status(201).json({
//           message:
//             "Record saved successfully",
//           id: this.lastID,
//         });
//       }
//     );
//   }
// );

// /* =========================
//    GET ALL RECORDS
// ========================= */

// app.get(
//   "/api/records",
//   (req, res) => {
//     db.all(
//       "SELECT * FROM records ORDER BY id DESC",
//       [],
//       (err, rows) => {
//         if (err) {
//           return res.status(500).json({
//             error: err.message,
//           });
//         }

//         res.json(rows);
//       }
//     );
//   }
// );

// /* =========================
//    UPDATE RECORD
// ========================= */

// app.put(
//   "/api/records/:id",
//   upload.array("documents", 10),
//   (req, res) => {
//     const { id } = req.params;

//     const {
//       projectNumber,
//       companyName,
//       companyAddress,
//       contactPerson,
//       phoneNumber,
//       amcType,
//       amcStartDate,
//       amcEndDate,
//       lastAMCDate,
//       nextAMCDate,
//       remarks,
//     } = req.body;

//     db.get(
//       "SELECT document FROM records WHERE id = ?",
//       [id],
//       (err, record) => {
//         if (err) {
//           return res.status(500).json({
//             message: err.message,
//           });
//         }

//         if (!record) {
//           return res.status(404).json({
//             message:
//               "Record not found",
//           });
//         }

//         let existingDocuments = [];

//         if (record.document) {
//           try {
//             existingDocuments =
//               JSON.parse(
//                 record.document
//               );
//           } catch {
//             existingDocuments = [];
//           }
//         }

//         const newDocuments = (
//           req.files || []
//         ).map((file) => ({
//           name: file.originalname,
//           path: `/uploads/${file.filename}`,
//         }));

//         const allDocuments = [
//           ...existingDocuments,
//           ...newDocuments,
//         ];

//         const sql = `
//           UPDATE records
//           SET
//             projectNumber = ?,
//             companyName = ?,
//             companyAddress = ?,
//             contactPerson = ?,
//             phoneNumber = ?,
//             amcType = ?,
//             amcStartDate = ?,
//             amcEndDate = ?,
//             lastAMCDate = ?,
//             nextAMCDate = ?,
//             remarks = ?,
//             document = ?
//           WHERE id = ?
//         `;

//         db.run(
//           sql,
//           [
//             projectNumber,
//             companyName,
//             companyAddress,
//             contactPerson,
//             phoneNumber,
//             amcType,
//             amcStartDate,
//             amcEndDate,
//             lastAMCDate,
//             nextAMCDate,
//             remarks,
//             JSON.stringify(
//               allDocuments
//             ),
//             id,
//           ],
//           function (err) {
//             if (err) {
//               return res.status(500).json({
//                 message:
//                   err.message,
//               });
//             }

//             res.json({
//               message:
//                 "Record updated successfully",
//             });
//           }
//         );
//       }
//     );
//   }
// );

// /* =========================
//    DELETE RECORD
// ========================= */

// app.delete(
//   "/api/records/:id",
//   (req, res) => {
//     const { id } = req.params;

//     db.get(
//       "SELECT document FROM records WHERE id = ?",
//       [id],
//       (findError, record) => {
//         if (findError) {
//           return res.status(500).json({
//             message:
//               findError.message,
//           });
//         }

//         db.run(
//           "DELETE FROM records WHERE id = ?",
//           [id],
//           function (err) {
//             if (err) {
//               return res.status(500).json({
//                 message:
//                   err.message,
//               });
//             }

//             res.json({
//               message:
//                 "Record deleted successfully",
//             });
//           }
//         );
//       }
//     );
//   }
// );

// /* =========================
//    START SERVER
// ========================= */

// app.listen(PORT, () => {
//   console.log(
//     `Server is running on port ${PORT}`
//   );
// });


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
   UPLOAD DIRECTORY
========================= */

const uploadDir = path.join(
  dataDir,
  "uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
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
   AMC DATE CALCULATION
========================= */

function calculateNextAMCDate(
  lastAMCDate,
  amcType,
  amcEndDate = ""
) {
  if (!lastAMCDate || !amcType) {
    return "";
  }

  const monthsToAdd = {
    Quarterly: 3,
    "Half Yearly": 6,
    Yearly: 12,
  }[amcType];

  if (!monthsToAdd) {
    return "";
  }

  const parts = lastAMCDate.split("-");

  if (parts.length !== 3) {
    return "";
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  /*
    Convert year/month into one continuous
    month number so adding months is safe.

    Example:
    31 Jan + 3 months
    -> 30 Apr

    31 Aug + 6 months
    -> 28 Feb
  */

  const totalMonths =
    year * 12 +
    (month - 1) +
    monthsToAdd;

  const targetYear =
    Math.floor(totalMonths / 12);

  const targetMonthIndex =
    totalMonths % 12;

  const daysInTargetMonth =
    new Date(
      targetYear,
      targetMonthIndex + 1,
      0
    ).getDate();

  const targetDay = Math.min(
    day,
    daysInTargetMonth
  );

  const nextDate =
    `${targetYear}-${String(
      targetMonthIndex + 1
    ).padStart(2, "0")}-${String(
      targetDay
    ).padStart(2, "0")}`;

  /*
    Do not create a next visit after
    the overall AMC contract ends.
  */

  if (
    amcEndDate &&
    nextDate > amcEndDate
  ) {
    return "";
  }

  return nextDate;
}

/* =========================
   HOME
========================= */

app.get("/", (req, res) => {
  res.send(
    "AMC Record Manager Backend is Running"
  );
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
      remarks,
    } = req.body;

    /*
      ALWAYS calculate the Next AMC Date
      on the backend.
    */

    const nextAMCDate =
      calculateNextAMCDate(
        lastAMCDate,
        amcType,
        amcEndDate
      );

    const documents = (
      req.files || []
    ).map((file) => ({
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

    db.run(
      sql,
      values,
      function (err) {
        if (err) {
          console.error(
            "Create record error:",
            err.message
          );

          return res.status(500).json({
            message:
              "Failed to save record",
          });
        }

        res.status(201).json({
          message:
            "Record saved successfully",
          id: this.lastID,
        });
      }
    );
  }
);

/* =========================
   GET ALL RECORDS
========================= */

app.get(
  "/api/records",
  (req, res) => {
    db.all(
      "SELECT * FROM records ORDER BY id DESC",
      [],
      (err, rows) => {
        if (err) {
          console.error(
            "Get records error:",
            err.message
          );

          return res.status(500).json({
            error: err.message,
          });
        }

        /*
          Recalculate Next AMC Date for every
          record when records are loaded.

          This also fixes old records that may
          contain manually entered next dates.
        */

        const updatedRows = rows.map(
          (record) => ({
            ...record,

            nextAMCDate:
              calculateNextAMCDate(
                record.lastAMCDate,
                record.amcType,
                record.amcEndDate
              ),
          })
        );

        res.json(updatedRows);
      }
    );
  }
);

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
      remarks,
    } = req.body;

    /*
      Recalculate Next AMC Date from:
      Last AMC Date + AMC Type
    */

    const nextAMCDate =
      calculateNextAMCDate(
        lastAMCDate,
        amcType,
        amcEndDate
      );

    db.get(
      "SELECT document FROM records WHERE id = ?",
      [id],
      (err, record) => {
        if (err) {
          return res.status(500).json({
            message: err.message,
          });
        }

        if (!record) {
          return res.status(404).json({
            message:
              "Record not found",
          });
        }

        let existingDocuments = [];

        if (record.document) {
          try {
            existingDocuments =
              JSON.parse(
                record.document
              );
          } catch {
            existingDocuments = [];
          }
        }

        const newDocuments = (
          req.files || []
        ).map((file) => ({
          name: file.originalname,
          path: `/uploads/${file.filename}`,
        }));

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
          JSON.stringify(
            allDocuments
          ),
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
                message:
                  err.message,
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
            message:
              findError.message,
          });
        }

        db.run(
          "DELETE FROM records WHERE id = ?",
          [id],
          function (err) {
            if (err) {
              return res.status(500).json({
                message:
                  err.message,
              });
            }

            if (this.changes === 0) {
              return res.status(404).json({
                message:
                  "Record not found",
              });
            }

            /*
              Remove uploaded files when the
              record is deleted.
            */

            if (
              record &&
              record.document
            ) {
              try {
                const documents =
                  JSON.parse(
                    record.document
                  );

                documents.forEach(
                  (document) => {
                    if (
                      !document.path
                    ) {
                      return;
                    }

                    const relativePath =
                      document.path
                        .replace(
                          /^\/uploads[\\/]/,
                          ""
                        )
                        .replace(
                          /^uploads[\\/]/,
                          ""
                        );

                    const filePath =
                      path.join(
                        uploadDir,
                        relativePath
                      );

                    if (
                      fs.existsSync(
                        filePath
                      )
                    ) {
                      fs.unlinkSync(
                        filePath
                      );
                    }
                  }
                );
              } catch (error) {
                console.error(
                  "Error removing documents:",
                  error.message
                );
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

app.listen(
  PORT,
  () => {
    console.log(
      `Server is running on port ${PORT}`
    );

    console.log(
      `Data directory: ${dataDir}`
    );

    console.log(
      `Upload directory: ${uploadDir}`
    );
  }
);