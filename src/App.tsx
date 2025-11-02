import React, { useState } from 'react';
import RoutePlanner from './route/RoutePlanner';
import SimpleDirectory from './components/SimpleDirectory';
import CompanyLookup from './components/CompanyLookup';


export default function App() {
  const [stopsText, setStopsText] = useState('');

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner">
          <div className="brand">RK Service · Plánovač tras</div>
          <div className="badge">beta</div>
        </div>
      </div>

      <div className="container app-grid">
        <div className="card">
          <div className="card-header">
            <div className="card-title">Adresář zákazníků</div>
            <div className="card-sub">Uloženo lokálně v prohlížeči</div>
          </div>
          <div className="card-body">
            <SimpleDirectory onInsert={(lines)=>{
              setStopsText(prev => (prev.trim() ? prev + '\n' : '') + lines);
            }}/>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">Plánovač</div>
            <div className="card-sub">Optimalizace, mapa, export CSV/GPX</div>
          </div>
          {/* Nová sekce: Vyhledávání firem podle IČ/IČO */}
<div className="card-sub" style={{marginBottom: 8}}>
  Vyhledej firmu podle IČ/IČO a přidej ji do adresáře
</div>

<CompanyLookup onAddLine={(line)=>{
  // Po vyhledání se automaticky přidá firma do adresáře (textového pole)
  setStopsText(prev => (prev.trim() ? prev + '\n' : '') + line);
}} />

<hr style={{border:'none', borderTop:'1px solid #e5e7eb', margin:'12px 0'}} />
          <div className="card-body">
            <RoutePlanner initialStops={stopsText} onStopsChange={setStopsText}/>
          </div>
        </div>
      </div>
    </>
  );
}
