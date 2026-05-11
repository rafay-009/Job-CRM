import { PageHeader } from "@/components/page-header";
import { requireScraper } from "@/lib/auth";
import { SearchForm } from "./search-form";

export const maxDuration = 300;

export default async function SearchPage() {
  await requireScraper();

  return (
    <section>
      <PageHeader
        title="Scraper"
        description="Run the Firecrawl and Gemini pipeline for the selected source URLs."
      />
      <SearchForm />
    </section>
  );
}
