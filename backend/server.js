const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const app = express();
const db = require("./database");

const PORT = 5000;

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(cors());
app.use(express.json());

/* =========================================================
   DATA DIRECTORY
========================================================= */

const dataDir =
  process.env.AMC_DATA_DIR ||
  __dirname;

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, {
    recursive: true,
  });
}

/* =========================================================
   UPLOAD DIRECTORY
========================================================= */

const uploadDir = path.join(
  dataDir,
  "uploads"
);

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

/* =========================================================
   MULTER
========================================================= */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path
      .extname(file.originalname)
      .toLowerCase();

    const baseName = path
      .basename(
        file.originalname,
        extension
      )
      .replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      );

    const uniqueName =
      `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}-${baseName}${extension}`;

    cb(null, uniqueName);
  },
});

/* =========================================================
   ONLY PDF FILES
========================================================= */

function pdfOnly(req, file, cb) {
  const extension = path
    .extname(file.originalname)
    .toLowerCase();

  if (
    file.mimetype ===
      "application/pdf" ||
    extension === ".pdf"
  ) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only PDF files are allowed."
      )
    );
  }
}

const upload = multer({
  storage,

  fileFilter: pdfOnly,

  limits: {
    fileSize:
      25 * 1024 * 1024,
  },
});

/* =========================================================
   SERVE UPLOADED FILES
========================================================= */

app.use(
  "/uploads",
  express.static(uploadDir)
);

/* =========================================================
   HELPERS
========================================================= */

function sendDbError(res, error) {
  console.error(
    "Database error:",
    error
  );

  return res.status(500).json({
    message:
      error?.message ||
      "Database error",
  });
}

function deleteFile(storedPath) {
  if (!storedPath) {
    return;
  }

  const relativePath =
    String(storedPath).replace(
      /^\/uploads[\\/]/,
      ""
    );

  const filePath = path.join(
    uploadDir,
    relativePath
  );

  if (
    fs.existsSync(filePath)
  ) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      console.error(
        "Could not delete file:",
        error.message
      );
    }
  }
}

function getNextVisitNumber(
  projectId,
  callback
) {
  db.get(
    `
      SELECT
        COALESCE(
          MAX(visitNumber),
          0
        ) AS maxVisit
      FROM amc_visits
      WHERE projectId = ?
    `,
    [projectId],
    (err, row) => {
      if (err) {
        return callback(err);
      }

      const nextNumber =
        Number(
          row?.maxVisit || 0
        ) + 1;

      callback(
        null,
        nextNumber
      );
    }
  );
}

/* =========================================================
   HOME
========================================================= */

app.get(
  "/",
  (req, res) => {
    res.json({
      message:
        "AMC Manager v2 Backend is Running",
    });
  }
);

/* =========================================================
   PROJECTS
========================================================= */

/* =========================================================
   GET ALL PROJECTS

   Optional search:
   /api/projects?projectNumber=51
========================================================= */

