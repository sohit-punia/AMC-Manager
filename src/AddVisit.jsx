// import { useEffect, useState } from "react";

// const API = "http://localhost:5000/api";

// function AddVisit({ onSaved }) {
//   const [form, setForm] = useState({
//   projectNumber: "",
//   visitNumber: "",
//   visitDate: "",

//   employeeName: "",

//   totalAmount: "",

//   amountReceived: "",
//   amountReceivedDate: "",

//   tourAmountAllocated: "",
//   tourExpense: "",

//   remarks: "",
// });

//   const [companyName, setCompanyName] =
//     useState("");

//   const [projectId, setProjectId] =
//     useState(null);

//   const [invoicePdf, setInvoicePdf] =
//     useState(null);

//   const [receivedReportPdf, setReceivedReportPdf] =
//     useState(null);

//   const [expensePdf, setExpensePdf] =
//     useState(null);

//   const [employees, setEmployees] =
//     useState([]);

//   const [projectLoading, setProjectLoading] =
//     useState(false);

//   const [saving, setSaving] =
//     useState(false);

//   const [error, setError] =
//     useState("");

//   /* =========================
//      LOAD EMPLOYEES
//   ========================= */

//   useEffect(() => {
//     loadEmployees();
//   }, []);

//   async function loadEmployees() {
//     try {
//       const response = await fetch(  `${API}/employees`);

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.message ||
//             "Failed to load employees"
//         );
//       }

//       setEmployees(
//         Array.isArray(data)
//           ? data
//           : []
//       );
//     } catch (err) {
//       console.error(
//         "Employee loading error:",
//         err
//       );
//     }
//   }

//   /* =========================
//      CHANGE HANDLER
//   ========================= */

//   function handleChange(e) {
//     const {
//       name,
//       value,
//     } = e.target;

//     setForm((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   }

//   /* =========================
//      FIND PROJECT
//   ========================= */

//   async function findProject() {
//     const number = form.projectNumber.trim();

//     if (!number) {
//       setCompanyName("");
//       setProjectId(null);
//       return;
//     }

//     try {
//       setProjectLoading(true);
//       setError("");

//       const response =
//         await fetch( `${API}/projects?projectNumber=${encodeURIComponent(number)}`);

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.message ||
//             "Failed to find project"
//         );
//       }

//       const exactProject =
//         data.find(
//           (project) =>
//             String(
//               project.projectNumber
//             ).toLowerCase() ===
//             number.toLowerCase()
//         );

//       if (!exactProject) {
//         setCompanyName("");
//         setProjectId(null);
//         setForm((prev) => ({
//           ...prev,
//           visitNumber: "",
//         }));

//         setError(
//           "Project Number not found."
//         );

//         return;
//       }

//       setCompanyName(
//         exactProject.companyName
//       );

//       setProjectId(
//         exactProject.id
//       );

//       /* =========================
//          FIND NEXT VISIT NUMBER
//       ========================= */

//       const visitsResponse =
//         await fetch(
//           `${API}/visits?projectNumber=${encodeURIComponent(
//             exactProject.projectNumber
//           )}`
//         );

//       const visitsData =
//         await visitsResponse.json();

//       if (
//         visitsResponse.ok &&
//         Array.isArray(visitsData)
//       ) {
//         const highest =
//           visitsData.reduce(
//             (max, visit) =>
//               Math.max(
//                 max,
//                 Number(
//                   visit.visitNumber
//                 ) || 0
//               ),
//             0
//           );

//         setForm((prev) => ({
//           ...prev,
//           visitNumber:
//             highest + 1,
//         }));
//       }
//     } catch (err) {
//       console.error(err);

//       setCompanyName("");
//       setProjectId(null);

//       setError(err.message);
//     } finally {
//       setProjectLoading(false);
//     }
//   }

//   /* =========================
//      SUBMIT
//   ========================= */

//   async function handleSubmit(e) {
//     e.preventDefault();

//     setError("");

//     if (!form.projectNumber.trim()) {
//       setError(
//         "Project Number is required."
//       );
//       return;
//     }

