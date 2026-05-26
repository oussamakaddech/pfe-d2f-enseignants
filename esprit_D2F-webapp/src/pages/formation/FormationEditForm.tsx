import { useState, useEffect } from "react";
import { format } from "date-fns";
import useAppNotification from "@/hooks/ui/useAppNotification";
import { Input, InputNumber, Button, Space, Card, Form } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { useUpdateFormation } from "@/hooks/formation/useFormations";

function FormationEditForm({ formation, onUpdate, onCancel }) {
  // Champs généraux de la formation
  const [titreFormation, setTitreFormation] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [typeFormation, setTypeFormation] = useState("");
  const [coutFormation, setCoutFormation] = useState(0);
  const [organismeRefExterne, setOrganismeRefExterne] = useState("");
  const [chargeHoraireGlobal, setChargeHoraireGlobal] = useState(0);

  // Pour les séances, on copie la liste existante
  const [seances, setSeances] = useState([]);

  // Lors du chargement du composant, pré-remplir les champs
  useEffect(() => {
    if (formation) {
      setTitreFormation(formation.titreFormation);
      setDateDebut(formation.dateDebut ? format(new Date(formation.dateDebut), "yyyy-MM-dd") : "");
      setDateFin(formation.dateFin ? format(new Date(formation.dateFin), "yyyy-MM-dd") : "");
      setTypeFormation(formation.typeFormation);
      setCoutFormation(formation.coutFormation);
      setOrganismeRefExterne(formation.organismeRefExterne);
      setChargeHoraireGlobal(formation.chargeHoraireGlobal);
      // On suppose que formation.seances est déjà une liste
      setSeances(
        formation.seances.map((s) => ({
          idSeance: s.idSeance,
          dateSeance: format(new Date(s.dateSeance), "yyyy-MM-dd"),
          heureDebut: s.heureDebut, // Format HH:mm:ss
          heureFin: s.heureFin,
        }))
      );
    }
  }, [formation]);

  const { message } = useAppNotification();
  const { mutateAsync: updateFormation } = useUpdateFormation();

  // Fonction de modification d'une séance dans la liste
  const handleSeanceChange = (index, field, value) => {
    const newSeances = [...seances];
    newSeances[index][field] = value;
    setSeances(newSeances);
  };

  // Ajouter une nouvelle séance (optionnel)
  const handleAddSeance = () => {
    setSeances([
      ...seances,
      {
        dateSeance: dateDebut,
        heureDebut: "08:00:00",
        heureFin: "10:00:00",
      },
    ]);
  };

  // Suppression d'une séance (optionnel)
  const handleDeleteSeance = (index) => {
    const newSeances = seances.filter((_, i) => i !== index);
    setSeances(newSeances);
  };

  // Envoi de la modification
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (seances.length === 0) {
      message.warning("Veuillez ajouter au moins une séance.");
      return;
    }
    const updatedFormation = {
      titreFormation,
      dateDebut,
      dateFin,
      typeFormation,
      coutFormation: Number.parseFloat(coutFormation),
      organismeRefExterne,
      chargeHoraireGlobal: Number.parseInt(chargeHoraireGlobal),
      // Ici, vous devez également gérer la mise à jour des animateurs/participants si besoin.
      // Pour cet exemple, nous nous concentrons sur les séances.
      seances,
    };
    try {
      const updated = await updateFormation({ id: formation.idFormation, data: updatedFormation });
      onUpdate(updated);
    } catch (err) {
      message.error("Échec de la mise à jour de la formation.");
    }
  };

  return (
    <Form layout="vertical" onFinish={handleSubmit} style={{ maxWidth: 600, margin: "0 auto" }}>
      <h3>Modifier la Formation</h3>
      <Form.Item label="Titre Formation" required>
        <Input
          value={titreFormation}
          onChange={(e) => setTitreFormation(e.target.value)}
        />
      </Form.Item>
      <Form.Item label="Date Début" required>
        <Input
          type="date"
          value={dateDebut}
          onChange={(e) => setDateDebut(e.target.value)}
        />
      </Form.Item>
      <Form.Item label="Date Fin" required>
        <Input
          type="date"
          value={dateFin}
          onChange={(e) => setDateFin(e.target.value)}
        />
      </Form.Item>
      <Form.Item label="Type Formation" required>
        <Input
          value={typeFormation}
          onChange={(e) => setTypeFormation(e.target.value)}
        />
      </Form.Item>
      <Form.Item label="Coût Formation">
        <InputNumber
          value={coutFormation}
          onChange={(val) => setCoutFormation(val)}
          style={{ width: "100%" }}
          min={0}
        />
      </Form.Item>
      <Form.Item label="Organisme Réf Externe">
        <Input
          value={organismeRefExterne}
          onChange={(e) => setOrganismeRefExterne(e.target.value)}
        />
      </Form.Item>
      <Form.Item label="Charge Horaire Global">
        <InputNumber
          value={chargeHoraireGlobal}
          onChange={(val) => setChargeHoraireGlobal(val)}
          style={{ width: "100%" }}
          min={0}
        />
      </Form.Item>

      <h4>Les Séances</h4>
      {seances.map((s, index) => (
        <Card key={s.idSeance ?? index} size="small" style={{ marginBottom: 16 }}>
          <Form.Item label="Date de séance" required>
            <Input
              type="date"
              value={s.dateSeance}
              onChange={(e) => handleSeanceChange(index, "dateSeance", e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Heure début" required>
            <Input
              type="time"
              value={s.heureDebut}
              onChange={(e) => handleSeanceChange(index, "heureDebut", e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Heure fin" required>
            <Input
              type="time"
              value={s.heureFin}
              onChange={(e) => handleSeanceChange(index, "heureFin", e.target.value)}
            />
          </Form.Item>
          <Button danger icon={<DeleteOutlined />} onClick={() => handleDeleteSeance(index)}>
            Supprimer cette séance
          </Button>
        </Card>
      ))}
      <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddSeance} style={{ marginBottom: 16 }}>
        Ajouter une séance
      </Button>
      <Space>
        <Button type="primary" htmlType="submit">
          Enregistrer les modifications
        </Button>
        <Button onClick={onCancel}>
          Annuler
        </Button>
      </Space>
    </Form>
  );
}

export default FormationEditForm;








