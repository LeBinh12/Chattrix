import { API_URL } from "../config/config";
import type { LoginRequest, LoginResponse, OAuth2LoginResponse } from "../types/auth";
import axiosClient from "../utils/axiosClient";

export const authApi = {
  login: async (payload: LoginRequest): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>(`${API_URL}/users/login`, payload);
    return response.data;
  },
  loginGoogle: async (token: string): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>(`${API_URL}/users/google-login`, { id_token: token });
    return response.data;
  },
  register: async (formData: FormData): Promise<LoginResponse> => {
    const response = await axiosClient.post<LoginResponse>(`${API_URL}/users/register`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },
  regissterOAuth: async (formData: FormData, id: string): Promise<LoginResponse> => {
    console.log(`${API_URL}/users/register-oauth?id=${id}`)
    const response = await axiosClient.post<LoginResponse>(`${API_URL}/users/register-oauth`, formData, {
      headers: { "Content-Type": "multipart/form-data" }
    });
    return response.data;
  },
  exchangeCodeForToken: async (payload: { code: string; code_verifier: string }): Promise<OAuth2LoginResponse> => {
    const response = await axiosClient.post<OAuth2LoginResponse>(
      `${API_URL}/users/login-open-dict`,
      payload
    );
    return response.data;
  }
}