//     if (!projectId) {
//       setError(
//         "Please enter a valid Project Number."
//       );
//       return;
//     }

//     if (!form.visitNumber) {
//       setError(
//         "Visit Number is required."
//       );
//       return;
//     }

//     if (!form.visitDate) {
//       setError(
//         "Visit Date is required."
//       );
//       return;
//     }

//     const totalAmount =
//       Number(
//         form.totalAmount
//       ) || 0;

//     const amountReceived =
//       Number(
//         form.amountReceived
//       ) || 0;

//     const tourAmountAllocated =
//       Number(
//         form.tourAmountAllocated
//       ) || 0;

//     const tourExpense =
//       Number(
//         form.tourExpense
//       ) || 0;

//     try {
//       setSaving(true);

//       const formData =
//         new FormData();

//       formData.append(
//         "projectNumber",
//         form.projectNumber.trim()
//       );

//       formData.append(
//         "visitNumber",
//         form.visitNumber
//       );

//       formData.append(
//         "visitDate",
//         form.visitDate
//       );

//       formData.append(
//         "employeeId",
//         form.employeeId
//       );

//       formData.append(
//         "totalAmount",
//         String(totalAmount)
//       );

//       formData.append(
//         "amountReceived",
//         String(amountReceived)
//       );

//       formData.append(
//         "amountReceivedDate",
//         form.amountReceivedDate
//       );

//       formData.append(
//         "tourAmountAllocated",
//         String(
//           tourAmountAllocated
//         )
//       );

//       formData.append(
//         "tourExpense",
//         String(tourExpense)
//       );

//       formData.append(
//         "remarks",
//         form.remarks
//       );

//       if (invoicePdf) {
//         formData.append(
//           "invoicePdf",
//           invoicePdf
//         );
//       }

//       if (receivedReportPdf) {
//         formData.append(
//           "receivedReportPdf",
//           receivedReportPdf
//         );
//       }

//       if (expensePdf) {
//         formData.append(
//           "expensePdf",
//           expensePdf
//         );
//       }

//       const response =
//         await fetch(
//           `${API}/visits`,
//           {
//             method: "POST",
//             body: formData,
//           }
//         );

//       const data =
//         await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.message ||
//             "Failed to save visit"
//         );
//       }

//       alert(
//         "AMC Visit saved successfully."
//       );

//       setForm({
//         projectNumber: "",
//         visitNumber: "",
//         visitDate: "",
//         employeeId: "",
//         totalAmount: "",
//         amountReceived: "",
//         amountReceivedDate: "",
//         tourAmountAllocated: "",
//         tourExpense: "",
//         remarks: "",
//       });

//       setCompanyName("");
//       setProjectId(null);

//       setInvoicePdf(null);
//       setReceivedReportPdf(null);
//       setExpensePdf(null);

//       const invoiceInput =
//         document.getElementById(
//           "invoicePdf"
//         );

//       const receivedInput =
//         document.getElementById(
//           "receivedReportPdf"
//         );

//       const expenseInput =
//         document.getElementById(
//           "expensePdf"
//         );

//       if (invoiceInput) {
//         invoiceInput.value = "";
//       }

//       if (receivedInput) {
//         receivedInput.value = "";
//       }

//       if (expenseInput) {
//         expenseInput.value = "";
//       }

//       if (onSaved) {
//         onSaved();
//       }
//     } catch (err) {
//       console.error(err);
//       setError(err.message);
//     } finally {
//       setSaving(false);
//     }
//   }

//   return (
//     <>
//       <div className="page-header">
//         <div>
//           <h1>
//             Add Visit Details
//           </h1>

//           <p>
//             Record an AMC visit, billing,
//             employee and tour information
//           </p>
//         </div>
//       </div>

//       {error && (
//         <div className="error-banner">
//           {error}
//         </div>
//       )}

//       <form
//         className="form-card visit-form"
//         onSubmit={handleSubmit}
//       >
//         {/* =========================
//             VISIT INFORMATION
//         ========================= */}

//         <div className="form-section">
//           <div className="form-section-title">
//             <h2>
//               Visit Information
//             </h2>

