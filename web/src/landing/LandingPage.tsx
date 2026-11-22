// Landing page at "/" (round 6). Track B builds it here: see docs/design-round-2.md "Round 6". Placeholder from the lead.
export function LandingPage() {
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-h1 text-ink">Ctrl+Z Eats</h1>
      <p className="mt-2 text-stone">Undo your food order.</p>
      <ul className="mt-6 space-y-2">
        {["/demo", "/seller", "/join", "/restaurant?r=r_fiveguys", "/stage", "/admin", "/sounds"].map((p) => (
          <li key={p}>
            <a className="text-forest underline" href={p}>{p}</a>
          </li>
        ))}
      </ul>
    </main>
  );
}
