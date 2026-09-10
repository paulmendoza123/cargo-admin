import { useEffect, useState } from "react";

type GlobalSearchNavigation = {
  path: string;
  value: string;
};

function initialSearchValue() {
  return (
    new URLSearchParams(window.location.search).get("search")?.trim() || ""
  );
}

export function useAdminPageSearch() {
  const [search, setSearch] = useState(initialSearchValue);

  useEffect(() => {
    const receiveGlobalSearch = (event: Event) => {
      const customEvent = event as CustomEvent<GlobalSearchNavigation>;

      if (
        customEvent.detail?.path === window.location.pathname &&
        typeof customEvent.detail.value === "string"
      ) {
        setSearch(customEvent.detail.value);
      }
    };

    window.addEventListener("cargo:global-search", receiveGlobalSearch);

    return () => {
      window.removeEventListener("cargo:global-search", receiveGlobalSearch);
    };
  }, []);

  return [search, setSearch] as const;
}

