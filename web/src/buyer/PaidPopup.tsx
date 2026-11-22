// The Stripe popup's last page (/join?paid=<id> inside the "ctrlz-pay" window, opened from a /demo or /stage frame).
// The frame that opened it gets the pass over /ws and shows B5 itself, so this window only says "Paid!" and closes.
// It does not read, save or overwrite the buyer.
import { useEffect } from "react";
import { Mascot } from "../ui";
import { BottomButton } from "./ui";
import { PAY_WINDOW } from "./useOfferFlow";

/** True on /join?paid=… when this window is the payment popup. */
export function isPaidPopup(): boolean {
  if (!new URLSearchParams(window.location.search).get("paid")) return false;
  try {
    return window.self === window.top && (window.opener !== null || window.name === PAY_WINDOW);
  } catch {
    return false;
  }
}

export function PaidPopup() {
  useEffect(() => {
    const t = setTimeout(() => window.close(), 1500);
    return () => clearTimeout(t);
  }, []);
  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-[390px] flex-col items-center justify-center bg-mint px-6 text-center">
      <Mascot pose="thumbsup" motion="bounce" size={140} />
      <h1 className="ui-pop-in mt-4 text-h2 text-ink">Paid! You can close this window.</h1>
      <div className="mt-8 w-full">
        <BottomButton onClick={() => window.close()} arrow={false}>
          Close
        </BottomButton>
      </div>
    </main>
  );
}
