import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { isAdminAuthenticated } from "./adminAuth";
import AdminLayout from "./components/AdminLayout";
import AdminLogin from "./pages/AdminLogin";
import Applications from "./pages/Applications";
import Businesses from "./pages/Businesses";
import Dashboard from "./pages/Dashboard";
import Sponsored from "./pages/Sponsored";
import Users from "./pages/Users";

function ProtectedAdminLayout() {
  if (!isAdminAuthenticated()) {
    return (
      <Navigate to="/login" replace />
    );
  }

  return <AdminLayout />;
}

function FallbackRoute() {
  return (
    <Navigate
      to={
        isAdminAuthenticated()
          ? "/"
          : "/login"
      }
      replace
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<AdminLogin />}
        />

        <Route
          element={<ProtectedAdminLayout />}
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
  );
}
