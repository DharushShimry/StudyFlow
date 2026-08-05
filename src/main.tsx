import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import { SettingsProvider } from "./contexts/SettingsContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import LoginPage from "./components/LoginPage";
import App from "./App";

function Root() {
  const { currentUser } = useAuth();
  return currentUser ? <App /> : <LoginPage />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <SettingsProvider>
        <ToastProvider>
          <AuthProvider>
            <Root />
          </AuthProvider>
        </ToastProvider>
      </SettingsProvider>
    </ThemeProvider>
  </StrictMode>
);
