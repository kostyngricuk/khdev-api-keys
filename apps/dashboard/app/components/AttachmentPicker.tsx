import { ArchiveIcon, Cross2Icon, FileIcon, FileTextIcon, ImageIcon, UploadIcon } from "@radix-ui/react-icons";
import { Flex, IconButton, Text } from "@radix-ui/themes";
import { useId, useRef, useState } from "react";
import { useI18n } from "~/i18n/context";
import { addAttachments, formatFileSize, type AttachmentError, type AttachmentLimits } from "~/lib/attachments";

type Props = {
  files: File[];
  onChange: (files: File[]) => void;
  limits: AttachmentLimits;
  accept: string;
  label: string;
};

function iconFor(file: File) {
  if (file.type.startsWith("image/")) return <ImageIcon />;
  if (file.type === "text/plain") return <FileTextIcon />;
  if (file.type.includes("zip") || file.name.toLowerCase().endsWith(".zip")) return <ArchiveIcon />;
  return <FileIcon />;
}

/** Drop zone + file list with per-file remove, enforcing the count/size/type limits as files are added. */
export function AttachmentPicker({ files, onChange, limits, accept, label }: Props) {
  const { t, locale } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<AttachmentError[]>([]);
  const full = files.length >= limits.maxFiles;
  const units = { b: t("support.sizeB"), kb: t("support.sizeKb"), mb: t("support.sizeMb") };

  function add(incoming: File[]) {
    const result = addAttachments(files, incoming, limits);
    setErrors(result.errors);
    onChange(result.files);
  }

  function remove(index: number) {
    setErrors([]);
    onChange(files.filter((_, i) => i !== index));
  }

  const errorText = (error: AttachmentError) =>
    ({
      tooMany: t("support.attachTooMany", { name: error.name, max: limits.maxFiles }),
      tooLarge: t("support.attachTooLarge", { name: error.name }),
      type: t("support.attachType", { name: error.name }),
      duplicate: t("support.attachDuplicate", { name: error.name }),
    })[error.code];

  return (
    <Flex direction="column" gap="2">
      <Flex justify="between" align="baseline">
        <Text size="2" weight="medium">
          {label}
        </Text>
        <Text size="1" color="gray">
          {t("support.filesCount", { n: files.length, max: limits.maxFiles })}
        </Text>
      </Flex>

      {!full && (
        <div
          className={`attach-drop${dragging ? " is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            add(Array.from(event.dataTransfer.files));
          }}
        >
          <UploadIcon width={20} height={20} color="var(--accent-9)" aria-hidden />
          <Text size="2">
            {t("support.dropHint")}{" "}
            <button type="button" className="attach-choose" onClick={() => inputRef.current?.click()} aria-describedby={hintId}>
              {t("support.chooseFiles")}
            </button>
          </Text>
          <Text id={hintId} size="1" color="gray">
            {t("support.attachmentsHint", { max: limits.maxFiles })}
          </Text>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={accept}
            hidden
            onChange={(event) => {
              add(Array.from(event.currentTarget.files ?? []));
              // Allow picking the same file again after removing it.
              event.currentTarget.value = "";
            }}
          />
        </div>
      )}

      {files.length > 0 && (
        <ul className="attach-list">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="attach-item">
              <span className="attach-icon">{iconFor(file)}</span>
              <Text size="2" truncate style={{ flex: 1, minWidth: 0 }}>
                {file.name}
              </Text>
              <Text size="1" color="gray" style={{ whiteSpace: "nowrap" }}>
                {formatFileSize(file.size, units, locale)}
              </Text>
              <IconButton
                type="button"
                size="1"
                variant="ghost"
                color="gray"
                aria-label={t("support.removeFile", { name: file.name })}
                onClick={() => remove(index)}
              >
                <Cross2Icon />
              </IconButton>
            </li>
          ))}
        </ul>
      )}

      {errors.length > 0 && (
        <Flex direction="column" gap="1" role="alert">
          {errors.map((error) => (
            <Text key={`${error.code}-${error.name}`} size="1" color="red">
              {errorText(error)}
            </Text>
          ))}
        </Flex>
      )}
    </Flex>
  );
}
