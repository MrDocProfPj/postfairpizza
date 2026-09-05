import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { CHEESE, CRUSTS, EXTRAS, PEOPLE, SAUCES, SAUCE_CUPS, TOPPINGS } from "./menu";

type Screen =
  | { kind: "home" }
  | { kind: "who" }
  | { kind: "party" }
  | { kind: "builder"; party: string[]; current: string; n: number }
  | { kind: "extras"; party: string[]; current: string };

const isHost = new URLSearchParams(location.search).has("host");

export default function App() {
  const data = useQuery(api.orders.all);
  const setDone = useMutation(api.orders.setDone);
  const [me, setMe] = useState<string | null>(() => localStorage.getItem("me"));
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem("me") ? { kind: "home" } : { kind: "who" }
  );

  useEffect(() => {
    if (me) localStorage.setItem("me", me);
    else localStorage.removeItem("me");
  }, [me]);

  if (!data) return <div className="center">Loading…</div>;

  if (screen.kind === "who")
    return (
      <Who
        onPick={(n) => {
          setMe(n);
          setScreen({ kind: "party" });
        }}
      />
    );

  if (screen.kind === "party")
    return (
      <Party
        me={me!}
        onStart={(party) => setScreen({ kind: "builder", party, current: party[0], n: 0 })}
        onSkip={() => setScreen({ kind: "home" })}
      />
    );

  if (screen.kind === "builder")
    return (
      <Builder
        key={screen.n}
        party={screen.party}
        current={screen.current}
        extras={data.extras}
        locked={data.locked}
        onAnother={(person) => setScreen({ kind: "builder", party: screen.party, current: person, n: screen.n + 1 })}
        onExtras={(person) => setScreen({ kind: "extras", party: screen.party, current: person })}
        onFinish={async () => {
          await Promise.all(screen.party.map((name) => setDone({ name, done: true })));
          setScreen({ kind: "home" });
        }}
        onCancel={() => setScreen({ kind: "home" })}
      />
    );

  if (screen.kind === "extras")
    return (
      <Extras
        party={screen.party}
        current={screen.current}
        extras={data.extras}
        locked={data.locked}
        onDone={async () => {
          await Promise.all(screen.party.map((name) => setDone({ name, done: true })));
          setScreen({ kind: "home" });
        }}
      />
    );

  return (
    <Home
      me={me!}
      data={data}
      onSwitch={() => setScreen({ kind: "who" })}
      onStartOrder={() => setScreen({ kind: "party" })}
      onExtras={(p) => setScreen({ kind: "extras", party: [p], current: p })}
    />
  );
}

/* ---------- Who are you ---------- */

