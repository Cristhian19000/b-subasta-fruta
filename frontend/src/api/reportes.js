import axios from 'axios';

const API_URL = 'http://localhost:8000/api/admin/reportes/subastas';

/**
 * Descarga el reporte de subastas en formato Excel.
 * 
 * @param {string} fechaInicio - Fecha de inicio en formato YYYY-MM-DD (opcional)
 * @param {string} fechaFin - Fecha de fin en formato YYYY-MM-DD (opcional)
 * @returns {Promise<Blob>} - Archivo Excel como Blob
 */
export const descargarReporteSubastas = async (fechaInicio = null, fechaFin = null) => {
    try {
        // Construir parámetros de query
        const params = {};
        if (fechaInicio) params.fecha_inicio = fechaInicio;
        if (fechaFin) params.fecha_fin = fechaFin;

        // Realizar la petición
        const response = await axios.get(`${API_URL}/excel/`, {
            params,
            responseType: 'blob', // Importante para archivos binarios
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error al descargar reporte:', error);
        throw error;
    }
};

/**
 * Descarga el reporte de clientes en formato Excel.
 * 
 * @returns {Promise<Blob>} - Archivo Excel como Blob
 */
export const descargarReporteClientes = async () => {
    try {
        // Realizar la petición
        const response = await axios.get(`${API_URL}/clientes_excel/`, {
            responseType: 'blob', // Importante para archivos binarios
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error al descargar reporte de clientes:', error);
        throw error;
    }
};

/**
 * Descarga el reporte de packing en formato Excel.
 * 
 * @param {string} fechaInicio - Fecha de inicio en formato YYYY-MM-DD (opcional)
 * @param {string} fechaFin - Fecha de fin en formato YYYY-MM-DD (opcional)
 * @returns {Promise<Blob>} - Archivo Excel como Blob
 */
export const descargarReportePacking = async (fechaInicio = null, fechaFin = null) => {
    try {
        const params = {};
        if (fechaInicio) params.fecha_inicio = fechaInicio;
        if (fechaFin) params.fecha_fin = fechaFin;

        const response = await axios.get(`${API_URL}/packing_excel/`, {
            params,
            responseType: 'blob',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
            },
        });

        return response.data;
    } catch (error) {
        console.error('Error al descargar reporte de packing:', error);
        throw error;
    }
};