app.get(
  "/api/projects",
  (req, res) => {
    const {
      projectNumber,
    } = req.query;

    const params = [];
    let whereClause = "";

    if (
      projectNumber &&
      String(projectNumber).trim()
    ) {
      whereClause = `
        WHERE LOWER(
          p.projectNumber
        ) LIKE LOWER(?)
      `;

      params.push(
        `%${String(
          projectNumber
        ).trim()}%`
      );
    }

    const sql = `
      SELECT
        p.*,

        /* =================================================
           NUMBER OF AMC VISITS
        ================================================= */

        (
          SELECT COUNT(*)
          FROM amc_visits v
          WHERE v.projectId = p.id
        ) AS visitCount,

        /* =================================================
           TOTAL BILL AMOUNT
           SUM OF totalAmount FROM ALL VISITS
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                v.totalAmount,
                0
              )
            )
            FROM amc_visits v
            WHERE v.projectId = p.id
          ),
          0
        ) AS totalBillsAmount,

        /* =================================================
           TOTAL RECEIVED AMOUNT
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                v.amountReceived,
                0
              )
            )
            FROM amc_visits v
            WHERE v.projectId = p.id
          ),
          0
        ) AS receivedAmount,

        /* =================================================
           PENDING AGAINST ORDER AMOUNT
        ================================================= */

        (
          COALESCE(
            p.totalOrderAmount,
            0
          )
          -
          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  v.amountReceived,
                  0
                )
              )
              FROM amc_visits v
              WHERE v.projectId = p.id
            ),
            0
          )
        ) AS pendingAmount,

          /* =================================================
            LAST COMPLETED AMC VISIT
          ================================================= */

          (
            SELECT MAX(
              v.visitDate
            )
            FROM amc_visits v
            WHERE
              v.projectId = p.id
              AND v.visitDate IS NOT NULL
              AND v.visitDate != ''
              AND v.visitDate <= date('now')
          ) AS lastAMCDate,

            /* =================================================
              NEXT AMC DATE

              Quarterly  -> +3 months
              Half Yearly -> +6 months
              Yearly     -> +12 months
            ================================================= */

            (
              SELECT
                CASE p.amcType

                  WHEN 'Quarterly' THEN
                    date(
                      MAX(v.visitDate),
                      '+3 months'
                    )

                  WHEN 'Half Yearly' THEN
                    date(
                      MAX(v.visitDate),
                      '+6 months'
                    )

                  WHEN 'Yearly' THEN
                    date(
                      MAX(v.visitDate),
                      '+12 months'
                    )

                  ELSE NULL

                END

              FROM amc_visits v

              WHERE
                v.projectId = p.id
                AND v.visitDate IS NOT NULL
                AND v.visitDate != ''
                AND v.visitDate <= date('now')
            ) AS nextAMCDate

      FROM projects p

      ${whereClause}

      ORDER BY
        p.id DESC
    `;

    db.all(
      sql,
      params,
      (err, rows) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        const projects =
          rows.map(
            (project) => ({
              ...project,

              totalOrderAmount:
                Number(
                  project.totalOrderAmount
                ) || 0,

              visitCount:
                Number(
                  project.visitCount
                ) || 0,

              totalBillsAmount:
                Number(
                  project.totalBillsAmount
                ) || 0,

              receivedAmount:
                Number(
                  project.receivedAmount
                ) || 0,

              pendingAmount:
                Number(
                  project.pendingAmount
                ) || 0,
            })
          );

        res.json(projects);
      }
    );
  }
);

/* =========================================================
   GET SINGLE PROJECT
========================================================= */

app.get(
  "/api/projects/:id",
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (
      !Number.isInteger(id)
    ) {
      return res.status(400).json({
        message:
          "Invalid project ID.",
      });
    }

    const projectSql = `
      SELECT
        p.*,

        /* =================================================
           AMC VISITS DONE
        ================================================= */

        (
          SELECT COUNT(*)
          FROM amc_visits v
          WHERE v.projectId = p.id
        ) AS visitCount,

        /* =================================================
           TOTAL BILLS / AMC WORK
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                v.totalAmount,
                0
              )
            )
            FROM amc_visits v
            WHERE v.projectId = p.id
          ),
          0
        ) AS totalBillsAmount,

        /* =================================================
           RECEIVED AMOUNT
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                v.amountReceived,
                0
              )
            )
            FROM amc_visits v
            WHERE v.projectId = p.id
          ),
          0
        ) AS receivedAmount,

        /* =================================================
           PENDING AMOUNT
        ================================================= */

        (
          COALESCE(
            p.totalOrderAmount,
            0
          )
          -
          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  v.amountReceived,
                  0
                )
              )
              FROM amc_visits v
              WHERE v.projectId = p.id
            ),
            0
          )
        ) AS pendingAmount

      FROM projects p

      WHERE p.id = ?
    `;

    db.get(
      projectSql,
      [id],
      (projectErr, project) => {
        if (projectErr) {
          return sendDbError(
            res,
            projectErr
          );
        }

        if (!project) {
          return res.status(404).json({
            message:
              "Project not found.",
          });
        }

        /* ===============================================
           GET PROJECT VISITS
        =============================================== */

        db.all(
          `
            SELECT
              v.*
            FROM amc_visits v
            WHERE v.projectId = ?
            ORDER BY
              v.visitNumber ASC
          `,
          [id],
          (visitErr, visits) => {
            if (visitErr) {
              return sendDbError(
                res,
                visitErr
              );
            }

            res.json({
              ...project,

              totalOrderAmount:
                Number(
                  project.totalOrderAmount
                ) || 0,

              visitCount:
                Number(
                  project.visitCount
                ) || 0,

              totalBillsAmount:
                Number(
                  project.totalBillsAmount
                ) || 0,

              receivedAmount:
                Number(
                  project.receivedAmount
                ) || 0,

              pendingAmount:
                Number(
                  project.pendingAmount
                ) || 0,

              visits:
                visits || [],
            });
          }
        );
      }
    );
  }
);

