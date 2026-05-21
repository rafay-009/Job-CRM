import { PageHeader } from "@/components/page-header";
import { requireScraper } from "@/lib/auth";
import { ManualLinksForm } from "./manual-links-form";

export default async function ManualLinksPage() {
  await requireScraper();

  return (
    <section>
      <PageHeader
        title="Adding Links Manually"
        description="Upload a CSV for a selected tech stack. Saved jobs will appear for workers like regular scraper results."
      />
      <ManualLinksForm />
    </section>
  );
}
