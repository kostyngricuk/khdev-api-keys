import { HStack, Text } from "@astryxdesign/core";
import type { KeySolution, Platform } from "@khdev/contracts";
import { useI18n } from "~/i18n/context";
import { PlatformIcon } from "./PlatformIcon";

/** Solution name with its platform logo, used instead of a separate Platform column. */
export function SolutionLabel({ solution, platform }: { solution: KeySolution; platform: Platform }) {
  const { solutionName } = useI18n();
  return (
    <HStack gap={2} vAlign="center">
      <PlatformIcon platform={platform} />
      <Text size="sm" style={{ whiteSpace: "nowrap" }}>
        {solutionName(solution)}
      </Text>
    </HStack>
  );
}
