import { API_URL } from "../config/config";
import type { CountTodayMessageResponse } from "../types/statistical";
import axiosClient from "../utils/axiosClient";

export const statisticalApi = {
    getCountTodayMessage: async (

    ): Promise<CountTodayMessageResponse> => {
        const response = await axiosClient.get<CountTodayMessageResponse>(
            `${API_URL}/statistical/count-today-message`,
        );

        return response.data;
    },
};