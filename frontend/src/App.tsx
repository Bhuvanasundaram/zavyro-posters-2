import { BrowserRouter, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BrandLoader from "./components/BrandLoader";
import AppRoutes from "./routes/AppRoutes";

function AppShell() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <>
      <BrandLoader />

      {!isAdminRoute && <Header />}

      <main className={isAdminRoute ? "zavyro-admin-app-main" : undefined}>
        <AppRoutes />
      </main>

      {!isAdminRoute && <Footer />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
