const BASE_URL = "http://localhost:8000/api/admin";

// Get all lots
export async function getLots() {
  const res = await fetch(`${BASE_URL}/lots/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch lots");
  return res.json();
}

// Get statistics for a date range
export async function getStatistics(startDate, endDate) {
  const res = await fetch(
    `${BASE_URL}/statistics/?start_date=${startDate}&end_date=${endDate}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch statistics");
  return res.json();
}

// Login
export async function login(adminId, password) {
  const res = await fetch(`${BASE_URL}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ adminId, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json(); // returns { token }
}