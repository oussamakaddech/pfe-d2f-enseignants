import { useNavigate } from "react-router-dom";

function Contact() {
  const navigate = useNavigate();
  const links = [
    { label: "Home", path: "/home" },
    { label: "About", path: "/home/about" },
    { label: "Services", path: "/home/services" },
    { label: "Support", path: "/home/support" },
  ];
  return (
    <div className="contact">
      <div className="header-top-menu tabl-d-n">
        <ul className="nav navbar-nav mai-top-nav">
          {links.map((l) => (
            <li className="nav-item" key={l.path}>
              <button
                type="button"
                className="nav-link"
                onClick={() => navigate(l.path)}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default Contact;
