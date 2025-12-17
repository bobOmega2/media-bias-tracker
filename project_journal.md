# Project Journal

## 2025-12-17
- Organized the `app/` folder with pages for articles, collection, and dashboard
- Added README files for `app/` and `app/api/` so it’s easier to understand what’s inside
- Created API route folders: `addArticle`, `getArticles`, `getArticle`, `updateArticle`, and `deleteArticle`
- Looked at how Next.js App Router works for API routes and dynamic pages
- Decided to make one API folder per action instead of putting many methods in one folder
- Started planning the project journal and design decisions files to track what I do and why



### TODO / Next Steps
- Set up a Supabase project and add environment variables so the app can talk to the database
- Create a Supabase client in `lib/` (`lib/supabaseClient.ts`) to connect to the database
- Plan the database tables: `articles`, `ai_scores`, `user_ratings`, and maybe `users`
- Start building backend API routes using these tables so the frontend can get and send data
