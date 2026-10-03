import { Button, Card, DateInput, HStack, Icon, Selector, TextInput } from "@astryxdesign/core";
import { Search } from "lucide-react";
import { PLATFORMS, type Solution } from "@khdev/contracts";
import { useState } from "react";
import { Form, useLocation } from "react-router";
import { useI18n } from "~/i18n/context";
import type { Filters as FilterValues } from "~/lib/filters";
import { platformLabel } from "~/lib/format";

type Props = {
  filters: FilterValues;
  /** When given, a Solution select is shown (key pages). */
  solutions?: Pick<Solution, "slug" | "name">[];
  statuses: readonly string[];
  showEmail?: boolean;
  showStatus?: boolean;
};

/** DateInput's ISODateString (not re-exported by core); parseFilters already validates this shape. */
type ISODate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

/** A GET form: filters are kept in the URL and read by the route loader. */
export function Filters({ filters, statuses, solutions, showEmail = false, showStatus = true }: Props) {
  const { t, locale, solutionName } = useI18n();
  const location = useLocation();
  // Astryx inputs are strictly controlled; seed local state from the URL. The form's
  // key={location.search} remounts this tree on every navigation and re-seeds it.
  const [dateFrom, setDateFrom] = useState(filters.dateFrom ?? "");
  const [dateTo, setDateTo] = useState(filters.dateTo ?? "");
  const [solution, setSolution] = useState(filters.solution ?? "all");
  const [platform, setPlatform] = useState(filters.platform ?? "all");
  const [status, setStatus] = useState(filters.status ?? "all");
  const [email, setEmail] = useState(filters.email ?? "");

  return (
    <Card style={{ marginBottom: 16 }}>
      <Form method="get" key={location.search}>
        <HStack gap={3} wrap="wrap" vAlign="end">
          {/* DateInput has no htmlName, so the native GET form reads hidden inputs. */}
          <DateInput
            label={t("filters.dateFrom")}
            value={dateFrom ? (dateFrom as ISODate) : undefined}
            onChange={(value) => setDateFrom(value ?? "")}
            presentation="native"
          />
          <input type="hidden" name="dateFrom" value={dateFrom} />
          <DateInput
            label={t("filters.dateTo")}
            value={dateTo ? (dateTo as ISODate) : undefined}
            onChange={(value) => setDateTo(value ?? "")}
            presentation="native"
          />
          <input type="hidden" name="dateTo" value={dateTo} />
          {solutions && (
            <Selector
              label={t("filters.solution")}
              options={[
                { value: "all", label: t("filters.allSolutions") },
                ...solutions.map((s) => ({ value: s.slug, label: solutionName(s) })),
              ]}
              value={solution}
              onChange={setSolution}
              htmlName="solution"
            />
          )}
          <Selector
            label={t("filters.platform")}
            options={[
              { value: "all", label: t("filters.allPlatforms") },
              ...PLATFORMS.map((p) => ({ value: p, label: platformLabel(p, locale) })),
            ]}
            value={platform}
            onChange={setPlatform}
            htmlName="platform"
          />
          {showStatus && (
            <Selector
              label={t("filters.status")}
              options={[
                { value: "all", label: t("filters.allStatuses") },
                ...statuses.map((s) => ({ value: s, label: t(`status.${s}`) })),
              ]}
              value={status}
              onChange={setStatus}
              htmlName="status"
            />
          )}
          {showEmail && (
            <TextInput
              label={t("filters.email")}
              value={email}
              onChange={(value) => setEmail(value)}
              placeholder={t("filters.emailPlaceholder")}
              startIcon={<Icon icon={Search} size="sm" color="secondary" />}
              htmlName="email"
            />
          )}
          <HStack gap={2}>
            <Button type="submit" variant="primary" label={t("common.apply")} />
            <Button variant="secondary" label={t("common.reset")} href={location.pathname} />
          </HStack>
        </HStack>
      </Form>
    </Card>
  );
}
