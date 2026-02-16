// src/components/EvaluationListEnriched.jsx
import  { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import SaveAltOutlined from "@mui/icons-material/SaveAltOutlined";
import * as XLSX from "xlsx";
import EvaluationFormateurService from "../../services/EvaluationFormateurService";

const EvaluationListEnriched = () => {
  const [evaluations, setEvaluations] = useState([]);

  useEffect(() => {
    EvaluationFormateurService.listAllEvaluationsEnriched()
      .then((data) => setEvaluations(data))
      .catch((error) => {
        console.error(
          "Erreur lors de la récupération des évaluations enrichies :",
          error
        );
      });
  }, []);

  const handleChange = (index, field, value) => {
    const copy = [...evaluations];
    copy[index][field] = value;
    setEvaluations(copy);
  };

  const handleCheckboxChange = (index, field, checked) => {
    const copy = [...evaluations];
    copy[index][field] = checked;
    setEvaluations(copy);
  };

  const handleSaveAll = () => {
    const dtos = evaluations.map((e) => ({
      idEvalParticipant: e.idEvalParticipant,
      note: e.note,
      satisfaisant: e.satisfaisant,
      commentaire: e.commentaire,
      enseignantId: e.enseignantId,
      formationId: e.formationId,
    }));
    EvaluationFormateurService.updateEvaluationsBulk(dtos)
      .then(() =>
        console.log("Mise à jour en masse effectuée avec succès")
      )
      .catch((err) =>
        console.error("Erreur lors de la mise à jour en masse :", err)
      );
  };

  const exportExcel = () => {
    const data = evaluations.map((e) => ({
      Nom: e.nom,
      Prénom: e.prenom,
      Email: e.mail,
      Note: e.note,
      Satisfaisant: e.satisfaisant ? "Oui" : "Non",
      Commentaire: e.commentaire || "",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Évaluations");
    XLSX.writeFile(wb, "evaluations_enriched.xlsx");
  };

  return (
    <Paper sx={{ mt: 4, p: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={2}
      >
        <Typography variant="h6">Évaluations enrichies</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SaveAltOutlined />}
            onClick={exportExcel}
            sx={{ mr: 1 }}
          >
            Exporter Excel
          </Button>
          <Button variant="contained" onClick={handleSaveAll}>
            Enregistrer tout
          </Button>
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Enseignant</TableCell>
              <TableCell>Note</TableCell>
              <TableCell>Satisfaisant</TableCell>
              <TableCell>Commentaire</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {evaluations.map((row, idx) => (
              <TableRow key={row.idEvalParticipant}>
                <TableCell>
                  {row.nom} {row.prenom}
                  <br />
                  <Typography variant="caption">
                    ({row.mail})
                  </Typography>
                </TableCell>
                <TableCell>
                  <TextField
                    type="number"
                    value={row.note}
                    onChange={(e) =>
                      handleChange(idx, "note", e.target.value)
                    }
                    size="small"
                    sx={{ width: 80 }}
                  />
                </TableCell>
                <TableCell>
                  <Checkbox
                    checked={row.satisfaisant}
                    onChange={(e) =>
                      handleCheckboxChange(
                        idx,
                        "satisfaisant",
                        e.target.checked
                      )
                    }
                  />
                </TableCell>
                <TableCell>
                  <TextField
                    value={row.commentaire}
                    onChange={(e) =>
                      handleChange(idx, "commentaire", e.target.value)
                    }
                    multiline
                    rows={1}
                    size="small"
                    fullWidth
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default EvaluationListEnriched;
