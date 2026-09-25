import { Flex, Text } from "@radix-ui/themes";

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <Flex direction="column" align="center" gap="1" py="8">
      <Text weight="medium">{title}</Text>
      {hint && (
        <Text size="2" color="gray">
          {hint}
        </Text>
      )}
    </Flex>
  );
}
