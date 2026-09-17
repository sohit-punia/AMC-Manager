import AddVisit from "./AddVisit";
import VisitDetails from "./VisitDetails";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";



/* =========================
   HELPERS
========================= */

function getAMCLeft(endDate) {
  if (!endDate) {
    return "-";
  }

  const today = new Date();
  const end = new Date(endDate);

  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (end < today) {
    return "Expired";
  }

  let years =
    end.getFullYear() -
    today.getFullYear();

  let months =
    end.getMonth() -
    today.getMonth();

  const days =
    end.getDate() -
    today.getDate();

  if (days < 0) {
    months--;
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  if (
    years > 0 &&
    months > 0
  ) {
    return `${years} Year ${months} Month`;
  }

  if (years > 0) {
    return `${years} Year`;
  }

  if (months > 0) {
    return `${months} Month`;
  }

  const remainingDays =
    Math.max(
      0,
      Math.ceil(
        (end - today) /
          (1000 * 60 * 60 * 24)
      )
    );

  return `${remainingDays} Days`;
}
function formatMoney(value) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function getAMCStatus(date) {
  if (!date) return "Upcoming";

  const today = new Date();
  const target = new Date(date);

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const days = Math.ceil(
    (target - today) /
      (1000 * 60 * 60 * 24)
  );

  if (days < 0) return "Missed";
  if (days <= 7) return "Due Soon";
  return "Upcoming";
}

function getStatusClass(status) {
  if (status === "Missed") return "status missed";
  if (status === "Due Soon") return "status due-soon";
  return "status upcoming";
}
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
      return 3;
  }
}

function addMonthsToDate(dateString, months) {
  if (!dateString) return "";

  const parts = String(dateString).split("-");
  if (parts.length !== 3) return "";

  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  const day = Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return "";
  }

  const targetMonthIndex = month + months;
  const targetYear =
    year + Math.floor(targetMonthIndex / 12);
  const targetMonth =
    targetMonthIndex % 12;

  const daysInTargetMonth =
    new Date(
      targetYear,
      targetMonth + 1,
      0
    ).getDate();

  const targetDay =
    Math.min(day, daysInTargetMonth);

  const result = new Date(
    targetYear,
    targetMonth,
    targetDay
  );

  return `${result.getFullYear()}-${String(
    result.getMonth() + 1
  ).padStart(2, "0")}-${String(
    result.getDate()
  ).padStart(2, "0")}`;
}

function calculateNextAMCDate(project) {
  if (!project) return "";

  const baseDate =
    project.lastAMCDate ||
    project.amcStartDate ||
    "";

  if (!baseDate) return "";

  return addMonthsToDate(
    baseDate,
    getAMCMonths(project.amcType)
  );
}

function emptyProject() {
  return {
    projectNumber: "",
    companyName: "",
    companyAddress: "",
    contactPerson: "",
    phoneNumber: "",
    totalOrderAmount: "",
    numberOfStations: "",
    stationName: "",
    amcType: "Quarterly",
    amcStartDate: "",
    lastAMCDate: "",
    amcEndDate: "",
    remarks: "",
  };
}

/* =========================
   APP
========================= */

