# Admin Global Search Setup

## 1. Install the search function

In the Supabase SQL Editor, open a new blank query and run the complete
contents of:

`supabase/admin-global-search.sql`

The final result should be:

`ADMIN GLOBAL SEARCH READY`

The migration is safe to run again. It creates one read-only search function
and does not modify existing records.

## 2. Verify the search

1. Start the portal with `npm run dev` and sign in as an active administrator.
2. Select the search field in the top bar.
3. Search for `Paul` and confirm the real business, user, application, and one
   grouped sponsorship result appear when those records exist.
4. Select the **Paul Cargo** business result.
5. Confirm the Businesses page opens with `BUS-2026-68B1D858` already entered
   in its local search and only the matching company displayed.
6. Repeat using an application code, customer email, or exact sponsorship
   request code. An exact request code should show only that sponsorship
   request rather than the grouped result.
7. Enter a value that does not exist and confirm the empty result message is
   displayed without leaving the current page.

## Search coverage

- Businesses: code, name, representative, email, phone, and address
- Applications: code, business name, representative, email, and phone
- Users: name, email, phone, and role
- Sponsorships: request code, business, representative, package, and payment
  reference

Broad sponsorship matches are grouped per business to avoid repetitive search
results. Exact request-code or payment-reference searches still return the
individual request.

## Security behavior

- The browser can call the function only as an authenticated user.
- The function additionally requires `public.is_admin()` to return true.
- Search input is trimmed, limited to 100 characters, and ignored until it
  contains at least two characters.
- Results are limited to twelve records per request.
- Search is literal: `%` and `_` are not treated as wildcard operators.
- The function returns no identity-document paths, payment-proof paths,
  passwords, tokens, or other secrets.

## Validation

```bash
npm run lint
npm run build
```
