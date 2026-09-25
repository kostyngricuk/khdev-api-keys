import { ChevronDownIcon, PaperPlaneIcon, QuestionMarkCircledIcon } from "@radix-ui/react-icons";
import { Box, Button, Card, Dialog, Flex, Heading, Select, Text, TextArea } from "@radix-ui/themes";
import { SUPPORT_MAX_FILE_BYTES, SUPPORT_MAX_FILES, SUPPORT_TOPICS } from "@khdev/contracts";
import { Accordion } from "radix-ui";
import { useState } from "react";
import { useFetcher } from "react-router";
import { PageHeader } from "~/components/PageHeader";
import { useActionToast } from "~/components/Toaster";
import { useI18n } from "~/i18n/context";
import { failAction, runAction } from "~/lib/actions.server";
import type { ActionResult } from "~/lib/actions.server";
import { api } from "~/lib/api.server";
import { requireRole } from "~/lib/auth.server";
import { bodyLimitError, SUPPORT_BODY_LIMIT } from "~/lib/body-limit";
import { pageTitle } from "~/lib/meta";
import type { Route } from "./+types/support";

export const meta: Route.MetaFunction = ({ matches }) => pageTitle(matches, "support.title");

const ACCEPT = ".png,.jpg,.jpeg,.pdf,.zip,.txt";

export async function loader({ request }: Route.LoaderArgs) {
  await requireRole(request, "customer");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  await requireRole(request, "customer");
  const tooLarge = bodyLimitError(request, SUPPORT_BODY_LIMIT);
  if (tooLarge) return failAction(request, tooLarge.code, tooLarge.status);
  const form = await request.formData();
  const body = new FormData();
  body.set("topic", String(form.get("topic") ?? ""));
  body.set("description", String(form.get("description") ?? ""));
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > SUPPORT_MAX_FILES) {
    return failAction(request, "TOO_MANY_FILES", 400);
  }
  for (const file of files) body.append("files", file, file.name);
  return runAction(request, () => api(request, "/support/tickets", { body }), "toast.ticketSent");
}

function AskQuestionDialog() {
  const { t } = useI18n();
  const fetcher = useFetcher<ActionResult>();
  const [open, setOpen] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  useActionToast(fetcher.data, () => setOpen(false));
  const busy = fetcher.state !== "idle";

  function checkFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length > SUPPORT_MAX_FILES) setFileError(t("support.tooManyFiles", { max: SUPPORT_MAX_FILES }));
    else if (files.some((f) => f.size > SUPPORT_MAX_FILE_BYTES)) setFileError(t("support.fileTooLarge"));
    else setFileError(null);
  }

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger>
        <Button>
          <QuestionMarkCircledIcon /> {t("support.askQuestion")}
        </Button>
      </Dialog.Trigger>
      <Dialog.Content maxWidth="520px">
        <Dialog.Title>{t("support.dialogTitle")}</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          {t("support.dialogDescription")}
        </Dialog.Description>
        <fetcher.Form method="post" encType="multipart/form-data">
          <Flex direction="column" gap="4">
            <Flex direction="column" gap="1">
              <Text as="label" size="2" weight="medium">
                {t("support.topic")}
              </Text>
              <Select.Root name="topic" defaultValue="activation" required>
                <Select.Trigger />
                <Select.Content>
                  {SUPPORT_TOPICS.map((topic) => (
                    <Select.Item key={topic} value={topic}>
                      {t(`topics.${topic}`)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
            </Flex>
            <label>
              <Text as="div" size="2" weight="medium" mb="1">
                {t("support.descriptionLabel")}
              </Text>
              <TextArea
                name="description"
                required
                minLength={10}
                maxLength={5000}
                rows={6}
                placeholder={t("support.descriptionPlaceholder")}
              />
            </label>
            <label>
              <Text as="div" size="2" weight="medium" mb="1">
                {t("support.attachments")}
              </Text>
              <input type="file" name="files" multiple accept={ACCEPT} onChange={checkFiles} />
              <Text as="div" size="1" color={fileError ? "red" : "gray"} mt="1">
                {fileError ?? t("support.attachmentsHint", { max: SUPPORT_MAX_FILES })}
              </Text>
            </label>
            <Flex gap="3" justify="end">
              <Dialog.Close>
                <Button variant="outline" color="gray" highContrast type="button">
                  {t("common.cancel")}
                </Button>
              </Dialog.Close>
              <Button type="submit" loading={busy} disabled={Boolean(fileError)}>
                <PaperPlaneIcon /> {t("support.send")}
              </Button>
            </Flex>
          </Flex>
        </fetcher.Form>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default function SupportPage() {
  const { t, dict } = useI18n();
  return (
    <>
      <PageHeader
        title={t("support.title")}
        description={t("support.description")}
        actions={<AskQuestionDialog />}
      />
      <Card size="3" style={{ maxWidth: 820 }}>
        <Heading size="4" mb="2">
          {t("support.faqTitle")}
        </Heading>
        <Accordion.Root type="single" collapsible>
          {dict.faq.map((faq, index) => (
            <Accordion.Item key={faq.question} value={`faq-${index}`} className="faq-item">
              <Accordion.Header asChild>
                <h3 style={{ margin: 0 }}>
                  <Accordion.Trigger className="faq-trigger">
                    <Text size="3">{faq.question}</Text>
                    <ChevronDownIcon aria-hidden />
                  </Accordion.Trigger>
                </h3>
              </Accordion.Header>
              <Accordion.Content>
                <Box pb="3">
                  <Text size="2" color="gray">
                    {faq.answer}
                  </Text>
                </Box>
              </Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion.Root>
      </Card>
    </>
  );
}
