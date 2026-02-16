// src/components/FormationList.jsx
import  { useEffect, useState, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Layout,
  Row,
  Col,
  Card,
  Typography,
  Input,
  Select,
  DatePicker,
  Button,
} from "antd";
import {
  ReadOutlined,
  CalendarOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import FormationWorkflowService from "../../services/FormationWorkflowService";
import { AuthContext } from "../../context/AuthContext";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const FormationList = () => {
  const { user } = useContext(AuthContext);
  const [formations, setFormations] = useState([]);
  const [titleFilter, setTitleFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [upFilter, setUpFilter] = useState("");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFn =
      user.role === "D2F"
        ? FormationWorkflowService.getFormationsAchevees
        : FormationWorkflowService.getFormationsByAnimateur;
    fetchFn()
      .then((data) => setFormations(data))
      .catch((err) =>
        console.error("Erreur récupération formations :", err)
      );
  }, [user]);

  // Extraire départements et UP
  const depts = useMemo(() => {
    const m = {};
    formations.forEach((f) => {
      if (f.departement1) m[f.departement1.id] = f.departement1.libelle;
    });
    return Object.entries(m).map(([id, libelle]) => ({ id, libelle }));
  }, [formations]);

  const ups = useMemo(() => {
    const m = {};
    formations.forEach((f) => {
      if (f.up1) m[f.up1.id] = f.up1.libelle;
    });
    return Object.entries(m).map(([id, libelle]) => ({ id, libelle }));
  }, [formations]);

  // Appliquer filtres
  const filtered = useMemo(() => {
    return formations.filter((f) => {
      if (
        titleFilter &&
        !f.titreFormation.toLowerCase().includes(titleFilter.toLowerCase())
      )
        return false;
      if (deptFilter && (!f.departement1 || f.departement1.id !== deptFilter))
        return false;
      if (upFilter && (!f.up1 || f.up1.id !== upFilter)) return false;
      if (startDate && dayjs(f.dateDebut).isBefore(startDate, "day"))
        return false;
      if (endDate && dayjs(f.dateFin).isAfter(endDate, "day"))
        return false;
      return true;
    });
  }, [formations, titleFilter, deptFilter, upFilter, startDate, endDate]);

  const resetFilters = () => {
    setTitleFilter("");
    setDeptFilter("");
    setUpFilter("");
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <Content style={{ padding: 24 }}>
      <Title level={2} style={{ textAlign: "center" }}>
        <ReadOutlined style={{ marginRight: 8 }} />
        {user.role === "D2F" ? "Toutes les Formations" : "Mes Formations"}
      </Title>

      {/* Filtres */}
      <Row gutter={[16, 16]} justify="center" style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Input
            placeholder="Titre"
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="Département"
            value={deptFilter}
            onChange={setDeptFilter}
            allowClear
            style={{ width: "100%" }}
          >
            {depts.map((d) => (
              <Option key={d.id} value={d.id}>
                {d.libelle}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Select
            placeholder="UP"
            value={upFilter}
            onChange={setUpFilter}
            allowClear
            style={{ width: "100%" }}
          >
            {ups.map((u) => (
              <Option key={u.id} value={u.id}>
                {u.libelle}
              </Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} sm={12} md={4}>
          <DatePicker
            placeholder="Date début"
            value={startDate}
            onChange={(d) => setStartDate(d)}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <DatePicker
            placeholder="Date fin"
            value={endDate}
            onChange={(d) => setEndDate(d)}
            style={{ width: "100%" }}
          />
        </Col>
        <Col xs={24} sm={12} md={4}>
          <Button
            icon={<ReloadOutlined />}
            onClick={resetFilters}
            style={{ width: "100%" }}
          >
            Réinitialiser
          </Button>
        </Col>
      </Row>

      {/* Cartes des formations */}
      <Row gutter={[16, 16]}>
        {filtered.map((f) => (
          <Col xs={24} sm={12} md={8} lg={6} key={f.idFormation}>
            <Card
              hoverable
              onClick={() =>
                navigate(`/home/animateur-formations/${f.idFormation}`)
              }
            >
              <Card.Meta
                title={f.titreFormation}
                description={
                  <Text type="secondary">
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    Du {dayjs(f.dateDebut).format("DD/MM/YYYY")} au{" "}
                    {dayjs(f.dateFin).format("DD/MM/YYYY")}
                  </Text>
                }
              />
            </Card>
          </Col>
        ))}
      </Row>
    </Content>
  );
};

export default FormationList;
