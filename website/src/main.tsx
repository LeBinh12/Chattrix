import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthProvider.tsx";
import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <RecoilRoot>
        <AuthProvider>
          <App />
        </AuthProvider>
      </RecoilRoot>
    </BrowserRouter>
  </StrictMode>
);
