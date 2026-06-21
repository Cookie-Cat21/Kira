import { redirect } from "next/navigation";

export const metadata = {
  title: "Track order — Kapruka",
  description: "Track your Kapruka delivery with Kira — live order status.",
};

export default function TrackPage() {
  redirect("/shop#track");
}