function App() {
  const [page, setPage] = useState("dashboard");

  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  const [projectForm, setProjectForm] =  useState(emptyProject());

  const [editingProjectId, setEditingProjectId] = useState(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [selectedBill, setSelectedBill] =
    useState(null);

  const [billForm, setBillForm] =
    useState({
      billDate: "",
      billAmount: "",
      amountReceived: "",
      amountReceivedDate: "",
      remarks: "",
    });

  const [billInvoiceFile, setBillInvoiceFile] =
    useState(null);

  const [billModalOpen, setBillModalOpen] =
    useState(false);

  const [billSaving, setBillSaving] =
    useState(false);

  /* =========================
     FETCH PROJECTS
  ========================= */

  async function fetchProjects() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API}/projects`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch projects"
        );
      }

      setProjects(
        Array.isArray(data)
          ? data.map((project) => ({
              ...project,
              nextAMCDate:
                calculateNextAMCDate(project) ||
                project.nextAMCDate ||
                "",
            }))
          : []
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    fetchProjects();
  }, []);

  /* =========================
     PROJECT FORM CHANGE
  ========================= */

  function handleProjectChange(e) {
    const {
      name,
      value,
    } = e.target;

    setProjectForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /* =========================
     SAVE PROJECT
  ========================= */

  async function handleProjectSubmit(e) {
    e.preventDefault();

    if (
      !projectForm.projectNumber.trim()
    ) {
      alert(
        "Project Number is required."
      );
      return;
    }

    if (
      !projectForm.companyName.trim()
    ) {
      alert(
        "Company Name is required."
      );
      return;
    }

    if (
      !projectForm.numberOfStations ||
      Number(
        projectForm.numberOfStations
      ) < 1
    ) {
      alert(
        "Number of Stations must be at least 1."
      );
      return;
    }

    try {
      setLoading(true);

      const url = editingProjectId
        ? `${API}/projects/${editingProjectId}`
        : `${API}/projects`;

      const method = editingProjectId
        ? "PUT"
        : "POST";

      const response = await fetch(
        url,
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...projectForm,
            numberOfStations:
              Number(
                projectForm.numberOfStations
              ),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save project"
        );
      }

      alert(
        editingProjectId
          ? "Project updated successfully."
          : "Project created successfully."
      );

      setProjectForm(
        emptyProject()
      );

      setEditingProjectId(null);

      await fetchProjects();

      setPage("projects");
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     EDIT PROJECT
  ========================= */

  function editProject(project) {
    setProjectForm({
      projectNumber:
        project.projectNumber || "",
      companyName:
        project.companyName || "",
      companyAddress:
        project.companyAddress || "",
      contactPerson:
        project.contactPerson || "",
      phoneNumber:
        project.phoneNumber || "",
      totalOrderAmount:
        project.totalOrderAmount || "",
      numberOfStations:
        project.numberOfStations || "",
      stationName:
        project.stationName || "",
      amcType:
        project.amcType ||
        "Quarterly",
      amcStartDate:
        project.amcStartDate || "",
      lastAMCDate:
        project.lastAMCDate || "",
      amcEndDate:
        project.amcEndDate || "",
      remarks:
        project.remarks || "",
    });

    setEditingProjectId(
      project.id
    );

    setPage("add-project");
  }

  /* =========================
     DELETE PROJECT
  ========================= */

  async function deleteProject(id) {
    const confirmed =
      window.confirm(
        "Delete this project and all related visits, billing, tours and documents?"
      );

    if (!confirmed) return;

    try {
      const response =
        await fetch(
          `${API}/projects/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete project"
        );
      }

      await fetchProjects();

      if (
        selectedProject &&
        selectedProject.id === id
      ) {
        setSelectedProject(null);
      }

      alert(
        "Project deleted successfully."
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  /* =========================
     OPEN PROJECT
  ========================= */

  async function openProject(project) {
  try {
    setLoading(true);
    setError("");

    /*
      Keep the project that is already visible in the list.
      This guarantees that Project Details can still open
      even if the detailed API call has a temporary issue.
    */
    setSelectedProject(project);

    const response = await fetch(
      `${API}/projects/${project.id}`,
      {
        cache: "no-store",
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to load project details"
      );
    }

    /*
      The detailed endpoint returns:
      project fields + calculated totals + visits
    */
    setSelectedProject({
      ...data,
      nextAMCDate:
        calculateNextAMCDate(data) ||
        data.nextAMCDate ||
        "",
    });
    setPage("project-details");

  } catch (err) {
    console.error(
      "Open project error:",
      err
    );

    /*
      Fallback to the project already loaded
      from the Projects page.
    */
    setSelectedProject({
      ...project,
      nextAMCDate:
        calculateNextAMCDate(project) ||
        project.nextAMCDate ||
        "",
      visits:
        project.visits || [],
    });

    setPage("project-details");

    setError(
      err.message ||
        "Could not load complete project details."
    );

  } finally {
    setLoading(false);
  }
}

  /* =========================
     BILL MANAGEMENT
  ========================= */

  function handleBillChange(e) {
    const {
      name,
      value,
    } = e.target;

    setBillForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function openAddBill() {
    if (!selectedProject) return;

    setSelectedBill(null);
    setBillForm({
      billDate: "",
      billAmount: "",
      amountReceived: "",
      amountReceivedDate: "",
      remarks: "",
    });

    setBillInvoiceFile(null);
    setBillModalOpen(true);
  }

  function openEditBill(bill) {
    setSelectedBill(bill);

    setBillForm({
      billDate: bill.billDate || "",
      billAmount: bill.billAmount ?? "",
      amountReceived:
        bill.amountReceived ?? "",
      amountReceivedDate:
        bill.amountReceivedDate || "",
      remarks: bill.remarks || "",
    });

    setBillInvoiceFile(null);
    setBillModalOpen(true);
  }

  async function refreshSelectedProject() {
    if (!selectedProject) return;

    const response = await fetch(
      `${API}/projects/${selectedProject.id}?_=${Date.now()}`,
      {
        cache: "no-store",
      }
    );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
          "Failed to refresh project details"
      );
    }

    setSelectedProject({
      ...data,
      nextAMCDate:
        calculateNextAMCDate(data) ||
        data.nextAMCDate ||
        "",
    });
  }

  async function saveBill(e) {
    e.preventDefault();

    if (!selectedProject) return;

    if (!billForm.billDate) {
      alert("Bill Date is required.");
      return;
    }

    try {
      setBillSaving(true);

      const url = selectedBill
        ? `${API}/bills/${selectedBill.id}`
        : `${API}/bills`;

      const method = selectedBill
        ? "PUT"
        : "POST";

      const formData = new FormData();

      formData.append(
        "projectNumber",
        selectedProject.projectNumber
      );

      formData.append(
        "billDate",
        billForm.billDate || ""
      );

      formData.append(
        "billAmount",
        String(
          Number(billForm.billAmount) || 0
        )
      );

      formData.append(
        "amountReceived",
        String(
          Number(billForm.amountReceived) || 0
        )
      );

      formData.append(
        "amountReceivedDate",
        billForm.amountReceivedDate || ""
      );

      formData.append(
        "remarks",
        billForm.remarks || ""
      );

      if (billInvoiceFile) {
        formData.append(
          "invoicePdf",
          billInvoiceFile
        );
      }

      const response = await fetch(
        url,
        {
          method,
          body: formData,
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save bill"
        );
      }

      await refreshSelectedProject();
      await fetchProjects();

      setBillModalOpen(false);
      setSelectedBill(null);
      setBillInvoiceFile(null);

      alert(
        selectedBill
          ? "Bill updated successfully."
          : "Bill added successfully."
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setBillSaving(false);
    }
  }

  async function deleteBill(billId) {
    const confirmed =
      window.confirm(
        "Delete this bill?"
      );

    if (!confirmed) return;

    try {
      setBillSaving(true);

      const response = await fetch(
        `${API}/bills/${billId}`,
        {
          method: "DELETE",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete bill"
        );
      }

      await refreshSelectedProject();
      await fetchProjects();
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setBillSaving(false);
    }
  }

  /* =========================
     DELETE VISIT
  ========================= */

  async function deleteVisit(
    visitId
  ) {
    const confirmed =
      window.confirm(
        "Delete this AMC visit and all associated data?"
      );

    if (!confirmed) return;

    try {
      const response =
        await fetch(
          `${API}/visits/${visitId}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete visit"
        );
      }

      if (selectedProject) {
        await openProject(
          selectedProject
        );
      }


    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  }

  /* =========================
     SEARCH
  ========================= */

  const filteredProjects =
    useMemo(() => {
      const value =
        search
          .trim()
          .toLowerCase();

      if (!value) {
        return projects;
      }

      return projects.filter(
        (project) =>
          String(
            project.projectNumber ||
              ""
          )
            .toLowerCase()
            .includes(value) ||
          String(
            project.companyName ||
              ""
          )
            .toLowerCase()
            .includes(value)
      );
    }, [projects, search]);

  /* =========================
     DASHBOARD DATA
  ========================= */

  const dashboardData =
    useMemo(() => {
      let active = 0;
      let expired = 0;
      let upcoming = 0;

      projects.forEach(
        (project) => {
          const today =
            new Date();

          today.setHours(
            0,
            0,
            0,
            0
          );

          if (
            !project.amcEndDate
          ) {
            return;
          }

          const end =
            new Date(
              project.amcEndDate
            );

          end.setHours(
            0,
            0,
            0,
            0
          );

          if (end < today) {
            expired++;
          } else {
            active++;
          }

          if (
            project.nextAMCDate
          ) {
            const status =
              getAMCStatus(
                project.nextAMCDate
              );

            if (
              status !== "Missed"
            ) {
              upcoming++;
            }
          }
        }
      );

      return {
        total: projects.length,
        active,
        expired,
        upcoming,
      };
    }, [projects]);

  /* =========================
     RENDER SIDEBAR
  ========================= */

  function renderSidebar() {
    return (
      <aside className="sidebar">

        <div className="logo">
          <h2>
            AMC Manager
          </h2>

          <p>
            Record Management
          </p>
        </div>

        <nav className="menu">

          <button
            className={
              page === "dashboard"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() =>
              setPage("dashboard")
            }
          >
            📊 Dashboard
          </button>

          <button
            className={
              page === "projects" ||
              page ===
                "project-details"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() =>
              setPage("projects")
            }
          >
            📁 Projects
          </button>

          <button
            className={
              page === "add-project"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() => {
              setProjectForm(
                emptyProject()
              );
              setEditingProjectId(
                null
              );
              setPage(
                "add-project"
              );
            }}
          >
            ➕ Add Project
          </button>

          <button
            className={
              page === "add-visit"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() =>
              setPage("add-visit")
            }
          >
            📝 Add Visit Details
          </button>

          <button
            className={
              page === "visit-details"
                ? "menu-item active"
                : "menu-item"
            }
            onClick={() =>
              setPage("visit-details")
            }
          >
            📋 Visit Details
          </button>

        </nav>
      </aside>
    );
  }

  /* =========================
     DASHBOARD PAGE
  ========================= */

  function renderDashboard() {
    return (
      <>
        <div className="page-header">
          <div>
            <h1>
              Dashboard
            </h1>

            <p>
              Overview of your AMC management system
            </p>
          </div>
        </div>

        <div className="stat-grid">

          <div className="stat-card">
            <span>
              Total Projects
            </span>

            <strong>
              {dashboardData.total}
            </strong>
          </div>

          <div className="stat-card green">
            <span>
              Active AMC
            </span>

            <strong>
              {dashboardData.active}
            </strong>
          </div>

          <div className="stat-card blue">
            <span>
              Upcoming AMC
            </span>

            <strong>
              {dashboardData.upcoming}
            </strong>
          </div>

          <div className="stat-card red">
            <span>
              Expired AMC
            </span>

            <strong>
              {dashboardData.expired}
            </strong>
          </div>

        </div>

        <div className="dashboard-panel">

          <h2>
            Project Overview
          </h2>

          <div className="overview-list">

            <div>
              <span>
                Total Projects
              </span>

              <strong>
                {
                  dashboardData.total
                }
              </strong>
            </div>

            <div>
              <span>
                Active AMC
              </span>

              <strong>
                {
                  dashboardData.active
                }
              </strong>
            </div>

            <div>
              <span>
                Expired AMC
              </span>

              <strong>
                {
                  dashboardData.expired
                }
              </strong>
            </div>


          </div>

        </div>
      </>
    );
  }

  /* =========================
     PROJECTS PAGE
  ========================= */

  /* =========================
   PROJECTS PAGE
========================= */

function renderProjects() {
  return (
    <>
      <div className="page-header">

        <div>
          <h1>
            All Projects
          </h1>

          <p>
            Manage your AMC projects
          </p>
        </div>

        <button
          className="primary-btn"
          onClick={() => {
            setProjectForm(
              emptyProject()
            );

            setEditingProjectId(
              null
            );

            setPage(
              "add-project"
            );
          }}
        >
          + Add Project
        </button>

      </div>

      <div className="search-box">

        <input
          type="text"
          placeholder="Search by project number or company..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

      </div>

      <div className="table-card">

        <table>

          <thead>

            <tr>

              <th>
                Project
              </th>

              <th>
                Company
              </th>

              <th>
                Total Amount
              </th>

              <th>
                AMC Type
              </th>

              <th>
                Next AMC
              </th>

              <th>
                AMC Left
              </th>

              <th>
                Bills
              </th>

              <th>
                Amount Received
              </th>

              <th>
                Status
              </th>

              <th>
                View
              </th>

              <th>
                Edit
              </th>

              <th>
                Delete
              </th>

            </tr>

          </thead>

          <tbody>

            {filteredProjects.length === 0 ? (

              <tr>

                <td
                  colSpan="12"
                  className="empty-cell"
                >
                  No projects found.
                </td>

              </tr>

            ) : (

              filteredProjects.map(
                (project) => (

                  <tr
                    key={
                      project.id
                    }
                  >

                    {/* PROJECT */}

                    <td>
                      {
                        project.projectNumber
                      }
                    </td>

                    {/* COMPANY */}

                    <td>
                      {
                        project.companyName
                      }
                    </td>

                    {/* TOTAL ORDER AMOUNT */}

                    <td>
                      {formatMoney(
                        project.totalOrderAmount
                      )}
                    </td>

                    {/* AMC TYPE */}

                    <td>
                      {
                        project.amcType
                      }
                    </td>

                    {/* NEXT AMC */}

                    <td>
                      {
                        project.nextAMCDate ||
                        "-"
                      }
                    </td>

                    {/* AMC LEFT */}

                    <td>
                      {getAMCLeft(
                        project.amcEndDate
                      )}
                    </td>

                    {/* BILLS */}

                    <td>
                      {
                        project.billCount ||
                        0
                      }
                    </td>

                    {/* AMOUNT RECEIVED */}

                    <td>
                      {formatMoney(
                        project.receivedAmount
                      )}
                    </td>

                    {/* STATUS */}

                    <td>
                      <span
                        className={getStatusClass(
                          getAMCStatus(
                            project.nextAMCDate
                          )
                        )}
                      >
                        {getAMCStatus(
                          project.nextAMCDate
                        )}
                      </span>
                    </td>

                    {/* VIEW */}

                    <td>
                      <button
                        className="small-btn view"
                        onClick={() =>
                          openProject(
                            project
                          )
                        }
                      >
                        View
                      </button>
                    </td>

                    {/* EDIT */}

                    <td>
                      <button
                        className="small-btn edit"
                        onClick={() =>
                          editProject(
                            project
                          )
                        }
                      >
                        Edit
                      </button>
                    </td>

                    {/* DELETE */}

                    <td>
                      <button
                        className="small-btn delete"
                        onClick={() =>
                          deleteProject(
                            project.id
                          )
                        }
                      >
                        Delete
                      </button>
                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>
    </>
  );
}

  /* =========================
     ADD PROJECT PAGE
  ========================= */

  function renderAddProject() {
    return (
      <>
        <div className="page-header">

          <div>
            <h1>
              {editingProjectId
                ? "Edit Project"
                : "Add New Project"}
            </h1>

            <p>
              Enter project and AMC information
            </p>
          </div>

        </div>

        <form
          className="form-card"
          onSubmit={
            handleProjectSubmit
          }
        >

          <div className="form-grid">

            <div className="field">
              <label>
                Project Number *
              </label>

              <input
                name="projectNumber"
                value={
                  projectForm.projectNumber
                }
                onChange={
                  handleProjectChange
                }
                placeholder="PR-001"
                required
              />
            </div>

            <div className="field">
              <label>
                Company Name *
              </label>

              <input
                name="companyName"
                value={
                  projectForm.companyName
                }
                onChange={
                  handleProjectChange
                }
                placeholder="Company name"
                required
              />
            </div>

            <div className="field full">
              <label>
                Company Address
              </label>

              <input
                name="companyAddress"
                value={
                  projectForm.companyAddress
                }
                onChange={
                  handleProjectChange
                }
                placeholder="Company address"
              />
            </div>

            <div className="field">
              <label>
                Contact Person
              </label>

              <input
                name="contactPerson"
                value={
                  projectForm.contactPerson
                }
                onChange={
                  handleProjectChange
                }
                placeholder="Contact person"
              />
            </div>

            <div className="field">
              <label>
                Phone Number
              </label>

              <input
                name="phoneNumber"
                value={
                  projectForm.phoneNumber
                }
                onChange={
                  handleProjectChange
                }
                placeholder="Phone number"
              />
            </div>

            <div className="field">
              <label>
                Total Order Amount
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                name="totalOrderAmount"
                value={
                  projectForm.totalOrderAmount
                }
                onChange={
                  handleProjectChange
                }
                placeholder="0"
              />
            </div>

            <div className="field">
              <label>
                Number of Stations *
              </label>

              <input
                type="number"
                min="1"
                name="numberOfStations"
                value={
                  projectForm.numberOfStations
                }
                onChange={
                  handleProjectChange
                }
                placeholder="4"
                required
              />
            </div>

            <div className="field">
              <label>
                Name of Station
              </label>

              <input
                name="stationName"
                value={
                  projectForm.stationName
                }
                onChange={
                  handleProjectChange
                }
                placeholder="Station name"
              />
            </div>

            <div className="field">
              <label>
                AMC Type *
              </label>

              <select
                name="amcType"
                value={
                  projectForm.amcType
                }
                onChange={
                  handleProjectChange
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

              <option>
                2 Yearly
              </option>

              <option>
                3 Yearly
              </option>
              </select>
            </div>

            <div className="field">
              <label>
                AMC Start Date
              </label>

              <input
                type="date"
                name="amcStartDate"
                value={
                  projectForm.amcStartDate
                }
                onChange={
                  handleProjectChange
                }
              />
            </div>

            <div className="field">
              <label>
                AMC End Date
              </label>

              <input
                type="date"
                name="amcEndDate"
                value={
                  projectForm.amcEndDate
                }
                onChange={
                  handleProjectChange
                }
              />
            </div>
            <div className="field">
              <label>
                Last AMC Date
              </label>

              <input
                type="date"
                name="lastAMCDate"
                value={
                  projectForm.lastAMCDate || ""
                }
                onChange={
                  handleProjectChange
                }
              />

              
            </div>

            <div className="field full">
              <label>
                Remarks
              </label>

              <textarea
                name="remarks"
                value={
                  projectForm.remarks
                }
                onChange={
                  handleProjectChange
                }
                placeholder="Remarks"
                rows="4"
              />
            </div>

          </div>

          <div className="form-actions">

            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setProjectForm(
                  emptyProject()
                );

                setEditingProjectId(
                  null
                );

                setPage(
                  "projects"
                );
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {editingProjectId
                ? "Update Project"
                : "Save Project"}
            </button>

          </div>

        </form>
      </>
    );
  }

  /* =========================
     PROJECT DETAILS PAGE
  ========================= */

  function renderProjectDetails() {
    if (!selectedProject) {
      return null;
    }

    const visits =
      selectedProject.visits || [];

    const bills =
      selectedProject.bills || [];

    return (
      <>
        <div className="page-header">

          <div>
            <h1>
              Project Details
            </h1>

            <p>
              {
                selectedProject.companyName
              }
            </p>
          </div>

          <div className="header-actions">

            <button
              className="secondary-btn"
              onClick={() =>
                setPage(
                  "projects"
                )
              }
            >
              ← Back
            </button>

            <button
              className="primary-btn"
              onClick={() => {
                setPage("add-visit");
              }}
            >
              + Add AMC Visit
            </button>

          </div>

        </div>

        <div className="project-finance-grid">

          <div className="project-finance-card">
            <span>
              Total Order Amount
            </span>

            <strong>
              {formatMoney(
                selectedProject.totalOrderAmount
              )}
            </strong>
          </div>

          <div className="project-finance-card">
            <span>
              AMC Visits Done
            </span>

            <strong>
              {selectedProject.visitCount || 0}
            </strong>
          </div>

          <div className="project-finance-card received">
            <span>
              Received Amount
            </span>

            <strong>
              {formatMoney(
                selectedProject.receivedAmount
              )}
            </strong>
          </div>

        </div>

        <div className="details-grid-large">

          <div className="details-card">

            <h2>
              Project Information
            </h2>

            <div className="detail-grid">

              <div>
                <span>
                  Project Number
                </span>

                <strong>
                  {
                    selectedProject.projectNumber
                  }
                </strong>
              </div>

              <div>
                <span>
                  Company Name
                </span>

                <strong>
                  {
                    selectedProject.companyName
                  }
                </strong>
              </div>

              <div>
                <span>
                  Company Address
                </span>

                <strong>
                  {
                    selectedProject.companyAddress ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Contact Person
                </span>

                <strong>
                  {
                    selectedProject.contactPerson ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Phone Number
                </span>

                <strong>
                  {
                    selectedProject.phoneNumber ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Total Order Amount
                </span>

                <strong>
                  {formatMoney(
                    selectedProject.totalOrderAmount
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Number of Stations
                </span>

                <strong>
                  {
                    selectedProject.numberOfStations
                  }
                </strong>
              </div>

              <div>
                <span>
                  Station Name
                </span>

                <strong>
                  {
                    selectedProject.stationName ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  AMC Type
                </span>

                <strong>
                  {
                    selectedProject.amcType
                  }
                </strong>
              </div>

              <div>
                <span>
                  AMC Start
                </span>

                <strong>
                  {
                    selectedProject.amcStartDate ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  Last AMC
                </span>

                <strong>
                  {
                    selectedProject.lastAMCDate ||
                    "-"
                  }
                </strong>
              </div>

              <div>
                <span>
                  AMC End
                </span>

                <strong>
                  {
                    selectedProject.amcEndDate ||
                    "-"
                  }
                </strong>
              </div>

            </div>

            <div className="remarks-display">

              <span>
                Remarks
              </span>

              <p>
                {
                  selectedProject.remarks ||
                  "No remarks added."
                }
              </p>

            </div>

          </div>

        </div>

        <div className="details-card visits-card">

          <div className="section-header">

            <div>
              <h2>
                Bills
              </h2>

              <p>
                Billing and payment details
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={
                openAddBill
              }
            >
              + Add Bill
            </button>

          </div>

          {bills.length === 0 ? (
            <div className="empty-state">
              No bills added yet.
            </div>
          ) : (
            <div className="table-card">

              <table>

                <thead>
                  <tr>
                    <th>
                      Bill No.
                    </th>

                    <th>
                      Bill Date
                    </th>

                    <th>
                      Bill Amount
                    </th>

                    <th>
                      Amount Received
                    </th>

                    <th>
                      Received Date
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      View/Edit
                    </th>
                  </tr>
                </thead>

                <tbody>

                  {bills.map(
                    (bill) => (
                      <tr
                        key={
                          bill.id
                        }
                      >

                        <td>
                          {
                            bill.billNumber
                          }
                        </td>

                        <td>
                          {
                            bill.billDate ||
                            "-"
                          }
                        </td>

                        <td>
                          {formatMoney(
                            bill.billAmount
                          )}
                        </td>

                        <td>
                          {formatMoney(
                            bill.amountReceived
                          )}
                        </td>

                        <td>
                          {
                            bill.amountReceivedDate ||
                            "-"
                          }
                        </td>

                        <td>

                          <strong
                            className={
                              bill.status ===
                              "Paid"
                                ? "status completed"
                                : bill.status ===
                                  "Partial"
                                ? "status due-soon"
                                : "status upcoming"
                            }
                          >
                            {
                              bill.status ||
                              "Pending"
                            }
                          </strong>

                        </td>

                        <td>

                          <button
                            type="button"
                            className="small-btn view"
                            onClick={() =>
                              openEditBill(
                                bill
                              )
                            }
                          >
                            View/Edit
                          </button>

                        </td>

                      </tr>
                    )
                  )}

                </tbody>

              </table>

            </div>
          )}

        </div>

        <div className="details-card visits-card">

          <div className="section-header">

            <div>
              <h2>
                AMC Visits
              </h2>

              <p>
                Visits for this AMC contract
              </p>
            </div>

            <button
              className="primary-btn"
              onClick={() => {
                setPage("add-visit");
              }}
            >
              + Add Visit
            </button>

          </div>

          {visits.length ===
          0 ? (
            <div className="empty-state">
              No AMC visits created yet.
            </div>
          ) : (
            <div className="visit-list">

              {visits.map(
                (visit) => {
                  const status =
                    visit.visitDate
                      ? "Completed"
                      : "Upcoming";

                  return (
                    <div
                      className="visit-row"
                      key={
                        visit.id
                      }
                    >

                      <div className="visit-number">
                        <span>
                          Visit
                        </span>

                        <strong>
                          {
                            visit.visitNumber
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Visit Date
                        </span>

                        <strong>
                          {
                            visit.visitDate ||
                            "-"
                          }
                        </strong>
                      </div>

                      <div>
                        <span>
                          Status
                        </span>

                        <strong
                          className={
                            status ===
                            "Completed"
                              ? "status completed"
                              : "status upcoming"
                          }
                        >
                          {status}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Employee Name
                        </span>

                        <strong>
                          {
                            visit.employeeName ||
                            "-"
                          }
                        </strong>
                      </div>

                      <div className="visit-actions">

                        {/* <button
                          className="small-btn view"
                          onClick={() => {
                            setSelectedVisit(visit);
                            setPage("visit-details");
                          }}
                        >
                          View
                        </button> */}

                        <button
                          className="small-btn delete"
                          onClick={() =>
                            deleteVisit(
                              visit.id
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    </div>
                  );
                }
              )}

            </div>
          )}

        </div>

        {billModalOpen && (
          <div className="modal-overlay">

            <div className="modal-card">

              <div className="modal-header">

                <div>
                  <h2>
                    {selectedBill
                      ? "Edit Bill"
                      : "Add Bill"}
                  </h2>

                  <p>
                    Project{" "}
                    {
                      selectedProject.projectNumber
                    }
                  </p>
                </div>

                <button
                  type="button"
                  className="modal-close"
                  onClick={() => {
                    setBillModalOpen(
                      false
                    );
                    setSelectedBill(
                      null
                    );
                    setBillInvoiceFile(null);
                  }}
                >
                  ×
                </button>

              </div>

              <form
                onSubmit={
                  saveBill
                }
              >

                <div className="form-grid">

                  {selectedBill && (
                    <div className="field">

                      <label>
                        Bill Number
                      </label>

                      <input
                        value={
                          selectedBill.billNumber
                        }
                        disabled
                      />

                    </div>
                  )}

                  <div className="field">

                    <label>
                      Bill Date *
                    </label>

                    <input
                      type="date"
                      name="billDate"
                      value={
                        billForm.billDate
                      }
                      onChange={
                        handleBillChange
                      }
                      required
                    />

                  </div>

                  <div className="field">

                    <label>
                      Bill Amount
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="billAmount"
                      value={
                        billForm.billAmount
                      }
                      onChange={
                        handleBillChange
                      }
                      placeholder="0"
                    />

                  </div>

                  <div className="field">

                    <label>
                      Amount Received
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="amountReceived"
                      value={
                        billForm.amountReceived
                      }
                      onChange={
                        handleBillChange
                      }
                      placeholder="0"
                    />

                  </div>

                  <div className="field">

                    <label>
                      Received Date
                    </label>

                    <input
                      type="date"
                      name="amountReceivedDate"
                      value={
                        billForm.amountReceivedDate
                      }
                      onChange={
                        handleBillChange
                      }
                    />

                  </div>

                  <div className="field full">
                    <label>
                      Invoice PDF
                    </label>

                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      onChange={(e) =>
                        setBillInvoiceFile(
                          e.target.files?.[0] || null
                        )
                      }
                    />

                    {selectedBill?.invoicePdf && (
                      <small>
                        Current invoice:{" "}
                        <a
                          href={`${API.replace(/\/api$/, "")}${selectedBill.invoicePdf}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          View PDF
                        </a>
                      </small>
                    )}

                    {billInvoiceFile && (
                      <small>
                        New file: {billInvoiceFile.name}
                      </small>
                    )}
                  </div>

                  <div className="field full">
                    <label>
                      Remarks
                    </label>

                    <textarea
                      name="remarks"
                      value={
                        billForm.remarks
                      }
                      onChange={
                        handleBillChange
                      }
                      placeholder="Remarks"
                      rows="3"
                    />

                  </div>

                </div>

                <div className="form-actions">

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => {
                      setBillModalOpen(
                        false
                      );
                      setSelectedBill(
                        null
                      );
                      setBillInvoiceFile(null);
                    }}
                    disabled={
                      billSaving
                    }
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="primary-btn"
                    disabled={
                      billSaving
                    }
                  >
                    {billSaving
                      ? "Saving..."
                      : selectedBill
                      ? "Update Bill"
                      : "Save Bill"}
                  </button>

                </div>

              </form>

            </div>

          </div>
        )}

      </>
    );
  }


  /* =========================
     MAIN PAGE
  ========================= */

  return (
    <div className="app">

      {renderSidebar()}

      <main className="main-content">

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-banner">
            Loading...
          </div>
        )}

        {page ===
          "dashboard" &&
          renderDashboard()}

        {page ===
          "projects" &&
          renderProjects()}

        {page ===
          "add-project" &&
          renderAddProject()}

        {page ===
          "project-details" &&
          renderProjectDetails()}
        {page === "add-visit" && (
          <AddVisit
              onSaved={async (projectNumber) => {
                try {
                  await fetchProjects();

                  const response =
                    await fetch(
                      `${API}/projects?projectNumber=${encodeURIComponent(
                        projectNumber
                      )}`,
                      {
                        cache: "no-store",
                      }
                    );

                  const data =
                    await response.json();

                  if (!response.ok) {
                    throw new Error(
                      data.message ||
                        "Failed to reload project"
                    );
                  }

                  const project =
                    data.find(
                      (item) =>
                        String(
                          item.projectNumber
                        ).toLowerCase() ===
                        String(
                          projectNumber
                        ).toLowerCase()
                    );

                  if (!project) {
                    throw new Error(
                      "Project not found after saving visit."
                    );
                  }

                  const detailResponse =
                    await fetch(
                      `${API}/projects/${project.id}`,
                      {
                        cache: "no-store",
                      }
                    );

                  const detailData =
                    await detailResponse.json();

                  if (!detailResponse.ok) {
                    throw new Error(
                      detailData.message ||
                        "Failed to load project details"
                    );
                  }

                  setSelectedProject({
                    ...detailData,
                    nextAMCDate:
                      calculateNextAMCDate(
                        detailData
                      ) ||
                      detailData.nextAMCDate ||
                      "",
                  });

                  setPage(
                    "project-details"
                  );

                } catch (err) {
                  console.error(
                    "Project refresh error:",
                    err
                  );

                  alert(
                    err.message ||
                      "Visit saved, but project could not be refreshed."
                  );
                }
              }}
            />
        )}

        {page === "visit-details" && (
          <VisitDetails
            onBack={() => {
              setPage("dashboard");
            }}
          />
        )}

      </main>
    </div>
  );
}

export default App;