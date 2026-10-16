
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://127.0.0.1:8000";

function getLocalDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value) {
  if (!value) return "—";

  const date = String(value).slice(0, 10);
  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function formatTime(value) {
  if (!value) return "Not recorded";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function Attendance() {
  const navigate = useNavigate();

  const token = localStorage.getItem("access_token");
  const username = localStorage.getItem("username") || "User";
  const role = (
    localStorage.getItem("user_role") || "EMPLOYEE"
  ).toUpperCase();

  const isHR = role === "HR" || role === "ADMIN";

  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const today = getLocalDate();

  const todayRecord = records.find(
    (record) =>
      String(record.attendance_date).slice(0, 10) === today
  );

  const checkedIn = Boolean(todayRecord);
  const checkedOut = Boolean(todayRecord?.check_out);

  const loadAttendance = useCallback(async () => {
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };

      if (isHR) {
        const params = selectedDate
          ? { attendance_date: selectedDate }
          : {};

        const [attendanceResponse, summaryResponse] =
          await Promise.all([
            axios.get(`${API_URL}/api/v1/attendance/`, {
              headers,
              params,
            }),
            axios.get(`${API_URL}/api/v1/attendance/summary`, {
              headers,
              params,
            }),
          ]);

        setRecords(attendanceResponse.data);
        setSummary(summaryResponse.data);
      } else {
        const response = await axios.get(
          `${API_URL}/api/v1/attendance/me`,
          { headers }
        );

        setRecords(response.data);
        setSummary(null);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("username");
        navigate("/", { replace: true });
        return;
      }

      setError(
        err.response?.data?.detail ||
          "Unable to load attendance records. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [token, isHR, selectedDate, navigate]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  async function handleAttendanceAction(action) {
    setWorking(true);
    setError("");
    setMessage("");

    try {
      const response = await axios.post(
        `${API_URL}/api/v1/attendance/${action}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage(
        action === "check-in"
          ? "Check-in recorded successfully!"
          : "Check-out recorded successfully!"
      );

      // Update the employee's records immediately.
      if (!isHR) {
        setRecords((previous) => {
          const updated = previous.filter(
            (record) => record.id !== response.data.id
          );

          return [response.data, ...updated];
        });
      }

      await loadAttendance();
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to record attendance. Please try again."
      );
    } finally {
      setWorking(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("username");
    navigate("/", { replace: true });
  }

  const styles = {
    page: {
      minHeight: "100vh",
      background: "#f5f7fb",
      color: "#172033",
    },
    header: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: "16px",
      padding: "18px 6%",
      background: "#fff",
      borderBottom: "1px solid #e5eaf2",
    },
    brand: {
      color: "#192b45",
      fontFamily: "Manrope, sans-serif",
      fontSize: "22px",
      fontWeight: 800,
    },
    headerActions: {
      display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "12px",
    },
    button: {
      padding: "10px 16px",
      border: "1px solid #d7dfeb",
      borderRadius: "8px",
      background: "#fff",
      color: "#263b63",
      cursor: "pointer",
      font: "inherit",
    },
    primaryButton: {
      padding: "12px 18px",
      border: "none",
      borderRadius: "8px",
      background: "#2457d6",
      color: "#fff",
      cursor: "pointer",
      font: "inherit",
      fontWeight: 700,
    },
    content: {
      maxWidth: "1150px",
      margin: "0 auto",
      padding: "38px 22px",
    },
    eyebrow: {
      color: "#7893b6",
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "2px",
    },
    title: {
      margin: "8px 0",
      fontFamily: "Manrope, sans-serif",
      fontSize: "clamp(28px, 4vw, 36px)",
    },
    subtitle: {
      color: "#64748b",
      lineHeight: 1.7,
    },
    panel: {
      marginTop: "24px",
      padding: "24px",
      border: "1px solid #e5eaf2",
      borderRadius: "14px",
      background: "#fff",
      boxShadow: "0 5px 18px rgba(20, 35, 65, 0.04)",
    },
    grid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
      gap: "16px",
      marginTop: "20px",
    },
    stat: {
      padding: "18px",
      border: "1px solid #e5eaf2",
      borderRadius: "10px",
      background: "#fff",
    },
    statLabel: {
      color: "#64748b",
      fontSize: "13px",
    },
    statValue: {
      display: "block",
      marginTop: "8px",
      fontSize: "25px",
      fontWeight: 800,
    },
    tableWrapper: {
      width: "100%",
      overflowX: "auto",
      marginTop: "18px",
    },
    table: {
      width: "100%",
      borderCollapse: "collapse",
      textAlign: "left",
      fontSize: "14px",
    },
    cell: {
      padding: "13px 12px",
      borderBottom: "1px solid #edf0f5",
      whiteSpace: "nowrap",
    },
    input: {
      minHeight: "42px",
      padding: "9px 12px",
      border: "1px solid #d0d5dd",
      borderRadius: "8px",
      background: "#fff",
      color: "#172033",
      font: "inherit",
    },
    notice: {
      marginTop: "18px",
      padding: "13px 15px",
      borderRadius: "8px",
      fontSize: "14px",
      lineHeight: 1.5,
    },
  };

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.brand}>WorkSphere</div>

        <div style={styles.headerActions}>
          <span style={{ color: "#64748b", fontSize: "13px" }}>
            {username} · {role}
          </span>

          <button
            style={styles.button}
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

          <button style={styles.button} onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <main style={styles.content}>
        <p style={styles.eyebrow}>TIME AND ATTENDANCE</p>

        <h1 style={styles.title}>Attendance Management</h1>

        <p style={styles.subtitle}>
          Record your working day and review attendance history.
        </p>

        {error && (
          <div
            role="alert"
            style={{
              ...styles.notice,
              background: "#fef3f2",
              color: "#b42318",
              border: "1px solid #fecdca",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              ...styles.notice,
              background: "#ecfdf3",
              color: "#067647",
              border: "1px solid #abefc6",
            }}
          >
            {message}
          </div>
        )}

        {!isHR && (
          <section style={styles.panel}>
            <h2 style={{ marginTop: 0 }}>Today's attendance</h2>

            <p style={styles.subtitle}>
              Date: {formatDate(today)}
            </p>

            <div style={styles.grid}>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Status</span>
                <strong style={styles.statValue}>
                  {todayRecord?.status || "NOT CHECKED IN"}
                </strong>
              </div>

              <div style={styles.stat}>
                <span style={styles.statLabel}>Check-in</span>
                <strong style={styles.statValue}>
                  {todayRecord?.check_in
                    ? formatTime(todayRecord.check_in)
                    : "—"}
                </strong>
              </div>

              <div style={styles.stat}>
                <span style={styles.statLabel}>Check-out</span>
                <strong style={styles.statValue}>
                  {todayRecord?.check_out
                    ? formatTime(todayRecord.check_out)
                    : "—"}
                </strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                marginTop: "22px",
              }}
            >
              <button
                style={{
                  ...styles.primaryButton,
                  opacity: working || checkedIn ? 0.6 : 1,
                  cursor:
                    working || checkedIn ? "not-allowed" : "pointer",
                }}
                disabled={working || checkedIn}
                onClick={() => handleAttendanceAction("check-in")}
              >
                {working ? "Processing..." : "Check In"}
              </button>

              <button
                style={{
                  ...styles.button,
                  opacity: working || !checkedIn || checkedOut ? 0.6 : 1,
                  cursor:
                    working || !checkedIn || checkedOut
                      ? "not-allowed"
                      : "pointer",
                }}
                disabled={working || !checkedIn || checkedOut}
                onClick={() => handleAttendanceAction("check-out")}
              >
                Check Out
              </button>

              <button
                style={styles.button}
                onClick={loadAttendance}
                disabled={loading || working}
              >
                ↻ Refresh
              </button>
            </div>

            {checkedOut && (
              <p style={{ ...styles.subtitle, marginBottom: 0 }}>
                Your attendance for today is complete.
              </p>
            )}
          </section>
        )}

        {isHR && (
          <>
            <section style={styles.panel}>
              <h2 style={{ marginTop: 0 }}>Daily attendance summary</h2>

              <label
                htmlFor="attendanceDate"
                style={{
                  display: "block",
                  margin: "16px 0 8px",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                Select attendance date
              </label>

              <input
                id="attendanceDate"
                type="date"
                value={selectedDate}
                max={today}
                onChange={(event) => setSelectedDate(event.target.value)}
                style={styles.input}
              />

              <div style={styles.grid}>
                <div style={styles.stat}>
                  <span style={styles.statLabel}>Total records</span>
                  <strong style={styles.statValue}>
                    {summary?.total_days ?? "—"}
                  </strong>
                </div>

                <div style={styles.stat}>
                  <span style={styles.statLabel}>Present</span>
                  <strong style={styles.statValue}>
                    {summary?.present_days ?? "—"}
                  </strong>
                </div>

                <div style={styles.stat}>
                  <span style={styles.statLabel}>Checked out</span>
                  <strong style={styles.statValue}>
                    {summary?.checked_out_days ?? "—"}
                  </strong>
                </div>
              </div>
            </section>

            <section style={styles.panel}>
              <h2 style={{ marginTop: 0 }}>Attendance directory</h2>
              <p style={styles.subtitle}>
                {records.length} attendance record(s) for{" "}
                {formatDate(selectedDate)}.
              </p>

              <button
                style={styles.button}
                onClick={loadAttendance}
                disabled={loading}
              >
                ↻ Refresh
              </button>
            </section>
          </>
        )}

        <section style={styles.panel}>
          <h2 style={{ marginTop: 0 }}>
            {isHR ? "Attendance records" : "My attendance history"}
          </h2>

          {loading ? (
            <p style={styles.subtitle}>Loading attendance records...</p>
          ) : records.length === 0 ? (
            <p style={styles.subtitle}>
              No attendance records found for the selected view.
            </p>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    {isHR && (
                      <>
                        <th style={styles.cell}>Username</th>
                        <th style={styles.cell}>Email</th>
                      </>
                    )}
                    <th style={styles.cell}>Date</th>
                    <th style={styles.cell}>Check-in</th>
                    <th style={styles.cell}>Check-out</th>
                    <th style={styles.cell}>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      {isHR && (
                        <>
                          <td style={styles.cell}>
                            {record.username || `User ${record.user_id}`}
                          </td>
                          <td style={styles.cell}>
                            {record.email || "—"}
                          </td>
                        </>
                      )}

                      <td style={styles.cell}>
                        {formatDate(record.attendance_date)}
                      </td>

                      <td style={styles.cell}>
                        {formatTime(record.check_in)}
                      </td>

                      <td style={styles.cell}>
                        {formatTime(record.check_out)}
                      </td>

                      <td style={styles.cell}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "5px 9px",
                            borderRadius: "20px",
                            background:
                              record.status === "PRESENT"
                                ? "#ecfdf3"
                                : "#f2f4f7",
                            color:
                              record.status === "PRESENT"
                                ? "#067647"
                                : "#344054",
                            fontSize: "12px",
                            fontWeight: 700,
                          }}
                        >
                          {record.status}
                        </span>
                      </td>
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
