export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  status: number;
  message: string;
  data: string
}

export interface OAuth2LoginResponse {
  status: number;
  message: string;
  data: string;
}
