import {useEffect,useState,useRef} from "react";
import axios from "axios";
import {MapContainer,TileLayer,Popup,Circle,useMap} from "react-leaflet";
import "leaflet/dist/leaflet.css";

function ChangeMapView({coords}){
  const map = useMap();
  useEffect(()=>{
    if(coords){ map.setView(coords,15); }
  },[coords,map]);
  return null;
}

export default function HospitalDashboard(){

  const [alerts,setAlerts]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [selectedLocation,setSelectedLocation]=useState(null);
  const [pulse,setPulse]=useState(80);
  const [playSound, setPlaySound] = useState(false);
  const lastAlertRef = useRef(null);

  const loadAlerts = () => {
    // ✅ Uses hospital-alerts API → only sos_double + medical + accident
    axios.get("https://major-project-9.onrender.com/api/hospital-alerts/")
      .then(res => {
        if (res.data.length > 0) {
          const latestId = res.data[0].id;
          if (lastAlertRef.current !== null && latestId !== lastAlertRef.current) {
            alert("🚨 New Emergency Alert!");
            setPlaySound(true);
          }
          lastAlertRef.current = latestId;
        }
        setAlerts(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load alerts");
        setLoading(false);
      });
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => reject(err)
      );
    });
  };

  useEffect(()=>{ loadAlerts(); },[]);

  useEffect(()=>{
    const interval=setInterval(()=>{ loadAlerts(); },10000);
    return ()=>clearInterval(interval);
  },[]);

  useEffect(()=>{
    const interval=setInterval(()=>{
      setPulse(prev => prev===80 ? 140 : 80);
    },700);
    return ()=>clearInterval(interval);
  },[]);

  useEffect(() => {
    const unlock = () => {
      const audio = document.getElementById("alertSound");
      if (audio) {
        audio.muted = true;
        audio.play().then(() => {
          audio.pause(); audio.currentTime = 0; audio.muted = false;
        }).catch(() => {});
      }
    };
    document.addEventListener("click", unlock, { once: true });
    return () => document.removeEventListener("click", unlock);
  }, []);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        axios.post("https://major-project-9.onrender.com/api/update-location/", {
          lat: latitude, lng: longitude
        });
      },
      (err) => console.log(err),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (playSound) {
      const audio = document.getElementById("alertSound");
      if (audio) {
        audio.currentTime = 0;
        audio.play().catch(() => {
          audio.muted = true;
          audio.play().then(() => { audio.muted = false; });
        });
      }
      setPlaySound(false);
    }
  }, [playSound]);

  const resolveAlert = async (alert) => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.capture = "environment";

      input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) { alert("Photo is required!"); return; }

        const location = await getCurrentLocation();
        const formData = new FormData();
        formData.append("photo", file);
        formData.append("lat", location.lat);
        formData.append("lng", location.lng);
        formData.append("alert_lat", alert.latitude);
        formData.append("alert_lng", alert.longitude);

        await axios.post(
          `https://major-project-9.onrender.com/api/resolve-api/${alert.id}/`,
          formData
        );
        loadAlerts();
      };
      input.click();
    } catch (err) {
      alert("Error resolving alert");
    }
  };

  const active=alerts.filter(a=>a.status!=="resolved");
  const resolved=alerts.filter(a=>a.status==="resolved");

  const exportCSV=()=>{
    const rows=[
      ["Device","Latitude","Longitude","Message","SOS Type","Status","Time"],
      ...alerts.map(a=>[
        a.device_id, a.latitude, a.longitude, a.message,
        a.emergency_type, a.status, new Date(a.timestamp).toLocaleString()
      ])
    ];
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e=>e.join(",")).join("\n");
    const link=document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download","hospital_alerts_report.csv");
    document.body.appendChild(link);
    link.click();
  };

  const sosBadge = (type) => {
    const styles = {
      sos_double: { background: "#b91c1c", label: "🚨 Double SOS" },
      medical:    { background: "#0369a1", label: "🏥 Medical" },
      accident:   { background: "#92400e", label: "🚗 Accident" },
    };
    const s = styles[type] || { background: "#374151", label: type };
    return (
      <span style={{
        padding:"3px 8px", borderRadius:5,
        background: s.background, color:"white", fontSize:11
      }}>
        {s.label}
      </span>
    );
  };

  if(loading) return <div style={page}>Loading dashboard...</div>;
  if(error) return <div style={page}>{error}</div>;

  return(
    <div style={page}>
      <audio id="alertSound" preload="auto">
        <source src="/alert.mp3" type="audio/mpeg" />
      </audio>

      <h1 style={{color:"#22c55e"}}>🏥 Hospital Emergency Dashboard</h1>

      {/* ✅ Note: Hospital only receives Double-Tap SOS alerts */}
      <div style={{
        background:"#064e3b", padding:"10px 16px", borderRadius:8,
        marginBottom:16, fontSize:13, color:"#6ee7b7"
      }}>
        ℹ️ This dashboard only receives <strong>Double-Tap SOS</strong> alerts (critical emergencies requiring medical assistance).
      </div>

      <div style={statsContainer}>
        <div style={card}>
          <h3>Total Alerts</h3>
          <p style={number}>{alerts.length}</p>
        </div>
        <div style={card}>
          <h3>Active Alerts</h3>
          <p style={{...number,color:"#ef4444"}}>{active.length}</p>
        </div>
        <div style={card}>
          <h3>Resolved Alerts</h3>
          <p style={{...number,color:"#22c55e"}}>{resolved.length}</p>
        </div>
        <button style={exportBtn} onClick={exportCSV}>Export Report</button>
      </div>

      <MapContainer
        center={[17.38,78.48]}
        zoom={11}
        style={{height:350,marginTop:20,borderRadius:12}}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
        <ChangeMapView coords={selectedLocation}/>
        {active.map(a=>(
          a.latitude && a.longitude && (
            <Circle
              key={a.id}
              center={[a.latitude,a.longitude]}
              radius={pulse}
              pathOptions={{color:"red",fillColor:"red",fillOpacity:0.5}}
            >
              <Popup>
                <strong>{a.message}</strong><br/>
                Type: {a.emergency_type}<br/>
                Status: {a.status}
              </Popup>
            </Circle>
          )
        ))}
        {selectedLocation && (
          <Circle center={selectedLocation} radius={pulse}
            pathOptions={{color:"#f97316",fillColor:"#f97316",fillOpacity:0.5}}>
            <Popup>Selected Alert Location</Popup>
          </Circle>
        )}
      </MapContainer>

      <h2 style={{marginTop:30}}>Active Alerts</h2>
      <Table alerts={active} resolveAlert={resolveAlert}
        setSelectedLocation={setSelectedLocation} sosBadge={sosBadge}/>

      <h2 style={{marginTop:30}}>Resolved Alerts History</h2>
      <Table alerts={resolved} setSelectedLocation={setSelectedLocation} sosBadge={sosBadge}/>
    </div>
  );
}

