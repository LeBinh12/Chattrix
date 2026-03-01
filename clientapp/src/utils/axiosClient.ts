import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosRequestHeaders } from "axios";
import { API_BASE_URL } from "../config/api";
import { toast } from "react-toastify";
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
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

// Interceptor xử lý response
axiosClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 403) {
      toast.error("Bạn không được phép truy cập chức năng này", {
        toastId: "403_forbidden_error",
      });
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
