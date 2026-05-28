/* ─────────────────────────────────────────────────────────────────────────
 * BesoinList — Page shell (thin orchestrator, ≤ 200 lines)
 * State & logic: useBesoinList | Table: BesoinTable | Mail: BesoinMailCupModal
 * ─────────────────────────────────────────────────────────────────────── */
import { Row, Col, Skeleton, Button, Pagination } from "antd";
import { InboxOutlined, PlusOutlined, ClearOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";

import { useBesoinList, INITIAL_FILTERS } from "./hooks/useBesoinList";
import { buildFormationNeedHtmlEmail } from "./components/BesoinMailCupModal";

import BesoinHeader      from "./components/BesoinHeader";
import BesoinStatsRow    from "./components/BesoinStatsRow";
import BesoinFiltersPanel from "./components/BesoinFiltersPanel";
import ViewModeToggle    from "./components/ViewModeToggle";
import BesoinCard        from "./components/BesoinCard";
import BesoinTable       from "./components/BesoinTable";
import BesoinMailCupModal from "./components/BesoinMailCupModal";
import BesoinEditModal   from "@/components/besoin/BesoinEditModal";
import BesoinMailModal   from "@/components/besoin/BesoinMailModal";

import "@/styles/pages/besoin-tokens.css";
import "@/styles/pages/besoin-list.css";

export default function BesoinList() {
  const navigate = useNavigate();
  const ctx = useBesoinList();

  const {
    besoins, filtered, pagedCards, loading, stats,
    departements, ups, cupAccounts, types,
    searchText, setSearchText,
    filters, setFilters,
    viewMode, setViewMode,
    page, setPage,
    pageSize, setPageSize,
    editModalOpen, setEditModalOpen, editForm, saving,
    approvingId,
    mailModalOpen, setMailModalOpen, mailRecord, mailForm, mailSending,
    getBesoinId, findById, getLabel, periodLabelOf,
    handleDelete, handleApprove,
    openEdit, handleEditSave,
    openMailModal, handleSendMail,
    exportToExcel,
    refetchBesoins,
    PERIOD_OPTIONS,
  } = ctx;

  const hasActiveFilters =
    !!searchText || !!filters.deptId || !!filters.upId ||
    !!filters.type || !!filters.statut || !!filters.priorite ||
    !!(filters.dateRange?.[0] && filters.dateRange?.[1]);

  if (loading && besoins.length === 0) {
    return (
      <div className="bf-scope bf-page">
        <Skeleton active paragraph={{ rows: 3 }} className="bf-skeleton" />
        <Skeleton active paragraph={{ rows: 2 }} className="bf-skeleton" />
        <div className="bf-skeleton-grid" aria-hidden="true">
          {["sk0","sk1","sk2","sk3","sk4","sk5"].map((key) => (
            <div key={key} className="bf-skeleton-card">
              <div className="bf-sk-row"><div className="bf-sk-line bf-sk-line--w-30" /><div className="bf-sk-line bf-sk-line--w-30" style={{ marginLeft: "auto" }} /></div>
              <div className="bf-sk-line bf-sk-line--h-lg bf-sk-line--w-90" />
              <div className="bf-sk-line bf-sk-line--h-md bf-sk-line--w-70" />
              <div className="bf-sk-row"><div className="bf-sk-circle" /><div style={{ flex: 1 }}><div className="bf-sk-line bf-sk-line--w-50" /><div className="bf-sk-line bf-sk-line--w-30" style={{ marginTop: 6 }} /></div></div>
              <div className="bf-sk-row"><div className="bf-sk-line bf-sk-line--w-30" /><div className="bf-sk-line bf-sk-line--w-30" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bf-scope bf-page">
      <div className="bf-hero">
        <BesoinHeader
          total={stats.total}
          filteredCount={filtered.length}
          loading={loading}
          exportDisabled={filtered.length === 0}
          onRefresh={() => refetchBesoins()}
          onExport={exportToExcel}
          onAdd={() => navigate("/home/besoins/ajouter")}
        />
      </div>

      <BesoinStatsRow total={stats.total} approved={stats.approved} pending={stats.pending} />

      <BesoinFiltersPanel
        searchText={searchText}
        filters={filters}
        types={types.filter(Boolean) as string[]}
        ups={ups as any}
        departements={departements as any}
        onSearchChange={setSearchText}
        onFiltersChange={setFilters as any}
        onReset={() => { setFilters(INITIAL_FILTERS); setSearchText(""); }}
      />

      <ViewModeToggle value={viewMode} onChange={setViewMode} count={filtered.length} total={stats.total} />

      {filtered.length === 0 && !loading && (
        <output className="bf-empty">
          <div className="bf-empty__illustration" aria-hidden="true"><InboxOutlined /></div>
          <h3 className="bf-empty__title">
            {hasActiveFilters ? "Aucun besoin ne correspond à vos critères" : "Aucun besoin enregistré"}
          </h3>
          <p className="bf-empty__subtitle">
            {hasActiveFilters
              ? "Essayez d'élargir vos filtres ou de réinitialiser la recherche pour voir l'ensemble des demandes."
              : "Commencez par enregistrer une première demande de formation pour la rendre visible aux unités pédagogiques."}
          </p>
          <div className="bf-empty__actions">
            {hasActiveFilters && (
              <Button icon={<ClearOutlined />} onClick={() => { setFilters(INITIAL_FILTERS); setSearchText(""); }} className="bf-btn bf-btn--ghost">
                Réinitialiser les filtres
              </Button>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate("/home/besoins/ajouter")} className="bf-btn bf-btn--primary">
              Ajouter un besoin
            </Button>
          </div>
        </output>
      )}

      {viewMode === "cards" && filtered.length > 0 && (
        <>
          <Row gutter={[16, 16]} className="bf-grid">
            {pagedCards.map((b) => {
              const id = getBesoinId(b as any);
              return (
                <Col xs={24} sm={12} lg={8} xxl={6} key={String(id)}>
                  <BesoinCard
                    besoin={b}
                    upLabel={getLabel(findById(ups as any, b.up as any) as any)}
                    deptLabel={getLabel(findById(departements as any, b.departement as any) as any)}
                    periodLabel={periodLabelOf(b as any)}
                    approvingId={approvingId}
                    onApprove={handleApprove}
                    onOpenMail={openMailModal}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    onOpen={() => openEdit(b as any)}
                  />
                </Col>
              );
            })}
          </Row>
          <div className="bf-pagination">
            <Pagination
              current={page}
              pageSize={pageSize}
              total={filtered.length}
              onChange={(p, s) => { setPage(p); setPageSize(s); }}
              showSizeChanger
              pageSizeOptions={[8, 12, 16, 24, 48]}
              showTotal={(t, [a, b]) => `${a}-${b} sur ${t} besoins`}
            />
          </div>
        </>
      )}

      {viewMode === "table" && filtered.length > 0 && (
        <BesoinTable
          data={filtered as any}
          loading={loading}
          approvingId={approvingId}
          getBesoinId={getBesoinId}
          onApprove={handleApprove}
          onOpenMail={openMailModal}
          onEdit={openEdit}
          onDelete={handleDelete}
        />
      )}

      {/* Edit Modal (delegated to existing shared component) */}
      <BesoinEditModal
        {...({
          open: editModalOpen,
          form: editForm,
          saving: saving,
          ups: ups as any,
          departements: departements as any,
          periodOptions: PERIOD_OPTIONS,
          onSave: handleEditSave,
          onCancel: () => setEditModalOpen(false),
        } as any)}
      />

      {/* Mail CUP Modal */}
      <BesoinMailCupModal
        open={mailModalOpen}
        mailRecord={mailRecord}
        mailForm={mailForm}
        cupAccounts={cupAccounts}
        sending={mailSending}
        onConfirm={handleSendMail}
        onCancel={() => setMailModalOpen(false)}
      />
    </div>
  );
}
