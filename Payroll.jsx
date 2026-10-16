
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "inherit",
  },
  header: {
    background: "#ffffff",
    borderBottom: "1px solid #e5eaf2",
    padding: "18px 5%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  content: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "32px 24px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5eaf2",
    borderRadius: 14,
    padding: 22,
    marginBottom: 24,
    boxShadow: "0 3px 12px rgba(20, 35, 70, 0.03)",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "11px 12px",
    border: "1px solid #d6dce8",
    borderRadius: 8,
    fontSize: 14,
    marginTop: 6,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    color: "#46536a",
  },
  primaryButton: {
    background: "#4338ca",
    color: "#ffffff",
    border: 0,
    borderRadius: 8,
    padding: "11px 16px",
    cursor: "pointer",
    fontWeight: 600,
  },
  secondaryButton: {
    background: "#ffffff",
    color: "#344054",
    border: "1px solid #d6dce8",
    borderRadius: 8,
    padding: "9px 13px",
    cursor: "pointer",
    fontWeight: 600,
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: 13,
    minWidth: 850,
  },
  th: {
    background: "#f7f8fc",
    color: "#667085",
    fontWeight: 600,
    textAlign: "left",
    padding: "13px 12px",
    borderBottom: "1px solid #e5eaf2",
    whiteSpace: "nowrap",
  },
  td: {
    padding: "14px 12px",
    borderBottom: "1px solid #edf0f5",
    whiteSpace: "nowrap",
  },
};

