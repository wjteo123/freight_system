const API_BASE = "/api";

function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.append(key, value);
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

async function request(path, options = {}) {
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  const publicAuthPaths = ["/auth/login", "/auth/register", "/auth/forgot-password"];
  const shouldAttachAuth = !publicAuthPaths.includes(path);
  const token = localStorage.getItem("freight_token");
  if (shouldAttachAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event("freight:unauthorized"));
    }
    let message = `Request failed with status ${response.status}`;
    let errorData;
    try {
      errorData = await response.clone().json();
      if (errorData?.detail) {
        if (typeof errorData.detail === "string") {
          message = errorData.detail;
        } else if (errorData.detail?.message) {
          message = errorData.detail.message;
        }
      } else if (typeof errorData === "string") {
        message = errorData;
      }
    } catch (_) {
      const text = await response.text();
      if (text) message = text;
    }
    const error = new Error(message);
    if (errorData) {
      error.payload = errorData;
    }
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  try {
    return await response.json();
  } catch (_) {
    return null;
  }
}

export const authApi = {
  login: (payload) => request("/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  register: (payload) => request("/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  forgotPassword: (payload) => request("/auth/forgot-password", { method: "POST", body: JSON.stringify(payload) })
};

export const dataApi = {
  getShipments: (params) => request(`/shipments/${buildQuery(params)}`),
  createShipment: (payload) => request("/shipments/", { method: "POST", body: JSON.stringify(payload) }),
  updateShipment: (id, payload) => request(`/shipments/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteShipment: (id) => request(`/shipments/${id}`, { method: "DELETE" }),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append("file", file);
    return request("/uploads/", { method: "POST", body: formData });
  }
};