//             <p>
//               Select the project and enter visit details
//             </p>
//           </div>

//           <div className="form-grid">

//             <div className="field">
//               <label>
//                 Project Number *
//               </label>

//               <div className="input-with-button">
//                 <input
//                   name="projectNumber"
//                   value={
//                     form.projectNumber
//                   }
//                   onChange={
//                     handleChange
//                   }
//                   onBlur={
//                     findProject
//                   }
//                   placeholder="Enter project number"
//                   required
//                 />

//                 <button
//                   type="button"
//                   className="lookup-btn"
//                   onClick={
//                     findProject
//                   }
//                   disabled={
//                     projectLoading
//                   }
//                 >
//                   {projectLoading
//                     ? "..."
//                     : "Find"}
//                 </button>
//               </div>
//             </div>

//             <div className="field">
//               <label>
//                 Company Name
//               </label>

//               <input
//                 value={
//                   companyName
//                 }
//                 placeholder="Automatically filled"
//                 disabled
//               />
//             </div>

//             <div className="field">
//               <label>
//                 Visit Number *
//               </label>

//               <input
//                 type="number"
//                 min="1"
//                 name="visitNumber"
//                 value={
//                   form.visitNumber
//                 }
//                 onChange={
//                   handleChange
//                 }
//                 required
//               />
//             </div>

//             <div className="field">
//               <label>
//                 Visit Date *
//               </label>

//               <input
//                 type="date"
//                 name="visitDate"
//                 value={
//                   form.visitDate
//                 }
//                 onChange={
//                   handleChange
//                 }
//                 required
//               />
//             </div>

//           </div>
//         </div>

//         {/* =========================
//             BILLING
//         ========================= */}

//         <div className="form-section">
//           <div className="form-section-title">
//             <h2>
//               Billing Details
//             </h2>

//             <p>
//               Invoice and payment information
//             </p>
//           </div>

//           <div className="form-grid">

//             <div className="field">
//               <label>
//                 Invoice PDF
//               </label>

//               <input
//                 id="invoicePdf"
//                 type="file"
//                 accept=".pdf,application/pdf"
//                 onChange={(e) =>
//                   setInvoicePdf(
//                     e.target.files?.[0] ||
//                       null
//                   )
//                 }
//               />
//             </div>

//             <div className="field">
//               <label>
//                 Total Amount
//               </label>

//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 name="totalAmount"
//                 value={
//                   form.totalAmount
//                 }
//                 onChange={
//                   handleChange
//                 }
//                 placeholder="0"
//               />
//             </div>

//             <div className="field">
//               <label>
//                 Amount Received
//               </label>

//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 name="amountReceived"
//                 value={
//                   form.amountReceived
//                 }
//                 onChange={
//                   handleChange
//                 }
//                 placeholder="0"
//               />
//             </div>

//             <div className="field">
//               <label>
//                 Amount Received Date
//               </label>

//               <input
//                 type="date"
//                 name="amountReceivedDate"
//                 value={
//                   form.amountReceivedDate
//                 }
//                 onChange={
//                   handleChange
//                 }
//               />
//             </div>

//             <div className="field full">
//               <label>
//                 Received Report PDF
//               </label>

//               <input
//                 id="receivedReportPdf"
//                 type="file"
//                 accept=".pdf,application/pdf"
//                 onChange={(e) =>
//                   setReceivedReportPdf(
//                     e.target.files?.[0] ||
//                       null
//                   )
//                 }
//               />
//             </div>

//           </div>
//         </div>

//         {/* =========================
//             EMPLOYEE
//         ========================= */}

//         <div className="form-section">
//           <div className="form-section-title">
//             <h2>
//               Employee
//             </h2>

//             <p>
//               Employee who attended this AMC visit
//             </p>
//           </div>

//           <div className="form-grid">

//             <div className="field">
//                 <label>
//                     Employee Name
//                 </label>

//                 <input
//                     type="text"
//                     name="employeeName"
//                     value={
//                     form.employeeName || ""
//                     }
//                     onChange={
//                     handleChange
//                     }
//                     placeholder="Enter employee name"
//                 />
//             </div>
//           </div>
//         </div>

