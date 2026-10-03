import { Icon, IconButton, Tooltip } from "@astryxdesign/core";
import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { useI18n } from "~/i18n/context";

export function CopyButton({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip content={copied ? t("keys.copied") : t("keys.copy")}>
      <IconButton
        label={t("keys.copy")}
        variant="ghost"
        size="sm"
        icon={<Icon icon={copied ? Check : Copy} size="sm" color={copied ? "success" : "inherit"} />}
        onClick={async () => {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
      />
    </Tooltip>
  );
}