/* =========================================================
   CREATE PROJECT
========================================================= */

app.post(
  "/api/projects",
  (req, res) => {
    const {
      projectNumber,
      companyName,
      companyAddress,
      contactPerson,
      phoneNumber,
      totalOrderAmount,
      numberOfStations,
      stationName,
      amcType,
      amcStartDate,
      amcEndDate,
      remarks,
    } = req.body;

    if (
      !projectNumber ||
      !String(
        projectNumber
      ).trim()
    ) {
      return res.status(400).json({
        message:
          "Project Number is required.",
      });
    }

    if (
      !companyName ||
      !String(
        companyName
      ).trim()
    ) {
      return res.status(400).json({
        message:
          "Company Name is required.",
      });
    }

    if (!amcType) {
      return res.status(400).json({
        message:
          "AMC Type is required.",
      });
    }

    const sql = `
      INSERT INTO projects (
        projectNumber,
        companyName,
        companyAddress,
        contactPerson,
        phoneNumber,
        totalOrderAmount,
        numberOfStations,
        stationName,
        amcType,
        amcStartDate,
        amcEndDate,
        remarks
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(
      sql,
      [
        String(
          projectNumber
        ).trim(),

        String(
          companyName
        ).trim(),

        companyAddress || "",

        contactPerson || "",

        phoneNumber || "",

        Number(
          totalOrderAmount
        ) || 0,

        Number(
          numberOfStations
        ) || 0,

        stationName || "",

        amcType,

        amcStartDate || "",

        amcEndDate || "",

        remarks || "",
      ],
      function (err) {
        if (err) {
          if (
            err.message.includes(
              "UNIQUE constraint failed"
            )
          ) {
            return res.status(409).json({
              message:
                "Project Number already exists.",
            });
          }

          return sendDbError(
            res,
            err
          );
        }

        res.status(201).json({
          message:
            "Project created successfully.",

          projectId:
            this.lastID,
        });
      }
    );
  }
);

/* =========================================================
   UPDATE PROJECT
========================================================= */

app.put(
  "/api/projects/:id",
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (
      !Number.isInteger(id)
    ) {
      return res.status(400).json({
        message:
          "Invalid project ID.",
      });
    }

    const {
      projectNumber,
      companyName,
      companyAddress,
      contactPerson,
      phoneNumber,
      totalOrderAmount,
      numberOfStations,
      stationName,
      amcType,
      amcStartDate,
      amcEndDate,
      remarks,
    } = req.body;

    if (
      !projectNumber ||
      !String(
        projectNumber
      ).trim()
    ) {
      return res.status(400).json({
        message:
          "Project Number is required.",
      });
    }

    if (
      !companyName ||
      !String(
        companyName
      ).trim()
    ) {
      return res.status(400).json({
        message:
          "Company Name is required.",
      });
    }

    if (!amcType) {
      return res.status(400).json({
        message:
          "AMC Type is required.",
      });
    }

    const sql = `
      UPDATE projects
      SET
        projectNumber = ?,
        companyName = ?,
        companyAddress = ?,
        contactPerson = ?,
        phoneNumber = ?,
        totalOrderAmount = ?,
        numberOfStations = ?,
        stationName = ?,
        amcType = ?,
        amcStartDate = ?,
        amcEndDate = ?,
        remarks = ?,
        updatedAt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(
      sql,
      [
        String(
          projectNumber
        ).trim(),

        String(
          companyName
        ).trim(),

        companyAddress || "",

        contactPerson || "",

        phoneNumber || "",

        Number(
          totalOrderAmount
        ) || 0,

        Number(
          numberOfStations
        ) || 0,

        stationName || "",

        amcType,

        amcStartDate || "",

        amcEndDate || "",

        remarks || "",

        id,
      ],
      function (err) {
        if (err) {
          if (
            err.message.includes(
              "UNIQUE constraint failed"
            )
          ) {
            return res.status(409).json({
              message:
                "Project Number already exists.",
            });
          }

          return sendDbError(
            res,
            err
          );
        }

        if (
          this.changes === 0
        ) {
          return res.status(404).json({
            message:
              "Project not found.",
          });
        }

        res.json({
          message:
            "Project updated successfully.",
        });
      }
    );
  }
);

