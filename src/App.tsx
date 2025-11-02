import React, { useState } from 'react';
import RoutePlanner from './route/RoutePlanner';
import SimpleDirectory from './components/SimpleDirectory';

export default function App() {
  const [stopsText, setStopsText] = useState('');

  return (
    <div className="min-h-screen p-4 grid gap-4" style={{gridTemplateColumns: '1fr 1fr'}}>
      <div className="border rounded">
        <SimpleDirectory onInsert={(lines)=>{
          setStopsText(prev => (prev.trim() ? prev + '\n' : '') + lines);
        }}/>
      </div>

      <div className="border rounded">
        <RoutePlanner initialStops={stopsText} onStopsChange={setStopsText}/>
      </div>
    </div>
  );
}