function formatCurrency(value) {
  const amount = Number(value ?? 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleDateString("en-IN");
}

function StatusBadge({ status }) {
  const paid = String(status || "").toUpperCase() === "PAID";

  return (
    <span
      style={{
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 700,
        background: paid ? "#dcfce7" : "#fff3d6",
        color: paid ? "#166534" : "#92400e",
      }}
    >
      {status || "PENDING"}
    </span>
  );
}

export default function Payroll() {
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const username = localStorage.getItem("username") || "User";
  const role = (
    localStorage.getItem("user_role") || "EMPLOYEE"
  ).toUpperCase();

  const isHR = role === "HR" || role === "ADMIN";

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    user_id: "",
    salary_month: new Date().toISOString().slice(0, 7),
    basic_salary: "",
    allowances: "0",
    deductions: "0",
  });

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("username");
    navigate("/", { replace: true });
  }, [navigate]);

  const loadPayroll = useCallback(async () => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const endpoint = isHR
        ? `${API_URL}/api/v1/payroll/`
        : `${API_URL}/api/v1/payroll/me`;

      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRecords(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Could not load payroll records. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [token, isHR, navigate, handleUnauthorized]);

  useEffect(() => {
    loadPayroll();
  }, [loadPayroll]);

  function handleFormChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleCreatePayroll(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const userId = Number(form.user_id);
    const basicSalary = Number(form.basic_salary);
    const allowances = Number(form.allowances);
    const deductions = Number(form.deductions);

    if (!Number.isInteger(userId) || userId < 1) {
      setError("Enter a valid employee user ID.");
      return;
    }

    if (
      !form.salary_month ||
      !Number.isFinite(basicSalary) ||
      !Number.isFinite(allowances) ||
      !Number.isFinite(deductions) ||
      basicSalary < 0 ||
      allowances < 0 ||
      deductions < 0
    ) {
      setError("Enter a valid salary month and non-negative salary amounts.");
      return;
    }

    if (basicSalary + allowances < deductions) {
      setError("Deductions cannot exceed basic salary plus allowances.");
      return;
    }

    setSaving(true);

    try {
      await axios.post(
        `${API_URL}/api/v1/payroll/`,
        {
          user_id: userId,
          salary_month: form.salary_month,
          basic_salary: basicSalary,
          allowances,
          deductions,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage("Payroll record created successfully.");
      setForm((previous) => ({
        ...previous,
        user_id: "",
        basic_salary: "",
        allowances: "0",
        deductions: "0",
      }));

      await loadPayroll();
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Could not create the payroll record."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(record) {
    if (String(record.payment_status).toUpperCase() === "PAID") {
      return;
    }

    const confirmed = window.confirm(
      `Mark the salary for ${record.username || `employee #${record.user_id}`} (${record.salary_month}) as PAID?`
    );

    if (!confirmed) return;

    setProcessingId(record.id);
    setError("");
    setMessage("");

    try {
      await axios.patch(
        `${API_URL}/api/v1/payroll/${record.id}/payment`,
        { payment_status: "PAID" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage(`Payroll record #${record.id} marked as paid.`);
      await loadPayroll();
    } catch (err) {
      if (err.response?.status === 401) {
        handleUnauthorized();
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Could not update the payroll payment status."
      );
    } finally {
      setProcessingId(null);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("username");
    navigate("/", { replace: true });
  }

  const totalNetSalary = records.reduce(
    (total, record) => total + Number(record.net_salary || 0),
    0
  );

  const paidCount = records.filter(
    (record) =>
      String(record.payment_status).toUpperCase() === "PAID"
  ).length;

  const pendingCount = records.length - paidCount;

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>
            WorkSphere
          </div>
          <div style={{ color: "#667085", fontSize: 12 }}>
            Payroll Management
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span style={{ fontSize: 13, color: "#475467" }}>
            {username} · {role}
          </span>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
          <button
            type="button"
            style={styles.secondaryButton}
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </header>

      <main style={styles.content}>
        <p
          style={{
            color: "#4338ca",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: 1.2,
            marginBottom: 8,
          }}
        >
          SALARY AND COMPENSATION
        </p>

        <h1 style={{ margin: "0 0 8px", fontSize: 30 }}>
          Payroll Management
        </h1>

        <p style={{ color: "#667085", marginTop: 0, marginBottom: 26 }}>
          {isHR
            ? "Create employee payroll records and manage salary payments."
            : "View your salary details and payroll payment history."}
        </p>

        {error && (
          <div
            role="alert"
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              padding: 13,
              borderRadius: 9,
              marginBottom: 18,
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              background: "#ecfdf3",
              border: "1px solid #abefc6",
              color: "#067647",
              padding: 13,
              borderRadius: 9,
              marginBottom: 18,
            }}
          >
            {message}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={styles.card}>
            <div style={{ color: "#667085", fontSize: 13 }}>
              Payroll records
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>
              {records.length}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ color: "#667085", fontSize: 13 }}>
              Paid records
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                marginTop: 8,
                color: "#15803d",
              }}
            >
              {paidCount}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ color: "#667085", fontSize: 13 }}>
              Pending records
            </div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                marginTop: 8,
                color: "#b45309",
              }}
            >
              {pendingCount}
            </div>
          </div>

          <div style={styles.card}>
            <div style={{ color: "#667085", fontSize: 13 }}>
              Total net salary
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 8 }}>
              {formatCurrency(totalNetSalary)}
            </div>
            <div style={{ color: "#667085", fontSize: 11, marginTop: 4 }}>
              Across displayed records
            </div>
          </div>
        </section>

        {isHR && (
          <section style={styles.card}>
            <h2 style={{ fontSize: 19, marginTop: 0 }}>
              Create payroll record
            </h2>
            <p style={{ color: "#667085", fontSize: 13 }}>
              Enter the employee's user ID and salary details. New records
              start with PENDING payment status.
            </p>

            <form onSubmit={handleCreatePayroll}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                  gap: 16,
                }}
              >
                <label style={styles.label}>
                  Employee user ID
                  <input
                    style={styles.input}
                    type="number"
                    name="user_id"
                    min="1"
                    step="1"
                    value={form.user_id}
                    onChange={handleFormChange}
                    placeholder="e.g. 1"
                    required
                  />
                </label>

                <label style={styles.label}>
                  Salary month
                  <input
                    style={styles.input}
                    type="month"
                    name="salary_month"
                    value={form.salary_month}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label style={styles.label}>
                  Basic salary (₹)
                  <input
                    style={styles.input}
                    type="number"
                    name="basic_salary"
                    min="0"
                    step="0.01"
                    value={form.basic_salary}
                    onChange={handleFormChange}
                    placeholder="30000"
                    required
                  />
                </label>

                <label style={styles.label}>
                  Allowances (₹)
                  <input
                    style={styles.input}
                    type="number"
                    name="allowances"
                    min="0"
                    step="0.01"
                    value={form.allowances}
                    onChange={handleFormChange}
                    required
                  />
                </label>

                <label style={styles.label}>
                  Deductions (₹)
                  <input
                    style={styles.input}
                    type="number"
                    name="deductions"
                    min="0"
                    step="0.01"
                    value={form.deductions}
                    onChange={handleFormChange}
                    required
                  />
                </label>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="submit"
                  style={styles.primaryButton}
                  disabled={saving}
                >
                  {saving ? "Creating..." : "+ Create payroll"}
                </button>

                <span style={{ color: "#667085", fontSize: 12 }}>
                  Net salary is calculated by the backend.
                </span>
              </div>
            </form>
          </section>
        )}

        <section style={styles.card}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 18,
            }}
          >
            <div>
              <h2 style={{ fontSize: 19, margin: "0 0 5px" }}>
                {isHR ? "All payroll records" : "My salary history"}
              </h2>
              <p style={{ color: "#667085", fontSize: 13, margin: 0 }}>
                Salary breakdown and payment status.
              </p>
            </div>

            <button
              type="button"
              style={styles.secondaryButton}
              onClick={loadPayroll}
              disabled={loading}
            >
              {loading ? "Loading..." : "↻ Refresh"}
            </button>
          </div>

          {loading ? (
            <p>Loading payroll records...</p>
          ) : records.length === 0 ? (
            <div
              style={{
                padding: "32px 12px",
                textAlign: "center",
                color: "#667085",
              }}
            >
              No payroll records found.
            </div>
          ) : (
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Month</th>
                    {isHR && <th style={styles.th}>Employee</th>}
                    {isHR && <th style={styles.th}>Email</th>}
                    <th style={styles.th}>Basic salary</th>
                    <th style={styles.th}>Allowances</th>
                    <th style={styles.th}>Deductions</th>
                    <th style={styles.th}>Net salary</th>
                    <th style={styles.th}>Payment status</th>
                    <th style={styles.th}>Paid at</th>
                    {isHR && <th style={styles.th}>Action</th>}
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td style={styles.td}>
                        <strong>{record.salary_month}</strong>
                      </td>

                      {isHR && (
                        <td style={styles.td}>
                          {record.username || `User #${record.user_id}`}
                        </td>
                      )}

                      {isHR && (
                        <td style={styles.td}>
                          {record.email || "—"}
                        </td>
                      )}

                      <td style={styles.td}>
                        {formatCurrency(record.basic_salary)}
                      </td>
                      <td style={styles.td}>
                        {formatCurrency(record.allowances)}
                      </td>
                      <td style={styles.td}>
                        {formatCurrency(record.deductions)}
                      </td>
                      <td style={styles.td}>
                        <strong>{formatCurrency(record.net_salary)}</strong>
                      </td>
                      <td style={styles.td}>
                        <StatusBadge status={record.payment_status} />
                      </td>
                      <td style={styles.td}>
                        {formatDate(record.paid_at)}
                      </td>

                      {isHR && (
                        <td style={styles.td}>
                          {String(record.payment_status).toUpperCase() ===
                          "PAID" ? (
                            <span style={{ color: "#15803d", fontWeight: 600 }}>
                              Completed
                            </span>
                          ) : (
                            <button
                              type="button"
                              style={styles.primaryButton}
                              onClick={() => handleMarkPaid(record)}
                              disabled={processingId === record.id}
                            >
                              {processingId === record.id
                                ? "Updating..."
                                : "Mark as paid"}
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
