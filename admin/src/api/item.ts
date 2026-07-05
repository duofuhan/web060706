import { http } from '@/utils/http';

export const getItems = (params: any) => http.get<any>('/items', { params });
export const getItem = (id: number) => http.get<any>(`/items/${id}`);
export const createItem = (data: any) => http.post<any>('/items', data);
export const updateItem = (id: number, data: any) => http.put<any>(`/items/${id}`, data);
export const deleteItem = (id: number) => http.delete<any>(`/items/${id}`);
export const uploadImages = (formData: FormData) =>
  http.post<any>('/items/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } } as any);