import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function SystemLogManagerScreen() {
  const navigate = useNavigate();

  useEffect(() => {
    toast.info("Tính năng đang phát triển", {
      position: "top-right",
      autoClose: 1500,
    });

    navigate("/admin");
  }, [navigate]);

  return null;
}
