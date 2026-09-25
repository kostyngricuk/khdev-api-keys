import { ChevronDownIcon } from "@radix-ui/react-icons";
import { Badge, DropdownMenu } from "@radix-ui/themes";
import type { StatusColor } from "~/lib/colors";
import { statusLabel } from "~/lib/format";

type Props<T extends string> = {
  value: T;
  options: readonly T[];
  colors: Record<T, StatusColor>;
  disabled?: boolean;
  onSelect: (value: T) => void;
  label: string;
};

/** A status badge that opens a dropdown to change the status; same size as the plain status badges. */
export function StatusMenu<T extends string>({ value, options, colors, disabled, onSelect, label }: Props<T>) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={disabled}>
        <Badge asChild color={colors[value]} variant="soft" radius="full">
          <button type="button" className="status-trigger" aria-label={`${label}: ${statusLabel(value)}. Change status`}>
            {statusLabel(value)}
            <ChevronDownIcon width={12} height={12} />
          </button>
        </Badge>
      </DropdownMenu.Trigger>
      <DropdownMenu.Content size="1">
        {options.map((option) => (
          <DropdownMenu.Item key={option} disabled={option === value} onSelect={() => onSelect(option)}>
            <Badge color={colors[option]} variant="soft" radius="full">
              {statusLabel(option)}
            </Badge>
          </DropdownMenu.Item>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
}
