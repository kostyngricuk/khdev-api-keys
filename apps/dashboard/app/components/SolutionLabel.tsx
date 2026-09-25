import { Flex, Text } from "@radix-ui/themes";
import type { KeySolution, Platform } from "@khdev/contracts";
import { PlatformIcon } from "./PlatformIcon";

/** Solution name with its platform logo, used instead of a separate Platform column. */
export function SolutionLabel({ solution, platform }: { solution: KeySolution; platform: Platform }) {
  return (
    <Flex align="center" gap="2">
      <PlatformIcon platform={platform} />
      <Text size="2" style={{ whiteSpace: "nowrap" }}>
        {solution.name}
      </Text>
    </Flex>
  );
}
