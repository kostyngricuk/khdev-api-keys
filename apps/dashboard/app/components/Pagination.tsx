import { Button, HStack, Icon, Text } from "@astryxdesign/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLocation } from "react-router";
import { useI18n } from "~/i18n/context";

type Props = { total: number; page: number; pageSize: number };

// A Button pair (not Astryx's Pagination component, whose labels are fixed to its
// own English i18n) so the app keeps its RU strings and URL-driven page param.
export function Pagination({ total, page, pageSize }: Props) {
  const { t } = useI18n();
  const location = useLocation();
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const hrefFor = (target: number) => {
    const params = new URLSearchParams(location.search);
    params.set("page", String(target));
    return `${location.pathname}?${params.toString()}`;
  };
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <HStack justify="between" vAlign="center" style={{ marginTop: 12 }}>
      <Text size="sm" color="secondary">
        {total === 0 ? t("pagination.empty") : t("pagination.range", { from, to, total })}
      </Text>
      <HStack gap={2}>
        <Button
          variant="secondary"
          size="sm"
          icon={<Icon icon={ChevronLeft} size="sm" color="inherit" />}
          label={t("common.previous")}
          isDisabled={page <= 1}
          href={page > 1 ? hrefFor(page - 1) : undefined}
        />
        <Button
          variant="secondary"
          size="sm"
          label={t("common.next")}
          endContent={<Icon icon={ChevronRight} size="sm" color="inherit" />}
          isDisabled={page >= pages}
          href={page < pages ? hrefFor(page + 1) : undefined}
        />
      </HStack>
    </HStack>
  );
}
