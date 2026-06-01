import type { FormInstance } from "antd";
import type useCompetenceCrud from "@/hooks/competence/useCompetenceCrud";
import type useStructureData from "@/hooks/competence/useStructureData";
import DomaineModal from "./modals/DomaineModal";
import CompetenceFormModal from "./modals/CompetenceFormModal";
import SousCompetenceFormModal from "./modals/SousCompetenceFormModal";
import SavoirFormModal from "./modals/SavoirFormModal";
import NiveauDefinitionModal from "./modals/NiveauDefinitionModal";

interface CompetenceModalsProps {
  crud: ReturnType<typeof useCompetenceCrud>;
  structure: ReturnType<typeof useStructureData>;
  domaineForm: FormInstance;
  compForm: FormInstance;
  scForm: FormInstance;
  savoirForm: FormInstance;
  addNiveauForm: FormInstance;
}

export default function CompetenceModals({
  crud,
  structure,
  domaineForm,
  compForm,
  scForm,
  savoirForm,
  addNiveauForm,
}: Readonly<CompetenceModalsProps>) {
  return (
    <>
      <DomaineModal crud={crud} domaineForm={domaineForm} />
      <CompetenceFormModal crud={crud} compForm={compForm} />
      <SousCompetenceFormModal crud={crud} scForm={scForm} />
      <SavoirFormModal crud={crud} savoirForm={savoirForm} />
      <NiveauDefinitionModal structure={structure} addNiveauForm={addNiveauForm} />
    </>
  );
}