/* =========================================================
   DELETE PROJECT
========================================================= */

app.delete(
  "/api/projects/:id",
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (
      !Number.isInteger(id)
    ) {
      return res.status(400).json({
        message:
          "Invalid project ID.",
      });
    }

    db.run(
      `
        DELETE FROM projects
        WHERE id = ?
      `,
      [id],
      function (err) {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        if (
          this.changes === 0
        ) {
          return res.status(404).json({
            message:
              "Project not found.",
          });
        }

        res.json({
          message:
            "Project and its visits deleted successfully.",
        });
      }
    );
  }
);

/* =========================================================
   VISITS
========================================================= */

/* =========================================================
   GET ALL VISITS

   Optional:
   /api/visits?projectNumber=51
========================================================= */

app.get(
  "/api/visits",
  (req, res) => {
    const {
      projectNumber,
    } = req.query;

    const params = [];
    let whereClause = "";

    if (
      projectNumber &&
      String(projectNumber).trim()
    ) {
      whereClause = `
        WHERE LOWER(
          p.projectNumber
        ) LIKE LOWER(?)
      `;

      params.push(
        `%${String(
          projectNumber
        ).trim()}%`
      );
    }

    const sql = `
      SELECT
        v.id,
        v.projectId,

        v.visitNumber,
        v.visitDate,

        v.employeeName,

        v.totalAmount,
        v.invoicePdf,

        v.amountReceived,
        v.amountReceivedDate,
        v.receivedReportPdf,

        v.tourAmountAllocated,
        v.tourExpense,
        v.expensePdf,

        v.remarks,

        v.createdAt,
        v.updatedAt,

        p.projectNumber,
        p.companyName

      FROM amc_visits v

      INNER JOIN projects p
        ON p.id = v.projectId

      ${whereClause}

      ORDER BY
        p.projectNumber ASC,
        v.visitNumber ASC
    `;

    db.all(
      sql,
      params,
      (err, rows) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        res.json(rows);
      }
    );
  }
);

/* =========================================================
   GET ONE VISIT
========================================================= */

app.get(
  "/api/visits/:id",
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (
      !Number.isInteger(id)
    ) {
      return res.status(400).json({
        message:
          "Invalid visit ID.",
      });
    }

    const sql = `
      SELECT
        v.*,

        p.projectNumber,
        p.companyName,
        p.totalOrderAmount

      FROM amc_visits v

      INNER JOIN projects p
        ON p.id = v.projectId

      WHERE v.id = ?
    `;

    db.get(
      sql,
      [id],
      (err, visit) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        if (!visit) {
          return res.status(404).json({
            message:
              "Visit not found.",
          });
        }

        res.json(visit);
      }
    );
  }
);

/* =========================================================
   CREATE VISIT
========================================================= */

