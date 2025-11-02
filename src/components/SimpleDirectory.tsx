import React from 'react';

const KEY = 'rk_route_planner_directory';

function normalizeLine(line: string) {
  return line.replace(/^\s*\[(x|\s)?\]\s*/i, '').trim();
}
function isChecked(line: string) {
  return /^\s*\[x\]/i.test(line);
}

export default function SimpleDirectory({ onInsert }: { onInsert: (lines: string) => void }) {
  const [text, setText] = React.useState<string>(() => {
    return localStorage.getItem(KEY) ?? `RK Service | Osvobození 60, 588 22 Luka nad Jihlavou, Czechia
Zákazník A | Třebíč, Czechia
Zákazník B | Velké Meziříčí, Czechia
Zákazník C | Jihlava, Czechia`;
  });

  React.useEffect(() => {
    localStorage.setItem(KEY, text);
  }, [text]);

  function toggleLine(i: number) {
    const lines = text.split(/\r?\n/);
    const line = lines[i] ?? '';
    if (!line.trim()) return;
    if (isChecked(line)) {
      lines[i] = line.replace(/^\s*\[x\]\s*/i, '[ ] ');
    } else if (/^\s*\[\s\]\s*/.test(line)) {
      lines[i] = line.replace(/^\s*\[\s\]\s*/, '[x] ');
    } else {
      lines[i] = '[x] ' + line;
    }
    setText(lines.join('\n'));
  }

  function addCheckedToPlanner() {
    const out = text
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean)
      .filter(isChecked)
      .map(l => normalizeLine(l))
      .map(l => {
        // když není země a nejsou to souřadnice, doplníme ", Czechia"
        const adr = l.split('|')[1]?.trim() ?? '';
        const looksLatLng = /-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/.test(adr);
        if (!looksLatLng && adr && !/(czechia|slovakia)/i.test(adr)) {
          const [label, addr] = l.split('|');
          return `${(label ?? '').trim()} | ${addr.trim()}, Czechia`;
        }
        return l;
      })
      .join('\n');

    if (!out) return alert('Není nic zaškrtnuté.');
    onInsert(out);
  }

  return (
    <div className="p-3">
      <h2 className="text-xl font-semibold mb-2">Adresář zákazníků (jednoduchý)</h2>
      <p className="text-sm text-gray-600 mb-2">
        Každý řádek: <code>Label | adresa</code> (nebo <code>Label | lat,lng</code>).<br/>
        Zaškrtávej přidáním <code>[x]</code> na začátek řádku (nebo klikem v seznamu níže).
      </p>

      <textarea
        className="w-full h-44 border rounded p-2 font-mono text-sm"
        value={text}
        onChange={e => setText(e.target.value)}
      />

     <div className="mt-2 flex gap-2 flex-wrap">
  <button className="btn-ghost" onClick={()=>{
    const lines = text.split(/\r?\n/).map((l)=> isChecked(l) ? l : (l.trim()? '[x] '+l : l));
    setText(lines.join('\n'));
  }}>Zaškrtnout vše</button>

  <button className="btn-ghost" onClick={()=>{
    const lines = text.split(/\r?\n/).map(l => l.replace(/^\s*\[(x|\s)?\]\s*/i,''));
    setText(lines.join('\n'));
  }}>Odznačit vše</button>

  <button className="btn" onClick={addCheckedToPlanner}>
    Přidat zaškrtnuté do plánovače
  </button>
</div>

      <div className="mt-2 text-sm text-gray-600">
        Tip: klikni na řádek v seznamu a rychle ho zaškrtneš/odškrtneš.
      </div>

      <div className="mt-2 border rounded">
        {text.split(/\r?\n/).map((line, i) => (
          <div key={i}
               className="text-sm cursor-pointer select-none py-1 px-2 border-b last:border-b-0"
               onClick={()=>toggleLine(i)}>
            <span className="inline-block w-6">{isChecked(line) ? '☑' : '☐'}</span>
            <span className="font-mono">{normalizeLine(line) || <em className="text-gray-400">— prázdný řádek —</em>}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
