# Lib Folder

Contains backend integration and domain-specific logic.

## Examples
- `supabaseClient.ts` — Initializes Supabase client
- `mediaService.ts` — Functions to fetch, add, update media items
- `constants.ts` — Global constants like media types or scoring thresholds

## Notes
- All code here may interact with APIs or database
- Should not contain pure utility functions (use utils/ for those)
