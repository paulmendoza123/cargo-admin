import type { User } from "@supabase/supabase-js";

import { supabase } from "./lib/supabase";

export type AdminSession = {
  authenticated: true;
  userId: string;
  name: string;
  email: string;
  role: "System Administrator";
  loggedInAt: string;
};

export async function getAdminSessionForUser(
  user: User | null
): Promise<AdminSession | null> {
  if (!user) {
    return null;
  }

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select(
        `
          id,
          email,
          full_name,
          role,
          account_status
        `
      )
      .eq("id", user.id)
      .maybeSingle();

  if (error) {
    throw new Error(
      "Unable to verify the administrator profile."
    );
  }

  if (
    !profile ||
    profile.role !== "admin" ||
    profile.account_status !== "active"
  ) {
    return null;
  }

  return {
    authenticated: true,
    userId: user.id,
    name:
      profile.full_name ||
      "Administrator",
    email:
      profile.email ||
      user.email ||
      "",
    role: "System Administrator",
    loggedInAt:
      user.last_sign_in_at ||
      new Date().toISOString(),
  };
}

export async function signInAdmin(
  email: string,
  password: string
): Promise<AdminSession> {
  const { data, error } =
    await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

  if (error) {
    console.error(
      "Supabase login error:",
      error
    );

    throw new Error(error.message);
  }

  if (!data.user) {
    throw new Error(
      "Supabase did not return a user account."
    );
  }

  const admin =
    await getAdminSessionForUser(data.user);

  if (!admin) {
    await supabase.auth.signOut();

    throw new Error(
      "This account is not authorized to access the Admin Portal."
    );
  }

  return admin;
}

export async function requestAdminPasswordReset(
  email: string
) {
  const normalizedEmail =
    email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error(
      "Enter the administrator email address."
    );
  }

  const redirectTo = new URL(
    "/reset-password",
    window.location.origin
  ).toString();

  const { error } =
    await supabase.auth.resetPasswordForEmail(
      normalizedEmail,
      { redirectTo }
    );

  if (error) {
    throw new Error(
      "Unable to send the password reset email. Please try again."
    );
  }
}

export async function updateAdminPassword(
  password: string
) {
  const { error } =
    await supabase.auth.updateUser({
      password,
    });

  if (error) {
    throw new Error(
      error.message ||
        "Unable to update the administrator password."
    );
  }
}

export async function getAdminSession():
  Promise<AdminSession | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  const admin =
    await getAdminSessionForUser(user);

  if (user && !admin) {
    await supabase.auth.signOut();
  }

  return admin;
}

export async function signOutAdmin() {
  const { error } =
    await supabase.auth.signOut({
      scope: "local",
    });

  if (error) {
    throw new Error(
      "Unable to sign out. Please try again."
    );
  }
}
