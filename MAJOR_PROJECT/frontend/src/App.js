import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Police from "./pages/Police";
import Hospital from "./pages/Hospital";
import Admin from "./pages/Admin";
import L from "leaflet";
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require("leaflet/dist/images/marker-icon-2x.png"),
  iconUrl: require("leaflet/dist/images/marker-icon.png"),
  shadowUrl: require("leaflet/dist/images/marker-shadow.png"),
});

function App(){
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login/>}/>
        <Route path="/police" element={<Police/>}/>
        <Route path="/hospital" element={<Hospital/>}/>
        <Route path="/admin" element={<Admin/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;