import { API_BASE_URL } from '../utils/api.js';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const getAuthHeaders = (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};

export const useDemandes = (token, { page = 0, size = 5, statusFilter = '', search = '', showArchived = false, startDate = '', endDate = '' }) => {

  return useQuery({
    queryKey: ['demandes', { page, size, statusFilter, search, showArchived, startDate, endDate }],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      if (statusFilter) queryParams.append('statut', statusFilter);
      if (search) queryParams.append('search', search);
      if (startDate) queryParams.append('startDate', startDate);
      if (endDate) queryParams.append('endDate', endDate);
      queryParams.append('archive', showArchived ? 'true' : 'false');
      queryParams.append('page', page);
      queryParams.append('size', size);

      const response = await fetch(`${API_BASE_URL}/demandes?${queryParams.toString()}`, {
        headers: getAuthHeaders(token),
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || 'Erreur lors du chargement des demandes.');
      }
      return response.json();
    },
    enabled: true, // Always enabled — auth handled via cookie or token
    keepPreviousData: true
  });
};


export const useUpdateDemandeStatus = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, motifRejet, officierId }) => {
      const response = await fetch(`${API_BASE_URL}/demandes/${id}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ 
          statut: status, 
          motif_rejet: motifRejet,
          officier_id: officierId 
        })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la mise à jour.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
    }
  });
};

export const useToggleArchive = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archive }) => {
      const response = await fetch(`${API_BASE_URL}/demandes/${id}/archive?archive=${archive}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `Erreur lors de l'archivage.`);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
    }
  });
};

export const useProgressWorkflow = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, commentaire }) => {
      const response = await fetch(`${API_BASE_URL}/demandes/${id}/workflow/progress`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ commentaire })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de la progression du workflow.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
    }
  });
};

export const useReturnWorkflow = (token) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, commentaire }) => {
      const response = await fetch(`${API_BASE_URL}/demandes/${id}/workflow/return`, {
        method: 'PUT',
        headers: getAuthHeaders(token),
        body: JSON.stringify({ commentaire })
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors du retour du workflow.');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['demandes'] });
    }
  });
};
