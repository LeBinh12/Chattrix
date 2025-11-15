import { API_URL } from "../config/config";
import axiosClient from "../utils/axiosClient";
import type { Media } from "../types/upload";

export const uploadAPI = {
    uploadFiles: async (
        files: File[],
        onProgress: (percent: number, index: number) => void
    ): Promise<Media[]> => {
        const formData = new FormData();
        files.forEach((file) => formData.append("files", file));

        const response = await axiosClient.post(`${API_URL}/upload/media`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
            onUploadProgress: (event) => {
                const percent = Math.round((event.loaded * 100) / (event.total ?? 1));
                onProgress(percent, 0);
            },
        });

        // ✅ API trả về có cấu trúc { status, message, data: [ { type, filename, size, url } ] }
        const res = response.data;

        if (res && Array.isArray(res.data)) {
            // Trả về danh sách Media
            return res.data as Media[];
        }

        throw new Error("Dữ liệu trả về từ API không hợp lệ: " + JSON.stringify(res));
    },
};
