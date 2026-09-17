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

app.use(
  express.urlencoded({
    extended: true,
  })
);

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

const uploadDir =
  path.join(
    dataDir,
    "uploads"
  );

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

/* =========================================================
   MULTER STORAGE
========================================================= */

const storage =
  multer.diskStorage({
    destination: (
      _req,
      _file,
      cb
    ) => {
      cb(
        null,
        uploadDir
      );
    },

    filename: (
      _req,
      file,
      cb
    ) => {
      const extension =
        path
          .extname(
            file.originalname ||
              ""
          )
          .toLowerCase();

      const baseName =
        path
          .basename(
            file.originalname ||
              "document",
            extension
          )
          .replace(
            /[^a-zA-Z0-9_-]/g,
            "_"
          );

      const uniqueName =
        `${Date.now()}-${Math.round(
          Math.random() * 1e9
        )}-${baseName || "document"}${extension}`;

      cb(
        null,
        uniqueName
      );
    },
  });

/* =========================================================
   PDF FILTER
========================================================= */

function pdfOnly(
  _req,
  file,
  cb
) {
  const extension =
    path
      .extname(
        file.originalname ||
          ""
      )
      .toLowerCase();

  if (
    file.mimetype ===
      "application/pdf" ||
    extension === ".pdf"
  ) {
    cb(
      null,
      true
    );

    return;
  }

  cb(
    new Error(
      "Only PDF files are allowed."
    )
  );
}

const upload =
  multer({
    storage,
    fileFilter:
      pdfOnly,

    limits: {
      fileSize:
        25 *
        1024 *
        1024,
    },
  });

/* =========================================================
   STATIC UPLOADS
========================================================= */

app.use(
  "/uploads",
  express.static(
    uploadDir
  )
);

/* =========================================================
   HELPERS
========================================================= */

function sendDbError(
  res,
  error
) {
  console.error(
    "Database error:",
    error
  );

  return res
    .status(500)
    .json({
      message:
        error?.message ||
        "Database error.",
    });
}

function normalizeProjectNumber(
  value
) {
  return String(
    value ?? ""
  ).trim();
}

function toNumber(
  value
) {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
}

/* =========================================================
   DELETE STORED FILE
========================================================= */

function deleteFile(
  storedPath
) {
  if (!storedPath) {
    return;
  }

  const normalized =
    String(storedPath)
      .replace(
        /\\/g,
        "/"
      )
      .replace(
        /^\/+/,
        ""
      );

  if (
    !normalized.startsWith(
      "uploads/"
    )
  ) {
    return;
  }

  const relativePath =
    normalized.slice(
      "uploads/".length
    );

  const filePath =
    path.resolve(
      uploadDir,
      relativePath
    );

  const uploadRoot =
    path.resolve(
      uploadDir
    ) + path.sep;

  if (
    !filePath.startsWith(
      uploadRoot
    )
  ) {
    return;
  }

  if (
    fs.existsSync(
      filePath
    )
  ) {
    try {
      fs.unlinkSync(
        filePath
      );
    } catch (error) {
      console.error(
        "Could not delete file:",
        error.message
      );
    }
  }
}

/* =========================================================
   AMC FREQUENCY
========================================================= */

function getAMCMonths(amcType) {
  switch (amcType) {
    case "Quarterly":
      return 3;

    case "Half Yearly":
      return 6;

    case "Yearly":
      return 12;

    case "2 Yearly":
      return 24;

    case "3 Yearly":
      return 36;

    default:
      return 0;
  }
}

/* =========================================================
   ADD MONTHS TO AMC DATE
========================================================= */

