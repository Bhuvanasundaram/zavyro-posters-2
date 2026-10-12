// ============================================================
// ZAVYRO POSTERS 2.0
// ADMIN DASHBOARD — FINAL VISUAL PASS
// Mobile-first • Dark/Light/System • Safe empty-state handling
// ============================================================

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";

const API_URL = "https://zavyro-posters-api.onrender.com";

type AdminUser = {
  id: string;
  fullName: string;
  email: string;
  role: "owner" | "admin" | "staff";
};

type RecentOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: string | number;
  status: string;
  payment_status: string;
  created_at: string;
};

type DashboardData = {
  stats: {
    products: number;
    customers: number;
    orders: number;
    revenue: number;
  };
  orderStatuses: Record<string, number>;
  recentOrders: RecentOrder[];
};

function normalizeDashboard(raw: any): DashboardData {
  const stats =
    raw?.stats && typeof raw.stats === "object"
      ? raw.stats
      : {};

  return {
    stats: {
      products: Number(stats.products ?? 0),
      customers: Number(stats.customers ?? stats.users ?? 0),
      orders: Number(stats.orders ?? 0),
      revenue: Number(stats.revenue ?? 0),
    },
    orderStatuses:
      raw?.orderStatuses &&
      typeof raw.orderStatuses === "object" &&
      !Array.isArray(raw.orderStatuses)
        ? raw.orderStatuses
        : {},
    recentOrders: Array.isArray(raw?.recentOrders)
      ? raw.recentOrders
      : [],
  };
}

