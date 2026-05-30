import { useState, useEffect } from "react";
import { Form } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import EnseignantService from "@/services/formation/EnseignantService";
import { useAllUps } from "@/hooks/formation/useUpCrud";
import { useAllDepts } from "@/hooks/formation/useDeptCrud";

type RecordType = Record<string, unknown>;

function normalizeListResponse<T>(payload: T[] | { content?: T[]; data?: T[]; items?: T[] } | null | undefined): T[] {
	if (Array.isArray(payload)) {
		return payload;
	}

	if (payload && typeof payload === "object") {
		const candidate = payload as { content?: unknown[]; data?: unknown[]; items?: unknown[] };
		if (Array.isArray(candidate.content)) return candidate.content as T[];
		if (Array.isArray(candidate.data)) return candidate.data as T[];
		if (Array.isArray(candidate.items)) return candidate.items as T[];
	}

	return [];
}

function splitNomComplet(nomComplet?: string) {
	const trimmed = (nomComplet || "").trim();
	if (!trimmed) {
		return { nom: "", prenom: "" };
	}

	const parts = trimmed.split(/\s+/);
	if (parts.length === 1) {
		return { nom: parts[0], prenom: "" };
	}

	return {
		prenom: parts[0],
		nom: parts.slice(1).join(" "),
	};
}

function buildTeacherPayload(values: RecordType) {
	// L'entité backend Enseignant porte les relations imbriquées `up`/`dept`
	// (pas des champs plats upId/deptId). On envoie donc les objets { id } pour
	// que l'affectation UP/Département soit réellement persistée. On conserve
	// aussi upId/deptId pour rétro-compatibilité (ignorés par le backend entité).
	return {
		id: values.id,
		nom: values.nom,
		prenom: values.prenom,
		mail: values.mail,
		type: values.type,
		etat: values.etat,
		cup: values.cup,
		chefDepartement: values.chefDepartement,
		upId: values.upId,
		deptId: values.deptId,
		up: values.upId ? { id: values.upId } : null,
		dept: values.deptId ? { id: values.deptId } : null,
	};
}

export function useTeachersDataGrid() {
	const queryClient = useQueryClient();
	const [file, setFile] = useState<File | null>(null);
	const [selectedTeacher, setSelectedTeacher] = useState<RecordType | null>(null);
	const [drawerVisible, setDrawerVisible] = useState(false);
	const [activeExtractIndex, setActiveExtractIndex] = useState<number | null>(null);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editingRecord, setEditingRecord] = useState<RecordType | null>(null);
	const [editLoading, setEditLoading] = useState(false);
	const [createModalOpen, setCreateModalOpen] = useState(false);
	const [creatingExtract, setCreatingExtract] = useState<RecordType | null>(null);
	const [creatingExtractIndex, setCreatingExtractIndex] = useState<number | null>(null);
	const [createLoading, setCreateLoading] = useState(false);
	const [extracted, setExtracted] = useState<RecordType[]>(() => {
		try {
			const raw = sessionStorage.getItem("rice_extracted_enseignants");
			return raw ? JSON.parse(raw) : [];
		} catch {
			return [];
		}
	});

	useEffect(() => {
		try {
			if (extracted.length > 0) {
				sessionStorage.setItem("rice_extracted_enseignants", JSON.stringify(extracted));
			} else {
				sessionStorage.removeItem("rice_extracted_enseignants");
			}
		} catch {
			// ignore
		}
	}, [extracted]);
	const [editForm] = Form.useForm();
	const [createForm] = Form.useForm();

	const { data: teachers = [], isLoading } = useQuery<RecordType[]>({
		queryKey: ["enseignants"],
		queryFn: async () => normalizeListResponse(await EnseignantService.getAllEnseignants()),
	});

	const { data: ups = [] } = useAllUps();
	const { data: depts = [] } = useAllDepts();

	const handleUpload = async () => {
		if (!file) {
			return;
		}

		await EnseignantService.uploadEnseignants(file);
		await queryClient.invalidateQueries({ queryKey: ["enseignants"] });
		setFile(null);
	};

	const openEditModal = (record: RecordType) => {
		setEditingRecord(record);
			editForm.setFieldsValue({
				...record,
				upId: record.upId ?? (record.up as Record<string, unknown>)?.id,
				deptId: record.deptId ?? (record.dept as Record<string, unknown>)?.id,
			});
		setEditModalOpen(true);
	};

	const handleEditSave = async () => {
		if (!editingRecord?.id) {
			return;
		}

		setEditLoading(true);
		try {
			const values = await editForm.validateFields();
			await EnseignantService.updateEnseignant(String(editingRecord.id), buildTeacherPayload(values));
			await queryClient.invalidateQueries({ queryKey: ["enseignants"] });
			setEditModalOpen(false);
			setEditingRecord(null);
		} finally {
			setEditLoading(false);
		}
	};

	const openCreateExtractModal = (extract?: RecordType, index?: number) => {
		const nextExtract = extract ?? null;
		setCreatingExtract(nextExtract);
		setCreatingExtractIndex(typeof index === "number" ? index : null);
		const { nom, prenom } = splitNomComplet(String(nextExtract?.nom_complet ?? ""));
		createForm.setFieldsValue({
			nom,
			prenom,
			mail: nextExtract?.mail,
			type: "P",
			etat: "A",
			cup: "N",
			chefDepartement: "N",
		});
		setCreateModalOpen(true);
	};

	const handleCreateExtractSave = async () => {
		setCreateLoading(true);
		try {
			const values = await createForm.validateFields();
			await EnseignantService.createEnseignant(buildTeacherPayload(values));
			await queryClient.invalidateQueries({ queryKey: ["enseignants"] });
			setCreateModalOpen(false);
			setCreatingExtract(null);
			setCreatingExtractIndex(null);
			createForm.resetFields();
		} finally {
			setCreateLoading(false);
		}
	};

	const handleIgnoreExtract = (index: number) => {
		setExtracted((current) => current.filter((_, currentIndex) => currentIndex !== index));
		if (creatingExtractIndex === index) {
			setCreatingExtract(null);
			setCreatingExtractIndex(null);
		}
	};

	const handleDelete = async (record: RecordType) => {
		if (!record.id) {
			return;
		}

		await EnseignantService.deleteEnseignant(String(record.id));
		await queryClient.invalidateQueries({ queryKey: ["enseignants"] });
	};

	return {
		data: teachers,
		isLoading,
		ups,
		depts,
		extracted,
		setExtracted,
		file,
		setFile,
		handleUpload,
		selectedTeacher,
		setSelectedTeacher,
		drawerVisible,
		setDrawerVisible,
		activeExtractIndex,
		setActiveExtractIndex,
		editModalOpen,
		setEditModalOpen,
		editingRecord,
		setEditingRecord,
		editLoading,
		editForm,
		openEditModal,
		handleEditSave,
		createModalOpen,
		setCreateModalOpen,
		creatingExtract,
		setCreatingExtract,
		setCreatingExtractIndex,
		createLoading,
		createForm,
		openCreateExtractModal,
		handleCreateExtractSave,
		handleIgnoreExtract,
		handleDelete,
	};
}
