import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  getAdminSession,
  getAdminSessionForUser,
  signInAdmin,
  signOutAdmin,
} from "../adminAuth";
import type {
  AdminSession,
} from "../adminAuth";
import { supabase } from "../lib/supabase";

type AdminAuthContextValue = {
  admin: AdminSession | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<AdminSession>;
  signOut: () => Promise<void>;
};

const AdminAuthContext =
  createContext<
    AdminAuthContextValue | undefined
  >(undefined);

export function AdminAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [admin, setAdmin] =
    useState<AdminSession | null>(null);

  const [loading, setLoading] =
    useState(true);

  const refreshSession =
    useCallback(async () => {
      try {
        const session =
          await getAdminSession();

        setAdmin(session);
      } catch (error) {
        console.error(
          "Unable to restore admin session:",
          error
        );

        setAdmin(null);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    const initialRefresh =
      window.setTimeout(
        () => {
          void refreshSession();
        },
        0
      );

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!session?.user) {
            setAdmin(null);
            setLoading(false);
            return;
          }

          window.setTimeout(() => {
            void getAdminSessionForUser(
              session.user
            )
              .then((nextAdmin) => {
                setAdmin(nextAdmin);
              })
              .catch((error) => {
                console.error(
                  "Unable to verify admin:",
                  error
                );

                setAdmin(null);
              })
              .finally(() => {
                setLoading(false);
              });
          }, 0);
        }
      );

    return () => {
      window.clearTimeout(
        initialRefresh
      );
      subscription.unsubscribe();
    };
  }, [refreshSession]);

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ) => {
      const session =
        await signInAdmin(email, password);

      setAdmin(session);

      return session;
    },
    []
  );

  const signOut = useCallback(async () => {
    await signOutAdmin();
    setAdmin(null);
  }, []);

  const value = useMemo(
    () => ({
      admin,
      loading,
      signIn,
      signOut,
    }),
    [admin, loading, signIn, signOut]
  );

  return (
    <AdminAuthContext.Provider
      value={value}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

// The provider and its matching hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAdminAuth() {
  const context =
    useContext(AdminAuthContext);

  if (!context) {
    throw new Error(
      "useAdminAuth must be used inside AdminAuthProvider."
    );
  }

  return context;
}
