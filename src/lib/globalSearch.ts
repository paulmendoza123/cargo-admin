import { supabase } from "./supabase";

export type AdminSearchResultType =
  | "Business"
  | "Application"
  | "User"
  | "Sponsorship";

export type AdminSearchResult = {
  type: AdminSearchResultType;
  entityId: string;
  code: string;
  title: string;
  subtitle: string;
  status: string;
  targetPath: string;
  searchValue: string;
};

type AdminSearchResultRow = {
  result_type: AdminSearchResultType;
  entity_id: string;
  result_code: string;
  title: string;
  subtitle: string;
  result_status: string;
  target_path: string;
  search_value: string;
  search_rank: number;
};

function errorMessage(error: unknown, fallback: string) {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return fallback;
}

export async function searchAdminPortal(query: string) {
  const normalizedQuery = query.trim();

  if (normalizedQuery.length < 2) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    "search_admin_portal",
    {
      requested_query: normalizedQuery.slice(0, 100),
    }
  );

  if (error) {
    throw new Error(
      errorMessage(error, "Unable to search the administrator portal.")
    );
  }

  return ((data || []) as AdminSearchResultRow[]).map(
    (row): AdminSearchResult => ({
      type: row.result_type,
      entityId: row.entity_id,
      code: row.result_code,
      title: row.title,
      subtitle: row.subtitle,
      status: row.result_status,
      targetPath: row.target_path,
      searchValue: row.search_value,
    })
  );
}
