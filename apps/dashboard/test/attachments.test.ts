import { describe, expect, it } from "vitest";
import { addAttachments, formatFileSize, type AttachmentLimits } from "~/lib/attachments";

const limits: AttachmentLimits = {
  maxFiles: 3,
  maxBytes: 5 * 1024 * 1024,
  mimeTypes: ["image/png", "image/jpeg", "application/pdf", "application/zip", "text/plain"],
  extensions: [".png", ".jpg", ".jpeg", ".pdf", ".zip", ".txt"],
};
const file = (name: string, size: number, type = "text/plain") => ({ name, size, type, lastModified: 1 });

describe("addAttachments", () => {
  it("adds allowed files", () => {
    const result = addAttachments([], [file("a.txt", 10), file("b.png", 20, "image/png")], limits);
    expect(result.files.map((f) => f.name)).toEqual(["a.txt", "b.png"]);
    expect(result.errors).toEqual([]);
  });

  it("keeps at most 3 files and reports the rest", () => {
    const result = addAttachments([file("a.txt", 1)], [file("b.txt", 1), file("c.txt", 1), file("d.txt", 1)], limits);
    expect(result.files.map((f) => f.name)).toEqual(["a.txt", "b.txt", "c.txt"]);
    expect(result.errors).toEqual([{ code: "tooMany", name: "d.txt" }]);
  });

  it("rejects files over 5 MB", () => {
    const result = addAttachments([], [file("big.zip", 5 * 1024 * 1024 + 1, "application/zip")], limits);
    expect(result.files).toEqual([]);
    expect(result.errors).toEqual([{ code: "tooLarge", name: "big.zip" }]);
  });

  it("rejects file types that are not allowed", () => {
    const result = addAttachments([], [file("setup.exe", 10, "application/x-msdownload")], limits);
    expect(result.errors).toEqual([{ code: "type", name: "setup.exe" }]);
  });

  it("accepts an allowed extension when the browser reports no MIME type", () => {
    expect(addAttachments([], [file("logs.zip", 10, "")], limits).files).toHaveLength(1);
  });

  it("skips the same file picked twice", () => {
    const a = file("a.txt", 10);
    const result = addAttachments([a], [file("a.txt", 10)], limits);
    expect(result.files).toHaveLength(1);
    expect(result.errors).toEqual([{ code: "duplicate", name: "a.txt" }]);
  });
});

describe("formatFileSize", () => {
  const units = { b: "Б", kb: "КБ", mb: "МБ" };
  it("uses bytes, kilobytes and megabytes", () => {
    expect(formatFileSize(512, units, "ru")).toBe("512 Б");
    expect(formatFileSize(2048, units, "ru")).toBe("2 КБ");
    expect(formatFileSize(1.5 * 1024 * 1024, units, "ru")).toBe("1,5 МБ");
  });
});
