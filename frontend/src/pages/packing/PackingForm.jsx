/**
 * Formulario de Registro de Packing Semanal.
 * 
 * Permite registrar la producción semanal empacada por empresa.
 * Incluye múltiples tipos de fruta, cada uno con su detalle diario.
 * 
 * Estructura:
 * - Cabecera: Empresa, Fechas, Estado, Observaciones
 * - Tipos de Fruta: Lista de tipos con sus detalles
 *   - Detalles: Día, Fecha, PY, KG
 */

import { useState, useEffect } from 'react';
import { Button } from '../../components/common';
import { ImageUploader, ImageGallery } from '../../components/packing';
import { subirImagen, eliminarImagen } from '../../api/imagenes';

const DIAS_SEMANA = [
    { value: 'LUNES', label: 'Lunes', offset: 0 },
    { value: 'MARTES', label: 'Martes', offset: 1 },
    { value: 'MIERCOLES', label: 'Miércoles', offset: 2 },
    { value: 'JUEVES', label: 'Jueves', offset: 3 },
    { value: 'VIERNES', label: 'Viernes', offset: 4 },
    { value: 'SABADO', label: 'Sábado', offset: 5 },
];

const ESTADOS = [
    { value: 'PROYECTADO', label: 'Proyectado' },
    { value: 'EN_SUBASTA', label: 'En Subasta' },
    { value: 'FINALIZADO', label: 'Finalizado' },
    { value: 'ANULADO', label: 'Anulado' },
];

