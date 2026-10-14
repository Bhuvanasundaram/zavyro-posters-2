import {
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import HomePage from "../pages/HomePage";
import ShopPage from "../pages/ShopPage";
import ProductPage from "../pages/ProductPage";
import CartPage from "../pages/CartPage";
import CheckoutPage from "../pages/CheckoutPage";
import CustomizePage from "../pages/CustomizePage";
import RandomPage from "../pages/RandomPage";
import OffersPage from "../pages/OffersPage";
import CombosPage from "../pages/CombosPage";
import AdminOffersPage from "../pages/admin/AdminOffersPage";

import LoginPage from "../pages/LoginPage";
import AdminDashboardPage from "../pages/admin/AdminDashboardPage";
import ManageProductsPage from "../pages/admin/ManageProductsPage";
import MockupTemplatesPage from "../pages/admin/MockupTemplatesPage";
import ManageHomepagePage from "../pages/admin/ManageHomepagePage";
import AdminOrdersPage from "../pages/admin/AdminOrdersPage";
import AdminUsersPage from "../pages/admin/AdminUsersPage";
import AccountPage from "../pages/AccountPage";
import ProtectedRoute from "./ProtectedRoute";
import OrderSuccessPage from "../pages/OrderSuccessPage";
import OrderDetailsPage from "../pages/OrderDetailsPage";
import TrackOrderPage from "../pages/TrackOrderPage";
import "./not-found.css";

function NotFoundPage() {
  return (
    <section className="zavyro-not-found" role="status" aria-labelledby="not-found-title">
      <img className="zavyro-not-found__symbol" src="/zavyro-symbol.png" alt="Zavyro Posters" />
      <h1 id="not-found-title">Oops! Page Not Found</h1>
      <p>The page you’re looking for doesn’t exist or may have been moved.</p>
      <a className="zavyro-not-found__home" href="/">Back to Home</a>
    </section>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage />}
      />

      <Route
        path="/shop"
        element={<ShopPage />}
      />

      <Route
        path="/product/:productId"
        element={<ProductPage />}
      />

      <Route
        path="/customize"
        element={<CustomizePage />}
      />

      <Route
        path="/random"
        element={<RandomPage />}
      />

      <Route
        path="/offers"
        element={<OffersPage />}
      />

      <Route
        path="/combos"
        element={<CombosPage />}
      />

      <Route
        path="/surprise-me"
        element={<Navigate to="/random" replace />}
      />

      <Route
        path="/cart"
        element={<CartPage />}
      />

      <Route path="/checkout" element={<ProtectedRoute><CheckoutPage /></ProtectedRoute>} />

      <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />

      <Route path="/order-success/:orderId" element={<ProtectedRoute><OrderSuccessPage /></ProtectedRoute>} />

      <Route path="/order/:orderId" element={<ProtectedRoute><OrderDetailsPage /></ProtectedRoute>} />

      <Route path="/track-order" element={<TrackOrderPage />} />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route path="/admin" element={<ProtectedRoute roles={["owner", "admin", "staff"]}><AdminDashboardPage /></ProtectedRoute>} />

      <Route path="/admin/products" element={<ProtectedRoute roles={["owner", "admin", "staff"]}><ManageProductsPage /></ProtectedRoute>} />

      <Route path="/admin/mockup-templates" element={<ProtectedRoute roles={["owner", "admin", "staff"]}><MockupTemplatesPage /></ProtectedRoute>} />

      <Route path="/admin/homepage" element={<ProtectedRoute roles={["owner", "admin"]}><ManageHomepagePage /></ProtectedRoute>} />

      <Route path="/admin/orders" element={<ProtectedRoute roles={["owner", "admin", "staff"]}><AdminOrdersPage /></ProtectedRoute>} />

      <Route path="/admin/offers" element={<ProtectedRoute roles={["owner", "admin"]}><AdminOffersPage /></ProtectedRoute>} />

      <Route path="/admin/users" element={<ProtectedRoute roles={["owner"]}><AdminUsersPage /></ProtectedRoute>} />

      <Route
        path="/404"
        element={<NotFoundPage />}
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/404"
            replace
          />
        }
      />
    </Routes>
  );
}