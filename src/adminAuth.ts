export const DEMO_ADMIN_EMAIL =
  "admin@cargotrack.ph";

export const DEMO_ADMIN_PASSWORD =
  "Admin123!";

const ADMIN_AUTH_KEY =
  "cargo-track-admin-auth-v1";

export type AdminSession = {
  authenticated: true;
  name: string;
  email: string;
  role: "System Administrator";
  loggedInAt: string;
};

export function validateDemoAdmin(
  email: string,
  password: string
) {
  return (
    email.trim().toLowerCase() ===
      DEMO_ADMIN_EMAIL &&
    password === DEMO_ADMIN_PASSWORD
  );
}

export function signInAdmin() {
  const session: AdminSession = {
    authenticated: true,
    name: "Administrator",
    email: DEMO_ADMIN_EMAIL,
    role: "System Administrator",
    loggedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(
    ADMIN_AUTH_KEY,
    JSON.stringify(session)
  );

  return session;
}

export function getAdminSession():
  | AdminSession
  | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(
        ADMIN_AUTH_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(
      raw
    ) as Partial<AdminSession>;

    if (
      parsed.authenticated !== true ||
      !parsed.email ||
      !parsed.name
    ) {
      return null;
    }

    return parsed as AdminSession;
  } catch {
    return null;
  }
}

export function isAdminAuthenticated() {
  return getAdminSession() !== null;
}

export function signOutAdmin() {
  window.localStorage.removeItem(
    ADMIN_AUTH_KEY
  );
}
