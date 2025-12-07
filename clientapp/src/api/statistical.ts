import type { MonthlyUserStatResponse, statisticalResponse, WeeklyMessageResponse } from "../types/statistical";
import axiosClient from "../utils/axiosClient";

export const statisticalApi = {
    getCountTodayMessage: async (): Promise<statisticalResponse> => {
        const response = await axiosClient.get<statisticalResponse>(
            `/statistical/count-today-message`,
        );

        return response.data;
    },
    getCountAllUser: async (): Promise<statisticalResponse> => {
        const response = await axiosClient.get<statisticalResponse>(
            `/statistical/total-user`,
        );

        return response.data;
    },
    getCountUserOnline: async (): Promise<statisticalResponse> => {
        const response = await axiosClient.get<statisticalResponse>(
            `/statistical/total-user-online`,
        );

        return response.data;
    },
    getCountGroup: async (): Promise<statisticalResponse> => {
        const response = await axiosClient.get<statisticalResponse>(
            `/statistical/total-group`,
        );

        return response.data;
    },
    getWeeklyMessages: async (): Promise<WeeklyMessageResponse> => {
        const response = await axiosClient.get<WeeklyMessageResponse>(
            `/statistical/total-message-by-week`,
        );
        return response.data;
    },
    getMonthlyUserStat: async (): Promise<MonthlyUserStatResponse> => {
        const res = await axiosClient.get<MonthlyUserStatResponse>(
            "/statistical/total-new-user-by-month"
        );
        return res.data;
    },

    downloadExcelReport: async (): Promise<void> => {
        try {
            const response = await axiosClient.get("/statistical/export-excel", {
                responseType: "blob", // bắt buộc để nhận file nhị phân
            });

            // Tạo URL tạm thời để tải file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement("a");

            // Lấy tên file từ header content-disposition nếu có
            const contentDisposition = response.headers["content-disposition"];
            let fileName = "statistical.xlsx";
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?(.+)"?/);
                if (match && match[1]) fileName = match[1];
            }

            link.href = url;
            link.setAttribute("download", fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error("Error downloading Excel:", err);
        }
    },
};