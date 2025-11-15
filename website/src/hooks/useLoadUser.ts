import { useRecoilState } from "recoil";
import { userAtom } from "../recoil/atoms/userAtom";
import { userApi } from "../api/userApi";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const useLoadUser = () => {
  const [user, setUser] = useRecoilState(userAtom);
  const navigate = useNavigate()
  useEffect(() => {
    const token = localStorage.getItem("access_token");

    const loadUser = async () => {
      if (!token) return;

      try {
        const res = await userApi.getProfile();
        setUser(res);

        // Nếu chưa hoàn tất profile, redirect ngay
        if (!res.data.is_profile_complete) {
          navigate("/register-oauth");
        }
      } catch (err) {
        console.warn("Token hết hạn hoặc không hợp lệ");
        localStorage.removeItem("access_token");
        setUser(null);
      }
    };

    loadUser();
  }, [navigate]);



  return user;
}