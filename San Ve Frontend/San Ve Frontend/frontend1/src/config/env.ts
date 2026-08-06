export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || '/api'
).replace(/\/+$/, '');

export default API_BASE_URL;