function Who({ onPick }: { onPick: (n: string) => void }) {
  return (
    <div className="page bottom">
      <div className="spacer" />
      <h1>🍕 Post-Fair Pizza</h1>
      <p className="sub">Who are you?</p>
      <div className="stack">
        {PEOPLE.map((p) => (
          <button key={p} className="big" onClick={() => onPick(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- Ordering for anyone else? ---------- */

function Party({ me, onStart, onSkip }: { me: string; onStart: (party: string[]) => void; onSkip: () => void }) {
  const [sel, setSel] = useState<string[]>([me]);
  const others = PEOPLE.filter((p) => p !== me);
  const toggle = (p: string) => setSel((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  const party = [me, ...others].filter((p) => sel.includes(p));
  return (
    <div className="page bottom">
      <div className="spacer" />
      <h1>Hey {me} 👋</h1>
      <p className="sub">Ordering for anyone else? Tap them too.</p>
      <div className="chips big-chips">
        <button className={"chip" + (sel.includes(me) ? " on" : "")} onClick={() => toggle(me)}>
          {me} (you)
        </button>
        {others.map((p) => (
          <button key={p} className={"chip" + (sel.includes(p) ? " on" : "")} onClick={() => toggle(p)}>
            {p}
          </button>
        ))}
      </div>
      <div className="stack">
        <button className="big primary" disabled={party.length === 0} onClick={() => onStart(party)}>
          {party.length > 1 ? `Order for ${party.length} people →` : "Build my pizza →"}
        </button>
        <button className="link center" onClick={onSkip}>Just looking, take me to the order</button>
      </div>
    </div>
  );
}

/* ---------- Home / running order ---------- */

type Data = NonNullable<ReturnType<typeof useQuery<typeof api.orders.all>>>;

function Home({
  me,
  data,
  onSwitch,
  onStartOrder,
  onExtras,
}: {
  me: string;
  data: Data;
  onSwitch: () => void;
  onStartOrder: () => void;
  onExtras: (p: string) => void;
}) {
  const removePizza = useMutation(api.orders.removePizza);
  const setDone = useMutation(api.orders.setDone);
  const setExtra = useMutation(api.orders.setExtra);
  const setLocked = useMutation(api.orders.setLocked);
  const resetAll = useMutation(api.orders.resetAll);

  const doneMap = Object.fromEntries(data.people.map((p) => [p.name, p.done]));
  const ordered = [me, ...PEOPLE.filter((p) => p !== me)];
  const pizzas = [...data.pizzas].sort((a, b) => a._creationTime - b._creationTime);
  const extras = [...data.extras].sort((a, b) => a.item.localeCompare(b.item) || a.person.localeCompare(b.person));
  const extraCount = extras.reduce((s, e) => s + e.qty, 0);

  return (
    <div className={"page" + (data.locked ? "" : " has-sticky")}>
      <header className="top">
        <h1>🍕 Post-Fair Pizza</h1>
        <p className="sub">
          You're <b>{me}</b> · <a onClick={onSwitch}>not you?</a>
        </p>
      </header>

      {data.locked && <div className="banner">🔒 Order's been placed. Too late to change, sorry!</div>}

      {isHost && (
        <HostPanel
          data={data}
          onLock={(l) => setLocked({ locked: l })}
          onReset={() => confirm("Wipe EVERYONE's picks? This can't be undone.") && resetAll()}
        />
      )}

      <div className="status-strip">
        {ordered.map((p) => {
          const done = !!doneMap[p];
          return (
            <button
              key={p}
              className={"status" + (done ? " done" : "")}
              onClick={() => setDone({ name: p, done: !done })}
              title={done ? "Tap to reopen" : "Tap to mark done"}
            >
              {done ? "✅" : "⏳"} {p}
            </button>
          );
        })}
      </div>

      <h2 className="section">
        Pizzas <span className="count">{pizzas.length} · deal needs 2+</span>
      </h2>
      {pizzas.length === 0 && <p className="muted">No pizzas yet.</p>}
      <div className="food">
        {pizzas.map((p) => (
          <div key={p._id} className="line food-line">
            <div className="food-main">
              <div className="line-title">
                {p.toppings.length ? p.toppings.join(", ") : "Cheese pizza"}
              </div>
              <div className="line-sub">
                {p.crust} · {p.sauce}
                {p.cheese !== "Normal" && ` · ${p.cheese} cheese`}
              </div>
            </div>
            <span className="tag">{p.person}</span>
            {!data.locked && (
              <button className="x" onClick={() => confirm("Remove this pizza?") && removePizza({ id: p._id as Id<"pizzas"> })}>
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <h2 className="section">
        Sides, sauces & drinks <span className="count">{extraCount}</span>
      </h2>
      {extras.length === 0 && <p className="muted">Nothing yet.</p>}
      <div className="food">
        {extras.map((e) => (
          <div key={e._id} className="line food-line">
            <div className="food-main">
              <div className="line-title">{e.qty}× {e.item}</div>
            </div>
            <span className="tag">{e.person}</span>
            {!data.locked && (
              <button className="x" onClick={() => setExtra({ person: e.person, item: e.item, qty: 0 })}>
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="muted center small">Parker places the real order. Tap your name above to toggle Done.</p>

      {!data.locked && (
        <div className="sticky">
          <button className="big primary" onClick={onStartOrder}>+ Add pizzas</button>
          <button className="link center" onClick={() => onExtras(me)}>+ sides & drinks for {me}</button>
        </div>
      )}
    </div>
  );
}

/* ---------- Host panel ---------- */

function HostPanel({ data, onLock, onReset }: { data: Data; onLock: (l: boolean) => void; onReset: () => void }) {
  const [open, setOpen] = useState(true);
  const lines = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of data.pizzas) {
      const key = `Medium ${p.crust}, ${p.sauce}${p.cheese !== "Normal" ? `, ${p.cheese} cheese` : ""}${
        p.toppings.length ? ": " + [...p.toppings].sort().join(", ") : " (cheese only)"
      }`;
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()];
  }, [data.pizzas]);
  const extraLines = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of data.extras) m.set(e.item, (m.get(e.item) ?? 0) + e.qty);
    return [...m.entries()];
  }, [data.extras]);
  const counts = PEOPLE.map((n) => ({
    n,
    pizzas: data.pizzas.filter((p) => p.person === n).length,
    extras: data.extras.filter((e) => e.person === n).reduce((s, e) => s + e.qty, 0),
    done: data.people.find((p) => p.name === n)?.done ?? false,
  }));
  const text =
    lines.map(([k, n]) => `${n}x ${k}`).join("\n") +
    (extraLines.length ? "\n\nExtras:\n" + extraLines.map(([k, n]) => `${n}x ${k}`).join("\n") : "");

  return (
    <div className="host">
      <div className="card-head">
        <h2>Host summary</h2>
        <button className="link" onClick={() => setOpen(!open)}>{open ? "hide" : "show"}</button>
      </div>
      {open && (
        <>
          <pre>{text || "No pizzas yet."}</pre>
          <div className="row">
            <button className="link" onClick={() => navigator.clipboard.writeText(text)}>copy</button>
            <button className={"link" + (data.locked ? "" : " danger")} onClick={() => onLock(!data.locked)}>
              {data.locked ? "🔓 Unlock" : "🔒 Lock order"}
            </button>
            <button className="link danger" onClick={onReset}>🗑 Reset everything</button>
          </div>
          <div className="counts">
            {counts.map((c) => (
              <span key={c.n}>
                {c.done ? "✅" : "⏳"} {c.n}: {c.pizzas}🍕 {c.extras ? `${c.extras}➕` : ""}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- Shared: "for whom" switcher + sauce cup steppers ---------- */

function ForRow({ party, current, onPick }: { party: string[]; current: string; onPick: (p: string) => void }) {
  if (party.length < 2) return null;
  return (
    <div className="for-row">
      <span className="for-label">For</span>
      <div className="chips">
        {party.map((p) => (
          <button key={p} className={"chip small" + (p === current ? " on" : "")} onClick={() => onPick(p)}>
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function Steppers({ person, items, extras, locked }: { person: string; items: string[]; extras: Data["extras"]; locked: boolean }) {
  const setExtra = useMutation(api.orders.setExtra);
  const qty = (item: string) => extras.find((e) => e.person === person && e.item === item)?.qty ?? 0;
  return (
    <>
      {items.map((item) => {
        const q = qty(item);
        return (
          <div key={item} className={"line" + (q ? " has" : "")}>
            <div className="line-title">{item}</div>
            <div className="stepper">
              <button disabled={locked || q === 0} onClick={() => setExtra({ person, item, qty: q - 1 })}>−</button>
              <span>{q}</span>
              <button disabled={locked} onClick={() => setExtra({ person, item, qty: q + 1 })}>+</button>
            </div>
          </div>
        );
      })}
    </>
  );
}

/* ---------- Pizza builder ---------- */

function Builder({
  party,
  current: initial,
  extras,
  locked,
  onAnother,
  onExtras,
  onFinish,
  onCancel,
}: {
  party: string[];
  current: string;
  extras: Data["extras"];
  locked: boolean;
  onAnother: (person: string) => void;
  onExtras: (person: string) => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  const addPizza = useMutation(api.orders.addPizza);
  const [person, setPerson] = useState(initial);
  const [crust, setCrust] = useState(CRUSTS[0].name);
  const [sauce, setSauce] = useState(SAUCES[0]);
  const [cheese, setCheese] = useState(CHEESE[0]);
  const [toppings, setToppings] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggle = (t: string) => {
    setToppings((cur) => {
      if (cur.includes(t)) return cur.filter((x) => x !== t);
      if (cur.length >= 3) return cur;
      return [...cur, t];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await addPizza({ person, crust, sauce, cheese, toppings });
      setSaved(true);
    } catch (e) {
      alert(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (locked)
    return (
      <div className="page bottom">
        <div className="spacer" />
        <div className="banner">🔒 Order's locked.</div>
        <button className="big" onClick={onCancel}>Back</button>
      </div>
    );

  if (saved) {
    const others = party.filter((p) => p !== person);
    return (
      <div className="page bottom center-text">
        <div className="spacer" />
        <h1>🍕 Added!</h1>
        <p className="sub">{person}'s pizza is in.</p>
        <div className="stack">
          <button className="big" onClick={() => onAnother(person)}>+ Another pizza for {person}</button>
          {others.map((p) => (
            <button key={p} className="big" onClick={() => onAnother(p)}>+ Pizza for {p}</button>
          ))}
          <button className="big" onClick={() => onExtras(person)}>Sides & drinks →</button>
          <button className="big primary" onClick={onFinish}>
            Done, just pizza ✅
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page builder">
      <header className="top">
        <a onClick={onCancel}>← back to order</a>
        <h1>{person}'s pizza</h1>
        <p className="sub">Medium · 3 toppings</p>
        <ForRow party={party} current={person} onPick={setPerson} />
      </header>

      <h2 className="section">Crust</h2>
      <div className="chips">
        {CRUSTS.map((c) => (
          <button key={c.name} className={"chip" + (crust === c.name ? " on" : "")} onClick={() => setCrust(c.name)}>
            {c.name}{c.extra && <sup>+$</sup>}
          </button>
        ))}
      </div>

      <h2 className="section">Sauce</h2>
      <div className="chips">
        {SAUCES.map((s) => (
          <button key={s} className={"chip" + (sauce === s ? " on" : "")} onClick={() => setSauce(s)}>{s}</button>
        ))}
      </div>

      <h2 className="section">Cheese</h2>
      <div className="chips">
        {CHEESE.map((c) => (
          <button key={c} className={"chip" + (cheese === c ? " on" : "")} onClick={() => setCheese(c)}>{c}</button>
        ))}
      </div>

      <h2 className="section">
        Toppings <span className="count">{toppings.length}/3</span>
      </h2>
      {TOPPINGS.map((g) => (
        <div key={g.group}>
          <h4>{g.group}</h4>
          <div className="chips">
            {g.items.map((t) => {
              const on = toppings.includes(t.name);
              const full = !on && toppings.length >= 3;
              return (
                <button key={t.name} className={"chip" + (on ? " on" : "") + (full ? " dim" : "")} onClick={() => toggle(t.name)}>
                  {t.name}{t.extra && <sup>+$</sup>}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <h2 className="section">Sauce cups</h2>
      <p className="sub small">These save instantly for {person}.</p>
      <Steppers person={person} items={SAUCE_CUPS} extras={extras} locked={locked} />

      <div className="sticky">
        <button className="big primary" disabled={saving} onClick={save}>
          {saving ? "Adding…" : `Add ${person}'s pizza (${toppings.length}/3 toppings)`}
        </button>
      </div>
    </div>
  );
}

/* ---------- Extras ---------- */

function Extras({
  party,
  current: initial,
  extras,
  locked,
  onDone,
}: {
  party: string[];
  current: string;
  extras: Data["extras"];
  locked: boolean;
  onDone: () => void;
}) {
  const [person, setPerson] = useState(initial);
  return (
    <div className="page builder">
      <header className="top">
        <h1>Anything else for {person}?</h1>
        <p className="sub">Optional. Skip if you're good.</p>
        <ForRow party={party} current={person} onPick={setPerson} />
      </header>
      {locked && <div className="banner">🔒 Order's locked.</div>}
      {EXTRAS.map((g) => (
        <div key={g.group}>
          <h2 className="section">{g.group}</h2>
          <Steppers person={person} items={g.items} extras={extras} locked={locked} />
        </div>
      ))}
      <h2 className="section">Sauce cups</h2>
      <Steppers person={person} items={SAUCE_CUPS} extras={extras} locked={locked} />
      <div className="sticky">
        <button className="big primary" onClick={onDone}>
          {party.length > 1 ? "Done, finalize us →" : "Done, finalize me →"}
        </button>
      </div>
    </div>
  );
}
