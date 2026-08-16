import { useEffect, useRef } from "react";
import { startOutboxDrain, type DrainResult, type OutboxStore } from "./offline-queue.js";

export function useOutboxDrain(handlers: {
  onDayClosed: () => void;
  onDrained?: (result: DrainResult) => void;
  store?: OutboxStore;
}): void {
  const onDayClosed = useRef(handlers.onDayClosed);
  const onDrained = useRef(handlers.onDrained);
  onDayClosed.current = handlers.onDayClosed;
  onDrained.current = handlers.onDrained;

  useEffect(() => {
    return startOutboxDrain({
      ...(handlers.store ? { store: handlers.store } : {}),
      onDayClosed: () => onDayClosed.current(),
      onDrained: (result) => onDrained.current?.(result),
    });
  }, [handlers.store]);
}
