/**
 * API para el Módulo de Subastas.
 * 
 * Endpoints para gestionar subastas y ofertas desde el panel administrativo.
 * NOTA: Los endpoints admin están bajo /admin/subastas/ y /admin/ofertas/
 */

import api from './axios';

// =============================================================================
// SUBASTAS (Panel Administrativo)
// =============================================================================

/**
 * Obtener lista de subastas con filtros opcionales.
 * @param {Object} params - Filtros (estado, empresa, packing_semanal, fecha, activas)
 */
export const getSubastas = (params = {}) => {
    return api.get('/admin/subastas/', { params });
};

/**
 * Obtener detalle de una subasta con historial de ofertas.
 * @param {number} id - ID de la subasta
 */
export const getSubasta = (id) => {
    return api.get(`/admin/subastas/${id}/`);
};

/**
 * Crear/programar una nueva subasta.
 * @param {Object} data - { packing_detalle, fecha_hora_inicio, fecha_hora_fin, precio_base }
 */
export const createSubasta = (data) => {
    return api.post('/admin/subastas/', data);
};

/**
 * Actualizar una subasta existente.
 * @param {number} id - ID de la subasta
 * @param {Object} data - Datos a actualizar
 */
export const updateSubasta = (id, data) => {
    return api.patch(`/admin/subastas/${id}/`, data);
};

/**
 * Cancelar una subasta.
 * @param {number} id - ID de la subasta
 */
export const cancelarSubasta = (id) => {
    return api.post(`/admin/subastas/${id}/cancelar/`);
};

/**
 * Obtener historial completo de ofertas de una subasta.
 * @param {number} id - ID de la subasta
 */
export const getHistorialOfertas = (id) => {
    return api.get(`/admin/subastas/${id}/historial_ofertas/`);
};

/**
 * Obtener resumen de subastas por estado.
 */
export const getResumenSubastas = () => {
    return api.get('/admin/subastas/resumen/');
};

/**
 * Actualizar estados de subastas basándose en las fechas.
 */
export const actualizarEstadosSubastas = () => {
    return api.post('/admin/subastas/actualizar_estados/');
};

// =============================================================================
// OFERTAS
// =============================================================================

/**
 * Obtener lista de ofertas con filtros opcionales.
 * @param {Object} params - Filtros (subasta, cliente, ganadoras)
 */
export const getOfertas = (params = {}) => {
    return api.get('/admin/ofertas/', { params });
};

/**
 * Crear una nueva oferta (desde el panel admin si es necesario).
 * @param {Object} data - { subasta, cliente, monto }
 */
export const createOferta = (data) => {
    return api.post('/admin/ofertas/', data);
};

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Obtener subastas activas (en curso).
 */
export const getSubastasActivas = () => {
    return api.get('/admin/subastas/', { params: { activas: 'true' } });
};

/**
 * Obtener subastas de un packing semanal específico.
 * @param {number} packingSemanalId - ID del packing semanal
 */
export const getSubastasPorPacking = (packingSemanalId) => {
    return api.get('/admin/subastas/', { params: { packing_semanal: packingSemanalId } });
};

/**
 * Obtener subastas de un packing detalle específico.
 * @param {number} packingDetalleId - ID del packing detalle
 */
export const getSubastaPorDetalle = async (packingDetalleId) => {
    const response = await api.get('/admin/subastas/', { 
        params: { packing_detalle: packingDetalleId } 
    });
    return response.data.length > 0 ? response.data[0] : null;
};

export default {
    getSubastas,
    getSubasta,
    createSubasta,
    updateSubasta,
    cancelarSubasta,
    getHistorialOfertas,
    getResumenSubastas,
    actualizarEstadosSubastas,
    getOfertas,
    createOferta,
    getSubastasActivas,
    getSubastasPorPacking,
    getSubastaPorDetalle,
};
