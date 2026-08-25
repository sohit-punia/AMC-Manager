import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [activePage, setActivePage] = useState("records");

  const [records, setRecords] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [formData, setFormData] = useState({
    projectNumber: "",
    companyName: "",
    companyAddress: "",
    contactPerson: "",
    phoneNumber: "",
    amcType: "Quarterly",
    amcStartDate: "",
    amcEndDate: "",
    lastAMCDate: "",
    nextAMCDate: "",
    remarks: "",
  });

  /* =========================
     FETCH RECORDS
  ========================= */

  const fetchRecords = () => {
    fetch("http://localhost:5000/api/records")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch records");
        }

        return response.json();
      })
      .then((data) => {
        setRecords(data);
      })
      .catch((error) => {
        console.error(
          "Error fetching records:",
          error
        );
      });
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  /* =========================
     FORM CHANGE
  ========================= */

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  /* =========================
     FILE CHANGE
  ========================= */

  const handleFileChange = (e) => {
    setSelectedFiles(
      Array.from(e.target.files || [])
    );
  };

  /* =========================
     RESET FORM
  ========================= */

  const resetForm = () => {
    setFormData({
      projectNumber: "",
      companyName: "",
      companyAddress: "",
      contactPerson: "",
      phoneNumber: "",
      amcType: "Quarterly",
      amcStartDate: "",
      amcEndDate: "",
      lastAMCDate: "",
      nextAMCDate: "",
      remarks: "",
    });

    setSelectedFiles([]);
  };

  /* =========================
     ADD / UPDATE RECORD
  ========================= */

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const url = editingId
        ? `http://localhost:5000/api/records/${editingId}`
        : "http://localhost:5000/api/records";

      const method = editingId ? "PUT" : "POST";

      const dataToSend = new FormData();

      Object.entries(formData).forEach(
        ([key, value]) => {
          dataToSend.append(key, value);
        }
      );

      selectedFiles.forEach((file) => {
        dataToSend.append("documents", file);
      });

      const response = await fetch(url, {
        method,
        body: dataToSend,
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Failed to save record"
        );
        return;
      }

      alert(
        editingId
          ? "Record updated successfully!"
          : "Record saved successfully!"
      );

      resetForm();

      await fetchRecords();

      setEditingId(null);
      setActivePage("records");
    } catch (error) {
      console.error(
        "Error saving record:",
        error
      );

      alert(
        "Something went wrong while saving the record"
      );
    }
  };

  /* =========================
     AMC STATUS
  ========================= */

  const getStatus = (nextAMCDate) => {
    if (!nextAMCDate) {
      return "Upcoming";
    }

    const today = new Date();
    const nextDate = new Date(
      nextAMCDate
    );

    today.setHours(0, 0, 0, 0);
    nextDate.setHours(0, 0, 0, 0);

    const difference = Math.ceil(
      (nextDate - today) /
        (1000 * 60 * 60 * 24)
    );

    if (difference < 0) {
      return "Missed";
    }

    if (difference <= 7) {
      return "Due Soon";
    }

    return "Upcoming";
  };

  /* =========================
     EDIT RECORD
  ========================= */

  const handleEdit = (record) => {
    setFormData({
      projectNumber:
        record.projectNumber || "",
      companyName:
        record.companyName || "",
      companyAddress:
        record.companyAddress || "",
      contactPerson:
        record.contactPerson || "",
      phoneNumber:
        record.phoneNumber || "",
      amcType:
        record.amcType || "Quarterly",
      amcStartDate:
        record.amcStartDate || "",
      amcEndDate:
        record.amcEndDate || "",
      lastAMCDate:
        record.lastAMCDate || "",
      nextAMCDate:
        record.nextAMCDate || "",
      remarks:
        record.remarks || "",
    });

    setSelectedFiles([]);
    setEditingId(record.id);
    setActivePage("add");
  };

  /* =========================
     VIEW DETAILS
  ========================= */

  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setActivePage("details");
  };

  /* =========================
     DELETE RECORD
  ========================= */

  const handleDelete = async (id) => {
    const confirmDelete =
      window.confirm(
        "Are you sure you want to delete this record?"
      );

    if (!confirmDelete) return;

    try {
      const response = await fetch(
        `http://localhost:5000/api/records/${id}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Failed to delete record"
        );
        return;
      }

      alert(
        "Record deleted successfully!"
      );

      await fetchRecords();

      setSelectedRecord(null);
      setActivePage("records");
    } catch (error) {
      console.error(
        "Error deleting record:",
        error
      );

      alert(
        "Something went wrong while deleting"
      );
    }
  };

  /* =========================
     AMC LEFT
  ========================= */

  const getAMCLeft = (amcEndDate) => {
    if (!amcEndDate) return "-";

    const today = new Date();
    const endDate = new Date(
      amcEndDate
    );

    today.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    if (endDate < today) {
      return "Expired";
    }

    let years =
      endDate.getFullYear() -
      today.getFullYear();

    let months =
      endDate.getMonth() -
      today.getMonth();

    let days =
      endDate.getDate() -
      today.getDate();

    if (days < 0) {
      months--;
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0 && months > 0) {
      return `${years} Year ${months} Month`;
    }

    if (years > 0) {
      return `${years} Year`;
    }

    if (months > 0) {
      return `${months} Month`;
    }

    return `${Math.max(
      0,
      Math.ceil(
        (endDate - today) /
          (1000 * 60 * 60 * 24)
      )
    )} Days`;
  };

  /* =========================
     DOCUMENTS
  ========================= */

  const getDocuments = (record) => {
    if (!record) {
      return [];
    }

    let documents = record.document || [];

    if (typeof documents === "string") {
      try {
        documents = JSON.parse(
          documents
        );
      } catch {
        documents = documents
          ? [
              {
                name: documents
                  .split("/")
                  .pop(),
                path: documents,
              },
            ]
          : [];
      }
    }

    if (!Array.isArray(documents)) {
      documents = [documents];
    }

    return documents;
  };

  const getDocumentUrl = (document) => {
    if (!document) {
      return "";
    }

    let filePath = "";

    if (typeof document === "string") {
      filePath = document;
    } else {
      filePath =
        document.path ||
        document.filePath ||
        document.url ||
        "";
    }

    if (!filePath) {
      return "";
    }

    if (
      filePath.startsWith(
        "http://"
      ) ||
      filePath.startsWith(
        "https://"
      )
    ) {
      return filePath;
    }

    filePath = filePath.replace(
      /\\/g,
      "/"
    );

    if (filePath.startsWith("/")) {
      return `http://localhost:5000${filePath}`;
    }

    return `http://localhost:5000/${filePath}`;
  };

  const getDocumentName = (
    document,
    index
  ) => {
    if (!document) {
      return `Document ${index + 1}`;
    }

    if (typeof document === "string") {
      return document
        .replace(/\\/g, "/")
        .split("/")
        .pop();
    }

    return (
      document.name ||
      document.originalname ||
      document.filename ||
      `Document ${index + 1}`
    );
  };

  /* =========================
     SEARCH
  ========================= */

  const filteredRecords = records.filter(
    (record) =>
      record.projectNumber
        ?.toLowerCase()
        .includes(
          searchTerm.toLowerCase()
        )
  );

  /* =========================
     DASHBOARD
  ========================= */

  const dashboardToday = new Date();
  dashboardToday.setHours(0, 0, 0, 0);

  const runningAMC = records.filter(
    (record) => {
      if (
        !record.amcStartDate ||
        !record.amcEndDate
      ) {
        return false;
      }

      const startDate = new Date(
        record.amcStartDate
      );

      const endDate = new Date(
        record.amcEndDate
      );

      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);

      return (
        startDate <= dashboardToday &&
        endDate >= dashboardToday
      );
    }
  );

  const missedAMC = records.filter(
    (record) => {
      if (!record.nextAMCDate) {
        return false;
      }

      const nextDate = new Date(
        record.nextAMCDate
      );

      nextDate.setHours(0, 0, 0, 0);

      return nextDate < dashboardToday;
    }
  );

  const upcomingAMC = records.filter(
    (record) => {
      if (!record.nextAMCDate) {
        return false;
      }

      const nextDate = new Date(
        record.nextAMCDate
      );

      nextDate.setHours(0, 0, 0, 0);

      return nextDate >= dashboardToday;
    }
  );

  const dashboardTotal =
    runningAMC.length +
    missedAMC.length +
    upcomingAMC.length;

  const runningPercent =
    dashboardTotal > 0
      ? (runningAMC.length /
          dashboardTotal) *
        100
      : 0;

  const upcomingPercent =
    dashboardTotal > 0
      ? (upcomingAMC.length /
          dashboardTotal) *
        100
      : 0;

  const missedPercent =
    dashboardTotal > 0
      ? (missedAMC.length /
          dashboardTotal) *
        100
      : 0;

  return (
    <div className="app">

      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="logo">
          <h2>AMC Manager</h2>
          <p>Record Management</p>
        </div>

        <div className="menu">

          {/* =====================
              DASHBOARD
          ====================== */}

          <button
            className={`menu-item ${
              activePage === "dashboard"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("dashboard")
            }
          >
            📊 Dashboard
          </button>

          <button
            className={`menu-item ${
              activePage === "records"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("records")
            }
          >
            📋 All Records
          </button>

          <button
            className={`menu-item ${
              activePage === "add"
                ? "active"
                : ""
            }`}
            onClick={() => {
              resetForm();
              setEditingId(null);
              setActivePage("add");
            }}
          >
            ➕ Add Record
          </button>

          <button
            className={`menu-item ${
              activePage === "upcoming"
                ? "active"
                : ""
            }`}
            onClick={() =>
              setActivePage("upcoming")
            }
          >
            📅 Upcoming AMC
          </button>

        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* =====================
            DASHBOARD
        ====================== */}

        {activePage === "dashboard" && (
          <>
            <div className="header">
              <div>
                <h1>Dashboard</h1>
                <p>
                  Overview of your AMC records
                </p>
              </div>
            </div>

            <div className="dashboard-cards">

              <div className="dashboard-card running-card">
                <div className="dashboard-card-title">
                  Running AMC
                </div>

                <div className="dashboard-card-number">
                  {runningAMC.length}
                </div>

                <div className="dashboard-card-text">
                  Currently active
                </div>
              </div>

              <div className="dashboard-card upcoming-card">
                <div className="dashboard-card-title">
                  Upcoming AMC
                </div>

                <div className="dashboard-card-number">
                  {upcomingAMC.length}
                </div>

                <div className="dashboard-card-text">
                  Upcoming visits
                </div>
              </div>

              <div className="dashboard-card missed-card">
                <div className="dashboard-card-title">
                  Missed AMC
                </div>

                <div className="dashboard-card-number">
                  {missedAMC.length}
                </div>

                <div className="dashboard-card-text">
                  Needs attention
                </div>
              </div>

            </div>

            <div className="dashboard-chart-card">
              <h2>AMC Overview</h2>

              <div className="chart-row">
                <div className="chart-label">
                  <span>Running AMC</span>
                  <strong>
                    {runningAMC.length}
                  </strong>
                </div>

                <div className="chart-bar">
                  <div
                    className="chart-bar-running"
                    style={{
                      width: `${runningPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className="chart-row">
                <div className="chart-label">
                  <span>Upcoming AMC</span>
                  <strong>
                    {upcomingAMC.length}
                  </strong>
                </div>

                <div className="chart-bar">
                  <div
                    className="chart-bar-upcoming"
                    style={{
                      width: `${upcomingPercent}%`,
                    }}
                  />
                </div>
              </div>

              <div className="chart-row">
                <div className="chart-label">
                  <span>Missed AMC</span>
                  <strong>
                    {missedAMC.length}
                  </strong>
                </div>

                <div className="chart-bar">
                  <div
                    className="chart-bar-missed"
                    style={{
                      width: `${missedPercent}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="dashboard-summary">

              <div>
                <span>Total Records</span>
                <strong>
                  {records.length}
                </strong>
              </div>

              <div>
                <span>Running AMC</span>
                <strong>
                  {runningAMC.length}
                </strong>
              </div>

              <div>
                <span>Missed AMC</span>
                <strong>
                  {missedAMC.length}
                </strong>
              </div>

            </div>
          </>
        )}

        {/* =====================
            RECORD DETAILS
        ====================== */}

        {activePage === "details" &&
          selectedRecord && (
            <>
              <div className="header">

                <div>
                  <h1>
                    Record Details
                  </h1>

                  <p>
                    Complete company and
                    AMC information
                  </p>
                </div>

                <button
                  className="cancel-btn"
                  onClick={() => {
                    setSelectedRecord(null);
                    setActivePage(
                      "records"
                    );
                  }}
                >
                  ← Back to Records
                </button>

              </div>

              <div className="details-container">

                {/* COMPANY */}
                <div className="details-card">

                  <h2>
                    Company Details
                  </h2>

                  <div className="details-grid">

                    <div className="detail-item">
                      <span>
                        Project Number
                      </span>

                      <strong>
                        {selectedRecord.projectNumber ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        Company Name
                      </span>

                      <strong>
                        {selectedRecord.companyName ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item full-detail">
                      <span>
                        Company Address
                      </span>

                      <strong>
                        {selectedRecord.companyAddress ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        Contact Person
                      </span>

                      <strong>
                        {selectedRecord.contactPerson ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        Phone Number
                      </span>

                      <strong>
                        {selectedRecord.phoneNumber ||
                          "-"}
                      </strong>
                    </div>

                  </div>
                </div>

                {/* AMC */}
                <div className="details-card">

                  <h2>AMC Details</h2>

                  <div className="details-grid">

                    <div className="detail-item">
                      <span>
                        AMC Type
                      </span>

                      <strong>
                        {selectedRecord.amcType ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        AMC Left
                      </span>

                      <strong>
                        {getAMCLeft(
                          selectedRecord.amcEndDate
                        )}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        AMC Start Date
                      </span>

                      <strong>
                        {selectedRecord.amcStartDate ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        AMC End Date
                      </span>

                      <strong>
                        {selectedRecord.amcEndDate ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        Last AMC Date
                      </span>

                      <strong>
                        {selectedRecord.lastAMCDate ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>
                        Next AMC Date
                      </span>

                      <strong>
                        {selectedRecord.nextAMCDate ||
                          "-"}
                      </strong>
                    </div>

                    <div className="detail-item">
                      <span>Status</span>

                      <strong>
                        <span
                          className={`status ${
                            getStatus(
                              selectedRecord.nextAMCDate
                            ) === "Missed"
                              ? "missed"
                              : getStatus(
                                  selectedRecord.nextAMCDate
                                ) === "Due Soon"
                              ? "due-soon"
                              : "upcoming"
                          }`}
                        >
                          {getStatus(
                            selectedRecord.nextAMCDate
                          )}
                        </span>
                      </strong>
                    </div>

                  </div>
                </div>

                {/* REMARKS */}
                <div className="details-card">

                  <h2>Remarks</h2>

                  <div className="remarks-box">
                    {selectedRecord.remarks ||
                      "No remarks added."}
                  </div>

                </div>

                {/* DOCUMENTS */}
                <div className="details-card">

                  <h2>
                    Attached Documents
                  </h2>

                  {getDocuments(
                    selectedRecord
                  ).length > 0 ? (

                    <div className="documents-list">

                      {getDocuments(
                        selectedRecord
                      ).map(
                        (
                          document,
                          index
                        ) => {

                          const url =
                            getDocumentUrl(
                              document
                            );

                          return (
                            <div
                              className="document-item"
                              key={index}
                            >

                              <span>
                                📄{" "}
                                {getDocumentName(
                                  document,
                                  index
                                )}
                              </span>

                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="view-document-btn"
                                >
                                  Open
                                </a>
                              ) : (
                                <span>
                                  File unavailable
                                </span>
                              )}

                            </div>
                          );
                        }
                      )}

                    </div>

                  ) : (

                    <div className="no-documents">
                      No documents attached yet.
                    </div>

                  )}

                </div>

              </div>
            </>
          )}

        {/* =====================
            ALL RECORDS
        ====================== */}

        {activePage === "records" && (
          <>
            <div className="header">

              <div>
                <h1>
                  All Records
                </h1>

                <p>
                  Manage your company
                  projects and AMC
                  records
                </p>
              </div>

              <button
                className="add-button"
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setActivePage("add");
                }}
              >
                + Add New Record
              </button>

            </div>

            <div className="search-section">
              <input
                type="text"
                placeholder="Search by order number..."
                value={searchTerm}
                onChange={(e) =>
                  setSearchTerm(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="table-container">

              <table>

                <thead>
                  <tr>
                    <th>
                      Project No.
                    </th>

                    <th>
                      Company Name
                    </th>

                    <th>
                      AMC Type
                    </th>

                    <th>
                      Last AMC
                    </th>

                    <th>
                      Next AMC
                    </th>

                    <th>
                      AMC Left
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {filteredRecords.map(
                    (record) => (
                      <tr
                        key={record.id}
                      >

                        <td>
                          {record.projectNumber}
                        </td>

                        <td>
                          {record.companyName}
                        </td>

                        <td>
                          {record.amcType}
                        </td>

                        <td>
                          {record.lastAMCDate}
                        </td>

                        <td>
                          {record.nextAMCDate}
                        </td>

                        <td>
                          {getAMCLeft(
                            record.amcEndDate
                          )}
                        </td>

                        <td>

                          <span
                            className={`status ${
                              getStatus(
                                record.nextAMCDate
                              ) ===
                              "Missed"
                                ? "missed"
                                : getStatus(
                                    record.nextAMCDate
                                  ) ===
                                  "Due Soon"
                                ? "due-soon"
                                : "upcoming"
                            }`}
                          >
                            {getStatus(
                              record.nextAMCDate
                            )}
                          </span>

                        </td>

                        <td className="actions">

                          <button
                            className="edit-btn"
                            onClick={() =>
                              handleEdit(
                                record
                              )
                            }
                          >
                            Edit
                          </button>

                          <button
                            className="delete-btn"
                            onClick={() =>
                              handleDelete(
                                record.id
                              )
                            }
                          >
                            Delete
                          </button>

                          <button
                            className="view-btn"
                            onClick={() =>
                              handleViewDetails(
                                record
                              )
                            }
                          >
                            View
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          </>
        )}

        {/* =====================
            ADD / EDIT
        ====================== */}

        {activePage === "add" && (
          <>

            <div className="header">

              <div>
                <h1>
                  {editingId
                    ? "Edit Record"
                    : "Add New Record"}
                </h1>

                <p>
                  Add company, project and
                  AMC details
                </p>
              </div>

            </div>

            <form
              className="record-form"
              onSubmit={handleSubmit}
            >

              <div className="form-grid">

                <div className="form-group">
                  <label>
                    Project Number
                  </label>

                  <input
                    type="text"
                    name="projectNumber"
                    value={
                      formData.projectNumber
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="PR-001"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Company Name
                  </label>

                  <input
                    type="text"
                    name="companyName"
                    value={
                      formData.companyName
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter company name"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    Company Address
                  </label>

                  <input
                    type="text"
                    name="companyAddress"
                    value={
                      formData.companyAddress
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Enter company address"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Contact Person
                  </label>

                  <input
                    type="text"
                    name="contactPerson"
                    value={
                      formData.contactPerson
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Contact person name"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Phone Number
                  </label>

                  <input
                    type="text"
                    name="phoneNumber"
                    value={
                      formData.phoneNumber
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Phone number"
                  />
                </div>

                <div className="form-group">
                  <label>
                    AMC Type
                  </label>

                  <select
                    name="amcType"
                    value={
                      formData.amcType
                    }
                    onChange={
                      handleChange
                    }
                  >
                    <option>
                      Quarterly
                    </option>
                    <option>
                      Half Yearly
                    </option>
                    <option>
                      Yearly
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>
                    AMC Start Date
                  </label>

                  <input
                    type="date"
                    name="amcStartDate"
                    value={
                      formData.amcStartDate
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    AMC End Date
                  </label>

                  <input
                    type="date"
                    name="amcEndDate"
                    value={
                      formData.amcEndDate
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    Last AMC Date
                  </label>

                  <input
                    type="date"
                    name="lastAMCDate"
                    value={
                      formData.lastAMCDate
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                <div className="form-group">
                  <label>
                    Next AMC Date
                  </label>

                  <input
                    type="date"
                    name="nextAMCDate"
                    value={
                      formData.nextAMCDate
                    }
                    onChange={
                      handleChange
                    }
                  />
                </div>

                <div className="form-group full-width">
                  <label>
                    Remarks
                  </label>

                  <textarea
                    name="remarks"
                    value={
                      formData.remarks
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Add remarks..."
                    rows="4"
                  />
                </div>

                {/* DOCUMENT UPLOAD */}
                <div className="form-group full-width">

                  <label>
                    Attach Documents
                  </label>

                  <input
                    type="file"
                    multiple
                    onChange={
                      handleFileChange
                    }
                  />

                  {selectedFiles.length >
                    0 && (
                    <div className="selected-files">

                      {selectedFiles.map(
                        (
                          file,
                          index
                        ) => (
                          <div
                            key={index}
                          >
                            📄{" "}
                            {file.name}
                          </div>
                        )
                      )}

                    </div>
                  )}

                </div>

              </div>

              <div className="form-actions">

                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    resetForm();
                    setEditingId(null);
                    setActivePage(
                      "records"
                    );
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                >
                  {editingId
                    ? "Update Record"
                    : "Save Record"}
                </button>

              </div>

            </form>
          </>
        )}

        {/* =====================
            UPCOMING AMC
        ====================== */}

        {activePage === "upcoming" && (
          <>

            <div className="header">

              <div>
                <h1>
                  Upcoming AMC
                </h1>

                <p>
                  View your upcoming AMC
                  records
                </p>
              </div>

            </div>

            <div className="table-container upcoming-table">

              <table>

                <thead>
                  <tr>
                    <th>
                      Project No.
                    </th>

                    <th>
                      Company Name
                    </th>

                    <th>
                      AMC Type
                    </th>

                    <th>
                      Next AMC
                    </th>

                    <th>
                      Status
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {records
                    .filter(
                      (record) =>
                        getStatus(
                          record.nextAMCDate
                        ) ===
                        "Upcoming"
                    )
                    .map(
                      (record) => (
                        <tr
                          key={
                            record.id
                          }
                        >

                          <td>
                            {
                              record.projectNumber
                            }
                          </td>

                          <td>
                            {
                              record.companyName
                            }
                          </td>

                          <td>
                            {
                              record.amcType
                            }
                          </td>

                          <td>
                            {
                              record.nextAMCDate
                            }
                          </td>

                          <td>
                            <span className="status upcoming">
                              Upcoming
                            </span>
                          </td>

                        </tr>
                      )
                    )}

                </tbody>

              </table>

            </div>

          </>
        )}

      </main>
    </div>
  );
}

export default App;