export default function AdminDashboardPage() {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();

  const [data, setData] =
    useState<DashboardData | null>(null);
  const [user, setUser] =
    useState<AdminUser | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [error, setError] =
    useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [dashboardResponse, profileResponse] =
        await Promise.all([
          fetch(`${API_URL}/api/admin/dashboard`, {
            credentials: "include",
          }),
          fetch(`${API_URL}/api/admin/profile`, {
            credentials: "include",
          }),
        ]);

      const dashboard = await dashboardResponse.json();
      const profile = await profileResponse.json();

      if (!dashboardResponse.ok || !dashboard.success) {
        throw new Error(
          dashboard.message ||
            "Failed to load dashboard.",
        );
      }

      if (!profileResponse.ok || !profile.success) {
        throw new Error(
          profile.message ||
            "Failed to load admin profile.",
        );
      }

      setData(normalizeDashboard(dashboard));
      setUser(profile.user ?? null);
    } catch (err) {
      console.error("Admin dashboard error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return (
      <main className="z-admin-page">
        <div className="z-admin-loading">
          <div className="z-admin-loader">Z</div>
          <span>Loading dashboard...</span>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="z-admin-page">
        <div className="z-admin-error">
          <div className="z-admin-error-icon">!</div>
          <h2>Dashboard unavailable</h2>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void loadDashboard()}
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const canProducts =
    user?.role === "owner" ||
    user?.role === "admin" ||
    user?.role === "staff";

  const canOffers =
    user?.role === "owner" ||
    user?.role === "admin";

  const canUsers =
    user?.role === "owner";

  return (
    <main className="z-admin-page">
      <style>{`
        .z-admin-page {
          --za-purple: #7c3aed;
          --za-purple-2: #a855f7;
          --za-blue: #3b82f6;
          --za-green: #10b981;
          --za-orange: #f59e0b;
          --za-red: #ef4444;
          min-height: 100vh;
          padding: 20px 14px 70px;
          background:
            radial-gradient(circle at 8% 0%, rgba(124,58,237,.14), transparent 28%),
            radial-gradient(circle at 92% 10%, rgba(59,130,246,.09), transparent 24%),
            var(--color-background);
          color: var(--color-text-primary);
        }

        .z-admin-wrap {
          width: 100%;
          max-width: 1380px;
          margin: 0 auto;
        }

        .z-admin-hero {
          position: relative;
          overflow: hidden;
          display: flex;
          justify-content: space-between;
          gap: 18px;
          align-items: center;
          padding: 22px;
          margin-bottom: 16px;
          border: 1px solid var(--color-border);
          border-radius: 20px;
          background:
            linear-gradient(135deg,
              rgba(124,58,237,.16),
              rgba(124,58,237,.045) 52%,
              var(--color-surface));
        }

        .z-admin-hero:after {
          content: "";
          position: absolute;
          width: 180px;
          height: 180px;
          right: -70px;
          top: -90px;
          border-radius: 50%;
          background: rgba(168,85,247,.16);
          pointer-events: none;
        }

        .z-admin-eyebrow {
          margin: 0 0 6px;
          color: var(--za-purple-2);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .22em;
        }

        .z-admin-title {
          margin: 0;
          font-size: clamp(28px, 7vw, 46px);
          line-height: 1;
          letter-spacing: -.045em;
        }

        .z-admin-subtitle {
          margin: 8px 0 0;
          color: var(--color-text-secondary);
          font-size: 13px;
        }

        .z-admin-refresh {
          position: relative;
          z-index: 1;
          min-height: 44px;
          padding: 0 15px;
          border: 1px solid rgba(124,58,237,.35);
          border-radius: 11px;
          background: var(--color-surface);
          color: var(--color-text-primary);
          font-weight: 800;
          cursor: pointer;
        }

        .z-admin-profile {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          padding: 14px;
          margin-bottom: 16px;
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-surface);
        }

        .z-admin-profile-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        .z-admin-avatar {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          display: grid;
          place-items: center;
          border-radius: 13px;
          background: linear-gradient(135deg, var(--za-purple), var(--za-purple-2));
          color: white;
          font-weight: 900;
          font-size: 18px;
          box-shadow: 0 8px 22px rgba(124,58,237,.24);
        }

        .z-admin-name {
          margin: 0;
          font-size: 15px;
          font-weight: 850;
        }

        .z-admin-email {
          margin: 3px 0 0;
          color: var(--color-text-muted);
          font-size: 11px;
          word-break: break-word;
        }

        .z-admin-role {
          display: inline-flex;
          margin-left: 7px;
          padding: 3px 7px;
          border-radius: 999px;
          background: rgba(124,58,237,.12);
          color: var(--za-purple-2);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .z-admin-theme {
          color: var(--color-text-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .z-admin-stats {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 10px;
          margin-bottom: 16px;
        }

        .z-admin-stat {
          position: relative;
          overflow: hidden;
          min-width: 0;
          padding: 15px;
          border: 1px solid var(--color-border);
          border-radius: 16px;
          background: var(--color-surface);
        }

        .z-admin-stat:before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          background: var(--stat-color);
        }

        .z-admin-stat-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          margin-bottom: 10px;
          border-radius: 10px;
          background: color-mix(in srgb, var(--stat-color) 14%, transparent);
          color: var(--stat-color);
          font-weight: 900;
        }

        .z-admin-stat-label {
          margin: 0;
          color: var(--color-text-muted);
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .z-admin-stat-value {
          margin: 4px 0 0;
          font-size: 24px;
          line-height: 1;
        }

        .z-admin-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        .z-admin-card {
          min-width: 0;
          padding: 17px;
          border: 1px solid var(--color-border);
          border-radius: 17px;
          background: var(--color-surface);
        }

        .z-admin-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }

        .z-admin-card-title {
          margin: 0;
          font-size: 17px;
        }

        .z-admin-card-sub {
          margin: 4px 0 0;
          color: var(--color-text-muted);
          font-size: 11px;
        }

        .z-admin-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--color-border);
        }

        .z-admin-status-left {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 12px;
          font-weight: 700;
        }

        .z-admin-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--dot);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--dot) 12%, transparent);
        }

        .z-admin-actions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 9px;
        }

        .z-admin-action {
          min-height: 48px;
          padding: 8px;
          border: 1px solid var(--color-border);
          border-radius: 11px;
          background: var(--color-background);
          color: var(--color-text-primary);
          font-size: 12px;
          font-weight: 800;
          cursor: pointer;
        }

        .z-admin-action:first-child {
          border-color: rgba(124,58,237,.4);
          background: rgba(124,58,237,.08);
          color: var(--za-purple-2);
        }

        .z-admin-permissions {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 8px;
        }

        .z-admin-permission {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border: 1px solid var(--color-border);
          border-radius: 10px;
          background: var(--color-background);
          font-size: 11px;
          font-weight: 750;
        }

        .z-admin-permission-icon {
          width: 23px;
          height: 23px;
          display: grid;
          place-items: center;
          border-radius: 7px;
          background: var(--permission-bg);
          color: var(--permission-color);
          font-weight: 900;
        }

        .z-admin-table-wrap {
          width: 100%;
          overflow-x: auto;
        }

        .z-admin-table {
          width: 100%;
          min-width: 700px;
          border-collapse: collapse;
        }

        .z-admin-table th {
          padding: 10px;
          text-align: left;
          color: var(--color-text-muted);
          font-size: 9px;
          letter-spacing: .1em;
          text-transform: uppercase;
          border-bottom: 1px solid var(--color-border);
        }

        .z-admin-table td {
          padding: 12px 10px;
          font-size: 12px;
          border-bottom: 1px solid var(--color-border);
        }

        .z-admin-badge {
          display: inline-flex;
          padding: 4px 7px;
          border-radius: 999px;
          font-size: 9px;
          font-weight: 900;
        }

        .z-admin-empty {
          padding: 25px 8px;
          color: var(--color-text-muted);
          text-align: center;
          font-size: 12px;
        }

        .z-admin-loading {
          min-height: 70vh;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 10px;
          color: var(--color-text-muted);
          font-size: 13px;
        }

        .z-admin-loader {
          width: 52px;
          height: 52px;
          display: grid;
          place-items: center;
          border-radius: 15px;
          background: linear-gradient(135deg, var(--za-purple), var(--za-purple-2));
          color: white;
          font-size: 21px;
          font-weight: 900;
          box-shadow: 0 12px 30px rgba(124,58,237,.25);
        }

        .z-admin-error {
          max-width: 500px;
          margin: 70px auto;
          padding: 28px 20px;
          border: 1px solid var(--color-border);
          border-radius: 18px;
          background: var(--color-surface);
          text-align: center;
        }

        .z-admin-error-icon {
          width: 44px;
          height: 44px;
          margin: 0 auto 12px;
          display: grid;
          place-items: center;
          border-radius: 50%;
          background: rgba(239,68,68,.12);
          color: var(--za-red);
          font-weight: 900;
        }

        .z-admin-error h2 {
          margin: 0;
          font-size: 19px;
        }

        .z-admin-error p {
          color: var(--color-text-muted);
          font-size: 12px;
          line-height: 1.5;
        }

        .z-admin-error button {
          min-height: 44px;
          padding: 0 17px;
          border: 0;
          border-radius: 10px;
          background: var(--za-purple);
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        @media (min-width: 720px) {
          .z-admin-page { padding: 28px 22px 70px; }
          .z-admin-stats { grid-template-columns: repeat(4, minmax(0,1fr)); }
          .z-admin-grid { grid-template-columns: minmax(0,1fr) minmax(0,1fr); }
          .z-admin-grid .z-admin-card:last-child { grid-column: 1 / -1; }
        }

        @media (min-width: 1080px) {
          .z-admin-grid { grid-template-columns: 1.05fr .95fr; }
          .z-admin-grid .z-admin-card:last-child { grid-column: 1 / -1; }
        }
      `}</style>

      <div className="z-admin-wrap">

        <header className="z-admin-hero">
          <div>
            <p className="z-admin-eyebrow">
              ZAVYRO POSTERS • CONTROL CENTER
            </p>
            <h1 className="z-admin-title">
              Admin Dashboard
            </h1>
            <p className="z-admin-subtitle">
              Your store, products and orders at a glance.
            </p>
          </div>

          <button
            type="button"
            className="z-admin-refresh"
            onClick={() => void loadDashboard()}
          >
            ↻ Refresh
          </button>
        </header>

        {user && (
          <section className="z-admin-profile">
            <div className="z-admin-profile-left">
              <div className="z-admin-avatar">
                {user.fullName?.charAt(0)?.toUpperCase() || "Z"}
              </div>

              <div>
                <p className="z-admin-name">
                  {user.fullName}
                  <span className="z-admin-role">
                    {user.role.toUpperCase()}
                  </span>
                </p>
                <p className="z-admin-email">
                  {user.email}
                </p>
              </div>
            </div>

            <div className="z-admin-theme">
              {resolvedTheme === "dark"
                ? "● Dark theme"
                : "● Light theme"}
            </div>
          </section>
        )}

        <section className="z-admin-stats">
          <Stat
            label="Products"
            value={data.stats.products}
            icon="▣"
            color="#7c3aed"
          />
          <Stat
            label="Customers"
            value={data.stats.customers}
            icon="♙"
            color="#3b82f6"
          />
          <Stat
            label="Orders"
            value={data.stats.orders}
            icon="□"
            color="#10b981"
          />
          <Stat
            label="Revenue"
            value={formatCurrency(data.stats.revenue)}
            icon="₹"
            color="#f59e0b"
          />
        </section>

        <section className="z-admin-grid">

          <div className="z-admin-card">
            <div className="z-admin-card-head">
              <div>
                <h2 className="z-admin-card-title">
                  Order Status
                </h2>
                <p className="z-admin-card-sub">
                  Current order breakdown
                </p>
              </div>
            </div>

            {Object.keys(data.orderStatuses || {}).length === 0 ? (
              <div className="z-admin-empty">
                No orders yet.
              </div>
            ) : (
              Object.entries(data.orderStatuses || {}).map(
                ([status, count]) => (
                  <div
                    className="z-admin-status-row"
                    key={status}
                  >
                    <div className="z-admin-status-left">
                      <span
                        className="z-admin-dot"
                        style={
                          {
                            "--dot": getStatusColor(status),
                          } as React.CSSProperties
                        }
                      />
                      {formatStatus(status)}
                    </div>
                    <strong>{count}</strong>
                  </div>
                ),
              )
            )}
          </div>

          <div className="z-admin-card">
            <div className="z-admin-card-head">
              <div>
                <h2 className="z-admin-card-title">
                  Quick Actions
                </h2>
                <p className="z-admin-card-sub">
                  Store management
                </p>
              </div>
            </div>

            <div className="z-admin-actions">
              {canProducts && (
                <>
                  <button
                    className="z-admin-action"
                    type="button"
                    onClick={() =>
                      navigate("/admin/products?tab=create")
                    }
                  >
                    + Add Product
                  </button>

                  <button
                    className="z-admin-action"
                    type="button"
                    onClick={() =>
                      navigate("/admin/products?tab=manage")
                    }
                  >
                    Manage Products
                  </button>

                  <button
                    className="z-admin-action"
                    type="button"
                    onClick={() =>
                      navigate("/admin/homepage")
                    }
                  >
                    Homepage
                  </button>

                  <button
                    className="z-admin-action"
                    type="button"
                    onClick={() => navigate("/admin/mockup-templates")}
                  >
                    Mockup Templates
                  </button>
                </>
              )}

              <button
                className="z-admin-action"
                type="button"
                onClick={() => navigate("/admin/orders")}
              >
                Orders
              </button>

              {canOffers && (
                <button
                  className="z-admin-action"
                  type="button"
                  onClick={() =>
                    navigate("/admin/offers")
                  }
                >
                  Offers
                </button>
              )}

              {canUsers && (
                <button
                  className="z-admin-action"
                  type="button"
                  onClick={() =>
                    navigate("/admin/users")
                  }
                >
                  Admin Users
                </button>
              )}
            </div>
          </div>

          {user && (
            <div className="z-admin-card">
              <div className="z-admin-card-head">
                <div>
                  <h2 className="z-admin-card-title">
                    Your Access
                  </h2>
                  <p className="z-admin-card-sub">
                    Permissions for your {user.role} account
                  </p>
                </div>
              </div>

              <div className="z-admin-permissions">
                <Permission label="Dashboard" allowed />
                <Permission label="Products" allowed={canProducts} />
                <Permission label="Orders" allowed />
                <Permission label="Offers" allowed={canOffers} />
                <Permission label="Admin Users" allowed={canUsers} />
                <Permission
                  label="Security & Audit"
                  allowed={
                    user.role === "owner" ||
                    user.role === "admin"
                  }
                />
              </div>
            </div>
          )}

          <div className="z-admin-card">
            <div className="z-admin-card-head">
              <div>
                <h2 className="z-admin-card-title">
                  Recent Orders
                </h2>
                <p className="z-admin-card-sub">
                  Latest customer orders
                </p>
              </div>
            </div>

            {data.recentOrders.length === 0 ? (
              <div className="z-admin-empty">
                No orders have been placed yet.
              </div>
            ) : (
              <div className="z-admin-table-wrap">
                <table className="z-admin-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Payment</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {data.recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <strong>{order.order_number}</strong>
                        </td>

                        <td>
                          <strong>{order.customer_name}</strong>
                          <br />
                          <span style={{ color: "var(--color-text-muted)", fontSize: 10 }}>
                            {order.customer_email}
                          </span>
                        </td>

                        <td>
                          {formatCurrency(
                            Number(order.total_amount) || 0,
                          )}
                        </td>

                        <td>
                          <span
                            className="z-admin-badge"
                            style={{
                              background: `${getPaymentColor(order.payment_status)}20`,
                              color: getPaymentColor(order.payment_status),
                            }}
                          >
                            {order.payment_status || "Pending"}
                          </span>
                        </td>

                        <td>
                          <span
                            className="z-admin-badge"
                            style={{
                              background: `${getStatusColor(order.status)}20`,
                              color: getStatusColor(order.status),
                            }}
                          >
                            {formatStatus(order.status || "pending")}
                          </span>
                        </td>

                        <td style={{ color: "var(--color-text-muted)" }}>
                          {formatDate(order.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}) {
  return (
    <div
      className="z-admin-stat"
      style={{ "--stat-color": color } as React.CSSProperties}
    >
      <div className="z-admin-stat-icon">
        {icon}
      </div>
      <p className="z-admin-stat-label">
        {label}
      </p>
      <h2 className="z-admin-stat-value">
        {value}
      </h2>
    </div>
  );
}

function Permission({
  label,
  allowed,
}: {
  label: string;
  allowed: boolean;
}) {
  return (
    <div
      className="z-admin-permission"
      style={
        {
          "--permission-bg": allowed
            ? "rgba(16,185,129,.12)"
            : "rgba(239,68,68,.12)",
          "--permission-color": allowed
            ? "#10b981"
            : "#ef4444",
        } as React.CSSProperties
      }
    >
      <span className="z-admin-permission-icon">
        {allowed ? "✓" : "×"}
      </span>
      {label}
    </div>
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "—";

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatStatus(status: string) {
  return String(status)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getStatusColor(status: string) {
  switch (String(status).toLowerCase()) {
    case "pending":
      return "#f59e0b";
    case "processing":
      return "#3b82f6";
    case "shipped":
      return "#8b5cf6";
    case "delivered":
      return "#10b981";
    case "cancelled":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}

function getPaymentColor(status: string) {
  switch (String(status).toLowerCase()) {
    case "paid":
      return "#10b981";
    case "failed":
      return "#ef4444";
    default:
      return "#f59e0b";
  }
}
