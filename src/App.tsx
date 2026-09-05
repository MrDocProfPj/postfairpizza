import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { CHEESE, CRUSTS, EXTRAS, PEOPLE, SAUCES, TOPPINGS } from "./menu";

type Screen =
  | { kind: "home" }
  | { kind: "who" }
  | { kind: "builder"; person: string }
  | { kind: "extras"; person: string };

const isHost = new URLSearchParams(location.search).has("host");

export default function App() {
  const data = useQuery(api.orders.all);
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
          setScreen({ kind: "home" });
        }}
      />
    );

  if (screen.kind === "builder")
    return (
      <Builder
        person={screen.person}
        locked={data.locked}
        onDone={(again) =>
          setScreen(again ? { kind: "builder", person: screen.person } : { kind: "extras", person: screen.person })
        }
        onCancel={() => setScreen({ kind: "home" })}
      />
    );

  if (screen.kind === "extras")
    return (
      <Extras
        person={screen.person}
        extras={data.extras.filter((e) => e.person === screen.person)}
        locked={data.locked}
        onDone={() => setScreen({ kind: "home" })}
      />
    );

  return (
    <Home
      me={me!}
      data={data}
      onSwitch={() => setScreen({ kind: "who" })}
      onAddPizza={(p) => setScreen({ kind: "builder", person: p })}
      onExtras={(p) => setScreen({ kind: "extras", person: p })}
    />
  );
}

/* ---------- Who are you ---------- */

