import { permanentRedirect } from "next/navigation";

/** Store home lives at `/` — keep `/shop` for old links. */
export default function ShopHomePage() {
  permanentRedirect("/");
}
