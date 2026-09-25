import { CheckIcon, CopyIcon } from "@radix-ui/react-icons";
import { IconButton, Tooltip } from "@radix-ui/themes";
import { useState } from "react";
import { useI18n } from "~/i18n/context";

export function CopyButton({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip content={copied ? t("keys.copied") : t("keys.copy")}>
      <IconButton
        size="1"
        variant="ghost"
        color={copied ? "green" : "gray"}
        aria-label={t("keys.copy")}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </IconButton>
    </Tooltip>
  );
}
