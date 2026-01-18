import { useState, useEffect } from 'react';
import { obtenerImagenes, eliminarImagen } from '../../api/imagenes';

/**
 * Componente minimalista para visualizar las imágenes de un packing
 * 
 * @param {Object} props
 * @param {number} props.packingSemanalId - ID del packing semanal
 * @param {number|null} props.packingTipoId - ID del tipo de fruta (opcional)
 * @param {boolean} props.soloGenerales - Mostrar solo imágenes generales
 * @param {boolean} props.allowDelete - Permitir eliminar imágenes
 * @param {Function} props.onImagenEliminada - Callback cuando se elimina una imagen
 * @param {boolean} props.compact - Modo compacto para formularios
 * @param {Array} props.imagenesAOcultar - IDs de imágenes a ocultar (eliminación pendiente)
 */
const ImageGallery = ({ 
  packingSemanalId, 
  packingTipoId = null,
  soloGenerales = false,
  allowDelete = true,
  onImagenEliminada,
  compact = false,
  imagenesAOcultar = []
}) => {
  const [imagenes, setImagenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);

  const cargarImagenes = async () => {
    try {
      setLoading(true);
      const data = await obtenerImagenes(packingSemanalId, packingTipoId, soloGenerales);
      // Asegurar que siempre sea un array
      setImagenes(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error al cargar imágenes:', err);
      setError('Error al cargar las imágenes');
      setImagenes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (packingSemanalId) {
      cargarImagenes();
    }
  }, [packingSemanalId, packingTipoId, soloGenerales]);

  const handleEliminar = async (imagenId) => {
    if (!allowDelete) return;

    if (onImagenEliminada) {
      // Solo llamar al callback, NO eliminar directamente
      onImagenEliminada(imagenId);
    } else {
      // Si no hay callback, eliminar directamente (modo anterior con confirmación)
      if (!window.confirm('¿Estás seguro de eliminar esta imagen?')) {
        return;
      }
      
      try {
        await eliminarImagen(imagenId);
        await cargarImagenes(); // Recargar lista
      } catch (err) {
        console.error('Error al eliminar imagen:', err);
        alert('Error al eliminar la imagen');
      }
    }
  };

  const handleVerImagen = (imagen) => {
    setSelectedImage(imagen);
  };

  const cerrarModal = () => {
    setSelectedImage(null);
  };

  if (loading) {
    return <div className="text-xs text-gray-500 py-2">Cargando imágenes...</div>;
  }

  if (error) {
    return <div className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">{error}</div>;
  }

  // Filtrar imágenes que están marcadas para ocultar
  const imagenesFiltradas = imagenes.filter(img => !imagenesAOcultar.includes(img.id));

  if (imagenesFiltradas.length === 0) {
    return (
      <div className="text-xs text-gray-400 py-2 text-center">
        {compact ? 'Sin imágenes' : 'No hay imágenes disponibles'}
      </div>
    );
  }

  const gridClass = compact 
    ? 'grid grid-cols-6 gap-1.5' 
    : 'grid grid-cols-4 gap-2';
  
  const imageHeight = compact ? 'h-16' : 'h-24';

  return (
    <>
      <div className={gridClass}>
        {imagenesFiltradas.map((imagen) => (
          <div 
            key={imagen.id} 
            className="relative group cursor-pointer"
            onClick={() => !compact && handleVerImagen(imagen)}
          >
            <img
              src={imagen.imagen_url}
              alt={imagen.descripcion || 'Imagen'}
              className={`w-full ${imageHeight} object-cover rounded border border-gray-200 transition-all group-hover:border-gray-400`}
              title={imagen.descripcion || ''}
            />
            
            {allowDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEliminar(imagen.id);
                }}
                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            )}

            {!compact && imagen.descripcion && (
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-[10px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {imagen.descripcion}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal para ver imagen completa */}
      {!compact && selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={cerrarModal}
        >
          <div 
            className="relative max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={cerrarModal}
              className="absolute top-2 right-2 bg-white text-gray-800 rounded-full w-8 h-8 flex items-center justify-center text-xl hover:bg-gray-100 z-10 shadow-lg"
            >
              ×
            </button>
            
            <img
              src={selectedImage.imagen_url}
              alt={selectedImage.descripcion || 'Imagen'}
              className="max-w-full max-h-[80vh] object-contain"
            />
            
            {selectedImage.descripcion && (
              <div className="bg-gray-50 px-4 py-3 border-t">
                <p className="text-sm text-gray-900">{selectedImage.descripcion}</p>
                {selectedImage.tipo_fruta_nombre && (
                  <p className="text-xs text-gray-500 mt-1">Tipo: {selectedImage.tipo_fruta_nombre}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGallery;
