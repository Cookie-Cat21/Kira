"use client";

import type { ComponentType } from "react";
import {
  Camera,
  Check,
  CheckCircle,
  Clock,
  Package,
  Truck,
  Video,
} from "lucide-react";
import type { OrderTracking } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  order_placed: Package,
  confirmed: Package,
  processing: Clock,
  dispatched: Truck,
  shipped: Truck,
  out_for_delivery: Truck,
  delivered: CheckCircle,
  completed: CheckCircle,
};

function getIcon(status: string) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  return STATUS_ICONS[key] ?? Clock;
}

interface Props {
  tracking: OrderTracking;
}

export default function OrderTracker({ tracking }: Props) {
  return (
    <div className="bg-white border border-kira-border rounded-2xl px-4 py-3 max-w-xs animate-fade-up">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-kira-muted">
            Order Tracking
          </p>
          <p className="text-xs font-semibold text-kira-text mt-0.5">
            {tracking.statusDisplay || tracking.currentStatus || "Processing"}
          </p>
        </div>
        {tracking.orderNumber && (
          <span className="text-[10px] font-mono text-kira-muted bg-kira-bg px-2 py-0.5 rounded-full border border-kira-border">
            #{tracking.orderNumber}
          </span>
        )}
      </div>

      {(tracking.deliveryDate || tracking.items?.length) && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {tracking.deliveryDate && (
            <div className="rounded-xl bg-kira-bg border border-kira-border px-2.5 py-2">
              <p className="text-[10px] text-kira-muted">Delivery</p>
              <p className="text-xs font-semibold text-kira-text truncate">
                {tracking.deliveryDate}
              </p>
            </div>
          )}
          {tracking.items?.length ? (
            <div className="rounded-xl bg-kira-bg border border-kira-border px-2.5 py-2">
              <p className="text-[10px] text-kira-muted">Items</p>
              <p className="text-xs font-semibold text-kira-text">
                {tracking.items.length}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <ol className="relative border-l border-kira-border ml-3 space-y-3">
        {tracking.timeline.map((event, i) => {
          const Icon = getIcon(event.status);
          const isLast = i === tracking.timeline.length - 1;
          const isCurrent =
            event.status.toLowerCase() === tracking.currentStatus.toLowerCase() ||
            (isLast && !tracking.timeline.some((e) => e.status === tracking.currentStatus));
          return (
            <li key={i} className="pl-4 relative">
              <span
                className={cn(
                  "absolute -left-[9px] top-0.5 w-4 h-4 rounded-full flex items-center justify-center border-2 transition-colors",
                  event.done
                    ? "bg-emerald-500 border-emerald-500"
                    : isCurrent
                    ? "bg-kap-purple border-kap-purple animate-pulse"
                    : "bg-white border-kira-border"
                )}
              >
                {event.done ? (
                  <Check className="w-2.5 h-2.5 text-white" />
                ) : isCurrent ? (
                  <Icon className="w-2.5 h-2.5 text-white" />
                ) : null}
              </span>
              <p
                className={cn(
                  "text-xs font-semibold leading-tight",
                  event.done
                    ? "text-emerald-600"
                    : isCurrent
                    ? "text-kap-purple"
                    : "text-kira-muted"
                )}
              >
                {event.label}
              </p>
              {event.time && (
                <p className="text-[10px] text-kira-muted mt-0.5">
                  {formatTime(event.time)}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      {(tracking.liveTrackingAvailable ||
        tracking.hasDeliveryPhoto ||
        tracking.hasDeliveryVideo) && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {tracking.liveTrackingAvailable && (
            <MediaPill icon={Truck} label="Live tracking" />
          )}
          {tracking.hasDeliveryPhoto && <MediaPill icon={Camera} label="Photo" />}
          {tracking.hasDeliveryVideo && <MediaPill icon={Video} label="Video" />}
        </div>
      )}
    </div>
  );
}

function MediaPill({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-kap-purple/10 text-kap-purple px-2 py-1 text-[10px] font-bold">
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

function formatTime(raw: string): string {
  try {
    return new Date(raw).toLocaleString("en-LK", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return raw;
  }
}
