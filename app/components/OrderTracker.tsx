"use client";

import type { ComponentType } from "react";
import {
  Camera,
  Check,
  CheckCircle,
  Clock,
  Package,
  Share2,
  Truck,
  Video,
} from "lucide-react";
import type { OrderTracking } from "@/types";
import { cn } from "@/lib/utils";

const STATUS_ICONS: Record<string, ComponentType<{ className?: string }>> = {
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
    <div className="max-w-xs rounded-lg border border-kira-line bg-white px-4 py-3 animate-fade-up">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase text-kira-muted">
            Order Tracking
          </p>
          <p className="mt-0.5 text-xs font-semibold text-kira-text">
            {tracking.statusDisplay || tracking.currentStatus || "Processing"}
          </p>
        </div>
        {tracking.orderNumber && (
          <span className="rounded-md border border-kira-line bg-kira-bg px-2 py-0.5 font-mono text-[10px] text-kira-muted">
            #{tracking.orderNumber}
          </span>
        )}
      </div>

      {(tracking.deliveryDate || tracking.items?.length) && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {tracking.deliveryDate && (
            <div className="rounded-lg border border-kira-line bg-kira-bg px-2.5 py-2">
              <p className="text-[10px] text-kira-muted">Delivery</p>
              <p className="truncate text-xs font-semibold text-kira-text">
                {tracking.deliveryDate}
              </p>
            </div>
          )}
          {tracking.items?.length ? (
            <div className="rounded-lg border border-kira-line bg-kira-bg px-2.5 py-2">
              <p className="text-[10px] text-kira-muted">Items</p>
              <p className="text-xs font-semibold text-kira-text">
                {tracking.items.length}
              </p>
            </div>
          ) : null}
        </div>
      )}

      <ol className="relative ml-3 space-y-3 border-l border-kira-line">
        {tracking.timeline.map((event, i) => {
          const Icon = getIcon(event.status);
          const isLast = i === tracking.timeline.length - 1;
          const isCurrent =
            event.status.toLowerCase() === tracking.currentStatus.toLowerCase() ||
            (isLast && !tracking.timeline.some((e) => e.status === tracking.currentStatus));
          return (
            <li key={i} className="relative pl-4">
              <span
                className={cn(
                  "absolute -left-[9px] top-0.5 flex size-4 items-center justify-center rounded-full border-2 transition-colors",
                  event.done
                    ? "bg-emerald-500 border-emerald-500"
                    : isCurrent
                    ? "bg-kap-purple border-kap-purple animate-pulse"
                    : "bg-white border-kira-border"
                )}
                aria-label={event.done ? "Done" : isCurrent ? "Current" : "Pending"}
              >
                {event.done ? (
                  <Check className="size-2.5 text-white" />
                ) : isCurrent ? (
                  <Icon className="size-2.5 text-white" />
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
                <p className="mt-0.5 text-[10px] text-kira-muted">
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
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tracking.liveTrackingAvailable && (
            <MediaPill icon={Truck} label="Live tracking" />
          )}
          {tracking.hasDeliveryPhoto && <MediaPill icon={Camera} label="Photo" />}
          {tracking.hasDeliveryVideo && <MediaPill icon={Video} label="Video" />}
        </div>
      )}

      {/* WhatsApp share — let the sender loop in family */}
      {tracking.orderNumber && (
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Tracking Kapruka order #${tracking.orderNumber} — current status: ${tracking.statusDisplay ?? tracking.currentStatus}. Check live: https://www.kapruka.com/order/${tracking.orderNumber}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-kira-line bg-kira-bg px-3 py-2 text-[11px] font-semibold text-kira-muted transition-colors hover:text-kira-text"
          aria-label="Share tracking on WhatsApp"
        >
          <Share2 className="size-3 text-green-500" />
          Share tracking on WhatsApp
        </a>
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
    <span className="inline-flex items-center gap-1 rounded-md bg-kap-purple/10 px-2 py-1 text-[10px] font-bold text-kap-purple">
      <Icon className="size-3" />
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
