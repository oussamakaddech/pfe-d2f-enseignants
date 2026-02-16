// src/pages/PasswordRecovery.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { forgotPassword } from "../../services/authService";

function PasswordRecovery() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /**
   * Envoie la requête de réinitialisation de mot de passe et affiche
   * une notification toast avec le résultat (succès / erreur).
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return; // évite les doubles clics

    try {
      setSubmitting(true);
      const response = await forgotPassword(email);
      toast.success(response || "Nous avons envoyé un e‑mail de réinitialisation");
    } catch (err) {
      const msg = err?.response?.data?.message || "Erreur lors de l'envoi";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="color-line" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-12 col-md-12 col-sm-12 col-xs-12">
            <div className="back-link back-backend">
              <button className="btn btn-primary" onClick={() => navigate("/")}>Back to Dashboard</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container-fluid">
        <div className="row">
          <div className="col-lg-4 col-md-4 col-sm-4 col-xs-12" />
          <div className="col-md-4 col-md-4 col-sm-4 col-xs-12">
            <div className="text-center ps-recovered">
              <h3>PASSWORD RECOVER</h3>
              <p>Please fill the form to recover your password</p>
            </div>
            <div className="hpanel">
              <div className="panel-body poss-recover">
                <p>Enter your email address and your password will be reset and emailed to you.</p>
                <form onSubmit={handleSubmit} id="loginForm">
                  <div className="form-group">
                    <label className="control-label" htmlFor="username">Email</label>
                    <input
                      type="email"
                      placeholder="example@gmail.com"
                      title="Please enter your email adress"
                      required
                      name="username"
                      id="username"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                    <span className="help-block small">Your registered email address</span>
                  </div>
                  <button className="btn btn-success btn-block" type="submit" disabled={submitting}>
                    {submitting ? "Sending…" : "Reset password"}
                  </button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-lg-4 col-md-4 col-sm-4 col-xs-12" />
        </div>
        <div className="row">
          <div className="col-md-12 col-md-12 col-sm-12 col-xs-12 text-center login-footer">
            <p>
              Copyright © 2025
              <a href="https://colorlib.com/wp/templates/"> Colorlib</a>
              &nbsp;All rights reserved.
            </p>
          </div>
        </div>
      </div>

      {/* Conteneur global des toasts */}
      <ToastContainer position="top-right" autoClose={4000} hideProgressBar={false} newestOnTop closeOnClick pauseOnHover />
    </div>
  );
}

export default PasswordRecovery;
