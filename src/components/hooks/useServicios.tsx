import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from './apiFetch';

export interface Servicio {
  id_servicio: number;
  nombre_servicio: string;
  precio: number;
  descripcion: string | null;
  // Campos mapeados para el frontend
  id?: number;
  nombre?: string;
  categoria?: string;
  costo?: number;
  estado?: string;
  equipoNecesario?: string[];
  materialesIncluidos?: string[];

}

const API_URL = '/api';

export function useServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  const cargarServicios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch(`${API_URL}/servicios`);
      const mapped = (data || [])
        .filter((s: any) => s.estado !== 'eliminado') // Excluir servicios eliminados
        .map((s: any) => ({
          ...s,
          id: s.id_servicio,
          nombre: s.nombre_servicio
        }));
      setServicios(mapped);
    } catch (error) {
      console.error('Error al cargar servicios:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarServicios(); }, [cargarServicios]);

  const agregarServicio = useCallback(async (servicioData: Partial<Servicio>) => {
    setLoading(true);
    try {
      const nuevo = await apiFetch(`${API_URL}/servicios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicioData),
      });
      const mapped = { ...nuevo, id: nuevo.id_servicio, nombre: nuevo.nombre_servicio };
      setServicios(prev => [mapped, ...prev]);
      return { success: true, data: mapped };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const actualizarServicio = useCallback(async (id: number, servicioData: Partial<Servicio>) => {
    setLoading(true);
    try {
      const actualizado = await apiFetch(`${API_URL}/servicios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(servicioData),
      });
      const mapped = { ...actualizado, id: actualizado.id_servicio, nombre: actualizado.nombre_servicio };
      setServicios(prev => prev.map(s => s.id_servicio === id ? mapped : s));
      return { success: true, data: mapped };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const eliminarServicio = useCallback(async (id: number) => {
    setLoading(true);
    try {
      // Usar PUT para marcar como 'eliminado' (soft delete) en lugar de DELETE
      // Esto evita errores de llave foránea en la base de datos
      await apiFetch(`${API_URL}/servicios/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'eliminado' }),
      });
      setServicios(prev => prev.filter(s => s.id_servicio !== id));
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const buscarServicios = useCallback((query: string) => {
    const q = query.toLowerCase().trim();
    const mapService = (s: Servicio) => ({
      ...s,
      id: s.id_servicio,
      nombre: s.nombre_servicio
    });

    if (!q) return servicios.map(mapService);

    return servicios
      .filter(s =>
        s.nombre_servicio?.toLowerCase().startsWith(q)
      )
      .map(mapService);
  }, [servicios]);

  const obtenerEstadisticas = useCallback(() => {
    return {
      totalServicios: servicios.length,
      serviciosActivos: servicios.length, // Placeholder logic
      ingresosPotenciales: servicios.reduce((acc, s) => acc + Number(s.precio || 0), 0)
    };
  }, [servicios]);

  // Map servicios to include 'id' for compatibility with page components
  const serviciosConId = servicios.map(s => ({ ...s, id: s.id_servicio, nombre: s.nombre_servicio }));

  return {
    servicios: serviciosConId,
    loading,
    agregarServicio,
    actualizarServicio,
    eliminarServicio,
    buscarServicios,
    obtenerEstadisticas,
    recargarServicios: cargarServicios
  };
}
