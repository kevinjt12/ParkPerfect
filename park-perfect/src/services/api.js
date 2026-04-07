const BASE_URL = "http://localhost:8000/api/admin";

// Get all lots
export async function get_lots() {
  const res = await fetch(`${BASE_URL}/lots/`, {
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  if (!res.ok) throw new Error("Failed to fetch lots");
  return res.json();
}

// Get statistics for a date range
export async function get_statistics(start_date, end_date) {
  const res = await fetch(
    `${BASE_URL}/statistics/?start_date=${start_date}&end_date=${end_date}`,
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
  );
  if (!res.ok) throw new Error("Failed to fetch statistics");
  return res.json();
}

// Login
export async function login(admin_id, password) {
  const res = await fetch(`${BASE_URL}/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ admin_id, password }),
  });
  if (!res.ok) throw new Error("Login failed");
  return res.json(); // returns { token }
}

