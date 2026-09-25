import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import { Button, Flex, Text } from "@radix-ui/themes";
import { Link, useLocation } from "react-router";
import { useI18n } from "~/i18n/context";

type Props = { total: number; page: number; pageSize: number };

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
    <Flex justify="between" align="center" mt="3">
      <Text size="2" color="gray">
        {total === 0 ? t("pagination.empty") : t("pagination.range", { from, to, total })}
      </Text>
      <Flex gap="2">
        <Button asChild={page > 1} variant="soft" color="gray" disabled={page <= 1}>
          {page > 1 ? (
            <Link to={hrefFor(page - 1)}>
              <ChevronLeftIcon /> {t("common.previous")}
            </Link>
          ) : (
            <span>
              <ChevronLeftIcon /> {t("common.previous")}
            </span>
          )}
        </Button>
        <Button asChild={page < pages} variant="soft" color="gray" disabled={page >= pages}>
          {page < pages ? (
            <Link to={hrefFor(page + 1)}>
              {t("common.next")} <ChevronRightIcon />
            </Link>
          ) : (
            <span>
              {t("common.next")} <ChevronRightIcon />
            </span>
          )}
        </Button>
      </Flex>
    </Flex>
  );
}
