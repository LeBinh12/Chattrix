import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosRequestHeaders } from "axios";
const axiosClient = axios.create({
  baseURL: "http://localhost:3000/v1",
  headers: {
    "X-API-Key": "becfce45-9237-4c6d-a7c5-f3be786249a5",
  },
});

// interceptor thêm JWT từ localStorage
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    const token = localStorage.getItem("access_token");

    if (!config.headers) {
      config.headers = {} as AxiosRequestHeaders;
    }

    if (token) {
      (config.headers as AxiosRequestHeaders).Authorization = `Bearer ${token}`;
    }

    return config;
  }
);

export default axiosClient;
