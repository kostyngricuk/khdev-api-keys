import { CheckIcon, ExclamationTriangleIcon } from "@radix-ui/react-icons";
import { Card, Flex, Text } from "@radix-ui/themes";
import { Toast } from "radix-ui";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ActionResult } from "~/lib/actions.server";

type Notice = { id: number; kind: "success" | "error"; text: string };

const ToastContext = createContext<(kind: Notice["kind"], text: string) => void>(() => {});

export function Toaster({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<Notice[]>([]);
  const nextId = useRef(1);
  const notify = useCallback((kind: Notice["kind"], text: string) => {
    setNotices((list) => [...list, { id: nextId.current++, kind, text }]);
  }, []);

  return (
    <ToastContext.Provider value={notify}>
      <Toast.Provider swipeDirection="right" duration={4000}>
        {children}
        {notices.map((notice) => (
          <Toast.Root
            key={notice.id}
            onOpenChange={(open) => !open && setNotices((list) => list.filter((n) => n.id !== notice.id))}
            asChild
          >
            <Card style={{ minWidth: 280 }}>
              <Flex align="center" gap="2">
                {notice.kind === "success" ? (
                  <CheckIcon color="var(--green-9)" />
                ) : (
                  <ExclamationTriangleIcon color="var(--red-9)" />
                )}
                <Toast.Description asChild>
                  <Text size="2">{notice.text}</Text>
                </Toast.Description>
              </Flex>
            </Card>
          </Toast.Root>
        ))}
        <Toast.Viewport
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 1000,
            listStyle: "none",
            margin: 0,
            padding: 0,
          }}
        />
      </Toast.Provider>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

/** Shows a toast whenever a fetcher finishes with an ActionResult. */
export function useActionToast(result: ActionResult | undefined, onSuccess?: () => void) {
  const notify = useToast();
  useEffect(() => {
    if (!result) return;
    if (result.ok) {
      notify("success", result.message);
      onSuccess?.();
    } else {
      notify("error", result.error);
    }
    // Only react to a new result object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);
}
