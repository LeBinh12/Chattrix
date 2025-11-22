import type { CountTodayMessageResponse } from "../types/statistical";
import axiosClient from "../utils/axiosClient";

export const statisticalApi = {
    getCountTodayMessage: async (

    ): Promise<CountTodayMessageResponse> => {
        const response = await axiosClient.get<CountTodayMessageResponse>(
            `/statistical/count-today-message`,
        );

        return response.data;
    },
};