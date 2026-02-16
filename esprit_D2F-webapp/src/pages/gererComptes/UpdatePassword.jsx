import { useState } from "react";
import { updatePassword } from "../../services/accountService";

function UpdatePassword() {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await updatePassword(formData);
      alert("Mot de passe mis à jour !");
    } catch (error) {
      console.error("Erreur :", error);
    }
  };

  return (
    <div className="container">
      <h2>Modifier mon Mot de Passe</h2>
      <form onSubmit={handleSubmit}>
        <label>Ancien mot de passe :</label>
        <input
          type="password"
          value={formData.oldPassword}
          onChange={(e) => setFormData({ ...formData, oldPassword: e.target.value })}
        />
        <label>Nouveau mot de passe :</label>
        <input
          type="password"
          value={formData.newPassword}
          onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
        />
        <button type="submit">Mettre à jour</button>
      </form>
    </div>
  );
}

export default UpdatePassword;
