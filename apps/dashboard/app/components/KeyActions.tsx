import {
  AlertDialog,
  Button,
  Dialog,
  DialogHeader,
  DropdownMenu,
  HStack,
  Icon,
  NumberInput,
  VStack,
  type DropdownMenuOption,
} from "@astryxdesign/core";
import { MoreHorizontal } from "lucide-react";
import type { CustomerKey } from "@khdev/contracts";
import { useState } from "react";
import { useFetcher } from "react-router";
import { useI18n } from "~/i18n/context";
import type { ActionResult } from "~/lib/actions.server";
import { useActionToast } from "./Toaster";

type Props = {
  keyItem: Pick<CustomerKey, "id" | "status" | "activationLimit" | "activationsUsed">;
  canEditLimit?: boolean;
};

/** Row actions shared by the customer and admin key tables. Each page's action handles the intents. */
export function KeyActions({ keyItem, canEditLimit = false }: Props) {
  const { t } = useI18n();
  const fetcher = useFetcher<ActionResult>();
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [limitOpen, setLimitOpen] = useState(false);
  const [limit, setLimit] = useState(keyItem.activationLimit);
  useActionToast(fetcher.data, () => setLimitOpen(false));
  const busy = fetcher.state !== "idle";

  const submit = (intent: string, extra: Record<string, string> = {}) =>
    fetcher.submit({ intent, id: keyItem.id, ...extra }, { method: "post" });

  const items: DropdownMenuOption[] = [
    ...(keyItem.status === "expired"
      ? [{ label: t("keyActions.extend"), onClick: () => submit("extend") }]
      : [
          { label: t("keyActions.regenerate"), onClick: () => setConfirmRegenerate(true) },
          keyItem.status === "active"
            ? { label: t("keyActions.deactivate"), onClick: () => submit("status", { status: "inactive" }) }
            : { label: t("keyActions.activate"), onClick: () => submit("status", { status: "active" }) },
        ]),
    ...(canEditLimit
      ? ([{ type: "divider" }, { label: t("keyActions.changeLimit"), onClick: () => setLimitOpen(true) }] as DropdownMenuOption[])
      : []),
  ];

  return (
    <>
      <DropdownMenu
        button={{
          label: t("keyActions.menu"),
          icon: <Icon icon={MoreHorizontal} size="sm" color="inherit" />,
          variant: "ghost",
          size: "sm",
          isIconOnly: true,
          isLoading: busy,
        }}
        hasChevron={false}
        placement="below"
        alignment="end"
        items={items}
      />

      <AlertDialog
        isOpen={confirmRegenerate}
        onOpenChange={setConfirmRegenerate}
        title={t("keyActions.regenerateTitle")}
        description={t("keyActions.regenerateText", { limit: keyItem.activationLimit })}
        cancelLabel={t("common.cancel")}
        actionLabel={t("keyActions.regenerate")}
        onAction={() => {
          setConfirmRegenerate(false);
          submit("regenerate");
        }}
        width={440}
      />

      {canEditLimit && (
        <Dialog isOpen={limitOpen} onOpenChange={setLimitOpen} width={400}>
          <DialogHeader
            title={t("keyActions.limitTitle")}
            subtitle={t("keyActions.limitText", { used: keyItem.activationsUsed })}
            onOpenChange={setLimitOpen}
          />
          <fetcher.Form method="post">
            <input type="hidden" name="intent" value="limit" />
            <input type="hidden" name="id" value={keyItem.id} />
            <VStack gap={3}>
              <NumberInput
                label={t("keyActions.limitLabel")}
                value={limit ?? undefined}
                onChange={(value) => setLimit(value)}
                min={1}
                max={100}
                isRequired
                htmlName="limit"
              />
              <HStack gap={2} justify="end">
                <Button variant="secondary" type="button" label={t("common.cancel")} onClick={() => setLimitOpen(false)} />
                <Button type="submit" variant="primary" isLoading={busy} label={t("common.save")} />
              </HStack>
            </VStack>
          </fetcher.Form>
        </Dialog>
      )}
    </>
  );
}
