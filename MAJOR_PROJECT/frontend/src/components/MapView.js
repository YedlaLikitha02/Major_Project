import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapView({alerts}) {
  return (
    <MapContainer center={[17.38,78.48]} zoom={10} style={{height:"400px"}}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {alerts.map(a=>(
        <Marker key={a.id} position={[a.latitude,a.longitude]}>
          <Popup>
            {a.device_id}<br/>
            {a.message}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}

export default MapView;