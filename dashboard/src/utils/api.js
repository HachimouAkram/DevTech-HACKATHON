/**
 * Centralized API Client for fetching data
 */

const getBaseUrl = () => {
  // Use VITE environment variable if available, otherwise fallback to standard host config
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  return `${API_BASE_URL}`;
};

export const API_BASE_URL = getBaseUrl();

const getHeaders = (isFormData = false) => {
  const headers = {};
  const token = localStorage.getItem('token');
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  return headers;
};

const handleResponse = async (response) => {
  if (response.status === 401) {
    // Unauthorized: Clear tokens and redirect to login if not already there
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
  }

  // Certain APIs return 204 No Content
  if (response.status === 204) {
      return null;
  }

  const contentType = response.headers.get("content-type");
  let data;
  if (contentType && contentType.indexOf("application/json") !== -1) {
      data = await response.json();
  } else {
      data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.message || data?.error || data || response.statusText;
    throw new Error(errorMsg);
  }

  return data;
};

export const api = {
  get: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },

  post: async (endpoint, body) => {
    const isFormData = body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: getHeaders(isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response);
  },

  put: async (endpoint, body) => {
    const isFormData = body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: getHeaders(isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response);
  },

  patch: async (endpoint, body) => {
    const isFormData = body instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: getHeaders(isFormData),
      body: isFormData ? body : JSON.stringify(body),
    });
    return handleResponse(response);
  },

  delete: async (endpoint) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    return handleResponse(response);
  },
  
  getStreamUrl: (endpoint) => {
    const token = localStorage.getItem('token');
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${API_BASE_URL}${endpoint}${separator}token=${token}`;
  }
};

export default api;