app.post(
  "/api/visits",
  upload.fields([
    {
      name: "invoicePdf",
      maxCount: 1,
    },

    {
      name:
        "receivedReportPdf",
      maxCount: 1,
    },

    {
      name: "expensePdf",
      maxCount: 1,
    },
  ]),
  (req, res) => {
    const {
      projectNumber,
      visitNumber,
      visitDate,
      employeeName,
      totalAmount,
      amountReceived,
      amountReceivedDate,
      tourAmountAllocated,
      tourExpense,
      remarks,
    } = req.body;

    if (
      !projectNumber ||
      !String(
        projectNumber
      ).trim()
    ) {
      return res.status(400).json({
        message:
          "Project Number is required.",
      });
    }

    /* =====================================================
       FIND PROJECT
    ===================================================== */

    db.get(
      `
        SELECT *
        FROM projects
        WHERE LOWER(projectNumber)
          = LOWER(?)
      `,
      [
        String(
          projectNumber
        ).trim(),
      ],
      (
        projectErr,
        project
      ) => {
        if (projectErr) {
          return sendDbError(
            res,
            projectErr
          );
        }

        if (!project) {
          return res.status(404).json({
            message:
              "Project Number not found.",
          });
        }

        /* =================================================
           INSERT VISIT
        ================================================= */

        function insertVisit(
          finalVisitNumber
        ) {
          const files =
            req.files || {};

          const invoiceFile =
            files.invoicePdf?.[0];

          const receivedFile =
            files
              .receivedReportPdf?.[0];

          const expenseFile =
            files.expensePdf?.[0];

          const invoicePath =
            invoiceFile
              ? `/uploads/${invoiceFile.filename}`
              : "";

          const receivedReportPath =
            receivedFile
              ? `/uploads/${receivedFile.filename}`
              : "";

          const expensePath =
            expenseFile
              ? `/uploads/${expenseFile.filename}`
              : "";

          const sql = `
            INSERT INTO amc_visits (
              projectId,
              visitNumber,
              visitDate,
              employeeName,
              totalAmount,
              invoicePdf,
              amountReceived,
              amountReceivedDate,
              receivedReportPdf,
              tourAmountAllocated,
              tourExpense,
              expensePdf,
              remarks
            )
            VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `;

          db.run(
            sql,
            [
              project.id,

              finalVisitNumber,

              visitDate || "",

              employeeName || "",

              Number(
                totalAmount
              ) || 0,

              invoicePath,

              Number(
                amountReceived
              ) || 0,

              amountReceivedDate ||
                "",

              receivedReportPath,

              Number(
                tourAmountAllocated
              ) || 0,

              Number(
                tourExpense
              ) || 0,

              expensePath,

              remarks || "",
            ],
            function (err) {
              if (err) {
                if (
                  err.message.includes(
                    "UNIQUE constraint failed"
                  )
                ) {
                  return res.status(409).json({
                    message:
                      "This visit number already exists for this project.",
                  });
                }

                return sendDbError(
                  res,
                  err
                );
              }

              res.status(201).json({
                message:
                  "Visit created successfully.",

                visitId:
                  this.lastID,

                visitNumber:
                  finalVisitNumber,
              });
            }
          );
        }

        /* =================================================
           VISIT NUMBER

           If frontend gives a number,
           use it.

           Otherwise calculate next number.
        ================================================= */

        if (
          visitNumber &&
          Number(
            visitNumber
          ) > 0
        ) {
          insertVisit(
            Number(
              visitNumber
            )
          );
        } else {
          getNextVisitNumber(
            project.id,
            (
              numberErr,
              nextNumber
            ) => {
              if (numberErr) {
                return sendDbError(
                  res,
                  numberErr
                );
              }

              insertVisit(
                nextNumber
              );
            }
          );
        }
      }
    );
  }
);

/* =========================================================
   UPDATE VISIT
========================================================= */

