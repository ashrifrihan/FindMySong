# FindMySong

FindMySong is a web application built to help users find the ISRC (International Standard Recording Code) for songs or the UPC (Universal Product Code) for albums. This is particularly useful for finding the exact track when using features like Instagram Music search.

## Features

- **Search Tracks & Albums**: Search for your favorite songs and albums using the Deezer public API.
- **Get ISRC / UPC**: Instantly retrieve the ISRC or UPC codes to copy and paste.
- **Save Favorites**: Keep track of the songs and albums you've looked up.
- **Usage Limits**: Includes built-in quota management (10 searches per day per IP) to prevent abuse.
- **Caching**: Search results are cached using Supabase to ensure fast responses and reduce external API calls.
- **Modern Tech Stack**: Built with Next.js 15 (App Router), React 19, TypeScript, and Supabase.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- A Supabase project (for caching and saved items)

### Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone <repository-url>
   cd findmysong
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Architecture & Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database / Backend**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Music Data**: [Deezer API](https://developers.deezer.com/api) (Public endpoint, no key required)

## How it works

1. **Search**: When a user submits a search query, the app first checks the Supabase `search_cache` table.
2. **Fetch**: If not cached (or if the cache is older than 24 hours), it makes a request to the Deezer API to fetch search results.
3. **Details**: For each item, a subsequent request fetches the precise ISRC/UPC code.
4. **Cache & Return**: The consolidated results are cached in Supabase and returned to the user, allowing them to copy the code.

## License
MIT
