import { Flex, Text } from "@radix-ui/themes";
import type { Platform } from "@khdev/contracts";
import { PLATFORM_COLORS } from "~/lib/colors";
import { platformLabel } from "~/lib/format";

export function PlatformBadge({ platform }: { platform: Platform }) {
  const color = PLATFORM_COLORS[platform];
  return (
    <Flex
      display="inline-flex"
      align="center"
      gap="2"
      px="2"
      py="1"
      style={{
        borderRadius: 999,
        background: `color-mix(in srgb, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 35%, transparent)`,
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 999, background: color, flexShrink: 0 }} />
      <Text size="1" weight="medium" style={{ whiteSpace: "nowrap" }}>
        {platformLabel(platform)}
      </Text>
    </Flex>
  );
}
