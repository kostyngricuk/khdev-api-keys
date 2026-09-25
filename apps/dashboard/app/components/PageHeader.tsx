import { Flex, Heading, Text } from "@radix-ui/themes";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <Flex justify="between" align="start" gap="4" mb="4">
      <Flex direction="column" gap="1">
        <Heading size="6">{title}</Heading>
        {description && (
          <Text size="2" color="gray">
            {description}
          </Text>
        )}
      </Flex>
      {actions}
    </Flex>
  );
}
