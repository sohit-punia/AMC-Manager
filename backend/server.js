const express = require("express");
const cors = require("cors");

const app = express();
const db = require("./database");

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("AMC Record Manager Backend is Running");
});

const PORT = 5000;


app.post("/api/records", (req, res) => {
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
      remarks
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error(err.message);

      return res.status(500).json({
        message: "Failed to save record",
      });
    }

    res.status(201).json({
      message: "Record saved successfully",
      id: this.lastID,
    });
  });
});


// GET ALL RECORDS
app.get("/api/records", (req, res) => {
  const sql = `SELECT * FROM records ORDER BY id DESC`;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        error: err.message,
      });
    }

    res.status(200).json(rows);
  });
});

// UPDATE RECORD
app.put("/api/records/:id", (req, res) => {
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

  const { id } = req.params;

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
      remarks = ?
    WHERE id = ?
  `;

  db.run(
    sql,
    [
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
      id,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({
          message: err.message,
        });
      }

      res.json({
        message: "Record updated successfully",
      });
    }
  );
});

// DELETE RECORD
app.delete("/api/records/:id", (req, res) => {
  const { id } = req.params;

  const sql = `DELETE FROM records WHERE id = ?`;

  db.run(sql, [id], function (err) {
    if (err) {
      return res.status(500).json({
        message: err.message,
      });
    }

    res.json({
      message: "Record deleted successfully",
    });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});