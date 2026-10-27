const API = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

function getStoredToken() {
  if (typeof window !== "undefined") {
    return localStorage.getItem("aicte_token") || "";
  }
  return "";
}

export function setStoredAuth(token, user) {
  if (typeof window !== "undefined") {
    if (token) localStorage.setItem("aicte_token", token);
    else localStorage.removeItem("aicte_token");
    if (user) localStorage.setItem("aicte_user", JSON.stringify(user));
    else localStorage.removeItem("aicte_user");
  }
}

export function getStoredUser() {
  if (typeof window !== "undefined") {
    const u = localStorage.getItem("aicte_user");
    if (u) {
      try { return JSON.parse(u); } catch { return null; }
    }
  }
  return null;
}

export function clearStoredAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("aicte_token");
    localStorage.removeItem("aicte_user");
  }
}

async function request(path, options = {}) {
  const token = getStoredToken();
  const headers = {
    ...(options.headers || {})
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token && !headers["Authorization"]) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      message = data.detail || message;
    } catch {}
    throw new Error(message);
  }

  // Handle blob/download if needed
  const contentType = response.headers.get("content-type");
  if (contentType && (contentType.includes("application/pdf") || contentType.includes("image/"))) {
    return response.blob();
  }

  return response.json();
}

export const api = {
  // System & Health
  health: () => request("/api/health"),
  stats: () => request("/api/dashboard/stats"),

  // Authentication
  login: (email, password) =>
    request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    }),
  register: (userData) =>
    request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    }),
  me: () => request("/api/auth/me"),
  setupAdmin: (data) =>
    request("/api/auth/setup-admin", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  // Applications
  applications: (params = {}) => {
    const q = new URLSearchParams();
    if (params.search) q.append("search", params.search);
    if (params.status && params.status !== "All statuses") q.append("status", params.status);
    if (params.type && params.type !== "All types") q.append("type", params.type);
    if (params.page) q.append("page", params.page);
    if (params.limit) q.append("limit", params.limit);
    return request(`/api/applications?${q.toString()}`);
  },
  getApplication: (id) => request(`/api/applications/${encodeURIComponent(id)}`),
  create: (data) =>
    request("/api/applications", {
      method: "POST",
      body: JSON.stringify(data)
    }),
  update: (id, data) =>
    request(`/api/applications/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),
  updateStatus: (id, target_status, comments = "") =>
    request(`/api/applications/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: JSON.stringify({ target_status, comments })
    }),
  addComment: (id, comments) =>
    request(`/api/applications/${encodeURIComponent(id)}/comments`, {
      method: "POST",
      body: JSON.stringify({ comments })
    }),
  assignReviewer: (id, reviewer_id, reviewer_name) =>
    request(`/api/applications/${encodeURIComponent(id)}/assign`, {
      method: "POST",
      body: JSON.stringify({ reviewer_id, reviewer_name })
    }),

  // Compliance
  compliance: (app_id) => request(`/api/applications/${encodeURIComponent(app_id)}/compliance`),

  // Documents
  documents: (app_id) => request(`/api/applications/${encodeURIComponent(app_id)}/documents`),
  uploadDocument: (app_id, formData) =>
    request(`/api/applications/${encodeURIComponent(app_id)}/documents`, {
      method: "POST",
      body: formData
    }),
  deleteDocument: (doc_id) =>
    request(`/api/documents/${encodeURIComponent(doc_id)}`, {
      method: "DELETE"
    }),
  getDocumentDownloadUrl: (doc_id) => `${API}/api/documents/${encodeURIComponent(doc_id)}/download`,

  // History & Notifications
  history: (app_id) => request(`/api/applications/${encodeURIComponent(app_id)}/history`),
  notifications: (params = {}) => {
    const q = new URLSearchParams();
    if (params.application_id) q.append("application_id", params.application_id);
    if (params.status) q.append("status", params.status);
    if (params.page) q.append("page", params.page);
    if (params.limit) q.append("limit", params.limit);
    return request(`/api/notifications?${q.toString()}`);
  },
  testEmail: (recipient_email) =>
    request("/api/email/test-send", {
      method: "POST",
      body: JSON.stringify({ recipient_email })
    }),
  testSms: (recipient_phone, message = "") =>
    request("/api/sms/test-send", {
      method: "POST",
      body: JSON.stringify({ recipient_phone, message })
    }),

  // Administration
  users: () => request("/api/users"),
  reviewers: () => request("/api/reviewers"),
  updateUserRole: (user_id, role) =>
    request(`/api/users/${encodeURIComponent(user_id)}/role`, {
      method: "PATCH",
      body: JSON.stringify({ role })
    })
};
