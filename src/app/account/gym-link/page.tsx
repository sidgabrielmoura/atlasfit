import { GymLinkConfirmation } from "@/components/privacy/gym-link-confirmation";
export const metadata = { title: "Autorizar vínculo | AtlasFit", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function GymLinkPage({ searchParams }: { searchParams: Promise<{ requestId?: string; token?: string }> }) {
  const params = await searchParams;
  return <GymLinkConfirmation requestId={params.requestId || ""} token={params.token || ""} />;
}
