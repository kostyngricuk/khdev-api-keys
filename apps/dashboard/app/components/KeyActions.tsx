import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { AlertDialog, Button, Dialog, DropdownMenu, Flex, IconButton, Text, TextField } from "@radix-ui/themes";
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
  useActionToast(fetcher.data, () => setLimitOpen(false));
  const busy = fetcher.state !== "idle";

  const submit = (intent: string, extra: Record<string, string> = {}) =>
    fetcher.submit({ intent, id: keyItem.id, ...extra }, { method: "post" });

  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          <IconButton variant="ghost" color="gray" aria-label={t("keyActions.menu")} loading={busy}>
            <DotsHorizontalIcon />
          </IconButton>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end">
          {keyItem.status === "expired" ? (
            <DropdownMenu.Item onSelect={() => submit("extend")}>{t("keyActions.extend")}</DropdownMenu.Item>
          ) : (
            <>
              <DropdownMenu.Item onSelect={() => setConfirmRegenerate(true)}>{t("keyActions.regenerate")}</DropdownMenu.Item>
              {keyItem.status === "active" ? (
                <DropdownMenu.Item onSelect={() => submit("status", { status: "inactive" })}>{t("keyActions.deactivate")}</DropdownMenu.Item>
              ) : (
                <DropdownMenu.Item onSelect={() => submit("status", { status: "active" })}>{t("keyActions.activate")}</DropdownMenu.Item>
              )}
            </>
          )}
          {canEditLimit && (
            <>
              <DropdownMenu.Separator />
              <DropdownMenu.Item onSelect={() => setLimitOpen(true)}>{t("keyActions.changeLimit")}</DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <AlertDialog.Root open={confirmRegenerate} onOpenChange={setConfirmRegenerate}>
        <AlertDialog.Content maxWidth="440px">
          <AlertDialog.Title>{t("keyActions.regenerateTitle")}</AlertDialog.Title>
          <AlertDialog.Description size="2">
            {t("keyActions.regenerateText", { limit: keyItem.activationLimit })}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Cancel>
              <Button variant="outline" color="gray" highContrast>
                {t("common.cancel")}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action>
              <Button color="red" onClick={() => submit("regenerate")}>
                {t("keyActions.regenerate")}
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {canEditLimit && (
        <Dialog.Root open={limitOpen} onOpenChange={setLimitOpen}>
          <Dialog.Content maxWidth="400px">
            <Dialog.Title>{t("keyActions.limitTitle")}</Dialog.Title>
            <Dialog.Description size="2" mb="3">
              {t("keyActions.limitText", { used: keyItem.activationsUsed })}
            </Dialog.Description>
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="limit" />
              <input type="hidden" name="id" value={keyItem.id} />
              <Flex direction="column" gap="3">
                <label>
                  <Text as="div" size="2" mb="1" weight="medium">
                    {t("keyActions.limitLabel")}
                  </Text>
                  <TextField.Root name="limit" type="number" min={1} max={100} required defaultValue={keyItem.activationLimit} />
                </label>
                <Flex gap="3" justify="end">
                  <Dialog.Close>
                    <Button variant="outline" color="gray" highContrast type="button">
                      {t("common.cancel")}
                    </Button>
                  </Dialog.Close>
                  <Button type="submit" loading={busy}>
                    {t("common.save")}
                  </Button>
                </Flex>
              </Flex>
            </fetcher.Form>
          </Dialog.Content>
        </Dialog.Root>
      )}
    </>
  );
}
