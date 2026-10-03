import { HStack, Heading, Text, VStack } from "@astryxdesign/core";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <HStack justify="between" vAlign="start" gap={3} wrap="wrap" style={{ marginBottom: 16 }}>
      <VStack gap={0.5}>
        {/* level 1 = 24px, the old Radix size="6" page title (and its default <h1>). */}
        <Heading level={1}>{title}</Heading>
        {description && (
          <Text size="sm" color="secondary">
            {description}
          </Text>
        )}
      </VStack>
      {actions}
    </HStack>
  );
}
