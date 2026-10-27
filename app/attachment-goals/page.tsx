import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { AttachmentGoals } from "@/components/attachment-goals";

export const metadata: Metadata = { title: "Attachment Goals" };

export default function AttachmentGoalsPage() {
  return (
    <PageShell title="Attachment Goals" description="Track each district's shared monthly DM and SEM goal, then open its district rollup to review accounts and contributions.">
      <AttachmentGoals />
    </PageShell>
  );
}
