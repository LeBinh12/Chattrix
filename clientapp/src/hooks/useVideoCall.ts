import { useState, useCallback } from 'react';
import axiosClient from '../utils/axiosClient';

interface TokenResponse {
    token: string;
    url: string;
}

export const useVideoCall = () => {
    const [token, setToken] = useState<string>("");
    const [serverUrl, setServerUrl] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const fetchToken = useCallback(async (roomName: string, participantName: string, groupId?: string, receiverId?: string) => {
        setLoading(true);
        setError(null);
        try {
            const response = await axiosClient.post<TokenResponse>('/videocall/token', {
                roomName,
                participantName,
                groupId,
                receiverId,
            });

            const { token, url } = response.data;
            setToken(token);
            setServerUrl(url);
            return { token, url };
        } catch (err: any) {
            console.error("Error fetching video call token:", err);
            if (err.response) {
                console.error("Response data:", err.response.data);
                console.error("Response status:", err.response.status);
            }
            setError(err.message || "Failed to fetch token");
        } finally {
            setLoading(false);
        }
    }, []);

    const resetCall = useCallback(() => {
        setToken("");
        setServerUrl("");
    }, []);

    return { token, serverUrl, fetchToken, resetCall, loading, error };
};
