/**
 * Servicio para manejar la subida de imágenes en el módulo de packing
 */

import api from './axios';

/**
 * Subir una sola imagen
 * @param {number} packingSemanalId - ID del packing semanal
 * @param {File} imageFile - Archivo de imagen
 * @param {number|null} packingTipoId - ID del tipo de fruta (opcional)
 * @param {string} descripcion - Descripción de la imagen (opcional)
 */
export const subirImagen = async (packingSemanalId, imageFile, packingTipoId = null, descripcion = '') => {
  const formData = new FormData();
  formData.append('packing_semanal', packingSemanalId);
  if (packingTipoId) {
    formData.append('packing_tipo', packingTipoId);
  }
  formData.append('imagen', imageFile);
  if (descripcion) {
    formData.append('descripcion', descripcion);
  }

  const response = await api.post('/imagenes/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Subir múltiples imágenes
 * @param {number} packingSemanalId - ID del packing semanal
 * @param {File[]} imageFiles - Array de archivos de imagen
 * @param {number|null} packingTipoId - ID del tipo de fruta (opcional)
 * @param {string} descripcion - Descripción (opcional)
 */
export const subirMultiplesImagenes = async (packingSemanalId, imageFiles, packingTipoId = null, descripcion = '') => {
  const formData = new FormData();
  formData.append('packing_semanal', packingSemanalId);
  if (packingTipoId) {
    formData.append('packing_tipo', packingTipoId);
  }
  
  // Agregar múltiples archivos
  imageFiles.forEach(file => {
    formData.append('imagenes', file);
  });
  
  if (descripcion) {
    formData.append('descripcion', descripcion);
  }

  const response = await api.post('/imagenes/subir-multiple/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

/**
 * Obtener imágenes de un packing
 * @param {number} packingSemanalId - ID del packing semanal
 * @param {number|null} packingTipoId - ID del tipo de fruta (opcional)
 * @param {boolean} soloGenerales - Solo imágenes generales
 */
export const obtenerImagenes = async (packingSemanalId, packingTipoId = null, soloGenerales = false) => {
  let url = `/imagenes/?packing=${packingSemanalId}`;
  
  if (packingTipoId) {
    url += `&tipo=${packingTipoId}`;
  }
  
  if (soloGenerales) {
    url += '&generales=true';
  }
  
  const response = await api.get(url);
  // Si la respuesta tiene paginación, devolver solo los resultados
  return response.data.results || response.data;
};

/**
 * Eliminar una imagen
 * @param {number} imagenId - ID de la imagen
 */
export const eliminarImagen = async (imagenId) => {
  const response = await api.delete(`/imagenes/${imagenId}/`);
  return response.data;
};

/**
 * Actualizar descripción de una imagen
 * @param {number} imagenId - ID de la imagen
 * @param {string} descripcion - Nueva descripción
 */
export const actualizarDescripcionImagen = async (imagenId, descripcion) => {
  const response = await api.patch(`/imagenes/${imagenId}/`, { descripcion });
  return response.data;
};
