import { useEffect } from "react";
export default function AuthOpenDictCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error"); // nhận lỗi từ OpenDict nếu có
    const codeVerifier = localStorage.getItem("pkce_verifier");

    if (window.opener) {
      // Popup: gửi code hoặc lỗi về trang cha
      window.opener.postMessage(
        { source: "opendict", code, codeVerifier, error },
        window.location.origin
      );
      window.close(); // tự đóng popup
    }
  }, []);

  return <div>Đang xử lý đăng nhập...</div>;
}
