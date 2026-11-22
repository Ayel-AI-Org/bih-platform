import { useToast, TOAST_DEFAULT_DURATION, TOAST_DESTRUCTIVE_DURATION } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider duration={TOAST_DEFAULT_DURATION}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        const duration = props.duration ?? (props.variant === "destructive" ? TOAST_DESTRUCTIVE_DURATION : TOAST_DEFAULT_DURATION);
        return (
          <Toast key={id} duration={duration} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
