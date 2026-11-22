// Page routes (booklet 10.2). Owned by the lead. Each track fills its own page component.
import { SellerApp } from "./seller/SellerApp";
import { JoinPage } from "./buyer/JoinPage";
import { BuyPage } from "./buyer/BuyPage";
import { StagePage } from "./stage/StagePage";
import { AdminPage } from "./stage/admin/AdminPage";
import { DemoPage } from "./stage/DemoPage";
import { RestaurantApp } from "./restaurant/RestaurantApp";
import { SoundCheck } from "./ui/SoundCheck";

export function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/seller") return <SellerApp />;
  if (path === "/join") return <JoinPage />;
  const buy = path.match(/^\/buy\/([^/]+)$/);
  if (buy) return <BuyPage listingId={decodeURIComponent(buy[1])} token={new URLSearchParams(window.location.search).get("t")} />;
  if (path === "/stage") return <StagePage />;
  if (path === "/admin") return <AdminPage />;
  if (path === "/demo") return <DemoPage />;
  if (path === "/restaurant") return <RestaurantApp />;
  if (path === "/sounds") return <SoundCheck />;

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-h1 text-ink">Ctrl+Z Eats</h1>
      <p className="mt-2 text-stone">You can't cancel once it's cooking. With us, you can Ctrl+Z it.</p>
      <ul className="mt-6 space-y-2">
        {["/demo", "/seller", "/join", "/restaurant", "/stage", "/admin"].map((p) => (
          <li key={p}>
            <a className="text-forest underline" href={p}>{p}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
