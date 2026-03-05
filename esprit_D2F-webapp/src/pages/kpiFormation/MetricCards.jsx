// src/components/KPI/MetricCards.js

import { useState, useEffect, useRef } from "react";
import {
  Card,
  Row,
  Col,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  DatePicker,
  Switch,
  Spin,
  Tooltip,
  message,
} from "antd";
import { SettingOutlined, PlusOutlined, CloseOutlined } from "@ant-design/icons";
import dayjs from "dayjs";

import KPIService from "../../services/KPIService";
import DeptService from "../../services/DeptService";
import UpService from "../../services/upService";

const { RangePicker } = DatePicker;
const { Option } = Select;

// Clé pour stocker la configuration des cartes dans localStorage
const LOCALSTORAGE_KEY = "metricCardsConfiguration";

const MetricCards = () => {
  //
  // ─── ÉTATS LOCAUX ──────────────────────────────────────────────────────────────
  //
  // Chaque carte est de la forme :
  // {
  //   id: <number>,
  //   visible: <bool>,
  //   filters: { domaine, upId, deptId, ouverte, start, end, etat },
  //   count: Number|null,       // nombre de formations
  //   totalHeures: Number|null, // somme des heures
  //   title: String
  // }
  //
  const [cards, setCards] = useState([]);

  // Listes pour remplir les filtres
  const [deptsOptions, setDeptsOptions] = useState([]);
  const [upsOptions, setUpsOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Période globale (dayjs) à appliquer à toutes les cartes
  const [globalPeriod, setGlobalPeriod] = useState(null);

  // Pour éviter de relancer le recalcul au moindre changement de "cards"
  // on utilisera un ref pour ne déclencher l’effet de recalcul qu’une seule fois au montage.
  const isFirstMount = useRef(true);

  //
  // ─── EFFETS AU MONTAGE ───────────────────────────────────────────────────────────
  //

  // 1) Charger la configuration des cartes depuis localStorage ET
  //    lancer un rafraîchissement des "count" + "totalHeures"
  //    *uniquement* lors du tout premier rendu du composant.
  useEffect(() => {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (stored) {
      let parsed = [];
      try {
        parsed = JSON.parse(stored);
      } catch (e) {
        console.warn("Impossible de parser la configuration depuis localStorage :", e);
      }

      // On met d’abord à jour l’état local avec la config stockée
      setCards(parsed);

      // Ensuite, pour chaque carte retrouvée, on appelle immédiatement l’API
      // pour récupérer le 'count' et le 'totalHeures' les plus récents.
      // On ne le fait que si parsed.length > 0.
      if (parsed.length > 0) {
        (async () => {
          const rafraichies = await Promise.all(
            parsed.map(async (c) => {
              try {
                // On reconstruit l’objet filters exactement comme on le ferait
                // depuis le formulaire, afin de récupérer les bonnes données :
                const { count, totalHeures } = await KPIService.getCountAndHeures(c.filters);
                return {
                  ...c,
                  count,
                  totalHeures,
                  title: buildTitle(c.filters),
                };
              // eslint-disable-next-line no-unused-vars
              } catch (e) {
                // Si l’API échoue pour une carte, on la conserve telle quelle
                return c;
              }
            })
          );
          setCards(rafraichies);
        })();
      }
    }
  }, []);

  // 2) Chaque fois que “cards” change, on sauvegarde dans localStorage
  //    (cela inclut les rafraîchissements initiaux ou tout ajout/suppression d’une carte)
  useEffect(() => {
    // On ne sauvegarde pas lors du premier montage (car on vient de lire localStorage),
    // mais on sauvegarde après chaque ajout/suppression/modification de contenu de "cards".
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  // 3) Charger dynamiquement Compétences, Départements, UPs
  useEffect(() => {
    const fetchAllOptions = async () => {
      try {
        const [depts, ups] = await Promise.all([
          DeptService.getAllDepts(),
          UpService.getAllUps(),
        ]);
        setDeptsOptions(depts || []);
        setUpsOptions(ups || []);
      } catch (error) {
        console.error("Erreur lors de la récupération des options :", error);
        message.error("Impossible de charger les listes de filtres.");
      } finally {
        setLoadingOptions(false);
      }
    };
    fetchAllOptions();
  }, []);

  //
  // ─── FONCTIONS POUR GÉRER LES CARTES ──────────────────────────────────────────────
  //

  // Ouvre le panneau de réglages pour la carte id
  const openSettings = (id) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, visible: true } : c)));
  };

  // Ferme le panneau de réglages pour la carte id
  const closeSettings = (id) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, visible: false } : c)));
  };

  // Supprime la carte d’ID id
  const deleteCard = (id) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
  };

  // Ajoute une nouvelle carte vierge
  const addCard = () => {
    const newCard = {
      id: Date.now(),
      visible: false,
      filters: {
        domaine: null,
        upId: null,
        deptId: null,
        ouverte: null,
        start: null,
        end: null,
        etat: null,
      },
      count: null,
      totalHeures: null,
      title: "Toutes formations (PLANIFIE + ACHEVE)",
    };
    setCards((prev) => [...prev, newCard]);
  };

  /**
   * buildTitle(filters):
   *   - Génére un titre « parlant » selon les filtres
   *   - Si seul filtre = ouverte true → "Formations transversales (ouvertes)"
   *   - Si seul filtre = période start+end → "Formations du X au Y"
   *   - Si seul filtre = upId → "Formations UP : <libellé>"
   *   - Si seul filtre = deptId → "Formations Département : <libellé>"
   *   - Sinon, concatène toutes les paires “Clé=Valeur” par “ • ”
   *   - Si aucun filtre → “Toutes formations (PLANIFIE + ACHEVE)”
   */
  const buildTitle = (filters) => {
    const { domaine, upId, deptId, ouverte, start, end, etat } = filters;

    // 1) Si seul filtre = ouverte true
    const onlyOuverte =
      ouverte === true &&
      !domaine &&
      upId == null &&
      deptId == null &&
      !start &&
      !end &&
      !etat;
    if (onlyOuverte) {
      return "Formations transversales (ouvertes)";
    }

    // 2) Si seul filtre = période
    const onlyPeriod =
      start &&
      end &&
      !domaine &&
      upId == null &&
      deptId == null &&
      ouverte == null &&
      !etat;
    if (onlyPeriod) {
      return `Formations du ${start} au ${end}`;
    }

    // 3) Si seul filtre = upId
    if (
      upId != null &&
      !domaine &&
      deptId == null &&
      ouverte == null &&
      !start &&
      !end &&
      !etat
    ) {
      const upItem = upsOptions.find((u) => u.id === upId);
      const label = upItem ? upItem.libelle : `UP ${upId}`;
      return `Formations UP : ${label}`;
    }

    // 4) Si seul filtre = deptId
    if (
      deptId != null &&
      !domaine &&
      upId == null &&
      ouverte == null &&
      !start &&
      !end &&
      !etat
    ) {
      const deptItem = deptsOptions.find((d) => d.id === deptId);
      const label = deptItem ? deptItem.libelle : `Dept ${deptId}`;
      return `Formations Département : ${label}`;
    }

    // 5) Cas générique : concaténer chaque critère
    const parts = [];
    if (domaine) parts.push(`Domaine=${domaine}`);
    if (upId != null) {
      const upItem = upsOptions.find((u) => u.id === upId);
      const label = upItem ? upItem.libelle : upId;
      parts.push(`UP=${label}`);
    }
    if (deptId != null) {
      const deptItem = deptsOptions.find((d) => d.id === deptId);
      const label = deptItem ? deptItem.libelle : deptId;
      parts.push(`Dépt=${label}`);
    }
    if (ouverte !== null) parts.push(`Ouverte=${ouverte ? "Oui" : "Non"}`);
    if (start && end) parts.push(`Période=${start}→${end}`);
    if (etat) parts.push(`État=${etat}`);

    if (parts.length === 0) {
      return "Toutes formations (PLANIFIE + ACHEVE)";
    }
    return parts.join("  •  ");
  };

  /**
   * handleFormSubmit(cardId, values):
   *   - Reconstruit 'filters' à partir des valeurs du Formulaire
   *   - Appelle KPIService.getCountAndHeures(filters)
   *   - Met à jour la carte : count, totalHeures, filters, title
   *   - Ferme le Drawer
   */
  const handleFormSubmit = async (cardId, values) => {
    // 1) Construire l’objet filters
    const filters = {
      domaine:    values.domaine    || null,
      upId:       values.upId       !== undefined ? values.upId : null,
      deptId:     values.deptId     !== undefined ? values.deptId : null,
      ouverte:    values.ouverte    !== undefined ? values.ouverte : null,
      start:      values.dateRange
                    ? values.dateRange[0].format("YYYY-MM-DD")
                    : null,
      end:        values.dateRange
                    ? values.dateRange[1].format("YYYY-MM-DD")
                    : null,
      etat:       values.etat || null,
    };

    try {
      // 2) Appel à /kpi/count-heures
      const { count, totalHeures } = await KPIService.getCountAndHeures(filters);

      // 3) Mise à jour de la carte dans le state
      setCards((prev) =>
        prev.map((c) =>
          c.id === cardId
            ? {
                ...c,
                count,
                totalHeures,
                filters,
                title: buildTitle(filters),
              }
            : c
        )
      );
    } catch (err) {
      console.error("Erreur lors de la récupération du count & heures :", err);
      message.error("Impossible de calculer l’indicateur. Vérifiez vos filtres.");
    } finally {
      // 4) Fermeture du Drawer
      closeSettings(cardId);
    }
  };

  /**
   * handleGlobalPeriodChange(dates):
   *   - Applique la période globale aux filtres “start” et “end” de toutes les cartes,
   *   - Appelle KPIService.getCountAndHeures pour chacune,
   *   - Met à jour chaque carte dans le state.
   */
  const handleGlobalPeriodChange = async (dates) => {
    if (!dates) {
      setGlobalPeriod(null);
      return;
    }
    const newStart = dates[0].format("YYYY-MM-DD");
    const newEnd   = dates[1].format("YYYY-MM-DD");
    setGlobalPeriod(dates);

    const updated = await Promise.all(
      cards.map(async (c) => {
        const newFilters = { ...c.filters, start: newStart, end: newEnd };
        try {
          const { count, totalHeures } = await KPIService.getCountAndHeures(newFilters);
          return {
            ...c,
            filters: newFilters,
            count,
            totalHeures,
            title: buildTitle(newFilters),
          };
        // eslint-disable-next-line no-unused-vars
        } catch (e) {
          // En cas d’erreur, on ne met à jour que les filtres
          return { ...c, filters: newFilters };
        }
      })
    );
    setCards(updated);
  };

  //
  // ─── AFFICHAGE DU SPINNER SI LES LISTES D’OPTIONS SONT EN COURS DE CHARGEMENT ───
  //
  if (loadingOptions) {
    return (
      <div style={{ textAlign: "center", padding: "50px 0" }}>
        <Spin size="large" tip="Chargement des filtres …" />
      </div>
    );
  }



  //
  // ─── RENDU FINAL ────────────────────────────────────────────────────────────────
  //
  return (
    <div>
      {/* TITRE DE SECTION + TOTAL */}
 
      <h4 style={{ margin: 0 }}>📊Nombre et heures des  Formations  </h4>
      {/* TEXTE EXPLICATIF SUR TOUTE LA LARGEUR */}
      <p style={{ textAlign: "center", color: "#999", marginBottom: 8 }}>
        Vous pouvez définir une période globale et ajouter un nouvel indicateur ci-dessous :
      </p>

      {/* CONTENEUR FLEX : RangePicker à gauche, Bouton Ajouter un indicateur à droite */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        {/* RangePicker pour la période globale */}
        <RangePicker
          style={{ maxWidth: 350 }}
          value={globalPeriod}
          onChange={handleGlobalPeriodChange}
          placeholder={["Date de début", "Date de fin"]}
        />

        {/* Bouton “+ Ajouter un indicateur” */}
        <Button
          type="dashed"
          onClick={addCard}
          icon={<PlusOutlined />}
          style={{ flexShrink: 0 }}
        >
          Ajouter un indicateur
        </Button>
      </div>

      {/* GRILLE DE CARTES */}
      <Row gutter={[16, 16]}>
        {cards.map((card) => (
          <Col key={card.id} xs={24} sm={12} md={8} lg={6}>
            {/* Tooltip pour afficher le titre complet */}
            <Tooltip title={card.title} placement="top" mouseEnterDelay={0.3}>
              <Card
                className="metric-card"
                hoverable
                title={
                  card.title.length > 20
                    ? card.title.slice(0, 20) + "…"
                    : card.title
                }
                extra={
                  <>
                    {/* Bouton ⚙️ */}
                    <SettingOutlined
                      style={{ fontSize: 18 }}
                      onClick={() => openSettings(card.id)}
                    />
                    {/* Bouton ❌ */}
                    <CloseOutlined
                      style={{ fontSize: 18, marginLeft: 8, color: "#f5222d" }}
                      onClick={() => deleteCard(card.id)}
                    />
                  </>
                }
              >
                {/* Affichage du count + totalHeures */}
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "1.8rem", fontWeight: "bold" }}>
                    {card.count !== null ? card.count : "-"}{" "}
                    <span style={{ fontSize: "1rem", marginLeft: 4 }}>
                      formations
                    </span>
                  </div>
                  <div style={{ fontSize: "1rem", color: "#555", marginTop: 4 }}>
                    {card.totalHeures !== null
                      ? `${card.totalHeures} h totales`
                      : "-"}
                  </div>
                </div>
              </Card>
            </Tooltip>

            {/* Drawer pour configurer les filtres */}
            <Drawer
              title="Configurer l’indicateur"
              placement="right"
              onClose={() => closeSettings(card.id)}
              visible={card.visible}
              width={350}
              destroyOnHidden
            >
              <Form
                layout="vertical"
                onFinish={(values) => handleFormSubmit(card.id, values)}
                initialValues={{
                  domaine:    card.filters.domaine,
                  upId:       card.filters.upId,
                  deptId:     card.filters.deptId,
                  ouverte:    card.filters.ouverte,
                  etat:       card.filters.etat,
                  dateRange:
                    card.filters.start && card.filters.end
                      ? [
                          dayjs(card.filters.start, "YYYY-MM-DD"),
                          dayjs(card.filters.end,   "YYYY-MM-DD"),
                        ]
                      : null,
                }}
              >

                {/* Champ “Domaine” */}
                <Form.Item label="Domaine" name="domaine">
                  <Input placeholder="Ex : Informatique" allowClear />
                </Form.Item>

                {/* Champ “UP” */}
                <Form.Item label="UP" name="upId">
                  <Select
                    showSearch
                    placeholder="Sélectionner une UP"
                    allowClear
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {upsOptions.map((u) => (
                      <Option key={u.id} value={u.id}>
                        {u.libelle}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* Champ “Département” */}
                <Form.Item label="Département" name="deptId">
                  <Select
                    showSearch
                    placeholder="Sélectionner un département"
                    allowClear
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {deptsOptions.map((d) => (
                      <Option key={d.id} value={d.id}>
                        {d.libelle}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                {/* Champ “Ouverte” */}
                <Form.Item label="Ouverte" name="ouverte" valuePropName="checked">
                  <Switch checkedChildren="Oui" unCheckedChildren="Non" />
                </Form.Item>

                {/* Champ “Période” */}
                <Form.Item label="Période" name="dateRange">
                  <RangePicker style={{ width: "100%" }} allowEmpty={[false, false]} />
                </Form.Item>

                {/* Champ “État” */}
                <Form.Item label="État" name="etat">
                  <Select placeholder="Sélectionner l’état (facultatif)" allowClear>
                    <Option value="PLANIFIE">PLANIFIE</Option>
                    <Option value="ACHEVE">ACHEVE</Option>
                    <Option value="TOUT">TOUT</Option>
                  </Select>
                </Form.Item>

                {/* Bouton “Appliquer” */}
                <Form.Item style={{ textAlign: "right" }}>
                  <Button type="primary" htmlType="submit">
                    Appliquer
                  </Button>
                </Form.Item>
              </Form>
            </Drawer>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default MetricCards;
