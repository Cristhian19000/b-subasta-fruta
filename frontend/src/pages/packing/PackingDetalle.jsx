/**
 * Componente para mostrar el detalle de un Packing Semanal.
 * 
 * Muestra la información completa del packing incluyendo
 * todos los tipos de fruta con su producción diaria e imágenes.
 * 
 * RF-02: Incluye indicadores visuales del estado de subasta.
 */

import { useState, useEffect } from 'react';
import { Button, Badge, Modal } from '../../components/common';
import { ImageGallery } from '../../components/packing';
import { getSubastasPorPacking, createSubasta, updateSubasta } from '../../api/subastas';

// Configuración de colores para estados
const ESTADO_COLORS = {
    'PROYECTADO': 'warning',
    'EN_SUBASTA': 'success',
    'FINALIZADO': 'default',
    'ANULADO': 'error'
};

// Colores para estados de subasta
const SUBASTA_COLORS = {
    'PROGRAMADA': 'warning',
    'ACTIVA': 'success',
    'FINALIZADA': 'default',
    'CANCELADA': 'error'
};

// Etiquetas de estado de subasta
const SUBASTA_LABELS = {
    'PROGRAMADA': '📅 Programada',
    'ACTIVA': '🔴 En Vivo',
    'FINALIZADA': '✅ Finalizada',
    'CANCELADA': '❌ Cancelada'
};

