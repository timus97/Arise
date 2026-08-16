export type SystemToastProps = {
  message: string;
  onDismiss?: () => void;
};

export function SystemToast({ message, onDismiss }: SystemToastProps) {
  return (
    <div className="sys-toast" role="status">
      <div className="sys-toast-row">
        <span>{message}</span>
        {onDismiss ? (
          <button type="button" className="sys-toast-dismiss" onClick={onDismiss}>
            Dismiss
          </button>
        ) : null}
      </div>
    </div>
  );
}