//         {/* =========================
//             TOUR
//         ========================= */}

//         <div className="form-section">
//           <div className="form-section-title">
//             <h2>
//               Tour Details
//             </h2>

//             <p>
//               Track tour allocation and expenses
//             </p>
//           </div>

//           <div className="form-grid">

//             <div className="field">
//               <label>
//                 Amount Allocated for Tour
//               </label>

//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 name="tourAmountAllocated"
//                 value={
//                   form.tourAmountAllocated
//                 }
//                 onChange={
//                   handleChange
//                 }
//                 placeholder="0"
//               />
//             </div>

//             <div className="field">
//               <label>
//                 Total Tour Expense
//               </label>

//               <input
//                 type="number"
//                 min="0"
//                 step="0.01"
//                 name="tourExpense"
//                 value={
//                   form.tourExpense
//                 }
//                 onChange={
//                   handleChange
//                 }
//                 placeholder="0"
//               />
//             </div>

//             <div className="field full">
//               <label>
//                 Expense PDF
//               </label>

//               <input
//                 id="expensePdf"
//                 type="file"
//                 accept=".pdf,application/pdf"
//                 onChange={(e) =>
//                   setExpensePdf(
//                     e.target.files?.[0] ||
//                       null
//                   )
//                 }
//               />
//             </div>

//           </div>
//         </div>

//         {/* =========================
//             REMARKS
//         ========================= */}

//         <div className="form-section">
//           <div className="form-section-title">
//             <h2>
//               Remarks
//             </h2>
//           </div>

//           <div className="field">
//             <textarea
//               name="remarks"
//               rows="4"
//               value={
//                 form.remarks
//               }
//               onChange={
//                 handleChange
//               }
//               placeholder="Enter any additional information..."
//             />
//           </div>
//         </div>

//         {/* =========================
//             ACTIONS
//         ========================= */}

//         <div className="form-actions">
//           <button
//             type="button"
//             className="secondary-btn"
//             onClick={() => {
//               setForm({
//                 projectNumber: "",
//                 visitNumber: "",
//                 visitDate: "",
//                 employeeId: "",
//                 totalAmount: "",
//                 amountReceived: "",
//                 amountReceivedDate: "",
//                 tourAmountAllocated: "",
//                 tourExpense: "",
//                 remarks: "",
//               });

//               setCompanyName("");
//               setProjectId(null);
//               setError("");
//             }}
//           >
//             Clear
//           </button>

//           <button
//             type="submit"
//             className="primary-btn"
//             disabled={saving}
//           >
//             {saving
//               ? "Saving..."
//               : "Save Visit"}
//           </button>
//         </div>
//       </form>
//     </>
//   );
// }

// export default AddVisit;


import { useState } from "react";

const API = "http://localhost:5000/api";

