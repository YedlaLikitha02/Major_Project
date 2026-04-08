import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Login(){

  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const navigate = useNavigate();

  const login = async ()=>{
    try{

      const res = await axios.post(
        "https://major-project-9.onrender.com/api/login/",
        { username, password },
        { withCredentials: true }
      );

      if(res.data.status==="success"){

        const role = res.data.role;

        if(role==="police") navigate("/police");
        else if(role==="hospital") navigate("/hospital");
        else navigate("/admin");

      } else {
        alert("Invalid credentials");
      }

    }catch(err){
      console.log("ERROR:", err);
      alert("Login failed. Check console.");
    }
  };

  return(
    <div style={{
      height:"100vh",
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      background:"#0f172a"
    }}>

      <div style={{
        background:"#1e293b",
        padding:40,
        borderRadius:10,
        width:340,
        boxShadow:"0 0 30px rgba(0,0,0,0.5)"
      }}>
        <h2 style={{color:"white",marginBottom:20}}>
          Emergency Authority Login
        </h2>

        <input
          placeholder="Username"
          style={inputStyle}
          onChange={e=>setUsername(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={inputStyle}
          onChange={e=>setPassword(e.target.value)}
        />

        <button style={btnStyle} onClick={login}>
          Login
        </button>
      </div>
    </div>
  )
}

const inputStyle={
  width:"100%",
  padding:12,
  marginTop:12,
  borderRadius:6,
  border:"none"
}

const btnStyle={
  width:"100%",
  padding:12,
  marginTop:20,
  borderRadius:6,
  background:"#ef4444",
  color:"white",
  border:"none",
  fontWeight:"bold",
  cursor:"pointer"
}
