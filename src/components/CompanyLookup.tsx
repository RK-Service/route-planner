import React from "react";

type Company = {
  country: "cz" | "sk";
  ico: string;
  name: string;
  street?: string;
  houseNumber?: string;
  zip?: string;
  city?: string;
};

function formatAddress(c: Company) {
  const parts = [
    [c.street, c.houseNumber].filter(Boolean).join(" ").trim(),
    [c.zip, c.city].filter(Boolean).join(" ").trim(),
    c.country === "cz" ? "Czechia" : "Slovakia",
  ].filter(Boolean);
  return parts.join(", ");
}

export default function CompanyLookup({
  onAddLine,
}: {
  onAddLine: (line: string) => void; // např. "Název | adresa"
}) {
  const [country, setCountry] = React.useState<"cz" | "sk">("cz");
  const [ico, setIco] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Company | null>(null);

  async function search() {
    setErr(null);
    setData(null);
    const _ico = ico.replace(/\s+/g, "");
    if (!/^\d{6,10}$/.test(_ico)) {
      setErr("Zadej 6–10 číslic (IČ/IČO).");
      return;
    }
    setBusy(true);
    try {
      // voláme naši proxy – viz Cloudflare/Netlify níže
      const url = `/api/company?country=${country}&ico=${_ico}`;
      const res = await fetch(url, { headers: { "x-client": "rk-route-planner" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const j = await res.json();
      if (!j || !j.name) throw new Error("Nenalezeno.");
      const c: Company = {
        country,
        ico: _ico,
        name: j.name,
        street: j.street,
        houseNumber: j.houseNumber,
        zip: j.zip,
        city: j.city,
      };
      setData(c);
    } catch (e: any) {
      setErr("Firma nenalezena (nebo dočasně nedostupné).");
    } finally {
      setBusy(false);
    }
  }

  function addToDirectory() {
    if (!data) return;
    const line = `${data.name} | ${formatAddress(data)}`;
    onAddLine(line);
  }

  return (
    <div className="row" style={{ gap: 10 }}>
      <div className="row row-2">
        <select
          className="select"
          value={country}
          onChange={(e) => setCountry(e.target.value as "cz" | "sk")}
        >
          <option value="cz">Česko (ARES)</option>
          <option value="sk">Slovensko (RPO/ORSR)</option>
        </select>
        <div className="row" style={{ gridTemplateColumns: "1fr auto" }}>
          <input
            className="input"
            placeholder="IČ / IČO (např. 27074358)"
            value={ico}
            onChange={(e) => setIco(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
          />
          <button className="btn" disabled={busy} onClick={search}>
            {busy ? "Hledám…" : "Vyhledat"}
          </button>
        </div>
      </div>

      {err && <div style={{ color: "#b91c1c" }}>{err}</div>}

      {data && (
        <div className="row" style={{ gap: 8 }}>
          <div className="row row-2">
            <input className="input" value={data.name} readOnly />
            <input className="input" value={data.ico} readOnly />
          </div>
          <div className="row row-2">
            <input
              className="input"
              value={[data.street, data.houseNumber].filter(Boolean).join(" ")}
              readOnly
            />
            <input className="input" value={[data.zip, data.city].filter(Boolean).join(" ")} readOnly />
          </div>
          <div>
            <button className="btn outline" onClick={addToDirectory}>
              Přidat do adresáře
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
