import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { api } from './api';

export function useSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['summary'],
    queryFn: () => api('/workspace/summary'),
    enabled,
    staleTime: 60000,
  });
}

export function useCustomers(enabled: boolean, q: string = '', filter: string = 'all', sort: string = 'recent') {
  return useInfiniteQuery({
    queryKey: ['customers', q, filter, sort],
    queryFn: ({ pageParam = 1 }) => api(`/customers?page=${pageParam}&q=${encodeURIComponent(q)}&filter=${encodeURIComponent(filter)}&sort=${encodeURIComponent(sort)}`),
    getNextPageParam: (lastPage: any, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 30000,
  });
}

export function useCustomer(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: () => api(`/customers/${id}`),
    enabled,
    staleTime: 30000,
  });
}

export function useCustomerEntries(id: string, enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['customers', id, 'entries'],
    queryFn: ({ pageParam = 1 }) => api(`/customers/${id}/entries?page=${pageParam}`),
    getNextPageParam: (lastPage: any, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 30000,
  });
}

export function useEntries(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['entries'],
    queryFn: ({ pageParam = 1 }) => api(`/entries?page=${pageParam}`),
    getNextPageParam: (lastPage: any, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 30000,
  });
}

export function useProducts(enabled: boolean, q: string = '') {
  return useInfiniteQuery({
    queryKey: ['products', q],
    queryFn: ({ pageParam = 1 }) => api(`/products?page=${pageParam}&q=${encodeURIComponent(q)}`),
    getNextPageParam: (lastPage: any, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 60000,
  });
}

export function useBills(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['bills'],
    queryFn: ({ pageParam = 1 }) => api(`/bills?page=${pageParam}`),
    getNextPageParam: (lastPage: any, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 60000,
  });
}

export function useNotifications(enabled: boolean) {
  return useInfiniteQuery({
    queryKey: ['notifications'],
    queryFn: ({ pageParam = 1 }) => api(`/notifications?page=${pageParam}`),
    getNextPageParam: (lastPage: any, allPages) => lastPage.hasMore ? allPages.length + 1 : undefined,
    initialPageParam: 1,
    enabled,
    staleTime: 30000,
  });
}
