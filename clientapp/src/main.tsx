import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthProvider.tsx";
import { BrowserRouter } from "react-router-dom";
import { RecoilRoot } from "recoil";
import { 
  ModuleRegistry, 
  ClientSideRowModelModule, 
  PaginationModule, 
  TextFilterModule, 
  NumberFilterModule, 
  DateFilterModule,
  ValidationModule,
  InfiniteRowModelModule
} from "ag-grid-community";
import { CssVarsProvider } from "@mui/joy/styles";

ModuleRegistry.registerModules([
  ClientSideRowModelModule, 
  PaginationModule, 
  TextFilterModule, 
  NumberFilterModule, 
  DateFilterModule,
  ValidationModule,
  InfiniteRowModelModule
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CssVarsProvider>
      <BrowserRouter>
        <RecoilRoot>
          <AuthProvider>
            <App />
          </AuthProvider>
        </RecoilRoot>
      </BrowserRouter>
    </CssVarsProvider>
  </StrictMode>
);
