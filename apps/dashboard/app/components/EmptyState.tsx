import { EmptyState as AstryxEmptyState } from "@astryxdesign/core";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return <AstryxEmptyState title={title} description={hint} isCompact />;
}
