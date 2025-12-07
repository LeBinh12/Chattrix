import { useRecoilValue } from "recoil";
import { userAtom } from "../../recoil/atoms/userAtom";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

// Hook tối ưu - chỉ gọi API nếu cần
export const useLoadUserOptimized = () => {
    const user = useRecoilValue(userAtom);
    const navigate = useNavigate();
    const hasCheckedRef = useRef(false);

    useEffect(() => {
        // Nếu đã check rồi hoặc user đã có, không gọi lại
        if (hasCheckedRef.current || user) {
            return;
        }

        hasCheckedRef.current = true;

        const token = localStorage.getItem("access_token");
        if (!token) {
            return;
        }

        // Nếu cần load user, sẽ được xử lý bởi global state
        // Component này chỉ check và redirect nếu cần
        if (user && !user.data.is_profile_complete) {
            navigate("/register-oauth");
        }
    }, [user, navigate]);

    return user;
};
