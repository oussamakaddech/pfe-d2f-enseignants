import { Outlet } from "react-router-dom";
import TopBar from "../../components/TopBar";
import SideMenu from "../../components/SideMenu";

function Home() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* 🔹 TopBar ajouté ici */}
      <TopBar />
      

      <div style={{ display: "flex", flex: 1 }}>
        {/* Barre latérale à gauche */}
        <SideMenu />

        {/* Contenu dynamique à droite */}
        <div style={{ flex: 1, padding: "20px"  , paddingTop: "65px"}}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Home;