const PackingForm = ({ packing, empresas = [], tiposFruta = [], onSave, onCancel, mode, errorServidor  }) => {
    // Estado para la cabecera
    const [cabecera, setCabecera] = useState({
        empresa: '',
        fecha_inicio_semana: '',
        fecha_fin_semana: '',
        estado: 'PROYECTADO',
        observaciones: '',
    });

    // Estado para los tipos de fruta con sus detalles
    const [tipos, setTipos] = useState([]);

    // Estado para errores
    const [errors, setErrors] = useState({});

    // Tipo de fruta seleccionado para agregar
    const [tipoSeleccionado, setTipoSeleccionado] = useState('');

    // Estado para recargar galería de imágenes
    const [refreshGallery, setRefreshGallery] = useState(0);

    // Estados para gestión de imágenes pendientes
    const [imagenesGenerales, setImagenesGenerales] = useState([]);
    const [imagenesPorTipo, setImagenesPorTipo] = useState({});
    const [imagenesAEliminar, setImagenesAEliminar] = useState([]); // IDs de imágenes a eliminar
    const [imagenesASubir, setImagenesASubir] = useState({ generales: [], tipos: {} }); // Archivos nuevos a subir

    // Cargar datos si estamos editando
    useEffect(() => {
        if (packing && mode === 'edit') {
            setCabecera({
                empresa: packing.empresa,
                fecha_inicio_semana: packing.fecha_inicio_semana,
                fecha_fin_semana: packing.fecha_fin_semana,
                estado: packing.estado,
                observaciones: packing.observaciones || '',
            });
            
            // Cargar tipos y sus detalles
            if (packing.tipos && packing.tipos.length > 0) {
                const tiposFormateados = packing.tipos.map(tipo => ({
                    tipo_fruta: tipo.tipo_fruta,
                    tipo_fruta_nombre: tipo.tipo_fruta_nombre,
                    detalles: tipo.detalles.map(d => ({
                        dia: d.dia,
                        fecha: d.fecha,
                        py: d.py || 0,
                    })),
                }));
                setTipos(tiposFormateados);
            }
        } else {
            // Modo crear: inicializar con fecha actual
            const fechaInicio = getMonday(new Date());
            const fechaFin = calculateDate(fechaInicio, 5);
            setCabecera({
                empresa: '',
                fecha_inicio_semana: fechaInicio,
                fecha_fin_semana: fechaFin,
                estado: 'PROYECTADO',
                observaciones: '',
            });
            setTipos([]);
        }
    }, [packing, mode]);

    // Obtiene el lunes de la semana actual
    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0];
    };

    // Calcula la fecha basándose en fecha base + días offset
    const calculateDate = (baseDate, daysOffset) => {
        if (!baseDate) return '';
        const date = new Date(baseDate + 'T00:00:00');
        date.setDate(date.getDate() + daysOffset);
        return date.toISOString().split('T')[0];
    };

    // Maneja cambios en la cabecera
    const handleCabeceraChange = (e) => {
        const { name, value } = e.target;
        
        if (name === 'fecha_inicio_semana' && value) {
            // Calcular automáticamente la fecha fin (sábado)
            const fechaFin = calculateDate(value, 5);
            setCabecera(prev => ({
                ...prev,
                fecha_inicio_semana: value,
                fecha_fin_semana: fechaFin,
            }));
            
            // Recalcular fechas de todos los detalles
            setTipos(prev => prev.map(tipo => ({
                ...tipo,
                detalles: tipo.detalles.map((detalle, i) => ({
                    ...detalle,
                    fecha: calculateDate(value, DIAS_SEMANA[i]?.offset || i),
                })),
            })));
        } else {
            setCabecera(prev => ({
                ...prev,
                [name]: value,
            }));
        }
    };

    // Agrega un nuevo tipo de fruta
    const handleAddTipo = () => {
        if (!tipoSeleccionado) return;
        
        // Verificar si ya existe
        const yaExiste = tipos.some(t => t.tipo_fruta === parseInt(tipoSeleccionado));
        if (yaExiste) {
            alert('Este tipo de fruta ya está agregado');
            return;
        }

        const tipoObj = tiposFruta.find(t => t.id === parseInt(tipoSeleccionado));
        if (!tipoObj) return;

        // Crear detalles para cada día de la semana
        const nuevosDetalles = DIAS_SEMANA.map((dia, index) => ({
            dia: dia.value,
            fecha: calculateDate(cabecera.fecha_inicio_semana, index),
            py: 0,
        }));

        setTipos(prev => [...prev, {
            tipo_fruta: tipoObj.id,
            tipo_fruta_nombre: tipoObj.nombre,
            detalles: nuevosDetalles,
        }]);

        setTipoSeleccionado('');
    };

    // Elimina un tipo de fruta
    const handleRemoveTipo = (tipoId) => {
        if (!window.confirm('¿Eliminar este tipo de fruta y todos sus detalles?')) return;
        setTipos(prev => prev.filter(t => t.tipo_fruta !== tipoId));
    };

    // Maneja cambios en el detalle de un tipo
    const handleDetalleChange = (tipoId, diaIndex, field, value) => {
        setTipos(prev => prev.map(tipo => {
            if (tipo.tipo_fruta === tipoId) {
                return {
                    ...tipo,
                    detalles: tipo.detalles.map((detalle, i) => {
                        if (i === diaIndex) {
                            return { ...detalle, [field]: value };
                        }
                        return detalle;
                    }),
                };
            }
            return tipo;
        }));
    };

    // Maneja el blur del campo kg (cuando pierde el foco)
    const handleKgBlur = (tipoId, diaIndex, value) => {
        const numValue = parseFloat(value) || 0;
        setTipos(prev => prev.map(tipo => {
            if (tipo.tipo_fruta === tipoId) {
                return {
                    ...tipo,
                    detalles: tipo.detalles.map((detalle, i) => {
                        if (i === diaIndex) {
                            return { ...detalle, py: numValue };
                        }
                        return detalle;
                    }),
                };
            }
            return tipo;
        }));
    };

    // Obtiene el valor a mostrar en el input de kg
    const getKgDisplayValue = (kg) => {
        if (kg === 0 || kg === '0' || kg === '') return '';
        return kg;
    };

    // Calcula el total de kg por tipo
    const calcularTotalTipo = (detalles) => {
        return detalles.reduce((sum, d) => sum + (parseFloat(d.py) || 0), 0);
    };

    // Calcula el total general
    const calcularTotalGeneral = () => {
        return tipos.reduce((sum, tipo) => sum + calcularTotalTipo(tipo.detalles), 0);
    };

    // Formatea números
    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg);
    };

    // Valida el formulario
    const validate = () => {
        const newErrors = {};
        
        if (!cabecera.empresa) newErrors.empresa = 'La empresa es requerida';
        if (!cabecera.fecha_inicio_semana) newErrors.fecha_inicio_semana = 'La fecha de inicio es requerida';
        if (!cabecera.fecha_fin_semana) newErrors.fecha_fin_semana = 'La fecha de fin es requerida';
        
        if (tipos.length === 0) {
            newErrors.tipos = 'Debe agregar al menos un tipo de fruta';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validate()) return;

        const data = {
            empresa: parseInt(cabecera.empresa),
            fecha_inicio_semana: cabecera.fecha_inicio_semana,
            fecha_fin_semana: cabecera.fecha_fin_semana,
            estado: cabecera.estado,
            observaciones: cabecera.observaciones,
            tipos: tipos.map(tipo => ({
                tipo_fruta: tipo.tipo_fruta,
                detalles: tipo.detalles.map(d => ({
                    dia: d.dia,
                    fecha: d.fecha,
                    py: parseFloat(d.py) || 0 
                })),
            })),
        };

        console.log("Enviando datos:", data);
        
        try {
            // Guardar el packing
            const packingCreado = await onSave(data);
            
            // Aplicar cambios de imágenes (crear o editar)
            await aplicarCambiosImagenes(packingCreado);
            
            // Si todo salió bien, cerrar el modal automáticamente
            onCancel();
        } catch (error) {
            console.error('Error completo:', error);
            console.error('Response data:', error.response?.data);
            const errorMsg = error.response?.data 
                ? JSON.stringify(error.response.data, null, 2) 
                : error.message;
            alert('Error al guardar el packing:\n' + errorMsg);
        }
    };

    // Aplicar todos los cambios de imágenes (eliminar y subir)
    const aplicarCambiosImagenes = async (packingGuardado) => {
        try {
            console.log('Aplicando cambios de imágenes...', packingGuardado);
            
            // 1. Eliminar imágenes marcadas
            if (imagenesAEliminar.length > 0) {
                console.log(`Eliminando ${imagenesAEliminar.length} imágenes`);
                for (const imagenId of imagenesAEliminar) {
                    await eliminarImagen(imagenId);
                }
            }

            // 2. Subir nuevas imágenes generales
            if (imagenesASubir.generales.length > 0) {
                console.log(`Subiendo ${imagenesASubir.generales.length} imágenes generales`);
                for (const imagenData of imagenesASubir.generales) {
                    await subirImagen(packingGuardado.id, imagenData.file, null, imagenData.descripcion);
                }
            }

            // 3. Subir nuevas imágenes por tipo
            if (packingGuardado.tipos && packingGuardado.tipos.length > 0) {
                for (const tipoEnBD of packingGuardado.tipos) {
                    const imagenesDelTipo = imagenesASubir.tipos[tipoEnBD.tipo_fruta] || [];
                    
                    if (imagenesDelTipo.length > 0) {
                        console.log(`Subiendo ${imagenesDelTipo.length} imágenes para tipo ${tipoEnBD.tipo_fruta_nombre}`);
                        for (const imagenData of imagenesDelTipo) {
                            await subirImagen(packingGuardado.id, imagenData.file, tipoEnBD.id, imagenData.descripcion);
                        }
                    }
                }
            }

            // 4. Subir imágenes pendientes del modo create
            if (mode === 'create') {
                // Imágenes generales del create
                if (imagenesGenerales.length > 0) {
                    console.log(`Subiendo ${imagenesGenerales.length} imágenes generales (create)`);
                    for (const imagenData of imagenesGenerales) {
                        await subirImagen(packingGuardado.id, imagenData.file, null, imagenData.descripcion);
                    }
                }

                // Imágenes por tipo del create
                if (packingGuardado.tipos) {
                    for (const tipoEnBD of packingGuardado.tipos) {
                        const imagenesDelTipo = imagenesPorTipo[tipoEnBD.tipo_fruta] || [];
                        
                        if (imagenesDelTipo.length > 0) {
                            console.log(`Subiendo ${imagenesDelTipo.length} imágenes para tipo ${tipoEnBD.tipo_fruta_nombre} (create)`);
                            for (const imagenData of imagenesDelTipo) {
                                await subirImagen(packingGuardado.id, imagenData.file, tipoEnBD.id, imagenData.descripcion);
                            }
                        }
                    }
                }
            }
            
            console.log('Todos los cambios de imágenes aplicados correctamente');
        } catch (error) {
            console.error('Error al aplicar cambios de imágenes:', error);
            alert('El packing se guardó, pero hubo un error al procesar algunas imágenes. Por favor, revisa y vuelve a intentarlo.');
        }
    };

    // === MANEJADORES DE IMÁGENES MODO CREATE ===
    
    // Manejar selección de imágenes generales (modo creación)
    const handleImagenesGeneralesSeleccionadas = (files) => {
        const nuevasImagenes = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            descripcion: ''
        }));
        setImagenesGenerales(prev => [...prev, ...nuevasImagenes]);
    };

    // Manejar selección de imágenes por tipo (modo creación)
    const handleImagenesTipoSeleccionadas = (tipoId, files) => {
        const nuevasImagenes = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file),
            descripcion: ''
        }));
        setImagenesPorTipo(prev => ({
            ...prev,
            [tipoId]: [...(prev[tipoId] || []), ...nuevasImagenes]
        }));
    };

    // Eliminar imagen pendiente (modo create)
    const handleEliminarImagenPendiente = (tipo, index) => {
        if (tipo === 'general') {
            setImagenesGenerales(prev => {
                const nueva = [...prev];
                URL.revokeObjectURL(nueva[index].preview);
                nueva.splice(index, 1);
                return nueva;
            });
        } else {
            setImagenesPorTipo(prev => {
                const nuevas = [...(prev[tipo] || [])];
                URL.revokeObjectURL(nuevas[index].preview);
                nuevas.splice(index, 1);
                return { ...prev, [tipo]: nuevas };
            });
        }
    };

    // === MANEJADORES DE IMÁGENES MODO EDIT ===
    
    // Cuando se sube una imagen en edit, agregar a pendientes
    const handleImagenSubida = (esGeneral, tipoFrutaId = null) => {
        // Esto es un placeholder para indicar que hubo cambios
        // La subida real se hará en aplicarCambiosImagenes
        setRefreshGallery(prev => prev + 1);
    };

    // Cuando se quiere agregar imágenes en edit mode
    const handleAgregarImagenesEdit = (files, tipoFrutaId = null) => {
        const nuevasImagenes = Array.from(files).map(file => ({
            file,
            descripcion: ''
        }));

        if (tipoFrutaId === null) {
            // Imágenes generales
            setImagenesASubir(prev => ({
                ...prev,
                generales: [...prev.generales, ...nuevasImagenes]
            }));
        } else {
            // Imágenes por tipo
            setImagenesASubir(prev => ({
                ...prev,
                tipos: {
                    ...prev.tipos,
                    [tipoFrutaId]: [...(prev.tipos[tipoFrutaId] || []), ...nuevasImagenes]
                }
            }));
        }
    };

    // Marcar imagen para eliminar (no elimina inmediatamente)
    const handleMarcarImagenParaEliminar = (imagenId) => {
        setImagenesAEliminar(prev => [...prev, imagenId]);
        setRefreshGallery(prev => prev + 1);
    };

    // Tipos de fruta disponibles (no agregados aún)
    const tiposDisponibles = tiposFruta.filter(
        t => t.activo && !tipos.some(tipo => tipo.tipo_fruta === t.id)
    );

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ============================================= */}
            {/* SECCIÓN 1: CABECERA DEL FORMULARIO */}
            {/* ============================================= */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    📋 Datos del Packing Semanal
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Empresa <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="empresa"
                            value={cabecera.empresa}
                            onChange={handleCabeceraChange}
                            className={`w-full px-3 py-2 border rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                                errors.empresa ? 'border-red-300' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Seleccione una empresa</option>
                            {empresas.map((e) => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                        {errors.empresa && (
                            <p className="mt-1 text-xs text-red-600">{errors.empresa}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Inicio (Lunes) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="fecha_inicio_semana"
                            value={cabecera.fecha_inicio_semana}
                            onChange={handleCabeceraChange}
                            className={`w-full px-3 py-2 border rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                                errors.fecha_inicio_semana ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                        {errors.fecha_inicio_semana && (
                            <p className="mt-1 text-xs text-red-600">{errors.fecha_inicio_semana}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha Fin (Sábado)
                        </label>
                        <input
                            type="date"
                            name="fecha_fin_semana"
                            value={cabecera.fecha_fin_semana}
                            readOnly
                            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-gray-100 cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                        </label>
                        <select
                            name="estado"
                            value={cabecera.estado}
                            onChange={handleCabeceraChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                        >
                            {ESTADOS.map((e) => (
                                <option key={e.value} value={e.value}>{e.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="md:col-span-2 lg:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observaciones
                        </label>
                        <input
                            type="text"
                            name="observaciones"
                            value={cabecera.observaciones}
                            onChange={handleCabeceraChange}
                            placeholder="Notas adicionales (opcional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                    </div>

                    {/* Sección de imágenes generales */}
                    <div className="md:col-span-2 lg:col-span-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            📸 Imágenes Generales de la Semana (opcional)
                        </label>
                        
                        {mode === 'create' ? (
                            /* Modo creación: Selector de archivos */
                            <div className="space-y-2">
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={(e) => handleImagenesGeneralesSeleccionadas(e.target.files)}
                                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                                />
                                
                                {imagenesGenerales.length > 0 && (
                                    <div className="grid grid-cols-6 gap-1.5 mt-2">
                                        {imagenesGenerales.map((img, index) => (
                                            <div key={index} className="relative group">
                                                <img
                                                    src={img.preview}
                                                    alt={`Preview ${index + 1}`}
                                                    className="w-full h-16 object-cover rounded border border-gray-200"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => handleEliminarImagenPendiente('general', index)}
                                                    className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                {imagenesGenerales.length > 0 && (
                                    <p className="text-xs text-gray-500">
                                        {imagenesGenerales.length} imagen(es) seleccionada(s). Se subirán al guardar el packing.
                                    </p>
                                )}
                            </div>
                        ) : (
                            /* Modo edición: Mostrar imágenes actuales y permitir agregar/eliminar (pendiente) */
                            <div className="space-y-3 bg-gray-50 p-3 rounded border border-gray-200">
                                {/* Mostrar imágenes actuales */}
                                <ImageGallery
                                    key={`general-${refreshGallery}`}
                                    packingSemanalId={packing.id}
                                    soloGenerales={true}
                                    allowDelete={true}
                                    compact={true}
                                    imagenesAOcultar={imagenesAEliminar}
                                    onImagenEliminada={handleMarcarImagenParaEliminar}
                                />
                                
                                {/* Input para agregar nuevas imágenes */}
                                <div>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Agregar imágenes generales
                                    </label>
                                    <input
                                        type="file"
                                        multiple
                                        accept="image/*"
                                        onChange={(e) => handleAgregarImagenesEdit(e.target.files, null)}
                                        className="text-xs"
                                    />
                                    {imagenesASubir.generales.length > 0 && (
                                        <div className="mt-1 text-xs text-green-600">
                                            ✓ {imagenesASubir.generales.length} imagen(es) nueva(s) pendiente(s)
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ============================================= */}
            {/* SECCIÓN 2: AGREGAR TIPO DE FRUTA */}
            {/* ============================================= */}
            <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Agregar Tipo de Fruta
                        </label>
                        <select
                            value={tipoSeleccionado}
                            onChange={(e) => setTipoSeleccionado(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">Seleccione un tipo de fruta</option>
                            {tiposDisponibles.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <Button 
                            type="button" 
                            onClick={handleAddTipo}
                            disabled={!tipoSeleccionado}
                        >
                            + Agregar Tipo
                        </Button>
                    </div>
                </div>
                {errors.tipos && (
                    <p className="mt-2 text-sm text-red-600">{errors.tipos}</p>
                )}
            </div>

            {/* ============================================= */}
            {/* SECCIÓN 3: TIPOS DE FRUTA AGREGADOS */}
            {/* ============================================= */}
            {tipos.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        📊 Producción por Tipo de Fruta
                    </h3>

                    {tipos.map((tipo) => (
                        <div key={tipo.tipo_fruta} className="border border-gray-200 rounded-lg overflow-hidden">
                            {/* Header del tipo */}
                            <div className="bg-gray-100 px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">{tipo.tipo_fruta_nombre}</span>
                                    <span className="text-sm text-gray-500">
                                        ({formatKg(calcularTotalTipo(tipo.detalles))} kg)
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTipo(tipo.tipo_fruta)}
                                    className="text-red-500 hover:text-red-700 cursor-pointer text-sm"
                                >
                                    Eliminar
                                </button>
                            </div>

                            {/* Tabla de detalles */}
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-28">
                                            Día
                                        </th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase w-32">
                                            Fecha
                                        </th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase w-32">
                                            PY
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tipo.detalles.map((detalle, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-2 text-sm text-gray-700">
                                                {DIAS_SEMANA[index]?.label || detalle.dia}
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-500">
                                                {detalle.fecha}
                                            </td>
                                            <td className="px-4 py-2">
                                                <input
                                                    type="number"
                                                    value={getKgDisplayValue(detalle.py)}
                                                    onChange={(e) => handleDetalleChange(tipo.tipo_fruta, index, 'py', e.target.value)}
                                                    onBlur={(e) => handleKgBlur(tipo.tipo_fruta, index, e.target.value)}
                                                    onFocus={(e) => e.target.select()}
                                                    min="0"
                                                    step="0.01"
                                                    placeholder="0"
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-gray-900"
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Sección de imágenes por tipo */}
                            <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-700">
                                        📸 Imágenes de {tipo.tipo_fruta_nombre}
                                    </span>
                                </div>
                                
                                {mode === 'create' ? (
                                    /* Modo creación: Selector de archivos */
                                    <div className="space-y-2">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            multiple
                                            onChange={(e) => handleImagenesTipoSeleccionadas(tipo.tipo_fruta, e.target.files)}
                                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                                        />
                                        
                                        {(imagenesPorTipo[tipo.tipo_fruta] || []).length > 0 && (
                                            <div className="grid grid-cols-6 gap-1.5">
                                                {(imagenesPorTipo[tipo.tipo_fruta] || []).map((img, index) => (
                                                    <div key={index} className="relative group">
                                                        <img
                                                            src={img.preview}
                                                            alt={`Preview ${index + 1}`}
                                                            className="w-full h-16 object-cover rounded border border-gray-200"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => handleEliminarImagenPendiente(tipo.tipo_fruta, index)}
                                                            className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {(imagenesPorTipo[tipo.tipo_fruta] || []).length > 0 && (
                                            <p className="text-xs text-gray-500">
                                                {(imagenesPorTipo[tipo.tipo_fruta] || []).length} imagen(es) seleccionada(s)
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    /* Modo edición: Mostrar imágenes y permitir cambios pendientes */
                                    (() => {
                                        const tipoEnBD = packing.tipos?.find(t => t.tipo_fruta === tipo.tipo_fruta);
                                        const tipoExiste = tipoEnBD?.id;
                                        
                                        return (
                                            <div className="space-y-3">
                                                {tipoExiste ? (
                                                    <>
                                                        <ImageGallery
                                                            key={`tipo-${tipo.tipo_fruta}-${refreshGallery}`}
                                                            packingSemanalId={packing.id}
                                                            packingTipoId={tipoEnBD.id}
                                                            allowDelete={true}
                                                            compact={true}
                                                            imagenesAOcultar={imagenesAEliminar}
                                                            onImagenEliminada={handleMarcarImagenParaEliminar}
                                                        />
                                                        
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                Agregar imágenes a {tipo.tipo_fruta_nombre}
                                                            </label>
                                                            <input
                                                                type="file"
                                                                multiple
                                                                accept="image/*"
                                                                onChange={(e) => handleAgregarImagenesEdit(e.target.files, tipo.tipo_fruta)}
                                                                className="text-xs"
                                                            />
                                                            {(imagenesASubir.tipos[tipo.tipo_fruta]?.length || 0) > 0 && (
                                                                <div className="mt-1 text-xs text-green-600">
                                                                    ✓ {imagenesASubir.tipos[tipo.tipo_fruta].length} imagen(es) nueva(s) pendiente(s)
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-xs text-gray-500 italic bg-blue-50 p-2 rounded border border-blue-200">
                                                        💡 Guarda el packing primero para poder agregar imágenes a este tipo de fruta
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Total General */}
                    <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700 uppercase">
                            Total General Semanal:
                        </span>
                        <span className="text-lg font-bold text-gray-900">
                            {formatKg(calcularTotalGeneral())} kg
                        </span>
                    </div>
                </div>
            )}

            {/* Mensaje cuando no hay tipos */}
            {tipos.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <p className="text-gray-500">
                        No hay tipos de fruta agregados. Use el selector de arriba para agregar tipos.
                    </p>
                </div>
            )}

            
            {errorServidor && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-sm">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-red-700">
                                {errorServidor}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================= */}
            {/* BOTONES DE ACCIÓN */}
            {/* ============================================= */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" type="button" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit">
                    {mode === 'create' ? 'Guardar Packing' : 'Actualizar Packing'}
                </Button>
            </div>
        </form>
    );
};

export default PackingForm;
