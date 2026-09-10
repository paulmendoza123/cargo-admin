import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  const authCheckVersion =
    useRef(0);

  const refreshSession =
    useCallback(async () => {
      const checkVersion =
        ++authCheckVersion.current;

      try {
        const session =
          await getAdminSession();

        if (
          checkVersion ===
          authCheckVersion.current
        ) {
          setAdmin(session);
        }
      } catch (error) {
        console.error(
          "Unable to restore admin session:",
          error
        );

        if (
          checkVersion ===
          authCheckVersion.current
        ) {
          setAdmin(null);
        }
      } finally {
        if (
          checkVersion ===
          authCheckVersion.current
        ) {
          setLoading(false);
        }
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
          const checkVersion =
            ++authCheckVersion.current;

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
                if (
                  checkVersion ===
                  authCheckVersion.current
                ) {
                  setAdmin(nextAdmin);
                }
              })
              .catch((error) => {
                console.error(
                  "Unable to verify admin:",
                  error
                );

                if (
                  checkVersion ===
                  authCheckVersion.current
                ) {
                  setAdmin(null);
                }
              })
              .finally(() => {
                if (
                  checkVersion ===
                  authCheckVersion.current
                ) {
                  setLoading(false);
                }
              });
          }, 0);
        }
      );

    return () => {
      authCheckVersion.current += 1;
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
    authCheckVersion.current += 1;
    await signOutAdmin();
    setAdmin(null);
    setLoading(false);
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
