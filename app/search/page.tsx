import type { Metadata } from "next";
import SearchForm from "@/components/SearchForm";
import SearchResults from "@/components/SearchResults";

type Props = { searchParams: Promise<{ q?: string; type?: string; exact?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return { title: q ? `${q} · FindMySong` : "Search · FindMySong" };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = "", type: rawType = "all", exact = "false" } = await searchParams;
  const type = ["all", "song", "album"].includes(rawType) ? rawType : "all";
  const query = q.trim();

  return (
    <div>
      <div className="search-header">
        <h1>Search</h1>
        <SearchForm initialQ={query} type={type} autoFocus={!query} variant="default" />
      </div>
      {query && <SearchResults q={query} type={type} exact={exact === "true"} />}
    </div>
  );
}

