import { useEffect, useState } from "react";

const API = "http://localhost:5000/api";

const SERVER = "http://localhost:5000";

function formatMoney(value) {
  return new Intl.NumberFormat(
    "en-IN",
    {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }
  ).format(Number(value) || 0);
}

function VisitDetails({
  onBack,
}) {
  const [visits, setVisits] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [editingVisit, setEditingVisit] =
    useState(null);

  /* =========================
     LOAD VISITS
  ========================= */

  async function loadVisits(
    projectNumber = ""
  ) {
    try {
      setLoading(true);
      setError("");

      const url =
        projectNumber.trim()
          ? `${API}/visits?projectNumber=${encodeURIComponent(
              projectNumber.trim()
            )}`
          : `${API}/visits`;

      const response =
        await fetch(url);

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to load visits"
        );
      }

      setVisits(
        Array.isArray(data)
          ? data
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
    loadVisits();
  }, []);

  /* =========================
     SEARCH
  ========================= */

  async function handleSearch(
    e
  ) {
    e.preventDefault();

    await loadVisits(search);
  }

  /* =========================
     DELETE
  ========================= */

  async function deleteVisit(
    id
  ) {
    if (
      !window.confirm(
        "Delete this visit and its documents?"
      )
    ) {
      return;
    }

    try {
      const response =
        await fetch(
          `${API}/visits/${id}`,
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

      await loadVisits(search);
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <div className="page-header">

        <div>
          <h1>
            Visit Details
          </h1>

          <p>
            Search and manage all AMC visits
          </p>
        </div>

        <button
          className="secondary-btn"
          onClick={onBack}
        >
          ← Back
        </button>

      </div>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* =========================
          SEARCH
      ========================= */}

      <form
        className="visit-search"
        onSubmit={handleSearch}
      >

        <input
          type="text"
          placeholder="Search by project number..."
          value={search}
          onChange={(e) =>
            setSearch(
              e.target.value
            )
          }
        />

        <button
          className="primary-btn"
          type="submit"
        >
          Search
        </button>

        <button
          type="button"
          className="secondary-btn"
          onClick={() => {
            setSearch("");
            loadVisits("");
          }}
        >
          Show All
        </button>

      </form>

      {/* =========================
          TABLE
      ========================= */}

      <div className="table-card visit-table-card">

        <table className="visit-table">

          <thead>
            <tr>

              <th>
                Project No.
              </th>

              <th>
                Company
              </th>

              <th>
                Visit No.
              </th>

              <th>
                Visit Date
              </th>

              <th>
                Total Amount
              </th>

              <th>
                Received
              </th>

              <th>
                Employee
              </th>

              <th>
                Tour Expense
              </th>

              <th>
                Documents
              </th>

              <th>
                Actions
              </th>

            </tr>
          </thead>

          <tbody>

            {loading ? (
              <tr>
                <td
                  colSpan="10"
                  className="empty-cell"
                >
                  Loading visits...
                </td>
              </tr>
            ) : visits.length ===
              0 ? (
              <tr>
                <td
                  colSpan="10"
                  className="empty-cell"
                >
                  No visits found.
                </td>
              </tr>
            ) : (
              visits.map(
                (visit) => (
                  <tr
                    key={
                      visit.id
                    }
                  >

                    <td>
                      {
                        visit.projectNumber
                      }
                    </td>

                    <td>
                      {
                        visit.companyName
                      }
                    </td>

                    <td>
                      <strong>
                        {
                          visit.visitNumber
                        }
                      </strong>
                    </td>

                    <td>
                      {
                        visit.visitDate ||
                        "-"
                      }
                    </td>

                    <td>
                      {formatMoney(
                        visit.totalAmount
                      )}
                    </td>

                    <td>
                      {formatMoney(
                        visit.amountReceived
                      )}
                    </td>

                    <td>
                      {
                        visit.employeeName ||
                        "-"
                      }
                    </td>

                    <td>
                      {formatMoney(
                        visit.tourExpense
                      )}
                    </td>

                    <td>
                      <div className="document-links">

                        {visit.invoicePdf && (
                          <a
                            href={`${SERVER}${visit.invoicePdf}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Invoice
                          </a>
                        )}

                        {visit.receivedReportPdf && (
                          <a
                            href={`${SERVER}${visit.receivedReportPdf}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Received
                          </a>
                        )}

                        {visit.expensePdf && (
                          <a
                            href={`${SERVER}${visit.expensePdf}`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Expense
                          </a>
                        )}

                        {!visit.invoicePdf &&
                          !visit.receivedReportPdf &&
                          !visit.expensePdf && (
                            <span>
                              -
                            </span>
                          )}

                      </div>
                    </td>

                    <td>
                      <div className="actions">

                        <button
                          className="small-btn view"
                          onClick={() =>
                            setEditingVisit(
                              visit
                            )
                          }
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
                    </td>

                  </tr>
                )
              )
            )}

          </tbody>

        </table>

      </div>

      {/* =========================
          EDIT MODAL
      ========================= */}

      {editingVisit && (
        <EditVisitModal
          visit={
            editingVisit
          }
          onClose={() =>
            setEditingVisit(
              null
            )
          }
          onSaved={() => {
            setEditingVisit(
              null
            );

            loadVisits(
              search
            );
          }}
        />
      )}

    </>
  );
}

/* =========================================================
   EDIT VISIT MODAL
========================================================= */

function EditVisitModal({
  visit,
  onClose,
  onSaved,
}) {
  const [form, setForm] =
    useState({
      projectNumber:
        visit.projectNumber ||
        "",
      visitNumber:
        visit.visitNumber ||
        "",
      visitDate:
        visit.visitDate ||
        "",
      employeeName:
        visit.employeeName || "",
      totalAmount:
        visit.totalAmount ||
        "",
      amountReceived:
        visit.amountReceived ||
        "",
      amountReceivedDate:
        visit.amountReceivedDate ||
        "",
      tourAmountAllocated:
        visit.tourAmountAllocated ||
        "",
      tourExpense:
        visit.tourExpense ||
        "",
      remarks:
        visit.remarks ||
        "",
    });

  const [employees, setEmployees] =
    useState([]);

  const [invoicePdf, setInvoicePdf] =
    useState(null);

  const [
    receivedReportPdf,
    setReceivedReportPdf,
  ] = useState(null);

  const [expensePdf, setExpensePdf] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    loadEmployees();
  }, []);

  async function loadEmployees() {
    try {
      const response =
        await fetch(
          `${API}/employees`
        );

      const data =
        await response.json();

      if (response.ok) {
        setEmployees(
          Array.isArray(data)
            ? data
            : []
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  function change(e) {
    setForm({
      ...form,
      [e.target.name]:
        e.target.value,
    });
  }

  async function save() {
    const totalAmount =
      Number(
        form.totalAmount
      ) || 0;

    const amountReceived =
      Number(
        form.amountReceived
      ) || 0;

    const tourAllocated =
      Number(
        form.tourAmountAllocated
      ) || 0;

    const tourExpense =
      Number(
        form.tourExpense
      ) || 0;

    if (
      amountReceived >
      totalAmount
    ) {
      alert(
        "Amount Received cannot be greater than Total Amount."
      );
      return;
    }

    if (
      tourExpense >
      tourAllocated
    ) {
      alert(
        "Tour Expense cannot be greater than Tour Amount Allocated."
      );
      return;
    }

    try {
      setSaving(true);

      const data =
        new FormData();

      data.append(
        "projectNumber",
        form.projectNumber
      );

      data.append(
        "visitNumber",
        form.visitNumber
      );

      data.append(
        "visitDate",
        form.visitDate
      );

      data.append(
        "employeeName",
        form.employeeName
      );

      data.append(
        "totalAmount",
        String(totalAmount)
      );

      data.append(
        "amountReceived",
        String(amountReceived)
      );

      data.append(
        "amountReceivedDate",
        form.amountReceivedDate
      );

      data.append(
        "tourAmountAllocated",
        String(
          tourAllocated
        )
      );

      data.append(
        "tourExpense",
        String(
          tourExpense
        )
      );

      data.append(
        "remarks",
        form.remarks
      );

      if (invoicePdf) {
        data.append(
          "invoicePdf",
          invoicePdf
        );
      }

      if (
        receivedReportPdf
      ) {
        data.append(
          "receivedReportPdf",
          receivedReportPdf
        );
      }

      if (expensePdf) {
        data.append(
          "expensePdf",
          expensePdf
        );
      }

      const response =
        await fetch(
          `${API}/visits/${visit.id}`,
          {
            method: "PUT",
            body: data,
          }
        );

      const result =
        await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to update visit"
        );
      }

      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">

      <div className="modal edit-visit-modal">

        <div className="modal-header">

          <div>
            <h2>
              Edit Visit{" "}
              {visit.visitNumber}
            </h2>

            <p>
              {
                visit.companyName
              }
            </p>
          </div>

          <button
            className="close-btn"
            onClick={
              onClose
            }
          >
            ×
          </button>

        </div>

        <div className="form-grid">

          <div className="field">
            <label>
              Project Number
            </label>

            <input
              name="projectNumber"
              value={
                form.projectNumber
              }
              onChange={change}
            />
          </div>

          <div className="field">
            <label>
              Visit Number
            </label>

            <input
              type="number"
              min="1"
              name="visitNumber"
              value={
                form.visitNumber
              }
              onChange={change}
            />
          </div>

          <div className="field">
            <label>
              Visit Date
            </label>

            <input
              type="date"
              name="visitDate"
              value={
                form.visitDate
              }
              onChange={change}
            />
          </div>

          <div className="field">
            <label>
              Employee Name
            </label>

            <input
              type="text"
              name="employeeName"
              value={
                form.employeeName || ""
              }
              onChange={change}
              placeholder="Enter employee name"
            />
          </div>

          <div className="field">
            <label>
              Total Amount
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="totalAmount"
              value={
                form.totalAmount
              }
              onChange={change}
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
                form.amountReceived
              }
              onChange={change}
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
                form.amountReceivedDate
              }
              onChange={change}
            />
          </div>

          <div className="field">
            <label>
              Tour Amount Allocated
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="tourAmountAllocated"
              value={
                form.tourAmountAllocated
              }
              onChange={change}
            />
          </div>

          <div className="field">
            <label>
              Tour Expense
            </label>

            <input
              type="number"
              min="0"
              step="0.01"
              name="tourExpense"
              value={
                form.tourExpense
              }
              onChange={change}
            />
          </div>

          <div className="field">
            <label>
              Invoice PDF
            </label>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) =>
                setInvoicePdf(
                  e.target.files?.[0] ||
                    null
                )
              }
            />

            {visit.invoicePdf && (
              <a
                className="existing-file"
                href={`${SERVER}${visit.invoicePdf}`}
                target="_blank"
                rel="noreferrer"
              >
                Open existing invoice
              </a>
            )}
          </div>

          <div className="field">
            <label>
              Received Report PDF
            </label>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) =>
                setReceivedReportPdf(
                  e.target.files?.[0] ||
                    null
                )
              }
            />

            {visit.receivedReportPdf && (
              <a
                className="existing-file"
                href={`${SERVER}${visit.receivedReportPdf}`}
                target="_blank"
                rel="noreferrer"
              >
                Open existing report
              </a>
            )}
          </div>

          <div className="field">
            <label>
              Expense PDF
            </label>

            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) =>
                setExpensePdf(
                  e.target.files?.[0] ||
                    null
                )
              }
            />

            {visit.expensePdf && (
              <a
                className="existing-file"
                href={`${SERVER}${visit.expensePdf}`}
                target="_blank"
                rel="noreferrer"
              >
                Open existing expense
              </a>
            )}
          </div>

          <div className="field full">
            <label>
              Remarks
            </label>

            <textarea
              name="remarks"
              rows="4"
              value={
                form.remarks
              }
              onChange={change}
            />
          </div>

        </div>

        <div className="modal-actions">

          <button
            className="secondary-btn"
            onClick={
              onClose
            }
          >
            Cancel
          </button>

          <button
            className="primary-btn"
            onClick={save}
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : "Update Visit"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default VisitDetails;