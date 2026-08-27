import AddVisit from "./AddVisit";
import VisitDetails from "./VisitDetails";
import { useEffect, useMemo, useState } from "react";
import "./App.css";

const API = "http://localhost:5000/api";



/* =========================
   HELPERS
========================= */

function getMonthsForAMCType(amcType) {
  if (amcType === "Quarterly") return 3;
  if (amcType === "Half Yearly") return 6;
  if (amcType === "Yearly") return 12;
  return 0;
}
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
function addMonthsToDate(dateString, months) {
  if (!dateString || !months) return "";

  const [year, month, day] = dateString
    .split("-")
    .map(Number);

  if (!year || !month || !day) return "";

  const totalMonths =
    year * 12 + (month - 1) + months;

  const targetYear = Math.floor(
    totalMonths / 12
  );

  const targetMonth =
    totalMonths % 12;

  const lastDay = new Date(
    targetYear,
    targetMonth + 1,
    0
  ).getDate();

  const targetDay = Math.min(
    day,
    lastDay
  );

  return (
    `${targetYear}-${String(
      targetMonth + 1
    ).padStart(2, "0")}-${String(
      targetDay
    ).padStart(2, "0")}`
  );
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
  const [employees, setEmployees] = useState([]);

  const [selectedProject, setSelectedProject] = useState(null);

  const [selectedVisit, setSelectedVisit] = useState(null);

  const [projectForm, setProjectForm] =  useState(emptyProject());

  const [editingProjectId, setEditingProjectId] = useState(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

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
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     FETCH EMPLOYEES
  ========================= */

  async function fetchEmployees() {
    try {
      const response = await fetch(
        `${API}/employees`
      );

      const data = await response.json();

      if (!response.ok) return;

      setEmployees(
        Array.isArray(data) ? data : []
      );
    } catch (err) {
      console.error(
        "Employee fetch error:",
        err
      );
    }
  }

  useEffect(() => {
    fetchProjects();
    fetchEmployees();
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

      const response =
        await fetch(
          `${API}/projects/${project.id}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load project"
        );
      }

      setSelectedProject(data);
      setPage("project-details");
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  /* =========================
     CREATE AMC VISIT
  ========================= */

/* =========================
   CREATE AMC VISIT
========================= */

function createVisit(projectId) {
  const project = projects.find(
    (item) => item.id === projectId
  );

  if (!project) return;

  const currentVisits =
    selectedProject?.visits || [];

  const nextVisitNumber =
    currentVisits.length + 1;

  let visitDate = "";

  if (currentVisits.length > 0) {
    const lastVisit =
      currentVisits[currentVisits.length - 1];

    visitDate = addMonthsToDate(
      lastVisit.visitDate,
      getMonthsForAMCType(
        project.amcType
      )
    );
  } else {
    visitDate =
      project.amcStartDate || "";
  }

  if (
    project.amcEndDate &&
    visitDate &&
    visitDate > project.amcEndDate
  ) {
    alert(
      "No further AMC visit falls within the AMC period."
    );
    return;
  }

  /*
    Do NOT create the visit here.

    We only open the Add Visit form.
    The complete visit including employeeName,
    amount, documents, tour details, etc.
    will be saved from AddVisit.jsx.
  */

  setSelectedProject({
    ...project,
    visits: currentVisits,
  });

  setPage("add-visit");

  /*
    If your AddVisit component accepts
    these values as props, use:

    nextVisitNumber
    visitDate
    project
  */

  console.log(
    "Preparing Visit:",
    nextVisitNumber,
    visitDate
  );
}

  /* =========================
     UPDATE VISIT
  ========================= */

  async function updateVisit(
    visitId,
    visitDate,
    remarks
  ) {
    try {
      const response =
        await fetch(
          `${API}/visits/${visitId}`,
          {
            method: "PUT",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              visitDate,
              remarks,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update visit"
        );
      }

      if (selectedProject) {
        await openProject(
          selectedProject
        );
      }

      setSelectedVisit(null);

      alert(
        "Visit updated successfully."
      );
    } catch (err) {
      console.error(err);
      alert(err.message);
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

      setSelectedVisit(null);
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
        employees:
          employees.length,
      };
    }, [
      projects,
      employees,
    ]);

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

            <div>
              <span>
                Employees
              </span>

              <strong>
                {
                  dashboardData.employees
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
        <th>Project No.</th>
        <th>Company</th>
        <th>Total Amount</th>
        <th>AMC Type</th>
        <th>Last AMC</th>
        <th>Next AMC</th>
        <th>AMC Left</th>
        <th>Status</th>
        <th>Actions</th>
      </tr>
    </thead>

    <tbody>

      {filteredProjects.length === 0 ? (

        <tr>
          <td
            colSpan="9"
            className="empty-cell"
          >
            No projects found.
          </td>
        </tr>

      ) : (

        filteredProjects.map(
          (project) => {

            const status =
              getAMCStatus(
                project.nextAMCDate
              );

            return (
              <tr
                key={project.id}
              >

                <td>
                  {project.projectNumber}
                </td>

                <td>
                  {project.companyName}
                </td>

                <td>
                  {formatMoney(
                    project.totalOrderAmount
                  )}
                </td>

                <td>
                  {project.amcType}
                </td>

                <td>
                  {project.lastAMCDate || "-"}
                </td>

                <td>
                  {project.nextAMCDate || "-"}
                </td>

                <td>
                  {getAMCLeft(
                    project.amcEndDate
                  )}
                </td>

                {/* STATUS */}

                <td>
                  <span
                    className={`status ${
                      status === "Missed"
                        ? "missed"
                        : status === "Due Soon"
                        ? "due-soon"
                        : "upcoming"
                    }`}
                  >
                    {status}
                  </span>
                </td>

                {/* ACTIONS */}

                <td className="actions">

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
            );
          }
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
                setSelectedVisit(null);
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
                setSelectedVisit(null);
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
                        <span>Employee Name</span>

                        <strong>
                          {visit.employeeName || "-"}
                        </strong>
                      </div>

                      <div className="visit-actions">

                        <button
                          className="small-btn view"
                          onClick={() => {
                            setSelectedVisit(visit);
                            setPage("visit-details");
                          }}
                        >
                          View
                        </button>

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
        {page === "employees" && (
          <Employees />
        )}

        {page === "add-visit" && (
          <AddVisit
            onSaved={() => {
              fetchProjects();
              setPage("visit-details");
            }}
          />
        )}

        {page === "visit-details" && (
          <VisitDetails
            onBack={() => {
              setSelectedVisit(null);
              setPage("dashboard");
            }}
          />
        )}

      </main>
    </div>
  );
}

export default App;