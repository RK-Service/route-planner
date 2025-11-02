  import React, { useMemo, useState } from 'react'
  import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet'
  import L from 'leaflet'
  import 'leaflet/dist/leaflet.css'

  // Fix default marker icon
  const DefaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
  // @ts-ignore
  L.Marker.prototype.options.icon = DefaultIcon

  const deg2rad = (deg:number) => deg * (Math.PI / 180)
  function haversine(a:{lat:number;lng:number}, b:{lat:number;lng:number}) {
    const R = 6371
    const dLat = deg2rad(b.lat - a.lat)
    const dLng = deg2rad(b.lng - a.lng)
    const lat1 = deg2rad(a.lat)
    const lat2 = deg2rad(b.lat)
    const h = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2
    return 2 * R * Math.asin(Math.sqrt(h))
  }

  function parseRow(row:string) {
    const parts = row.split('|').map(s => s.trim()).filter(Boolean)
    if (!parts.length) return null
    const coords = parts[parts.length-1].match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/)
    const label = parts.length > 1 ? parts.slice(0,-1).join(' | ') : row.trim()
    if (coords) return { label, lat: parseFloat(coords[1]), lng: parseFloat(coords[2]) }
    return { label: row.trim(), lat: NaN, lng: NaN }
  }

  async function geocode(q:string) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'cs' } })
    const data = await res.json()
    if (Array.isArray(data) && data[0]) {
      const { lat, lon } = data[0]
      return { lat: parseFloat(lat), lng: parseFloat(lon) }
    }
    throw new Error('Nenalezeno: ' + q)
  }

  function nearestNeighborOrder(points: {lat:number;lng:number;label:string}[], startIdx=0) {
    const n = points.length
    const visited = new Array(n).fill(false)
    let order = [startIdx]
    visited[startIdx] = true
    for (let step = 1; step < n; step++) {
      const last = order[order.length - 1]
      let best = -1, bestD = Infinity
      for (let i = 0; i < n; i++) if (!visited[i]) {
        const d = haversine(points[last], points[i])
        if (d < bestD) { bestD = d; best = i }
      }
      visited[best] = true
      order.push(best)
    }
    return order
  }

  function twoOpt(points:{lat:number;lng:number}[], order:number[]) {
    const dist = (i:number,j:number) => haversine(points[order[i]], points[order[j]])
    let improved = true
    while (improved) {
      improved = false
      for (let i=1; i<order.length-2; i++) {
        for (let k=i+1; k<order.length-1; k++) {
          const delta = (dist(i-1,i)+dist(k,k+1)) - (dist(i-1,k)+dist(i,k+1))
          if (delta > 1e-9) {
            order = [...order.slice(0,i), ...order.slice(i,k+1).reverse(), ...order.slice(k+1)]
            improved = true
          }
        }
      }
    }
    return order
  }

  function estimateTimeKm(km:number, avgSpeedKmh:number) {
    const hours = km / Math.max(1, avgSpeedKmh)
    const h = Math.floor(hours)
    const m = Math.round((hours - h) * 60)
    return `${h} h ${m} min`
  }

  function download(filename:string, contents:string, mime='text/plain') {
    const blob = new Blob([contents], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  export default function RoutePlanner() {
    const [input, setInput] = useState<string>(`RK Service s.r.o. | Osvobození 60, Luka nad Jihlavou
Zákazník A | Třebíč
Zákazník B | Velké Meziříčí
Zákazník C | Jihlava
`)
    const [start, setStart] = useState<string>('Osvobození 60, Luka nad Jihlavou')
    const [roundtrip, setRoundtrip] = useState<boolean>(true) // TS happy
    const [avgSpeed, setAvgSpeed] = useState<number>(60)
    const [serviceMinutes, setServiceMinutes] = useState<number>(20)
    const [fuelPrice, setFuelPrice] = useState<number>(32)
    const [consumption, setConsumption] = useState<number>(10)
    const [geocodeOnline, setGeocodeOnline] = useState<boolean>(true)
    const [busy, setBusy] = useState<boolean>(false)
    const [error, setError] = useState<string | undefined>()
    const [result, setResult] = useState<any>(null)

    const rows = useMemo(() => input.split(/\r?\n/).map(r => r.trim()).filter(Boolean), [input])
    // @ts-ignore
    const parsed = useMemo(() => rows.map(parseRow).filter(Boolean), [rows])

    const defaultCenter = { lat: 49.4, lng: 15.59 }

    async function run() {
      setBusy(true); setError(undefined); setResult(null)
      try {
        const points:any[] = []
        for (const row of parsed as any[]) {
          let { lat, lng, label } = row
          if (Number.isNaN(lat) || Number.isNaN(lng)) {
            if (!geocodeOnline) throw new Error(`Řádek „${row.label}“ nemá souřadnice a geokódování je vypnuto.`)
            const g = await geocode(row.label)
            lat = g.lat; lng = g.lng
          }
        points.push({ label, lat, lng })
        }

        // ensure start
        let s = parseRow(start.trim()) as any
        if (s && (Number.isNaN(s.lat) || Number.isNaN(s.lng))) {
          if (!geocodeOnline) throw new Error('Start nemá souřadnice a geokódování je vypnuto.')
          const g = await geocode(s.label)
          s = { ...s, lat: g.lat, lng: g.lng }
        }
        points.unshift({ label: `Start: ${s.label}`, lat: s.lat, lng: s.lng })

        if (points.length < 2) throw new Error('Zadejte alespoň 2 body.')

        const visitables = points.slice(1)
        let order = nearestNeighborOrder(visitables as any[], 0).map(i => i + 1)
        order = twoOpt(points, order)

        const fullOrder = [0, ...order]
        if (roundtrip) fullOrder.push(0)

        let kmTotal = 0
        const legs:any[] = []
        for (let i=0; i<fullOrder.length-1; i++) {
          const a = points[fullOrder[i]], b = points[fullOrder[i+1]]
          const km = haversine(a,b)
          kmTotal += km
          legs.push({ from: a.label, to: b.label, km })
        }

        const driveTime = estimateTimeKm(kmTotal, avgSpeed)
        const serviceTimeHours = (serviceMinutes/60) * Math.max(0, (roundtrip ? fullOrder.length-2 : fullOrder.length-1))
        const serviceStr = estimateTimeKm(serviceTimeHours*avgSpeed, avgSpeed)
        const fuelLiters = (kmTotal * consumption) / 100
        const fuelCost = fuelLiters * fuelPrice

        setResult({ points, order: fullOrder, kmTotal, legs, driveTime, serviceStr, fuelLiters, fuelCost })
      } catch (e:any) {
        setError(e.message || String(e))
      } finally {
        setBusy(false)
      }
    }

    function exportCSV() {
      if (!result) return
      const rows = ['Pořadí;Název;Lat;Lng']
      result.order.forEach((idx:number, i:number) => {
        const p = result.points[idx]
        rows.push(`${i+1};${p.label};${p.lat};${p.lng}`)
      })
      download('trasa.csv', rows.join('\n'), 'text/csv;charset=utf-8')
    }

    function exportGPX() {
      if (!result) return
      const pts = result.order.map((idx:number) => result.points[idx])
      const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="RK-Service RoutePlanner" xmlns="http://www.topografix.com/GPX/1/1">
<trk><name>Optimalizovaná trasa</name><trkseg>
${pts.map((p:any)=>`<trkpt lat="${p.lat}" lon="${p.lng}"><name>${p.label}</name></trkpt>`).join('\n')}
</trkseg></trk></gpx>`
      download('trasa.gpx', gpx, 'application/gpx+xml')
    }

    const mapCenter = useMemo(() => {
      if (result?.points?.length) {
        return { lat: result.points[0].lat, lng: result.points[0].lng }
      }
      return defaultCenter
    }, [result])

    return (
      <div className="grid grid-2">
        <div className="card">
          <h1 style={{fontSize: '24px', fontWeight: 700}}>Plánovač tras – RK Service</h1>
          <p style={{color:'#555'}}>Formát: <code>Firma | adresa</code> nebo <code>Label | lat,lng</code>. Start zadejte níže.</p>

          <textarea
            style={{width:'100%', height: '160px'}}
            value={input}
            onChange={e=>setInput(e.target.value)}
          />

          <div className="grid" style={{gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 8}}>
            <div>
              <label>Start:</label>
              <input style={{width:'100%', padding:'8px'}} value={start} onChange={e=>setStart(e.target.value)} />
            </div>
            <div style={{display:'flex', alignItems:'end', gap:8}}>
              <label><input type="checkbox" checked={!!roundtrip} onChange={e=>setRoundtrip(e.target.checked)} /> Návrat na start</label>
            </div>
          </div>

          <div className="grid" style={{gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12, marginTop:12}}>
            <div><label>Rychlost (km/h)</label><input type="number" style={{width:'100%', padding:'8px'}} value={avgSpeed} onChange={e=>setAvgSpeed(Number(e.target.value)||60)} /></div>
            <div><label>Servis (min)</label><input type="number" style={{width:'100%', padding:'8px'}} value={serviceMinutes} onChange={e=>setServiceMinutes(Number(e.target.value)||0)} /></div>
            <div><label>Spotřeba (l/100km)</label><input type="number" style={{width:'100%', padding:'8px'}} value={consumption} onChange={e=>setConsumption(Number(e.target.value)||10)} /></div>
            <div><label>Cena nafty (Kč/l)</label><input type="number" style={{width:'100%', padding:'8px'}} value={fuelPrice} onChange={e=>setFuelPrice(Number(e.target.value)||32)} /></div>
          </div>

          <div style={{marginTop:12}}>
            <label><input type="checkbox" checked={geocodeOnline} onChange={e=>setGeocodeOnline(e.target.checked)} /> Použít online geokódování (OSM Nominatim)</label>
          </div>

          <div style={{display:'flex', gap:8, marginTop:12}}>
            <button className="btn" onClick={run} disabled={busy}>{busy?'Počítám…':'Optimalizovat trasu'}</button>
            <button className="btn secondary" onClick={exportCSV} disabled={!result}>Export CSV</button>
            <button className="btn secondary" onClick={exportGPX} disabled={!result}>Export GPX</button>
          </div>

          {error && <div className="card" style={{background:'#fee2e2', color:'#991b1b', marginTop:12}}>{error}</div>}

          {result && (
            <div className="card" style={{marginTop:12}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:12}}>
                <div><div style={{color:'#555'}}>Vzdálenost</div><div style={{fontSize:18, fontWeight:600}}>{result.kmTotal.toFixed(1)} km</div></div>
                <div><div style={{color:'#555'}}>Jízda</div><div style={{fontSize:18, fontWeight:600}}>{result.driveTime}</div></div>
                <div><div style={{color:'#555'}}>Palivo</div><div style={{fontSize:18, fontWeight:600}}>{result.fuelLiters.toFixed(1)} l ≈ {result.fuelCost.toFixed(0)} Kč</div></div>
                <div><div style={{color:'#555'}}>Zastávky</div><div style={{fontSize:18, fontWeight:600}}>{result.order.length - (roundtrip?1:0)}</div></div>
              </div>
              <div style={{overflowX:'auto', marginTop:8}}>
                <table>
                  <thead><tr><th>#</th><th>Zastávka</th><th>Lat</th><th>Lng</th></tr></thead>
                  <tbody>
                    {result.order.map((idx:number, i:number) => {
                      const p = result.points[idx]
                      return (<tr key={i}><td>{i+1}</td><td>{p.label}</td><td>{p.lat.toFixed(6)}</td><td>{p.lng.toFixed(6)}</td></tr>)
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="card" style={{height:'80vh'}}>
          <MapContainer center={[49.4, 15.59]} zoom={10} style={{height: '100%', width: '100%'}}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
            {result && (<>
              {result.order.map((idx:number, i:number) => {
                const p = result.points[idx]
                return (
                  <Marker key={i} position={[p.lat, p.lng]}>
                    <Popup>
                      <div style={{fontSize:12}}><strong>{i+1}. {p.label}</strong><div>{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</div></div>
                    </Popup>
                  </Marker>
                )
              })}
              <Polyline positions={result.order.map((idx:number)=>[result.points[idx].lat, result.points[idx].lng]) as any} />
            </>)}
          </MapContainer>
        </div>
      </div>
    )
  }
