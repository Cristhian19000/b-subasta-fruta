import { useState } from 'react';
import { subirImagen, subirMultiplesImagenes } from '../../api/imagenes';

/**
 * Componente minimalista para subir imágenes en el módulo de packing
 * 
 * @param {Object} props
 * @param {number} props.packingSemanalId - ID del packing semanal
 * @param {number|null} props.packingTipoId - ID del tipo de fruta (opcional)
 * @param {Function} props.onImagenSubida - Callback cuando se sube una imagen
 * @param {boolean} props.multiple - Permitir múltiples archivos
 * @param {string} props.label - Texto del label (opcional)
 */
const ImageUploader = ({ 
  packingSemanalId, 
  packingTipoId = null, 
  onImagenSubida,
  multiple = true,
  label = 'Subir imágenes'
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previews, setPreviews] = useState([]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
    setError(null);

    // Generar previews
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Por favor selecciona al menos una imagen');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      if (multiple && selectedFiles.length > 1) {
        // Subir múltiples imágenes
        const result = await subirMultiplesImagenes(
          packingSemanalId,
          selectedFiles,
          packingTipoId,
          descripcion
        );
        console.log('Imágenes subidas:', result);
      } else {
        // Subir una sola imagen
        const result = await subirImagen(
          packingSemanalId,
          selectedFiles[0],
          packingTipoId,
          descripcion
        );
        console.log('Imagen subida:', result);
      }

      // Limpiar formulario
      setSelectedFiles([]);
      setDescripcion('');
      setPreviews([]);
      
      // Notificar al componente padre
      if (onImagenSubida) {
        onImagenSubida();
      }

      // Limpiar input
      const fileInput = document.getElementById('image-upload-input');
      if (fileInput) fileInput.value = '';

    } catch (err) {
      console.error('Error al subir imagen:', err);
      setError(err.response?.data?.error || 'Error al subir la imagen');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = (index) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    const newPreviews = [...previews];
    URL.revokeObjectURL(newPreviews[index]); // Liberar memoria
    newPreviews.splice(index, 1);
    setPreviews(newPreviews);
  };

  return (
    <div className="space-y-3">
      {/* Input de archivo con diseño minimalista */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1.5">
          {label}
        </label>
        <div className="relative">
          <input
            id={`image-upload-${packingTipoId || 'general'}`}
            type="file"
            accept="image/*"
            multiple={multiple}
            onChange={handleFileChange}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      {/* Previews de imágenes */}
      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-20 object-cover rounded border border-gray-200"
              />
              <button
                type="button"
                onClick={() => handleRemoveFile(index)}
                disabled={uploading}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Campo descripción */}
      <div>
        <input
          type="text"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          placeholder="Descripción (opcional)"
          disabled={uploading}
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
      </div>

      {/* Error message */}
      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-2 py-1.5 rounded">
          {error}
        </div>
      )}

      {/* Botón de subida */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || selectedFiles.length === 0}
        className="w-full px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {uploading ? 'Subiendo...' : `Subir ${selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}`}
      </button>
    </div>
  );
};

export default ImageUploader;
