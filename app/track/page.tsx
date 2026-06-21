import { getCategories } from "@/lib/catalog";
import TrackOrderClient from "@/app/components/store/TrackOrderClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track order — Kapruka",
  description: "Track your Kapruka delivery with Kira — live order status.",
};

export default async function TrackPage() {
  const categories = await getCategories();
  return <TrackOrderClient categories={categories} />;
}
