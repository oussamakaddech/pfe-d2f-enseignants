

import SideBar from "../pages/SideBar";

import TopBar from "./TopBar";
import PropTypes from "prop-types";

function Layout({ children}) {
  return (
    <div className="main-container">
      {/* Barre du haut */}
      <TopBar />

      <div className="content-wrapper">
        {/* Barre latérale */}
        <SideBar />

        {/* Contenu principal */}
        <div className="content-area">
          {children}
        </div>
      </div>
    </div>
  );
}
Layout.propTypes = {
    children: PropTypes.node.isRequired,
  };
  
export default Layout;