app.put(
  "/api/visits/:id",
  upload.fields([
    {
      name: "invoicePdf",
      maxCount: 1,
    },

    {
      name:
        "receivedReportPdf",
      maxCount: 1,
    },

    {
      name: "expensePdf",
      maxCount: 1,
    },
  ]),
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (
      !Number.isInteger(id)
    ) {
      return res.status(400).json({
        message:
          "Invalid visit ID.",
      });
    }

    /* =====================================================
       GET EXISTING VISIT
    ===================================================== */

    db.get(
      `
        SELECT *
        FROM amc_visits
        WHERE id = ?
      `,
      [id],
      (
        findErr,
        existing
      ) => {
        if (findErr) {
          return sendDbError(
            res,
            findErr
          );
        }

        if (!existing) {
          return res.status(404).json({
            message:
              "Visit not found.",
          });
        }

        const {
          projectNumber,
          visitNumber,
          visitDate,
          employeeName,
          totalAmount,
          amountReceived,
          amountReceivedDate,
          tourAmountAllocated,
          tourExpense,
          remarks,
        } = req.body;

        if (
          !projectNumber ||
          !String(
            projectNumber
          ).trim()
        ) {
          return res.status(400).json({
            message:
              "Project Number is required.",
          });
        }

        /* ===============================================
           FIND NEW PROJECT
        =============================================== */

        db.get(
          `
            SELECT *
            FROM projects
            WHERE LOWER(projectNumber)
              = LOWER(?)
          `,
          [
            String(
              projectNumber
            ).trim(),
          ],
          (
            projectErr,
            project
          ) => {
            if (projectErr) {
              return sendDbError(
                res,
                projectErr
              );
            }

            if (!project) {
              return res.status(404).json({
                message:
                  "Project Number not found.",
              });
            }

            /* =========================================
               FILE PATHS
            ========================================= */

            const files =
              req.files || {};

            let invoicePath =
              existing.invoicePdf ||
              "";

            let receivedReportPath =
              existing.receivedReportPdf ||
              "";

            let expensePath =
              existing.expensePdf ||
              "";

            /* =========================================
               NEW INVOICE
            ========================================= */

            if (
              files.invoicePdf?.[0]
            ) {
              deleteFile(
                invoicePath
              );

              invoicePath =
                `/uploads/${files.invoicePdf[0].filename}`;
            }

            /* =========================================
               NEW RECEIVED REPORT
            ========================================= */

            if (
              files
                .receivedReportPdf?.[0]
            ) {
              deleteFile(
                receivedReportPath
              );

              receivedReportPath =
                `/uploads/${files.receivedReportPdf[0].filename}`;
            }

            /* =========================================
               NEW EXPENSE PDF
            ========================================= */

            if (
              files.expensePdf?.[0]
            ) {
              deleteFile(
                expensePath
              );

              expensePath =
                `/uploads/${files.expensePdf[0].filename}`;
            }

            /* =========================================
               UPDATE
            ========================================= */

            const sql = `
              UPDATE amc_visits
              SET
                projectId = ?,
                visitNumber = ?,
                visitDate = ?,
                employeeName = ?,
                totalAmount = ?,
                invoicePdf = ?,
                amountReceived = ?,
                amountReceivedDate = ?,
                receivedReportPdf = ?,
                tourAmountAllocated = ?,
                tourExpense = ?,
                expensePdf = ?,
                remarks = ?,
                updatedAt = CURRENT_TIMESTAMP
              WHERE id = ?
            `;

            db.run(
              sql,
              [
                project.id,

                Number(
                  visitNumber
                ) || 1,

                visitDate || "",

                employeeName || "",

                Number(
                  totalAmount
                ) || 0,

                invoicePath,

                Number(
                  amountReceived
                ) || 0,

                amountReceivedDate ||
                  "",

                receivedReportPath,

                Number(
                  tourAmountAllocated
                ) || 0,

                Number(
                  tourExpense
                ) || 0,

                expensePath,

                remarks || "",

                id,
              ],
              function (err) {
                if (err) {
                  if (
                    err.message.includes(
                      "UNIQUE constraint failed"
                    )
                  ) {
                    return res.status(409).json({
                      message:
                        "This visit number already exists for this project.",
                    });
                  }

                  return sendDbError(
                    res,
                    err
                  );
                }

                res.json({
                  message:
                    "Visit updated successfully.",
                });
              }
            );
          }
        );
      }
    );
  }
);

/* =========================================================
   DELETE VISIT
========================================================= */

app.delete(
  "/api/visits/:id",
  (req, res) => {
    const id = Number(
      req.params.id
    );

    if (
      !Number.isInteger(id)
    ) {
      return res.status(400).json({
        message:
          "Invalid visit ID.",
      });
    }

    db.get(
      `
        SELECT *
        FROM amc_visits
        WHERE id = ?
      `,
      [id],
      (
        findErr,
        visit
      ) => {
        if (findErr) {
          return sendDbError(
            res,
            findErr
          );
        }

        if (!visit) {
          return res.status(404).json({
            message:
              "Visit not found.",
          });
        }

        db.run(
          `
            DELETE FROM amc_visits
            WHERE id = ?
          `,
          [id],
          function (err) {
            if (err) {
              return sendDbError(
                res,
                err
              );
            }

            /* =========================================
               DELETE DOCUMENTS
            ========================================= */

            deleteFile(
              visit.invoicePdf
            );

            deleteFile(
              visit.receivedReportPdf
            );

            deleteFile(
              visit.expensePdf
            );

            res.json({
              message:
                "Visit deleted successfully.",
            });
          }
        );
      }
    );
  }
);

/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {
    res.status(404).json({
      message:
        "API endpoint not found.",
    });
  }
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "Server error:",
      err
    );

    if (
      err instanceof
      multer.MulterError
    ) {
      return res.status(400).json({
        message:
          err.message,
      });
    }

    res.status(500).json({
      message:
        err.message ||
        "Internal server error.",
    });
  }
);

/* =========================================================
   START SERVER
========================================================= */

app.listen(
  PORT,
  () => {
    console.log(
      "================================"
    );

    console.log(
      "AMC Manager v2 Backend"
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Data directory: ${dataDir}`
    );

    console.log(
      `Upload directory: ${uploadDir}`
    );

    console.log(
      "================================"
    );
  }
);