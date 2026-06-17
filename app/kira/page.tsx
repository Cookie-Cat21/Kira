import { permanentRedirect } from "next/navigation";

// The full-screen Kira experience moved back to the root route. Keep /kira
// alive for old links and shared URLs.
export default function KiraPage() {
  permanentRedirect("/");
}