const PackingDetalle = ({ packing, onClose, onEdit }) => {
    const [subastas, setSubastas] = useState({});
    const [showSubastaModal, setShowSubastaModal] = useState(false);
    const [showDetalleSubastaModal, setShowDetalleSubastaModal] = useState(false);
    const [subastaSeleccionada, setSubastaSeleccionada] = useState(null);
    const [detalleParaSubasta, setDetalleParaSubasta] = useState(null);
    const [subastaEditando, setSubastaEditando] = useState(null); // Para edición
    const [modoEdicion, setModoEdicion] = useState(false);
    const [subastaForm, setSubastaForm] = useState({
        fecha_hora_inicio: '',
        duracion_horas: '1',  // Duración por defecto: 1 hora
        precio_base: ''
    });
    const [creandoSubasta, setCreandoSubasta] = useState(false);
    const [errorSubasta, setErrorSubasta] = useState(null);

    // Cargar subastas asociadas a este packing
    useEffect(() => {
        if (!packing?.id) return;

        const cargarSubastas = async () => {
            try {
                const response = await getSubastasPorPacking(packing.id);
                // Manejar respuesta paginada o array directo
                const data = response.data?.results || response.data || [];
                const subastasArray = Array.isArray(data) ? data : [];
                // Crear un mapa de packing_detalle_id -> subasta
                const subastasMap = {};
                subastasArray.forEach(s => {
                    subastasMap[s.packing_detalle] = s;
                });
                setSubastas(subastasMap);
            } catch (err) {
                console.error('Error cargando subastas:', err);
            }
        };

        cargarSubastas();
    }, [packing?.id]);

    if (!packing) return null;

    // Abrir modal para crear subasta
    const handleAbrirSubastaModal = (detalle, tipoFrutaNombre) => {
        setDetalleParaSubasta({ ...detalle, tipo_fruta_nombre: tipoFrutaNombre });
        setModoEdicion(false);
        setSubastaEditando(null);
        setSubastaForm({
            fecha_hora_inicio: '',
            duracion_horas: '1',
            precio_base: ''
        });
        setErrorSubasta(null);
        setShowSubastaModal(true);
    };

    // Abrir modal para ver detalle de subasta
    const handleVerSubasta = (subasta, detalle, tipoFrutaNombre) => {
        setSubastaSeleccionada({
            ...subasta,
            tipo_fruta_nombre: tipoFrutaNombre,
            detalle: detalle
        });
        setShowDetalleSubastaModal(true);
    };

    // Abrir modal para editar subasta
    const handleEditarSubasta = (subasta, detalle, tipoFrutaNombre) => {
        setDetalleParaSubasta({ ...detalle, tipo_fruta_nombre: tipoFrutaNombre });
        setModoEdicion(true);
        setSubastaEditando(subasta);

        // Formatear fecha para el input datetime-local
        const formatDateForInput = (dateStr) => {
            if (!dateStr) return '';
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Calcular duración en horas
        const inicio = new Date(subasta.fecha_hora_inicio);
        const fin = new Date(subasta.fecha_hora_fin);
        const duracionMs = fin - inicio;
        const duracionHoras = Math.round(duracionMs / (1000 * 60 * 60));

        setSubastaForm({
            fecha_hora_inicio: formatDateForInput(subasta.fecha_hora_inicio),
            duracion_horas: duracionHoras.toString(),
            precio_base: subasta.precio_base?.toString() || ''
        });
        setErrorSubasta(null);
        setShowDetalleSubastaModal(false);
        setShowSubastaModal(true);
    };

    // Recargar subastas
    const recargarSubastas = async () => {
        const response = await getSubastasPorPacking(packing.id);
        const data = response.data?.results || response.data || [];
        const subastasArray = Array.isArray(data) ? data : [];
        const subastasMap = {};
        subastasArray.forEach(s => {
            subastasMap[s.packing_detalle] = s;
        });
        setSubastas(subastasMap);
    };

    // Crear subasta
    const handleCrearSubasta = async () => {
        if (!subastaForm.fecha_hora_inicio || !subastaForm.duracion_horas || !subastaForm.precio_base) {
            setErrorSubasta('Todos los campos son requeridos');
            return;
        }

        try {
            setCreandoSubasta(true);
            setErrorSubasta(null);

            // Calcular fecha fin basándose en duración
            const fechaInicio = new Date(subastaForm.fecha_hora_inicio);
            const duracionMs = parseInt(subastaForm.duracion_horas) * 60 * 60 * 1000;
            const fechaFin = new Date(fechaInicio.getTime() + duracionMs);

            // Formatear para enviar al backend
            const formatForBackend = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            await createSubasta({
                packing_detalle: detalleParaSubasta.id,
                fecha_hora_inicio: subastaForm.fecha_hora_inicio,
                fecha_hora_fin: formatForBackend(fechaFin),
                precio_base: parseFloat(subastaForm.precio_base)
            });

            await recargarSubastas();

            setShowSubastaModal(false);
            setDetalleParaSubasta(null);
        } catch (err) {
            console.error('Error creando subasta:', err);
            const errorMsg = err.response?.data?.packing_detalle?.[0]
                || err.response?.data?.fecha_hora_inicio?.[0]
                || err.response?.data?.detail
                || 'Error al crear la subasta';
            setErrorSubasta(errorMsg);
        } finally {
            setCreandoSubasta(false);
        }
    };

    // Guardar edición de subasta
    const handleGuardarSubasta = async () => {
        if (!subastaForm.fecha_hora_inicio || !subastaForm.duracion_horas || !subastaForm.precio_base) {
            setErrorSubasta('Todos los campos son requeridos');
            return;
        }

        try {
            setCreandoSubasta(true);
            setErrorSubasta(null);

            // Calcular fecha fin basándose en duración
            const fechaInicio = new Date(subastaForm.fecha_hora_inicio);
            const duracionMs = parseInt(subastaForm.duracion_horas) * 60 * 60 * 1000;
            const fechaFin = new Date(fechaInicio.getTime() + duracionMs);

            // Formatear para enviar al backend
            const formatForBackend = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            await updateSubasta(subastaEditando.id, {
                fecha_hora_inicio: subastaForm.fecha_hora_inicio,
                fecha_hora_fin: formatForBackend(fechaFin),
                precio_base: parseFloat(subastaForm.precio_base)
            });

            await recargarSubastas();

            setShowSubastaModal(false);
            setDetalleParaSubasta(null);
            setSubastaEditando(null);
            setModoEdicion(false);
        } catch (err) {
            console.error('Error actualizando subasta:', err);
            const errorMsg = err.response?.data?.fecha_hora_inicio?.[0]
                || err.response?.data?.fecha_hora_fin?.[0]
                || err.response?.data?.detail
                || 'Error al actualizar la subasta';
            setErrorSubasta(errorMsg);
        } finally {
            setCreandoSubasta(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', {
            day: '2-digit',
            month: 'short'
        });
    };

    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg || 0);
    };

    const getDiaLabel = (dia) => {
        const dias = {
            'LUNES': 'Lunes',
            'MARTES': 'Martes',
            'MIERCOLES': 'Miércoles',
            'JUEVES': 'Jueves',
            'VIERNES': 'Viernes',
            'SABADO': 'Sábado',
            'DOMINGO': 'Domingo',
        };
        return dias[dia] || dia;
    };

    const calcularTotalTipo = (detalles) => {
        if (!detalles) return 0;
        return detalles.reduce((sum, d) => sum + (parseFloat(d.py) || 0), 0);
    };

    return (
        <div className="space-y-6">
            {/* Información General */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    Información del Packing
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <p className="text-xs text-gray-500">Empresa</p>
                        <p className="text-sm font-medium text-gray-900">{packing.empresa_nombre}</p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Estado</p>
                        <Badge variant={ESTADO_COLORS[packing.estado_actual || packing.estado] || 'default'}>
                            {packing.estado_display || packing.estado_actual || packing.estado}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Semana</p>
                        <p className="text-sm font-medium text-gray-900">
                            {formatDateShort(packing.fecha_inicio_semana)} - {formatDateShort(packing.fecha_fin_semana)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-500">Total Semanal</p>
                        <p className="text-lg font-bold text-green-600">{formatKg(packing.total_kg)} kg</p>
                    </div>
                    {packing.observaciones && (
                        <div className="col-span-2 md:col-span-4">
                            <p className="text-xs text-gray-500">Observaciones</p>
                            <p className="text-sm text-gray-700">{packing.observaciones}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Imágenes Generales */}
            {packing.imagenes && packing.imagenes.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                        Imágenes Generales
                    </h3>
                    <ImageGallery
                        packingSemanalId={packing.id}
                        soloGenerales={true}
                        allowDelete={false}
                    />
                </div>
            )}

            {/* Tipos de Fruta */}
            <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                    Producción por Tipo de Fruta
                </h3>

                {packing.tipos && packing.tipos.length > 0 ? (
                    <div className="space-y-4">
                        {packing.tipos.map((tipo) => (
                            <div key={tipo.id} className="border border-gray-200 rounded-lg overflow-hidden">
                                {/* Header del tipo */}
                                <div className="bg-blue-50 px-4 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="info">{tipo.tipo_fruta_nombre}</Badge>
                                    </div>
                                    <span className="text-sm font-semibold text-blue-700">
                                        {formatKg(tipo.kg_total || calcularTotalTipo(tipo.detalles))} kg
                                    </span>
                                </div>

                                {/* Tabla de detalles */}
                                {tipo.detalles && tipo.detalles.length > 0 ? (
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Día
                                                </th>
                                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                                    Fecha
                                                </th>
                                                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                                                    PY
                                                </th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                                    Estado Subasta
                                                </th>
                                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                                    Acción
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {tipo.detalles.map((detalle, index) => {
                                                const subasta = subastas[detalle.id];
                                                return (
                                                    <tr key={detalle.id || index} className="hover:bg-gray-50">
                                                        <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                                            {getDiaLabel(detalle.dia)}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-gray-500">
                                                            {formatDateShort(detalle.fecha)}
                                                        </td>
                                                        <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">
                                                            {formatKg(detalle.py)} kg
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {subasta ? (
                                                                <Badge variant={SUBASTA_COLORS[subasta.estado_actual]}>
                                                                    {SUBASTA_LABELS[subasta.estado_actual] || subasta.estado_actual}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-gray-400">—</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {subasta ? (
                                                                <div className="flex items-center justify-center gap-1">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="secondary"
                                                                        onClick={() => handleVerSubasta(subasta, detalle, tipo.tipo_fruta_nombre)}
                                                                    >
                                                                        Ver
                                                                    </Button>
                                                                    {subasta.estado_actual === 'PROGRAMADA' && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="warning"
                                                                            onClick={() => handleEditarSubasta(subasta, detalle, tipo.tipo_fruta_nombre)}
                                                                        >
                                                                            Editar
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <Button
                                                                    size="sm"
                                                                    variant="success"
                                                                    onClick={() => handleAbrirSubastaModal(detalle, tipo.tipo_fruta_nombre)}
                                                                >
                                                                    + Subasta
                                                                </Button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                ) : (
                                    <div className="px-4 py-3 text-sm text-gray-500">
                                        Sin detalles registrados
                                    </div>
                                )}

                                {/* Imágenes del tipo de fruta */}
                                {tipo.imagenes && tipo.imagenes.length > 0 && (
                                    <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                                        <p className="text-xs font-medium text-gray-600 mb-2">
                                            Imágenes de {tipo.tipo_fruta_nombre}
                                        </p>
                                        <ImageGallery
                                            packingSemanalId={packing.id}
                                            packingTipoId={tipo.id}
                                            allowDelete={false}
                                            compact={true}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Total General */}
                        <div className="bg-green-50 p-4 rounded-lg flex justify-between items-center border border-green-200">
                            <span className="text-sm font-semibold text-green-700 uppercase">
                                Total General Semanal:
                            </span>
                            <span className="text-xl font-bold text-green-700">
                                {formatKg(packing.total_kg)} kg
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-gray-500">No hay tipos de fruta registrados</p>
                    </div>
                )}
            </div>

            {/* Información adicional */}
            <div className="text-xs text-gray-400 border-t pt-4">
                <p>Registrado: {packing.fecha_registro ? new Date(packing.fecha_registro).toLocaleString('es-PE') : '-'}</p>
                {packing.fecha_actualizacion && (
                    <p>Última actualización: {new Date(packing.fecha_actualizacion).toLocaleString('es-PE')}</p>
                )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
                <Button onClick={onEdit}>
                    Editar
                </Button>
            </div>

            {/* Modal para crear/editar subasta */}
            <Modal
                isOpen={showSubastaModal}
                onClose={() => setShowSubastaModal(false)}
                title={modoEdicion ? "Editar Subasta" : "Programar Subasta"}
                size="md"
            >
                {detalleParaSubasta && (
                    <div className="space-y-4">
                        {/* Info del detalle seleccionado */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600">Tipo de Fruta:</span>
                                    <div className="font-semibold">{detalleParaSubasta.tipo_fruta_nombre}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600">Día:</span>
                                    <div className="font-semibold">{getDiaLabel(detalleParaSubasta.dia)}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600">Fecha:</span>
                                    <div className="font-semibold">{detalleParaSubasta.fecha}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600">Kilos:</span>
                                    <div className="font-semibold text-green-600">{formatKg(detalleParaSubasta.py)} kg</div>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {errorSubasta && (
                            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">
                                {errorSubasta}
                            </div>
                        )}

                        {/* Formulario */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Fecha y Hora de Inicio *
                                </label>
                                <input
                                    type="datetime-local"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={subastaForm.fecha_hora_inicio}
                                    onChange={(e) => setSubastaForm(prev => ({ ...prev, fecha_hora_inicio: e.target.value }))}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Duración de la Subasta *
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { value: '1', label: '1 hora' },
                                        { value: '2', label: '2 horas' },
                                        { value: '3', label: '3 horas' },
                                        { value: '6', label: '6 horas' },
                                    ].map(({ value, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => setSubastaForm(prev => ({ ...prev, duracion_horas: value }))}
                                            className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${subastaForm.duracion_horas === value
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                                {subastaForm.fecha_hora_inicio && subastaForm.duracion_horas && (
                                    <p className="mt-2 text-xs text-gray-500">
                                        Finalizará: {(() => {
                                            const inicio = new Date(subastaForm.fecha_hora_inicio);
                                            const fin = new Date(inicio.getTime() + parseInt(subastaForm.duracion_horas) * 60 * 60 * 1000);
                                            return fin.toLocaleString('es-PE', {
                                                weekday: 'short',
                                                day: '2-digit',
                                                month: 'short',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            });
                                        })()}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Precio Base (S/) *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="0.00"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={subastaForm.precio_base}
                                    onChange={(e) => setSubastaForm(prev => ({ ...prev, precio_base: e.target.value }))}
                                />
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setShowSubastaModal(false)}>
                                Cancelar
                            </Button>
                            <Button
                                onClick={modoEdicion ? handleGuardarSubasta : handleCrearSubasta}
                                disabled={creandoSubasta}
                            >
                                {creandoSubasta
                                    ? (modoEdicion ? 'Guardando...' : 'Creando...')
                                    : (modoEdicion ? 'Guardar Cambios' : 'Programar Subasta')
                                }
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal para ver detalle de subasta */}
            <Modal
                isOpen={showDetalleSubastaModal}
                onClose={() => setShowDetalleSubastaModal(false)}
                title="Detalle de Subasta"
                size="lg"
            >
                {subastaSeleccionada && (
                    <div className="space-y-4">
                        {/* Estado y Badge */}
                        <div className="flex items-center justify-between">
                            <Badge variant={SUBASTA_COLORS[subastaSeleccionada.estado_actual]}>
                                {SUBASTA_LABELS[subastaSeleccionada.estado_actual] || subastaSeleccionada.estado_actual}
                            </Badge>
                            <span className="text-sm text-gray-500">ID: #{subastaSeleccionada.id}</span>
                        </div>

                        {/* Info del producto */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="text-sm font-semibold text-blue-800 mb-3">Producto en Subasta</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <span className="text-blue-600 block">Tipo de Fruta</span>
                                    <div className="font-semibold">{subastaSeleccionada.tipo_fruta_nombre}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600 block">Día</span>
                                    <div className="font-semibold">{getDiaLabel(subastaSeleccionada.detalle?.dia)}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600 block">Fecha Producción</span>
                                    <div className="font-semibold">{subastaSeleccionada.detalle?.fecha}</div>
                                </div>
                                <div>
                                    <span className="text-blue-600 block">Cantidad</span>
                                    <div className="font-semibold text-green-600">{formatKg(subastaSeleccionada.kilos || subastaSeleccionada.detalle?.py)} kg</div>
                                </div>
                            </div>
                        </div>

                        {/* Tiempos y Precios */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">⏰ Horarios</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Inicio:</span>
                                        <span className="font-medium">
                                            {new Date(subastaSeleccionada.fecha_hora_inicio).toLocaleString('es-PE', {
                                                weekday: 'short', day: '2-digit', month: 'short',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Fin:</span>
                                        <span className="font-medium">
                                            {new Date(subastaSeleccionada.fecha_hora_fin).toLocaleString('es-PE', {
                                                weekday: 'short', day: '2-digit', month: 'short',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2">
                                        <span className="text-gray-500">Duración:</span>
                                        <span className="font-medium">
                                            {(() => {
                                                const inicio = new Date(subastaSeleccionada.fecha_hora_inicio);
                                                const fin = new Date(subastaSeleccionada.fecha_hora_fin);
                                                const horas = Math.round((fin - inicio) / (1000 * 60 * 60));
                                                return `${horas} hora${horas !== 1 ? 's' : ''}`;
                                            })()}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">💰 Precios</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Precio Base:</span>
                                        <span className="font-medium">S/ {parseFloat(subastaSeleccionada.precio_base).toFixed(2)}</span>
                                    </div>
                                    {subastaSeleccionada.precio_actual && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">Precio Actual:</span>
                                            <span className="font-bold text-green-600 text-lg">
                                                S/ {parseFloat(subastaSeleccionada.precio_actual).toFixed(2)}
                                            </span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t pt-2">
                                        <span className="text-gray-500">Total Ofertas:</span>
                                        <span className="font-medium">{subastaSeleccionada.total_ofertas || 0}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cliente Ganando (si hay) */}
                        {subastaSeleccionada.cliente_ganando && (
                            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                                <h4 className="text-sm font-semibold text-yellow-800 mb-2">🏆 Oferta Ganadora Actual</h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-yellow-700">{subastaSeleccionada.cliente_ganando.nombre}</span>
                                    <span className="font-bold text-yellow-800 text-lg">
                                        S/ {parseFloat(subastaSeleccionada.cliente_ganando.monto).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Botones */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="secondary" onClick={() => setShowDetalleSubastaModal(false)}>
                                Cerrar
                            </Button>
                            {subastaSeleccionada.estado_actual === 'PROGRAMADA' && (
                                <Button
                                    variant="warning"
                                    onClick={() => handleEditarSubasta(
                                        subastaSeleccionada,
                                        subastaSeleccionada.detalle,
                                        subastaSeleccionada.tipo_fruta_nombre
                                    )}
                                >
                                    Editar Subasta
                                </Button>
                            )}
                            <Button onClick={() => window.open(`/dashboard/subastas?id=${subastaSeleccionada.id}`, '_self')}>
                                Ver Historial Completo
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default PackingDetalle;
