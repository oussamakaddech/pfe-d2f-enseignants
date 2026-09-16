import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DocumentService from "@/services/formation/DocumentService";
import type { Id } from "@/models/common";

const KEYS = {
  all: ["documents"] as const,
  one: (id: Id) => ["documents", id] as const,
};

type DocumentPayload = {
  formationId: Id;
  pathType: string;
  nomDocument: string;
  obligation: string;
  file: File;
};

type DocumentUpdatePayload = {
  pathType: string;
  nomDocument: string;
  obligation: string;
  file?: File;
};

export function useAllDocuments() {
  return useQuery<unknown[]>({
    queryKey: KEYS.all,
    queryFn: () => DocumentService.getAllDocuments(),
  });
}

export function useDocumentById(id: Id | undefined) {
  return useQuery<unknown>({
    queryKey: KEYS.one(id!),
    queryFn: () => DocumentService.getDocumentById(id!),
    enabled: !!id,
  });
}

export function useCreateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: DocumentPayload) => DocumentService.createDocument(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useUpdateDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: Id } & DocumentUpdatePayload) =>
      DocumentService.updateDocument(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: Id) => DocumentService.deleteDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEYS.all }),
  });
}

export function useDownloadDocument() {
  return useMutation({
    mutationFn: (id: Id) => DocumentService.downloadDocument(id),
  });
}
