// Track B: /buy/:listingId?t=<buyerToken>, opened from the Telegram "Buy now" button (booklet 7). Placeholder from track 0.
export function BuyPage({ listingId }: { listingId: string; token: string | null }) {
  return (
    <main className="mx-auto max-w-[390px] p-6">
      <h1 className="text-h2">Offer {listingId}</h1>
      <p className="mt-2 text-small text-stone">Track B opens B3 here for this listing.</p>
    </main>
  );
}
