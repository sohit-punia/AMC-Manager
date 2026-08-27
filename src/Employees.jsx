import { useEffect, useState } from "react";

const API =
  "http://localhost:5000/api";

function Employees() {
  const [employees, setEmployees] =
    useState([]);

  const [form, setForm] =
    useState({
      employeeName: "",
      employeeCode: "",
      phoneNumber: "",
      designation: "",
      remarks: "",
    });

  const [editingId, setEditingId] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  async function loadEmployees() {
    try {
      const response =
        await fetch(
          `${API}/employees`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load employees"
        );
      }

      setEmployees(data);
    } catch (error) {
      alert(error.message);
    }
  }

  useEffect(() => {
    loadEmployees();
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  }

  async function saveEmployee(e) {
    e.preventDefault();

    if (
      !form.employeeName.trim()
    ) {
      alert(
        "Employee name is required."
      );
      return;
    }

    try {
      setLoading(true);

      const url = editingId
        ? `${API}/employees/${editingId}`
        : `${API}/employees`;

      const response =
        await fetch(url, {
          method: editingId
            ? "PUT"
            : "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(form),
        });

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save employee"
        );
      }

      setForm({
        employeeName: "",
        employeeCode: "",
        phoneNumber: "",
        designation: "",
        remarks: "",
      });

      setEditingId(null);

      await loadEmployees();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  function editEmployee(employee) {
    setForm({
      employeeName:
        employee.employeeName || "",
      employeeCode:
        employee.employeeCode || "",
      phoneNumber:
        employee.phoneNumber || "",
      designation:
        employee.designation || "",
      remarks:
        employee.remarks || "",
    });

    setEditingId(
      employee.id
    );
  }

  async function deleteEmployee(id) {
    if (
      !window.confirm(
        "Delete this employee?"
      )
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API}/employees/${id}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to delete employee"
        );
      }

      await loadEmployees();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            Employees
          </h1>

          <p>
            Manage employees who attend AMC visits
          </p>
        </div>
      </div>

      <div className="employee-layout">

        <form
          className="form-card employee-form"
          onSubmit={saveEmployee}
        >
          <h2>
            {editingId
              ? "Edit Employee"
              : "Add Employee"}
          </h2>

          <div className="form-grid">

            <div className="field full">
              <label>
                Employee Name *
              </label>

              <input
                name="employeeName"
                value={
                  form.employeeName
                }
                onChange={handleChange}
                required
              />
            </div>

            <div className="field">
              <label>
                Employee Code
              </label>

              <input
                name="employeeCode"
                value={
                  form.employeeCode
                }
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label>
                Phone Number
              </label>

              <input
                name="phoneNumber"
                value={
                  form.phoneNumber
                }
                onChange={handleChange}
              />
            </div>

            <div className="field full">
              <label>
                Designation
              </label>

              <input
                name="designation"
                value={
                  form.designation
                }
                onChange={handleChange}
              />
            </div>

            <div className="field full">
              <label>
                Remarks
              </label>

              <textarea
                name="remarks"
                rows="3"
                value={
                  form.remarks
                }
                onChange={handleChange}
              />
            </div>

          </div>

          <div className="form-actions">

            {editingId && (
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setEditingId(null);

                  setForm({
                    employeeName: "",
                    employeeCode: "",
                    phoneNumber: "",
                    designation: "",
                    remarks: "",
                  });
                }}
              >
                Cancel
              </button>
            )}

            <button
              className="primary-btn"
              type="submit"
              disabled={loading}
            >
              {editingId
                ? "Update Employee"
                : "Add Employee"}
            </button>

          </div>
        </form>

        <div className="table-card">

          <table>

            <thead>
              <tr>
                <th>
                  Name
                </th>

                <th>
                  Code
                </th>

                <th>
                  Phone
                </th>

                <th>
                  Designation
                </th>

                <th>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>

              {employees.length ===
              0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="empty-cell"
                  >
                    No employees added yet.
                  </td>
                </tr>
              ) : (
                employees.map(
                  (employee) => (
                    <tr
                      key={
                        employee.id
                      }
                    >
                      <td>
                        {
                          employee.employeeName
                        }
                      </td>

                      <td>
                        {
                          employee.employeeCode ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          employee.phoneNumber ||
                          "-"
                        }
                      </td>

                      <td>
                        {
                          employee.designation ||
                          "-"
                        }
                      </td>

                      <td className="actions">

                        <button
                          className="small-btn edit"
                          onClick={() =>
                            editEmployee(
                              employee
                            )
                          }
                        >
                          Edit
                        </button>

                        <button
                          className="small-btn delete"
                          onClick={() =>
                            deleteEmployee(
                              employee.id
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

      </div>
    </>
  );
}

export default Employees;