import React, { useState } from 'react';
import RoutePlanner from './route/RoutePlanner';
import SimpleDirectory from './components/SimpleDirectory';

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
          <div className="card-body">
            <RoutePlanner initialStops={stopsText} onStopsChange={setStopsText}/>
          </div>
        </div>
      </div>
    </>
  );
}
