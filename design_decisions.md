# Design Decisions

## Folder Structure
- `app/` contains pages, layouts, and API routes, following Next.js App Router conventions
- `lib/` contains backend logic (Supabase interactions, Python scoring functions) to keep API routes thin
- `components/` contains reusable frontend components
- `utils/` contains helper functions for data manipulation or formatting
- `types/` contains TypeScript type definitions

## API Design
- Each API route is in a separate folder under `app/api/` (e.g., `addArticle`, `updateArticle`) for clarity and maintainability
- Only export the HTTP methods needed per route (POST, GET, PUT, DELETE)
- API routes call `lib/` functions for database and AI scoring
- Unsupported methods will automatically return 405 Method Not Allowed

## Tech Stack Choices
- Next.js for frontend and routing
- Supabase for database and authentication
- Python for AI bias scoring
- TailwindCSS for styling and layout
