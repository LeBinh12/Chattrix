import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useSetRecoilState } from "recoil";
import { toast } from "react-toastify";

import AuthForm from "../components/auth/AuthForm";
import AuthInput from "../components/auth/AuthInput";
import AuthButton from "../components/auth/AuthButton";

import { authApi } from "../api/authApi";
import { userApi } from "../api/userApi";
import { useAuth } from "../hooks/useAuth";

import {
  GoogleLogin,
  GoogleOAuthProvider,
  type CredentialResponse,
} from "@react-oauth/google";

import { userAtom } from "../recoil/atoms/userAtom";
import { generatePKCECodes } from "../utils/pkce";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const { saveToken } = useAuth();
  const setUser = useSetRecoilState(userAtom);

  // --------------------------
  // Common Success Handler
  // --------------------------
  const handleAfterLoginSuccess = async (res: any) => {
    toast.success(res.message);
    saveToken(res.data);

    try {
      const user = await userApi.getProfile();
      setUser(user);
    } catch {
      console.warn("Không thể lấy profile sau đăng nhập");
    }

    navigate("/home");
  };

  // --------------------------
  // Username/Password Login
  // --------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    authApi
      .login({ username, password })
      .then(handleAfterLoginSuccess)
      .catch((err) => {
        const message =
          err.response?.data?.message || err.message || "Đăng nhập thất bại";
        toast.error(message);
        console.error(message);
      });
  };

  // --------------------------
  // Google OAuth Login
  // --------------------------
  const handleGoogleLoginSuccess = (credentialResponse: CredentialResponse) => {
    const token = credentialResponse.credential;

    if (!token) {
      toast.error("Google không trả về token!");
      return;
    }

    authApi
      .loginGoogle(token)
      .then(handleAfterLoginSuccess)
      .catch((err) => {
        const message =
          err.response?.data?.message || err.message || "Đăng nhập thất bại";
        toast.error(message);
        console.error(message);
      });
  };

  const handleGoogleLoginError = () => {
    toast.error("Đăng nhập Google thất bại");
  };

  // --------------------------
  // OpenDict OAuth2 + PKCE
  // --------------------------
  const handleOpenDictLogin = async () => {
    const { codeVerifier, codeChallenge } = await generatePKCECodes();
    sessionStorage.setItem("pkce_code_verifier", codeVerifier);

    const clientId = "chat-system";
    const redirectUri = "http://localhost:3000/auth/opendict/callback";

    const openDictUrl =
      `http://localhost:9005/connect/authorize?client_id=${clientId}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code&scope=openid%20profile%20email` +
      `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    const popup = window.open(
      openDictUrl,
      "OpenDictLogin",
      "width=600,height=700"
    );
    let isProcessing = false;

    const listener = async (event: MessageEvent) => {
      if (!event.data || event.data.source !== "opendict") return;
      if (isProcessing) return;

      const { code, error } = event.data;
      if (error || !code) {
        toast.error(error || "Không nhận được code!");
        popup?.close();
        window.removeEventListener("message", listener);
        return;
      }

      isProcessing = true;

      try {
        const storedVerifier = sessionStorage.getItem("pkce_code_verifier");
        if (!storedVerifier) throw new Error("Code verifier không tồn tại");

        const res = await authApi.exchangeCodeForToken({
          code,
          code_verifier: storedVerifier,
        });

        saveToken(res.data);

        try {
          const user = await userApi.getProfile();
          setUser(user);
        } catch {
          console.warn("Không thể lấy profile sau đăng nhập");
        }

        toast.success("Đăng nhập thành công!");
        navigate("/home");
      } catch (err: any) {
        const message =
          err.response?.data?.message || "Đăng nhập OpenDict thất bại!";
        toast.error(message);
        console.error(err);
      } finally {
        popup?.close();
        window.removeEventListener("message", listener);
        sessionStorage.removeItem("pkce_code_verifier");
        isProcessing = false;
      }
    };

    window.addEventListener("message", listener);

    // Cleanup if popup closed manually
    const checkPopupClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkPopupClosed);
        window.removeEventListener("message", listener);
        sessionStorage.removeItem("pkce_code_verifier");
      }
    }, 500);
  };

  // --------------------------
  // Render
  // --------------------------
  return (
    <GoogleOAuthProvider clientId="500759950637-9gdtqlt4kqli24gpg9jih6h6kl624boh.apps.googleusercontent.com">
      <AuthForm title="Đăng nhập" onSubmit={handleSubmit}>
        <AuthInput
          label="Username"
          type="text"
          placeholder="Nhập tài khoản..."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <AuthInput
          label="Mật khẩu"
          type="password"
          placeholder="Nhập mật khẩu..."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }}>
          <AuthButton type="submit">Đăng nhập</AuthButton>
        </motion.div>

        {/* OpenDict OAuth Login */}
        <div className="mt-4">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }}>
            <button
              type="button"
              onClick={handleOpenDictLogin}
              className="w-full rounded-md bg-[#222] text-white py-2 hover:bg-[#444] transition"
            >
              Đăng nhập bằng OpenDict
            </button>
          </motion.div>
        </div>

        {/* Google Login */}
        <div className="mt-4">
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.8 }}>
            <GoogleLogin
              onSuccess={handleGoogleLoginSuccess}
              onError={handleGoogleLoginError}
            />
          </motion.div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-500">
          Chưa có tài khoản?{" "}
          <button
            type="button"
            className="text-blue-500 hover:underline"
            onClick={() => navigate("/register")}
          >
            Đăng ký ngay
          </button>
        </div>
      </AuthForm>
    </GoogleOAuthProvider>
  );
}