function AddVisit({ onSaved }) {
  /* =====================================================
     FORM
  ===================================================== */

  const [form, setForm] = useState({
    projectNumber: "",
    visitNumber: "",
    visitDate: "",

    employeeName: "",

    totalAmount: "",

    amountReceived: "",
    amountReceivedDate: "",

    tourAmountAllocated: "",
    tourExpense: "",

    remarks: "",
  });

  /* =====================================================
     PROJECT
  ===================================================== */

  const [companyName, setCompanyName] =
    useState("");

  const [projectId, setProjectId] =
    useState(null);

  /* =====================================================
     FILES
  ===================================================== */

  const [invoicePdf, setInvoicePdf] =
    useState(null);

  const [receivedReportPdf, setReceivedReportPdf] =
    useState(null);

  const [expensePdf, setExpensePdf] =
    useState(null);

  /* =====================================================
     UI STATE
  ===================================================== */

  const [projectLoading, setProjectLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /* =====================================================
     CHANGE HANDLER
  ===================================================== */

  function handleChange(e) {
    const {
      name,
      value,
    } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  /* =====================================================
     FIND PROJECT
  ===================================================== */

  async function findProject() {
    const number =
      form.projectNumber.trim();

    if (!number) {
      setCompanyName("");
      setProjectId(null);

      setForm((prev) => ({
        ...prev,
        visitNumber: "",
      }));

      return;
    }

    try {
      setProjectLoading(true);
      setError("");

      /* ================================================
         FIND PROJECT
      ================================================ */

      const response =
        await fetch(
          `${API}/projects?projectNumber=${encodeURIComponent(
            number
          )}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to find project"
        );
      }

      const exactProject =
        Array.isArray(data)
          ? data.find(
              (project) =>
                String(
                  project.projectNumber
                ).toLowerCase() ===
                number.toLowerCase()
            )
          : null;

      if (!exactProject) {
        setCompanyName("");
        setProjectId(null);

        setForm((prev) => ({
          ...prev,
          visitNumber: "",
        }));

        setError(
          "Project Number not found."
        );

        return;
      }

      /* ================================================
         PROJECT FOUND
      ================================================ */

      setCompanyName(
        exactProject.companyName || ""
      );

      setProjectId(
        exactProject.id
      );

      /* ================================================
         FIND NEXT VISIT NUMBER
      ================================================ */

      const visitsResponse =
        await fetch(
          `${API}/visits?projectNumber=${encodeURIComponent(
            exactProject.projectNumber
          )}`
        );

      const visitsData =
        await visitsResponse.json();

      if (
        visitsResponse.ok &&
        Array.isArray(visitsData)
      ) {
        const highest =
          visitsData.reduce(
            (max, visit) =>
              Math.max(
                max,
                Number(
                  visit.visitNumber
                ) || 0
              ),
            0
          );

        setForm((prev) => ({
          ...prev,
          visitNumber:
            highest + 1,
        }));
      } else {
        setForm((prev) => ({
          ...prev,
          visitNumber: 1,
        }));
      }
    } catch (err) {
      console.error(
        "Project search error:",
        err
      );

      setCompanyName("");
      setProjectId(null);

      setError(
        err.message ||
          "Failed to find project."
      );
    } finally {
      setProjectLoading(false);
    }
  }

  /* =====================================================
     RESET FORM
  ===================================================== */

  function resetForm() {
    setForm({
      projectNumber: "",
      visitNumber: "",
      visitDate: "",

      employeeName: "",

      totalAmount: "",

      amountReceived: "",
      amountReceivedDate: "",

      tourAmountAllocated: "",
      tourExpense: "",

      remarks: "",
    });

    setCompanyName("");
    setProjectId(null);

    setInvoicePdf(null);
    setReceivedReportPdf(null);
    setExpensePdf(null);

    setError("");

    const invoiceInput =
      document.getElementById(
        "invoicePdf"
      );

    const receivedInput =
      document.getElementById(
        "receivedReportPdf"
      );

    const expenseInput =
      document.getElementById(
        "expensePdf"
      );

    if (invoiceInput) {
      invoiceInput.value = "";
    }

    if (receivedInput) {
      receivedInput.value = "";
    }

    if (expenseInput) {
      expenseInput.value = "";
    }
  }

  /* =====================================================
     SUBMIT
  ===================================================== */

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");

    /* ================================================
       BASIC VALIDATION
    ================================================ */

    if (
      !form.projectNumber.trim()
    ) {
      setError(
        "Project Number is required."
      );

      return;
    }

    if (!projectId) {
      setError(
        "Please enter a valid Project Number."
      );

      return;
    }

    if (!form.visitNumber) {
      setError(
        "Visit Number is required."
      );

      return;
    }

    if (!form.visitDate) {
      setError(
        "Visit Date is required."
      );

      return;
    }

    /* ================================================
       NUMERIC VALUES
       
       IMPORTANT:
       No restriction that:
       amountReceived <= totalAmount
       tourExpense <= tourAmountAllocated
    ================================================ */

    const totalAmount =
      Number(
        form.totalAmount
      ) || 0;

    const amountReceived =
      Number(
        form.amountReceived
      ) || 0;

    const tourAmountAllocated =
      Number(
        form.tourAmountAllocated
      ) || 0;

    const tourExpense =
      Number(
        form.tourExpense
      ) || 0;

    try {
      setSaving(true);

      const formData =
        new FormData();

      /* ==============================================
         PROJECT
      ============================================== */

      formData.append(
        "projectNumber",
        form.projectNumber.trim()
      );

      /* ==============================================
         VISIT
      ============================================== */

      formData.append(
        "visitNumber",
        String(
          form.visitNumber
        )
      );

      formData.append(
        "visitDate",
        form.visitDate
      );

      /* ==============================================
         EMPLOYEE NAME

         THIS IS THE IMPORTANT FIX
      ============================================== */

      formData.append(
        "employeeName",
        form.employeeName.trim()
      );

      /* ==============================================
         BILLING
      ============================================== */

      formData.append(
        "totalAmount",
        String(totalAmount)
      );

      formData.append(
        "amountReceived",
        String(amountReceived)
      );

      formData.append(
        "amountReceivedDate",
        form.amountReceivedDate
      );

      /* ==============================================
         TOUR
      ============================================== */

      formData.append(
        "tourAmountAllocated",
        String(
          tourAmountAllocated
        )
      );

      formData.append(
        "tourExpense",
        String(tourExpense)
      );

      /* ==============================================
         REMARKS
      ============================================== */

      formData.append(
        "remarks",
        form.remarks
      );

      /* ==============================================
         INVOICE PDF
      ============================================== */

      if (invoicePdf) {
        formData.append(
          "invoicePdf",
          invoicePdf
        );
      }

      /* ==============================================
         RECEIVED REPORT PDF
      ============================================== */

      if (
        receivedReportPdf
      ) {
        formData.append(
          "receivedReportPdf",
          receivedReportPdf
        );
      }

      /* ==============================================
         EXPENSE PDF
      ============================================== */

      if (expensePdf) {
        formData.append(
          "expensePdf",
          expensePdf
        );
      }

      /* ==============================================
         SAVE
      ============================================== */

      const response =
        await fetch(
          `${API}/visits`,
          {
            method: "POST",
            body: formData,
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to save visit"
        );
      }

      /* ==============================================
         SUCCESS
      ============================================== */

      alert(
        "AMC Visit saved successfully."
      );

      resetForm();

      /* ==============================================
         REFRESH PARENT DATA
      ============================================== */

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error(
        "Save visit error:",
        err
      );

      setError(
        err.message ||
          "Failed to save visit."
      );
    } finally {
      setSaving(false);
    }
  }

  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <>
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="page-header">
        <div>
          <h1>
            Add Visit Details
          </h1>

          <p>
            Record an AMC visit, billing,
            employee and tour information
          </p>
        </div>
      </div>

      {/* =================================================
          ERROR
      ================================================= */}

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}

      {/* =================================================
          FORM
      ================================================= */}

      <form
        className="form-card visit-form"
        onSubmit={
          handleSubmit
        }
      >

        {/* =================================================
            VISIT INFORMATION
        ================================================= */}

        <div className="form-section">

          <div className="form-section-title">
            <h2>
              Visit Information
            </h2>

            <p>
              Select the project and enter visit details
            </p>
          </div>

          <div className="form-grid">

            {/* PROJECT NUMBER */}

            <div className="field">

              <label>
                Project Number *
              </label>

              <div className="input-with-button">

                <input
                  name="projectNumber"
                  value={
                    form.projectNumber
                  }
                  onChange={
                    handleChange
                  }
                  onBlur={
                    findProject
                  }
                  placeholder="Enter project number"
                  required
                />

                <button
                  type="button"
                  className="lookup-btn"
                  onClick={
                    findProject
                  }
                  disabled={
                    projectLoading
                  }
                >
                  {projectLoading
                    ? "..."
                    : "Find"}
                </button>

              </div>

            </div>

            {/* COMPANY NAME */}

            <div className="field">

              <label>
                Company Name
              </label>

              <input
                value={
                  companyName
                }
                placeholder="Automatically filled"
                disabled
              />

            </div>

            {/* VISIT NUMBER */}

            <div className="field">

              <label>
                Visit Number *
              </label>

              <input
                type="number"
                min="1"
                name="visitNumber"
                value={
                  form.visitNumber
                }
                onChange={
                  handleChange
                }
                required
              />

            </div>

            {/* VISIT DATE */}

            <div className="field">

              <label>
                Visit Date *
              </label>

              <input
                type="date"
                name="visitDate"
                value={
                  form.visitDate
                }
                onChange={
                  handleChange
                }
                required
              />

            </div>

          </div>

        </div>

        {/* =================================================
            BILLING
        ================================================= */}

        <div className="form-section">

          <div className="form-section-title">

            <h2>
              Billing Details
            </h2>

            <p>
              Invoice and payment information
            </p>

          </div>

          <div className="form-grid">

            {/* INVOICE */}

            <div className="field">

              <label>
                Invoice PDF
              </label>

              <input
                id="invoicePdf"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setInvoicePdf(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />

            </div>

            {/* TOTAL AMOUNT */}

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
                onChange={
                  handleChange
                }
                placeholder="0"
              />

            </div>

            {/* RECEIVED */}

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
                onChange={
                  handleChange
                }
                placeholder="0"
              />

            </div>

            {/* RECEIVED DATE */}

            <div className="field">

              <label>
                Amount Received Date
              </label>

              <input
                type="date"
                name="amountReceivedDate"
                value={
                  form.amountReceivedDate
                }
                onChange={
                  handleChange
                }
              />

            </div>

            {/* RECEIVED REPORT */}

            <div className="field full">

              <label>
                Received Report PDF
              </label>

              <input
                id="receivedReportPdf"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setReceivedReportPdf(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />

            </div>

          </div>

        </div>

        {/* =================================================
            EMPLOYEE
        ================================================= */}

        <div className="form-section">

          <div className="form-section-title">

            <h2>
              Employee
            </h2>

            <p>
              Employee who attended this AMC visit
            </p>

          </div>

          <div className="form-grid">

            <div className="field">

              <label>
                Employee Name
              </label>

              <input
                type="text"
                name="employeeName"
                value={
                  form.employeeName
                }
                onChange={
                  handleChange
                }
                placeholder="Enter employee name"
              />

            </div>

          </div>

        </div>

        {/* =================================================
            TOUR
        ================================================= */}

        <div className="form-section">

          <div className="form-section-title">

            <h2>
              Tour Details
            </h2>

            <p>
              Track tour allocation and expenses
            </p>

          </div>

          <div className="form-grid">

            {/* ALLOCATED */}

            <div className="field">

              <label>
                Amount Allocated for Tour
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                name="tourAmountAllocated"
                value={
                  form.tourAmountAllocated
                }
                onChange={
                  handleChange
                }
                placeholder="0"
              />

            </div>

            {/* EXPENSE */}

            <div className="field">

              <label>
                Total Tour Expense
              </label>

              <input
                type="number"
                min="0"
                step="0.01"
                name="tourExpense"
                value={
                  form.tourExpense
                }
                onChange={
                  handleChange
                }
                placeholder="0"
              />

            </div>

            {/* EXPENSE PDF */}

            <div className="field full">

              <label>
                Expense PDF
              </label>

              <input
                id="expensePdf"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) =>
                  setExpensePdf(
                    e.target.files?.[0] ||
                      null
                  )
                }
              />

            </div>

          </div>

        </div>

        {/* =================================================
            REMARKS
        ================================================= */}

        <div className="form-section">

          <div className="form-section-title">

            <h2>
              Remarks
            </h2>

          </div>

          <div className="field">

            <textarea
              name="remarks"
              rows="4"
              value={
                form.remarks
              }
              onChange={
                handleChange
              }
              placeholder="Enter any additional information..."
            />

          </div>

        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div className="form-actions">

          <button
            type="button"
            className="secondary-btn"
            onClick={
              resetForm
            }
            disabled={saving}
          >
            Clear
          </button>

          <button
            type="submit"
            className="primary-btn"
            disabled={
              saving
            }
          >
            {saving
              ? "Saving..."
              : "Save Visit"}
          </button>

        </div>

      </form>
    </>
  );
}

export default AddVisit;