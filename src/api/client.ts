import axios from 'axios'

/**
 * Axios instance pre-configured for the TaskFlow backend.
 *
 * Base URL is read from VITE_API_BASE_URL (see .env.development / .env.production).
 * In development, Vite proxies /api/* to the backend, so the base URL here is empty.
 * In production, Nginx handles the proxy.
 */
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

// ── Response interceptor: unwrap data, normalise errors ───────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const msg =
      error.response?.data?.detail ??
      error.response?.data?.message ??
      error.message ??
      'Unknown error'
    return Promise.reject(new Error(msg))
  },
)

export default apiClient
