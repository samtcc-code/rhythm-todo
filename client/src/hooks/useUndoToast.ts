import { useRef, useCallback } from "react";
import { toast } from "sonner";

interface UndoToastOptions {
  message: string;
  onUndo: () => void;
  duration?: number;
}

export function useUndoToast() {
  const toastIdRef = useRef<string | number | null>(null);

  const showUndo = useCallback(({ message, onUndo, duration = 5000 }: UndoToastOptions) => {
    if (toastIdRef.current !== null) {
      toast.dismiss(toastIdRef.current);
    }

    toastIdRef.current = toast(message, {
      duration,
      action: {
        label: "Undo",
        onClick: () => {
          onUndo();
          if (toastIdRef.current !== null) {
            toast.dismiss(toastIdRef.current);
            toastIdRef.current = null;
          }
        },
      },
      onDismiss: () => { toastIdRef.current = null; },
      onAutoClose: () => { toastIdRef.current = null; },
    });
  }, []);

  return { showUndo };
}