function Table({alerts,resolveAlert,setSelectedLocation,sosBadge}){
  const navigateToLocation=(lat,lon)=>{
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`,"_blank");
  };

  if(!alerts.length){
    return <p style={{marginTop:10,color:"white"}}>No alerts found</p>;
  }

  return(
    <table style={table}>
      <thead>
        <tr>
          <th style={th}>Device</th>
          <th style={th}>SOS Type</th>
          <th style={th}>Location</th>
          <th style={th}>Message</th>
          <th style={th}>Status</th>
          <th style={th}>Time</th>
          {resolveAlert && <th style={th}>Action</th>}
        </tr>
      </thead>
      <tbody>
      {alerts.map(a=>(
        <tr key={a.id} style={a.status!=="resolved"?blinkingRow:{}}>
          <td style={td}>{a.device_id}</td>
          <td style={td}>{sosBadge(a.emergency_type)}</td>
          <td style={td}>
            {a.latitude},{a.longitude}<br/>
            <button style={navigateBtn} onClick={()=>navigateToLocation(a.latitude,a.longitude)}>
              Navigate
            </button>
            <button style={viewBtn} onClick={()=>setSelectedLocation([a.latitude,a.longitude])}>
              View
            </button>
          </td>
          <td style={td}>{a.message}</td>
          <td style={td}>
            <span style={{
              padding:"4px 8px", borderRadius:6,
              background:a.status==="resolved"?"#16a34a":"#dc2626",
              color:"white", fontSize:12
            }}>
              {a.status}
            </span>
          </td>
          <td style={td}>
            {new Date(a.timestamp).toLocaleString()}
            {a.proof_image && (
              <div>
                <button style={{...btn,marginTop:5,background:"#22c55e"}}
                  onClick={()=>window.open(`https://major-project-9.onrender.com${a.proof_image}`)}>
                  View Proof
                </button>
              </div>
            )}
          </td>
          {resolveAlert &&
            <td style={td}>
              <button style={btn} onClick={()=>resolveAlert(a)}>Resolve</button>
            </td>
          }
        </tr>
      ))}
      </tbody>
    </table>
  );
}

const page={padding:30,background:"#0b1f3a",minHeight:"100vh",color:"white"};
const statsContainer={display:"flex",gap:20,marginTop:20,flexWrap:"wrap",alignItems:"center"};
const card={background:"#142c4c",padding:20,borderRadius:10,width:180};
const number={fontSize:28,fontWeight:"bold",marginTop:10};
const exportBtn={padding:"10px 18px",background:"#22c55e",border:"none",color:"white",borderRadius:8,cursor:"pointer"};
const table={width:"100%",marginTop:15,borderCollapse:"collapse",background:"#142c4c"};
const th={padding:"14px",background:"#1f3a5f"};
const td={padding:"12px"};
const btn={padding:"6px 14px",background:"#22c55e",border:"none",color:"white",borderRadius:6};
const navigateBtn={marginTop:6,padding:"4px 10px",background:"#2563eb",border:"none",color:"white",borderRadius:6,fontSize:12};
const viewBtn={marginLeft:6,padding:"4px 10px",background:"#ea580c",border:"none",color:"white",borderRadius:6,fontSize:12};
const blinkingRow={animation:"blink 1s infinite",background:"#7f1d1d"};

const styleSheet=document.styleSheets[0];
styleSheet.insertRule(`@keyframes blink{0%{background-color:#7f1d1d;}50%{background-color:#dc2626;}100%{background-color:#7f1d1d;}}`,styleSheet.cssRules.length);