function addAMCMonths(
  dateString,
  amcType
) {
  if (!dateString) {
    return "";
  }

  const months =
    getAMCMonths(
      amcType
    );

  if (!months) {
    return "";
  }

  const parts =
    String(
      dateString
    ).split("-");

  if (
    parts.length !==
    3
  ) {
    return "";
  }

  const year =
    Number(parts[0]);

  const month =
    Number(parts[1]);

  const day =
    Number(parts[2]);

  if (
    !year ||
    !month ||
    !day
  ) {
    return "";
  }

  const date =
    new Date(
      year,
      month - 1,
      1
    );

  date.setMonth(
    date.getMonth() +
      months
  );

  const lastDay =
    new Date(
      date.getFullYear(),
      date.getMonth() +
        1,
      0
    ).getDate();

  date.setDate(
    Math.min(
      day,
      lastDay
    )
  );

  const resultYear =
    date.getFullYear();

  const resultMonth =
    String(
      date.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const resultDay =
    String(
      date.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${resultYear}-${resultMonth}-${resultDay}`;
}

/* =========================================================
   CALCULATE NEXT AMC DATE

   Latest actual visit is used.
   If no visit exists, AMC Start Date is used.

   Last AMC Date remains in the DB only for compatibility
   with existing data and old project records.
========================================================= */

function calculateNextAMCDate(
  project,
  latestVisitDate = ""
) {
  const baseDate =
    latestVisitDate ||
    project.amcStartDate ||
    "";

  if (!baseDate) {
    return "";
  }

  return addAMCMonths(
    baseDate,
    project.amcType
  );
}

/* =========================================================
   GET NEXT VISIT NUMBER
========================================================= */

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
    (
      err,
      row
    ) => {
      if (err) {
        return callback(
          err
        );
      }

      const nextNumber =
        Number(
          row?.maxVisit ||
            0
        ) + 1;

      callback(
        null,
        nextNumber
      );
    }
  );
}

/* =========================================================
   GET NEXT BILL NUMBER
========================================================= */

function getNextBillNumber(
  projectId,
  callback
) {
  db.get(
    `
      SELECT
        COALESCE(
          MAX(billNumber),
          0
        ) AS maxBill
      FROM amc_bills
      WHERE projectId = ?
    `,
    [projectId],
    (
      err,
      row
    ) => {
      if (err) {
        return callback(
          err
        );
      }

      const nextNumber =
        Number(
          row?.maxBill ||
            0
        ) + 1;

      callback(
        null,
        nextNumber
      );
    }
  );
}

/* =========================================================
   GET LATEST VISIT DATE
========================================================= */

function getLatestVisitDate(
  projectId,
  callback
) {
  db.get(
    `
      SELECT
        MAX(visitDate)
          AS latestVisitDate
      FROM amc_visits
      WHERE
        projectId = ?
        AND visitDate IS NOT NULL
        AND visitDate != ''
    `,
    [projectId],
    (
      err,
      row
    ) => {
      if (err) {
        return callback(
          err
        );
      }

      callback(
        null,
        row?.latestVisitDate ||
          ""
      );
    }
  );
}

/* =========================================================
   REFRESH LAST AMC DATE

   Kept for compatibility with the existing visit system.
   This does NOT control the new Next AMC calculation.
========================================================= */

function refreshProjectLastAMCDate(
  projectId,
  callback
) {
  getLatestVisitDate(
    projectId,
    (
      err,
      latestVisitDate
    ) => {
      if (err) {
        return callback(
          err
        );
      }

      if (
        latestVisitDate
      ) {
        db.run(
          `
            UPDATE projects
            SET
              lastAMCDate = ?,
              updatedAt =
                CURRENT_TIMESTAMP
            WHERE id = ?
          `,
          [
            latestVisitDate,
            projectId,
          ],
          (
            updateErr
          ) => {
            callback(
              updateErr ||
                null
            );
          }
        );

        return;
      }

      callback(
        null
      );
    }
  );
}

/* =========================================================
   FIND PROJECT BY NUMBER
========================================================= */

function findProjectByNumber(
  projectNumber,
  callback
) {
  const normalized =
    normalizeProjectNumber(
      projectNumber
    );

  if (!normalized) {
    return callback(
      null,
      null
    );
  }

  db.get(
    `
      SELECT *
      FROM projects
      WHERE LOWER(projectNumber)
        = LOWER(?)
    `,
    [normalized],
    callback
  );
}

/* =========================================================
   HOME
========================================================= */

app.get(
  "/",
  (
    _req,
    res
  ) => {
    res.json({
      message:
        "AMC Manager v2 Backend is Running",
    });
  }
);

/* =========================================================
   GET ALL PROJECTS
========================================================= */

app.get(
  "/api/projects",
  (
    req,
    res
  ) => {
    const projectNumber =
      normalizeProjectNumber(
        req.query.projectNumber
      );

    const params = [];

    let whereClause =
      "";

    if (projectNumber) {
      whereClause = `
        WHERE LOWER(
          p.projectNumber
        ) LIKE LOWER(?)
      `;

      params.push(
        `%${projectNumber}%`
      );
    }

    const sql = `
      SELECT
        p.*,

        /* =================================================
           NUMBER OF VISITS
        ================================================= */

        (
          SELECT COUNT(*)
          FROM amc_visits v
          WHERE v.projectId = p.id
        ) AS visitCount,

        /* =================================================
           LATEST VISIT DATE
        ================================================= */

        (
          SELECT MAX(v.visitDate)
          FROM amc_visits v
          WHERE
            v.projectId = p.id
            AND v.visitDate IS NOT NULL
            AND v.visitDate != ''
        ) AS latestVisitDate,

        /* =================================================
           NUMBER OF BILLS
        ================================================= */

        (
          SELECT COUNT(*)
          FROM amc_bills b
          WHERE b.projectId = p.id
        ) AS billCount,

        /* =================================================
           TOTAL BILL AMOUNT
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                b.billAmount,
                0
              )
            )
            FROM amc_bills b
            WHERE b.projectId = p.id
          ),
          0
        ) AS totalBillAmount,

        /* =================================================
           TOTAL RECEIVED AMOUNT
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                b.amountReceived,
                0
              )
            )
            FROM amc_bills b
            WHERE b.projectId = p.id
          ),
          0
        ) AS receivedAmount,

        /* =================================================
           PENDING BILL AMOUNT
        ================================================= */

        (
          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  b.billAmount,
                  0
                )
              )
              FROM amc_bills b
              WHERE b.projectId = p.id
            ),
            0
          )
          -
          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  b.amountReceived,
                  0
                )
              )
              FROM amc_bills b
              WHERE b.projectId = p.id
            ),
            0
          )
        ) AS pendingBillAmount

      FROM projects p

      ${whereClause}

      ORDER BY
        p.id DESC
    `;

    db.all(
      sql,
      params,
      (
        err,
        rows
      ) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        const projects =
          (
            rows || []
          ).map(
            (
              project
            ) => ({
              ...project,

              nextAMCDate:
                calculateNextAMCDate(
                  project,
                  project.latestVisitDate
                ),

              totalOrderAmount:
                toNumber(
                  project.totalOrderAmount
                ),

              numberOfStations:
                toNumber(
                  project.numberOfStations
                ),

              visitCount:
                toNumber(
                  project.visitCount
                ),

              billCount:
                toNumber(
                  project.billCount
                ),

              totalBillAmount:
                toNumber(
                  project.totalBillAmount
                ),

              receivedAmount:
                toNumber(
                  project.receivedAmount
                ),

              pendingBillAmount:
                toNumber(
                  project.pendingBillAmount
                ),
            })
          );

        res.json(
          projects
        );
      }
    );
  }
);

/* =========================================================
   GET SINGLE PROJECT
========================================================= */

app.get(
  "/api/projects/:id",
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid project ID.",
        });
    }

    const sql = `
      SELECT
        p.*,

        /* =================================================
           VISIT COUNT
        ================================================= */

        (
          SELECT COUNT(*)
          FROM amc_visits v
          WHERE v.projectId = p.id
        ) AS visitCount,

        /* =================================================
           LATEST VISIT
        ================================================= */

        (
          SELECT MAX(v.visitDate)
          FROM amc_visits v
          WHERE
            v.projectId = p.id
            AND v.visitDate IS NOT NULL
            AND v.visitDate != ''
        ) AS latestVisitDate,

        /* =================================================
           BILL COUNT
        ================================================= */

        (
          SELECT COUNT(*)
          FROM amc_bills b
          WHERE b.projectId = p.id
        ) AS billCount,

        /* =================================================
           TOTAL BILL AMOUNT
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                b.billAmount,
                0
              )
            )
            FROM amc_bills b
            WHERE b.projectId = p.id
          ),
          0
        ) AS totalBillAmount,

        /* =================================================
           RECEIVED AMOUNT
        ================================================= */

        COALESCE(
          (
            SELECT SUM(
              COALESCE(
                b.amountReceived,
                0
              )
            )
            FROM amc_bills b
            WHERE b.projectId = p.id
          ),
          0
        ) AS receivedAmount,

        /* =================================================
           PENDING BILL AMOUNT
        ================================================= */

        (
          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  b.billAmount,
                  0
                )
              )
              FROM amc_bills b
              WHERE b.projectId = p.id
            ),
            0
          )
          -
          COALESCE(
            (
              SELECT SUM(
                COALESCE(
                  b.amountReceived,
                  0
                )
              )
              FROM amc_bills b
              WHERE b.projectId = p.id
            ),
            0
          )
        ) AS pendingBillAmount

      FROM projects p

      WHERE p.id = ?
    `;

    db.get(
      sql,
      [id],
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
          return res
            .status(404)
            .json({
              message:
                "Project not found.",
            });
        }

        /* =================================================
           GET VISITS
        ================================================= */

        db.all(
          `
            SELECT *
            FROM amc_visits
            WHERE projectId = ?
            ORDER BY visitNumber ASC
          `,
          [id],
          (
            visitErr,
            visits
          ) => {
            if (visitErr) {
              return sendDbError(
                res,
                visitErr
              );
            }

            /* =============================================
               GET BILLS
            ============================================= */

            db.all(
              `
                SELECT
                  b.*,

                  CASE
                    WHEN COALESCE(
                      b.amountReceived,
                      0
                    ) <= 0
                      THEN 'Pending'

                    WHEN COALESCE(
                      b.amountReceived,
                      0
                    ) >= COALESCE(
                      b.billAmount,
                      0
                    )
                      THEN 'Paid'

                    ELSE 'Partial'
                  END AS status

                FROM amc_bills b

                WHERE
                  b.projectId = ?

                ORDER BY
                  b.billNumber ASC
              `,
              [id],
              (
                billErr,
                bills
              ) => {
                if (billErr) {
                  return sendDbError(
                    res,
                    billErr
                  );
                }

                res.json({
                  ...project,

                  nextAMCDate:
                    calculateNextAMCDate(
                      project,
                      project.latestVisitDate
                    ),

                  totalOrderAmount:
                    toNumber(
                      project.totalOrderAmount
                    ),

                  numberOfStations:
                    toNumber(
                      project.numberOfStations
                    ),

                  visitCount:
                    toNumber(
                      project.visitCount
                    ),

                  billCount:
                    toNumber(
                      project.billCount
                    ),

                  totalBillAmount:
                    toNumber(
                      project.totalBillAmount
                    ),

                  receivedAmount:
                    toNumber(
                      project.receivedAmount
                    ),

                  pendingBillAmount:
                    toNumber(
                      project.pendingBillAmount
                    ),

                  visits:
                    visits || [],

                  bills:
                    bills || [],
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
   CREATE PROJECT
========================================================= */

app.post(
  "/api/projects",
  (
    req,
    res
  ) => {
    const projectNumber =
      normalizeProjectNumber(
        req.body.projectNumber
      );

    const companyName =
      String(
        req.body.companyName ??
          ""
      ).trim();

    const companyAddress =
      req.body.companyAddress ||
      "";

    const contactPerson =
      req.body.contactPerson ||
      "";

    const phoneNumber =
      req.body.phoneNumber ||
      "";

    const totalOrderAmount =
      toNumber(
        req.body.totalOrderAmount
      );

    const numberOfStations =
      Math.max(
        0,
        Math.trunc(
          toNumber(
            req.body.numberOfStations
          )
        )
      );

    const stationName =
      req.body.stationName ||
      "";

    const amcType =
      req.body.amcType ||
      "";

    const amcStartDate =
      req.body.amcStartDate ||
      "";

    /*
      Kept for compatibility with your existing database.
      It is no longer used for calculating Next AMC.
    */
    const lastAMCDate =
      req.body.lastAMCDate ||
      "";

    const amcEndDate =
      req.body.amcEndDate ||
      "";

    const remarks =
      req.body.remarks ||
      "";

    if (!projectNumber) {
      return res
        .status(400)
        .json({
          message:
            "Project Number is required.",
        });
    }

    if (!companyName) {
      return res
        .status(400)
        .json({
          message:
            "Company Name is required.",
        });
    }

    if (!amcType) {
      return res
        .status(400)
        .json({
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
        lastAMCDate,
        amcEndDate,
        remarks
      )
      VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `;

    const values = [
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
      lastAMCDate,
      amcEndDate,
      remarks,
    ];

    db.run(
      sql,
      values,
      function (err) {
        if (err) {
          if (
            err.message.includes(
              "UNIQUE constraint failed"
            )
          ) {
            return res
              .status(409)
              .json({
                message:
                  "Project Number already exists.",
              });
          }

          return sendDbError(
            res,
            err
          );
        }

        res
          .status(201)
          .json({
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
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid project ID.",
        });
    }

    const projectNumber =
      normalizeProjectNumber(
        req.body.projectNumber
      );

    const companyName =
      String(
        req.body.companyName ??
          ""
      ).trim();

    const companyAddress =
      req.body.companyAddress ||
      "";

    const contactPerson =
      req.body.contactPerson ||
      "";

    const phoneNumber =
      req.body.phoneNumber ||
      "";

    const totalOrderAmount =
      toNumber(
        req.body.totalOrderAmount
      );

    const numberOfStations =
      Math.max(
        0,
        Math.trunc(
          toNumber(
            req.body.numberOfStations
          )
        )
      );

    const stationName =
      req.body.stationName ||
      "";

    const amcType =
      req.body.amcType ||
      "";

    const amcStartDate =
      req.body.amcStartDate ||
      "";

    const lastAMCDate =
      req.body.lastAMCDate ||
      "";

    const amcEndDate =
      req.body.amcEndDate ||
      "";

    const remarks =
      req.body.remarks ||
      "";

    if (!projectNumber) {
      return res
        .status(400)
        .json({
          message:
            "Project Number is required.",
        });
    }

    if (!companyName) {
      return res
        .status(400)
        .json({
          message:
            "Company Name is required.",
        });
    }

    if (!amcType) {
      return res
        .status(400)
        .json({
          message:
            "AMC Type is required.",
        });
    }

    /*
      Allow current project to keep its own number.
      Reject only another project's number.
    */

    db.get(
      `
        SELECT id
        FROM projects
        WHERE
          LOWER(projectNumber)
            = LOWER(?)
          AND id != ?
      `,
      [
        projectNumber,
        id,
      ],
      (
        duplicateErr,
        duplicate
      ) => {
        if (duplicateErr) {
          return sendDbError(
            res,
            duplicateErr
          );
        }

        if (duplicate) {
          return res
            .status(409)
            .json({
              message:
                "Project Number already exists.",
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
            lastAMCDate = ?,
            amcEndDate = ?,
            remarks = ?,
            updatedAt =
              CURRENT_TIMESTAMP
          WHERE id = ?
        `;

        const values = [
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
          lastAMCDate,
          amcEndDate,
          remarks,
          id,
        ];

        db.run(
          sql,
          values,
          function (err) {
            if (err) {
              return sendDbError(
                res,
                err
              );
            }

            if (
              this.changes ===
              0
            ) {
              return res
                .status(404)
                .json({
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
  }
);

/* =========================================================
   DELETE PROJECT
========================================================= */

app.delete(
  "/api/projects/:id",
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid project ID.",
        });
    }

    /*
      Get visit files before deleting project.
    */

    db.all(
      `
        SELECT
          invoicePdf,
          receivedReportPdf,
          expensePdf
        FROM amc_visits
        WHERE projectId = ?
      `,
      [id],
      (
        visitErr,
        visits
      ) => {
        if (visitErr) {
          return sendDbError(
            res,
            visitErr
          );
        }

        /*
          Get bill files before deleting project.
        */

        db.all(
          `
            SELECT
              invoicePdf
            FROM amc_bills
            WHERE projectId = ?
          `,
          [id],
          (
            billErr,
            bills
          ) => {
            if (billErr) {
              return sendDbError(
                res,
                billErr
              );
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
                  this.changes ===
                  0
                ) {
                  return res
                    .status(404)
                    .json({
                      message:
                        "Project not found.",
                    });
                }

                /*
                  Delete visit files.
                */

                for (
                  const visit of
                  visits || []
                ) {
                  deleteFile(
                    visit.invoicePdf
                  );

                  deleteFile(
                    visit.receivedReportPdf
                  );

                  deleteFile(
                    visit.expensePdf
                  );
                }

                /*
                  Delete bill files.
                */

                for (
                  const bill of
                  bills || []
                ) {
                  deleteFile(
                    bill.invoicePdf
                  );
                }

                res.json({
                  message:
                    "Project and its visits and bills deleted successfully.",
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
   GET ALL VISITS
========================================================= */

app.get(
  "/api/visits",
  (
    req,
    res
  ) => {
    const projectNumber =
      normalizeProjectNumber(
        req.query.projectNumber
      );

    const params = [];

    let whereClause =
      "";

    if (projectNumber) {
      whereClause = `
        WHERE LOWER(
          p.projectNumber
        ) LIKE LOWER(?)
      `;

      params.push(
        `%${projectNumber}%`
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
      (
        err,
        rows
      ) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        res.json(
          rows || []
        );
      }
    );
  }
);

/* =========================================================
   GET ONE VISIT
========================================================= */

app.get(
  "/api/visits/:id",
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid visit ID.",
        });
    }

    db.get(
      `
        SELECT
          v.*,

          p.projectNumber,
          p.companyName,
          p.totalOrderAmount

        FROM amc_visits v

        INNER JOIN projects p
          ON p.id = v.projectId

        WHERE v.id = ?
      `,
      [id],
      (
        err,
        visit
      ) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        if (!visit) {
          return res
            .status(404)
            .json({
              message:
                "Visit not found.",
            });
        }

        res.json(
          visit
        );
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
      name:
        "invoicePdf",
      maxCount: 1,
    },
    {
      name:
        "receivedReportPdf",
      maxCount: 1,
    },
    {
      name:
        "expensePdf",
      maxCount: 1,
    },
  ]),
  (
    req,
    res
  ) => {
    const projectNumber =
      normalizeProjectNumber(
        req.body.projectNumber
      );

    const requestedVisitNumber =
      Math.trunc(
        toNumber(
          req.body.visitNumber
        )
      );

    const visitDate =
      req.body.visitDate ||
      "";

    const employeeName =
      String(
        req.body.employeeName ??
          ""
      ).trim();

    /*
      Existing visit amount fields are preserved
      so current visit functionality is not broken.

      These are now independent from project billing totals.
    */

    const totalAmount =
      toNumber(
        req.body.totalAmount
      );

    const amountReceived =
      toNumber(
        req.body.amountReceived
      );

    const amountReceivedDate =
      req.body.amountReceivedDate ||
      "";

    const tourAmountAllocated =
      toNumber(
        req.body.tourAmountAllocated
      );

    const tourExpense =
      toNumber(
        req.body.tourExpense
      );

    const remarks =
      req.body.remarks ||
      "";

    if (!projectNumber) {
      return res
        .status(400)
        .json({
          message:
            "Project Number is required.",
        });
    }

    if (!visitDate) {
      return res
        .status(400)
        .json({
          message:
            "Visit Date is required.",
        });
    }

    findProjectByNumber(
      projectNumber,
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
          return res
            .status(404)
            .json({
              message:
                "Project Number not found.",
            });
        }

        const saveVisit =
          (
            finalVisitNumber
          ) => {
            const files =
              req.files ||
              {};

            const invoiceFile =
              files
                .invoicePdf?.[0];

            const receivedFile =
              files
                .receivedReportPdf?.[0];

            const expenseFile =
              files
                .expensePdf?.[0];

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

            const values = [
              project.id,
              finalVisitNumber,
              visitDate,
              employeeName,
              totalAmount,
              invoicePath,
              amountReceived,
              amountReceivedDate,
              receivedReportPath,
              tourAmountAllocated,
              tourExpense,
              expensePath,
              remarks,
            ];

            db.run(
              sql,
              values,
              function (err) {
                if (err) {
                  if (
                    invoiceFile
                  ) {
                    deleteFile(
                      invoicePath
                    );
                  }

                  if (
                    receivedFile
                  ) {
                    deleteFile(
                      receivedReportPath
                    );
                  }

                  if (
                    expenseFile
                  ) {
                    deleteFile(
                      expensePath
                    );
                  }

                  if (
                    err.message.includes(
                      "UNIQUE constraint failed"
                    )
                  ) {
                    return res
                      .status(409)
                      .json({
                        message:
                          "This visit number already exists for this project.",
                      });
                  }

                  return sendDbError(
                    res,
                    err
                  );
                }

                const visitId =
                  this.lastID;

                /*
                  Keep existing Last AMC database behavior
                  for compatibility.

                  New Next AMC calculation uses latest visit directly.
                */

                db.run(
                  `
                    UPDATE projects
                    SET
                      lastAMCDate = ?,
                      updatedAt =
                        CURRENT_TIMESTAMP
                    WHERE id = ?
                  `,
                  [
                    visitDate,
                    project.id,
                  ],
                  (
                    updateErr
                  ) => {
                    if (
                      updateErr
                    ) {
                      console.error(
                        "Error updating Last AMC Date:",
                        updateErr.message
                      );
                    }

                    res
                      .status(201)
                      .json({
                        message:
                          "Visit created successfully.",

                        visitId,

                        visitNumber:
                          finalVisitNumber,
                      });
                  }
                );
              }
            );
          };

        if (
          requestedVisitNumber >
          0
        ) {
          saveVisit(
            requestedVisitNumber
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

              saveVisit(
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
      name:
        "invoicePdf",
      maxCount: 1,
    },
    {
      name:
        "receivedReportPdf",
      maxCount: 1,
    },
    {
      name:
        "expensePdf",
      maxCount: 1,
    },
  ]),
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
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
        existing
      ) => {
        if (findErr) {
          return sendDbError(
            res,
            findErr
          );
        }

        if (!existing) {
          return res
            .status(404)
            .json({
              message:
                "Visit not found.",
            });
        }

        const projectNumber =
          normalizeProjectNumber(
            req.body.projectNumber
          );

        const visitNumber =
          Math.trunc(
            toNumber(
              req.body.visitNumber
            )
          ) ||
          existing.visitNumber;

        const visitDate =
          req.body.visitDate ||
          "";

        const employeeName =
          String(
            req.body.employeeName ??
              ""
          ).trim();

        const totalAmount =
          toNumber(
            req.body.totalAmount
          );

        const amountReceived =
          toNumber(
            req.body.amountReceived
          );

        const amountReceivedDate =
          req.body.amountReceivedDate ||
          "";

        const tourAmountAllocated =
          toNumber(
            req.body
              .tourAmountAllocated
          );

        const tourExpense =
          toNumber(
            req.body.tourExpense
          );

        const remarks =
          req.body.remarks ||
          "";

        if (!projectNumber) {
          return res
            .status(400)
            .json({
              message:
                "Project Number is required.",
            });
        }

        if (!visitDate) {
          return res
            .status(400)
            .json({
              message:
                "Visit Date is required.",
            });
        }

        findProjectByNumber(
          projectNumber,
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
              return res
                .status(404)
                .json({
                  message:
                    "Project Number not found.",
                });
            }

            const oldProjectId =
              existing.projectId;

            const newProjectId =
              project.id;

            const files =
              req.files ||
              {};

            let invoicePath =
              existing.invoicePdf ||
              "";

            let receivedReportPath =
              existing.receivedReportPdf ||
              "";

            let expensePath =
              existing.expensePdf ||
              "";

            const newInvoice =
              files
                .invoicePdf?.[0];

            const newReceivedReport =
              files
                .receivedReportPdf?.[0];

            const newExpense =
              files
                .expensePdf?.[0];

            if (
              newInvoice
            ) {
              invoicePath =
                `/uploads/${newInvoice.filename}`;
            }

            if (
              newReceivedReport
            ) {
              receivedReportPath =
                `/uploads/${newReceivedReport.filename}`;
            }

            if (
              newExpense
            ) {
              expensePath =
                `/uploads/${newExpense.filename}`;
            }

            /*
              Check duplicate visit number
              within target project.
            */

            db.get(
              `
                SELECT id
                FROM amc_visits
                WHERE
                  projectId = ?
                  AND visitNumber = ?
                  AND id != ?
              `,
              [
                newProjectId,
                visitNumber,
                id,
              ],
              (
                duplicateErr,
                duplicate
              ) => {
                if (
                  duplicateErr
                ) {
                  return sendDbError(
                    res,
                    duplicateErr
                  );
                }

                if (
                  duplicate
                ) {
                  if (
                    newInvoice
                  ) {
                    deleteFile(
                      invoicePath
                    );
                  }

                  if (
                    newReceivedReport
                  ) {
                    deleteFile(
                      receivedReportPath
                    );
                  }

                  if (
                    newExpense
                  ) {
                    deleteFile(
                      expensePath
                    );
                  }

                  return res
                    .status(409)
                    .json({
                      message:
                        "This visit number already exists for this project.",
                    });
                }

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
                    updatedAt =
                      CURRENT_TIMESTAMP
                  WHERE id = ?
                `;

                const values = [
                  newProjectId,
                  visitNumber,
                  visitDate,
                  employeeName,
                  totalAmount,
                  invoicePath,
                  amountReceived,
                  amountReceivedDate,
                  receivedReportPath,
                  tourAmountAllocated,
                  tourExpense,
                  expensePath,
                  remarks,
                  id,
                ];

                db.run(
                  sql,
                  values,
                  function (err) {
                    if (err) {
                      if (
                        newInvoice
                      ) {
                        deleteFile(
                          invoicePath
                        );
                      }

                      if (
                        newReceivedReport
                      ) {
                        deleteFile(
                          receivedReportPath
                        );
                      }

                      if (
                        newExpense
                      ) {
                        deleteFile(
                          expensePath
                        );
                      }

                      return sendDbError(
                        res,
                        err
                      );
                    }

                    /*
                      Delete replaced files only
                      after successful update.
                    */

                    if (
                      newInvoice &&
                      existing.invoicePdf
                    ) {
                      deleteFile(
                        existing.invoicePdf
                      );
                    }

                    if (
                      newReceivedReport &&
                      existing.receivedReportPdf
                    ) {
                      deleteFile(
                        existing.receivedReportPdf
                      );
                    }

                    if (
                      newExpense &&
                      existing.expensePdf
                    ) {
                      deleteFile(
                        existing.expensePdf
                      );
                    }

                    /*
                      Refresh affected project's latest
                      AMC database field.
                    */

                    if (
                      oldProjectId ===
                      newProjectId
                    ) {
                      refreshProjectLastAMCDate(
                        newProjectId,
                        (
                          refreshErr
                        ) => {
                          if (
                            refreshErr
                          ) {
                            console.error(
                              "Project AMC refresh error:",
                              refreshErr.message
                            );
                          }

                          res.json({
                            message:
                              "Visit updated successfully.",
                          });
                        }
                      );

                      return;
                    }

                    refreshProjectLastAMCDate(
                      oldProjectId,
                      (
                        oldRefreshErr
                      ) => {
                        if (
                          oldRefreshErr
                        ) {
                          console.error(
                            "Old project AMC refresh error:",
                            oldRefreshErr.message
                          );
                        }

                        refreshProjectLastAMCDate(
                          newProjectId,
                          (
                            newRefreshErr
                          ) => {
                            if (
                              newRefreshErr
                            ) {
                              console.error(
                                "New project AMC refresh error:",
                                newRefreshErr.message
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
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
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
          return res
            .status(404)
            .json({
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

            deleteFile(
              visit.invoicePdf
            );

            deleteFile(
              visit.receivedReportPdf
            );

            deleteFile(
              visit.expensePdf
            );

            refreshProjectLastAMCDate(
              visit.projectId,
              (
                refreshErr
              ) => {
                if (
                  refreshErr
                ) {
                  console.error(
                    "Project AMC refresh error:",
                    refreshErr.message
                  );
                }

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
  }
);

/* =========================================================
   BILLS
========================================================= */

/* =========================================================
   GET ALL BILLS
   Optional:
   /api/bills?projectNumber=001
========================================================= */

app.get(
  "/api/bills",
  (
    req,
    res
  ) => {
    const projectNumber =
      normalizeProjectNumber(
        req.query.projectNumber
      );

    const params = [];

    let whereClause =
      "";

    if (projectNumber) {
      whereClause = `
        WHERE LOWER(
          p.projectNumber
        ) LIKE LOWER(?)
      `;

      params.push(
        `%${projectNumber}%`
      );
    }

    const sql = `
      SELECT
        b.id,
        b.projectId,
        b.billNumber,
        b.billDate,
        b.billAmount,
        b.amountReceived,
        b.amountReceivedDate,
        b.invoicePdf,
        b.remarks,
        b.createdAt,
        b.updatedAt,

        CASE
          WHEN COALESCE(
            b.amountReceived,
            0
          ) <= 0
            THEN 'Pending'

          WHEN COALESCE(
            b.amountReceived,
            0
          ) >= COALESCE(
            b.billAmount,
            0
          )
            THEN 'Paid'

          ELSE 'Partial'
        END AS status,

        p.projectNumber,
        p.companyName

      FROM amc_bills b

      INNER JOIN projects p
        ON p.id = b.projectId

      ${whereClause}

      ORDER BY
        p.projectNumber ASC,
        b.billNumber ASC
    `;

    db.all(
      sql,
      params,
      (
        err,
        rows
      ) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        res.json(
          rows || []
        );
      }
    );
  }
);

/* =========================================================
   GET ONE BILL
========================================================= */

app.get(
  "/api/bills/:id",
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid bill ID.",
        });
    }

    db.get(
      `
        SELECT
          b.*,

          CASE
            WHEN COALESCE(
              b.amountReceived,
              0
            ) <= 0
              THEN 'Pending'

            WHEN COALESCE(
              b.amountReceived,
              0
            ) >= COALESCE(
              b.billAmount,
              0
            )
              THEN 'Paid'

            ELSE 'Partial'
          END AS status,

          p.projectNumber,
          p.companyName,
          p.totalOrderAmount

        FROM amc_bills b

        INNER JOIN projects p
          ON p.id = b.projectId

        WHERE b.id = ?
      `,
      [id],
      (
        err,
        bill
      ) => {
        if (err) {
          return sendDbError(
            res,
            err
          );
        }

        if (!bill) {
          return res
            .status(404)
            .json({
              message:
                "Bill not found.",
            });
        }

        res.json(
          bill
        );
      }
    );
  }
);

/* =========================================================
   CREATE BILL
   Bill number is automatic per project.
========================================================= */

app.post(
  "/api/bills",
  upload.fields([
    {
      name:
        "invoicePdf",
      maxCount: 1,
    },
  ]),
  (
    req,
    res
  ) => {
    const projectNumber =
      normalizeProjectNumber(
        req.body.projectNumber
      );

    const billDate =
      req.body.billDate ||
      "";

    const billAmount =
      toNumber(
        req.body.billAmount
      );

    const amountReceived =
      toNumber(
        req.body.amountReceived
      );

    const amountReceivedDate =
      req.body.amountReceivedDate ||
      "";

    const remarks =
      req.body.remarks ||
      "";

    if (!projectNumber) {
      return res
        .status(400)
        .json({
          message:
            "Project Number is required.",
        });
    }

    if (!billDate) {
      return res
        .status(400)
        .json({
          message:
            "Bill Date is required.",
        });
    }

    const files =
      req.files ||
      {};

    const invoiceFile =
      files
        .invoicePdf?.[0];

    const invoicePath =
      invoiceFile
        ? `/uploads/${invoiceFile.filename}`
        : "";

    findProjectByNumber(
      projectNumber,
      (
        projectErr,
        project
      ) => {
        if (projectErr) {
          if (
            invoiceFile
          ) {
            deleteFile(
              invoicePath
            );
          }

          return sendDbError(
            res,
            projectErr
          );
        }

        if (!project) {
          if (
            invoiceFile
          ) {
            deleteFile(
              invoicePath
            );
          }

          return res
            .status(404)
            .json({
              message:
                "Project Number not found.",
            });
        }

        getNextBillNumber(
          project.id,
          (
            numberErr,
            billNumber
          ) => {
            if (numberErr) {
              if (
                invoiceFile
              ) {
                deleteFile(
                  invoicePath
                );
              }

              return sendDbError(
                res,
                numberErr
              );
            }

            const sql = `
              INSERT INTO amc_bills (
                projectId,
                billNumber,
                billDate,
                billAmount,
                amountReceived,
                amountReceivedDate,
                invoicePdf,
                remarks
              )
              VALUES (
                ?, ?, ?, ?, ?, ?, ?, ?
              )
            `;

            const values = [
              project.id,
              billNumber,
              billDate,
              billAmount,
              amountReceived,
              amountReceivedDate,
              invoicePath,
              remarks,
            ];

            db.run(
              sql,
              values,
              function (err) {
                if (err) {
                  if (
                    invoiceFile
                  ) {
                    deleteFile(
                      invoicePath
                    );
                  }

                  if (
                    err.message.includes(
                      "UNIQUE constraint failed"
                    )
                  ) {
                    return res
                      .status(409)
                      .json({
                        message:
                          "Could not assign the next bill number. Please try again.",
                      });
                  }

                  return sendDbError(
                    res,
                    err
                  );
                }

                res
                  .status(201)
                  .json({
                    message:
                      "Bill created successfully.",

                    billId:
                      this.lastID,

                    billNumber,
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
   UPDATE BILL
========================================================= */

app.put(
  "/api/bills/:id",
  upload.fields([
    {
      name:
        "invoicePdf",
      maxCount: 1,
    },
  ]),
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid bill ID.",
        });
    }

    db.get(
      `
        SELECT *
        FROM amc_bills
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
          return res
            .status(404)
            .json({
              message:
                "Bill not found.",
            });
        }

        const projectNumber =
          normalizeProjectNumber(
            req.body.projectNumber
          );

        const billDate =
          req.body.billDate ||
          "";

        const billAmount =
          toNumber(
            req.body.billAmount
          );

        const amountReceived =
          toNumber(
            req.body.amountReceived
          );

        const amountReceivedDate =
          req.body.amountReceivedDate ||
          "";

        const remarks =
          req.body.remarks ||
          "";

        if (!projectNumber) {
          return res
            .status(400)
            .json({
              message:
                "Project Number is required.",
            });
        }

        if (!billDate) {
          return res
            .status(400)
            .json({
              message:
                "Bill Date is required.",
            });
        }

        findProjectByNumber(
          projectNumber,
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
              return res
                .status(404)
                .json({
                  message:
                    "Project Number not found.",
                });
            }

            const files =
              req.files ||
              {};

            const newInvoice =
              files
                .invoicePdf?.[0];

            let invoicePath =
              existing.invoicePdf ||
              "";

            if (
              newInvoice
            ) {
              invoicePath =
                `/uploads/${newInvoice.filename}`;
            }

            const sql = `
              UPDATE amc_bills
              SET
                projectId = ?,
                billDate = ?,
                billAmount = ?,
                amountReceived = ?,
                amountReceivedDate = ?,
                invoicePdf = ?,
                remarks = ?,
                updatedAt =
                  CURRENT_TIMESTAMP
              WHERE id = ?
            `;

            const values = [
              project.id,
              billDate,
              billAmount,
              amountReceived,
              amountReceivedDate,
              invoicePath,
              remarks,
              id,
            ];

            db.run(
              sql,
              values,
              function (err) {
                if (err) {
                  if (
                    newInvoice
                  ) {
                    deleteFile(
                      invoicePath
                    );
                  }

                  return sendDbError(
                    res,
                    err
                  );
                }

                if (
                  newInvoice &&
                  existing.invoicePdf
                ) {
                  deleteFile(
                    existing.invoicePdf
                  );
                }

                res.json({
                  message:
                    "Bill updated successfully.",
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
   DELETE BILL
========================================================= */

app.delete(
  "/api/bills/:id",
  (
    req,
    res
  ) => {
    const id =
      Number(
        req.params.id
      );

    if (
      !Number.isInteger(
        id
      ) ||
      id <= 0
    ) {
      return res
        .status(400)
        .json({
          message:
            "Invalid bill ID.",
        });
    }

    db.get(
      `
        SELECT *
        FROM amc_bills
        WHERE id = ?
      `,
      [id],
      (
        findErr,
        bill
      ) => {
        if (findErr) {
          return sendDbError(
            res,
            findErr
          );
        }

        if (!bill) {
          return res
            .status(404)
            .json({
              message:
                "Bill not found.",
            });
        }

        db.run(
          `
            DELETE FROM amc_bills
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

            deleteFile(
              bill.invoicePdf
            );

            res.json({
              message:
                "Bill deleted successfully.",
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
  (
    _req,
    res
  ) => {
    res
      .status(404)
      .json({
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
    _req,
    res,
    _next
  ) => {
    console.error(
      "Server error:",
      err
    );

    if (
      err instanceof
      multer.MulterError
    ) {
      return res
        .status(400)
        .json({
          message:
            err.message,
        });
    }

    if (
      err?.message ===
      "Only PDF files are allowed."
    ) {
      return res
        .status(400)
        .json({
          message:
            err.message,
        });
    }

    return res
      .status(500)
      .json({
        message:
          err?.message ||
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