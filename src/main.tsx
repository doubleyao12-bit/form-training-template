import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import App from "./CloudTrainingApp";
import OAuthConsent from "./ai-bridge/OAuthConsent";
import "./styles.css";
const oauthConsent = window.location.pathname === "/oauth/consent";
function BootReady() {
  useEffect(() => {
    window.dispatchEvent(new Event("form:boot-ready"));
  }, []);
  return null;
}
createRoot(document.getElementById("root")!).render(<StrictMode>{oauthConsent?<OAuthConsent/>:<App/>}<BootReady/></StrictMode>);
