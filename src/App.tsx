import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import {
  AdminAuthProvider,
  useAdminAuth,
} from "./contexts/AdminAuthContext";
import AdminLogin from "./pages/AdminLogin";
import AdminResetPassword from "./pages/AdminResetPassword";
import Applications from "./pages/Applications";
import Businesses from "./pages/Businesses";
import Dashboard from "./pages/Dashboard";
import Sponsored from "./pages/Sponsored";
import Users from "./pages/Users";

function AdminAccessLoader() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        color: "#123b5d",
        fontWeight: 700,
      }}
    >
      Checking administrator access...
    </div>
  );
}

function ProtectedAdminLayout() {
  const {
    admin,
    loading,
  } = useAdminAuth();

  if (loading) {
    return <AdminAccessLoader />;
  }

  if (!admin) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <AdminLayout />;
}

function FallbackRoute() {
  const {
    admin,
    loading,
  } = useAdminAuth();

  if (loading) {
    return <AdminAccessLoader />;
  }

  return (
    <Navigate
      to={admin ? "/" : "/login"}
      replace
    />
  );
}

export default function App() {
  return (
    <AdminAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={<AdminLogin />}
          />

          <Route
            path="/reset-password"
            element={<AdminResetPassword />}
          />

          <Route
            element={
              <ProtectedAdminLayout />
            }
          >
            <Route
              path="/"
              element={<Dashboard />}
            />

            <Route
              path="/applications"
              element={<Applications />}
            />

            <Route
              path="/businesses"
              element={<Businesses />}
            />

            <Route
              path="/sponsored"
              element={<Sponsored />}
            />

            <Route
              path="/users"
              element={<Users />}
            />
          </Route>

          <Route
            path="*"
            element={<FallbackRoute />}
          />
        </Routes>
      </BrowserRouter>
    </AdminAuthProvider>
  );
}