function Who({ onPick }: { onPick: (n: string) => void }) {
  return (
    <div className="page">
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

/* ---------- Home / running order ---------- */

type Data = NonNullable<ReturnType<typeof useQuery<typeof api.orders.all>>>;

function Home({
  me,
  data,
  onSwitch,
  onAddPizza,
  onExtras,
}: {
  me: string;
  data: Data;
  onSwitch: () => void;
  onAddPizza: (p: string) => void;
  onExtras: (p: string) => void;
}) {
  const removePizza = useMutation(api.orders.removePizza);
  const setDone = useMutation(api.orders.setDone);
  const setExtra = useMutation(api.orders.setExtra);
  const setLocked = useMutation(api.orders.setLocked);
  const resetAll = useMutation(api.orders.resetAll);
  const [forWho, setForWho] = useState<string | null>(null);

  const doneMap = Object.fromEntries(data.people.map((p) => [p.name, p.done]));
  const ordered = [me, ...PEOPLE.filter((p) => p !== me)];

  return (
    <div className="page">
      <header className="top">
        <div>
          <h1>🍕 Post-Fair Pizza</h1>
          <p className="sub">
            You're <b>{me}</b> · <a onClick={onSwitch}>not you?</a>
          </p>
        </div>
      </header>

      {data.locked && <div className="banner">🔒 Order's been placed. Too late to change, sorry!</div>}

      {isHost && (
        <HostPanel
          data={data}
          onLock={(l) => setLocked({ locked: l })}
          onReset={() => confirm("Wipe EVERYONE's picks? This can't be undone.") && resetAll()}
        />
      )}

      {!data.locked && (
        <div className="cta-row">
          <button className="big primary" onClick={() => setForWho(me)}>
            + Add a pizza
          </button>
        </div>
      )}

      {forWho && (
        <div className="sheet-bg" onClick={() => setForWho(null)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2>Who's this pizza for?</h2>
            <div className="chips">
              {ordered.map((p) => (
                <button key={p} className={"chip" + (p === forWho ? " on" : "")} onClick={() => setForWho(p)}>
                  {p}
                </button>
              ))}
            </div>
            <button className="big primary" onClick={() => onAddPizza(forWho)}>
              Build {forWho}'s pizza →
            </button>
          </div>
        </div>
      )}

      <h2 className="section">Running order</h2>
      <p className="sub small">
        {data.pizzas.length} pizza{data.pizzas.length === 1 ? "" : "s"} so far · deal needs 2+
      </p>

      {ordered.map((person) => {
        const pizzas = data.pizzas.filter((p) => p.person === person);
        const extras = data.extras.filter((e) => e.person === person);
        const done = !!doneMap[person];
        const empty = pizzas.length === 0 && extras.length === 0;
        return (
          <div key={person} className={"card" + (person === me ? " mine" : "") + (done ? " done" : "")}>
            <div className="card-head">
              <h3>
                {person}
                {person === me && <span className="you">you</span>}
              </h3>
              <label className="toggle">
                <input type="checkbox" checked={done} onChange={(e) => setDone({ name: person, done: e.target.checked })} />
                <span>{done ? "✅ Done" : "Still picking"}</span>
              </label>
            </div>
            {empty && <p className="muted">Nothing yet.</p>}
            {pizzas.map((p) => (
              <div key={p._id} className="line">
                <div>
                  <div className="line-title">{p.crust} · {p.sauce}</div>
                  <div className="line-sub">
                    {p.toppings.length ? p.toppings.join(", ") : "Just cheese"}
                    {p.cheese !== "Normal" && ` · ${p.cheese} cheese`}
                  </div>
                </div>
                {!data.locked && (
                  <button className="x" onClick={() => confirm("Remove this pizza?") && removePizza({ id: p._id as Id<"pizzas"> })}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            {extras.map((e) => (
              <div key={e._id} className="line">
                <div className="line-title">
                  {e.qty}× {e.item}
                </div>
                {!data.locked && (
                  <button className="x" onClick={() => setExtra({ person, item: e.item, qty: 0 })}>
                    ✕
                  </button>
                )}
              </div>
            ))}
            {!data.locked && (
              <div className="card-actions">
                <button className="link" onClick={() => onAddPizza(person)}>+ pizza</button>
                <button className="link" onClick={() => onExtras(person)}>+ sides & drinks</button>
              </div>
            )}
          </div>
        );
      })}
      <p className="muted center small">Parker places the real order. Just pick your stuff and hit Done.</p>
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

/* ---------- Pizza builder ---------- */

function Builder({
  person,
  locked,
  onDone,
  onCancel,
}: {
  person: string;
  locked: boolean;
  onDone: (again: boolean) => void;
  onCancel: () => void;
}) {
  const addPizza = useMutation(api.orders.addPizza);
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

  if (locked) return <div className="page"><div className="banner">🔒 Order's locked.</div><button className="big" onClick={onCancel}>Back</button></div>;

  if (saved)
    return (
      <div className="page center-page">
        <h1>🍕 Added!</h1>
        <p className="sub">{person}'s pizza is in.</p>
        <div className="stack">
          <button className="big" onClick={() => onDone(true)}>+ Another pizza for {person}</button>
          <button className="big primary" onClick={() => onDone(false)}>Sides & drinks →</button>
        </div>
      </div>
    );

  return (
    <div className="page builder">
      <header className="top">
        <a onClick={onCancel}>← back</a>
        <h1>{person}'s pizza</h1>
        <p className="sub">Medium · 3 toppings</p>
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

      <div className="sticky">
        <button className="big primary" disabled={saving} onClick={save}>
          {saving ? "Adding…" : `Add pizza (${toppings.length}/3 toppings)`}
        </button>
      </div>
    </div>
  );
}

/* ---------- Extras ---------- */

function Extras({
  person,
  extras,
  locked,
  onDone,
}: {
  person: string;
  extras: Data["extras"];
  locked: boolean;
  onDone: () => void;
}) {
  const setExtra = useMutation(api.orders.setExtra);
  const qty = (item: string) => extras.find((e) => e.item === item)?.qty ?? 0;

  return (
    <div className="page builder">
      <header className="top">
        <h1>Anything else for {person}?</h1>
        <p className="sub">Optional. Skip if you're good.</p>
      </header>
      {locked && <div className="banner">🔒 Order's locked.</div>}
      {EXTRAS.map((g) => (
        <div key={g.group}>
          <h2 className="section">{g.group}</h2>
          {g.items.map((item) => {
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
        </div>
      ))}
      <div className="sticky">
        <button className="big primary" onClick={onDone}>Done →</button>
      </div>
    </div>
  );
}
