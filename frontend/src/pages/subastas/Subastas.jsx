/**
 * Página principal de Subastas.
 * 
 * Lista todas las subastas con filtros por estado y permite
 * ver el detalle, programar nuevas y monitorear en tiempo real.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Badge, Table, Modal, Input, Select, Alert } from '../../components/common';
import { getSubastas, getResumenSubastas, actualizarEstadosSubastas, cancelarSubasta } from '../../api/subastas';
import SubastaDetalle from './SubastaDetalle';
import SubastaForm from './SubastaForm';
import { Circle, Clock, Flag, RefreshCw } from 'lucide-react';

// Colores para estados de subasta
const ESTADO_COLORS = {
    'PROGRAMADA': 'warning',
    'ACTIVA': 'success',
    'FINALIZADA': 'default',
    'CANCELADA': 'error'
};

// Etiquetas de estado
const ESTADO_LABELS = {
    'PROGRAMADA': 'Programada',
    'ACTIVA': 'En Vivo',
    'FINALIZADA': 'Finalizada',
    'CANCELADA': 'Cancelada'
};

const Subastas = () => {
    const location = useLocation();

    // Estados
    const [subastas, setSubastas] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState('');

    // Modales
    const [selectedSubasta, setSelectedSubasta] = useState(null);
    const [showDetalle, setShowDetalle] = useState(false);
    const [showForm, setShowForm] = useState(false);

    // Cargar datos
    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {};
            if (filtroEstado) params.estado = filtroEstado;

            const [subastasRes, resumenRes] = await Promise.all([
                getSubastas(params),
                getResumenSubastas()
            ]);

            // Manejar respuesta paginada o array directo
            const subastasData = subastasRes.data?.results || subastasRes.data || [];
            const subastasArray = Array.isArray(subastasData) ? subastasData : [];
            setSubastas(subastasArray);
            setResumen(resumenRes.data);

            // Verificar si venimos del dashboard con un ID para abrir automáticamente
            if (location.state?.openSubastaId) {
                const subastaDeepLink = subastasArray.find(s => s.id === location.state.openSubastaId);
                if (subastaDeepLink) {
                    setSelectedSubasta(subastaDeepLink);
                    setShowDetalle(true);
                }
            }
        } catch (err) {
            console.error('Error cargando subastas:', err);
            setError('Error al cargar las subastas');
        } finally {
            setLoading(false);
        }
    }, [filtroEstado, location.state]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Actualizar estados automáticamente cada 30 segundos
    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                await actualizarEstadosSubastas();
                cargarDatos();
            } catch (err) {
                console.error('Error actualizando estados:', err);
            }
        }, 30000);

        return () => clearInterval(interval);
    }, [cargarDatos]);

    // Handlers
    const handleVerDetalle = (subasta) => {
        setSelectedSubasta(subasta);
        setShowDetalle(true);
    };

    const handleNuevaSubasta = () => {
        setSelectedSubasta(null);
        setShowForm(true);
    };

    const handleSubastaCreada = () => {
        setShowForm(false);
        cargarDatos();
    };

    const handleCancelar = async (subasta) => {
        if (!window.confirm('¿Está seguro de cancelar esta subasta?')) return;

        try {
            await cancelarSubasta(subasta.id);
            cargarDatos();
        } catch (err) {
            console.error('Error cancelando subasta:', err);
            setError('Error al cancelar la subasta');
        }
    };

    // Formatters
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-PE', {
            style: 'currency',
            currency: 'PEN'
        }).format(amount || 0);
    };

    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg || 0) + ' kg';
    };

    // Columnas de la tabla (formato compatible con Table.jsx: key, title, render)
    const columns = [
        {
            key: 'id',
            title: 'ID',
            render: (_, row) => <span className="font-mono text-sm">#{row.id}</span>
        },
        {
            key: 'tipo_fruta_nombre',
            title: 'Producto',
            render: (_, row) => (
                <div>
                    <div className="font-medium text-gray-900">{row.tipo_fruta_nombre}</div>
                    <div className="text-xs text-gray-500">{row.empresa_nombre}</div>
                </div>
            )
        },
        {
            key: 'fecha_produccion',
            title: 'Fecha Producción',
            render: (_, row) => (
                <div>
                    <div className="text-sm">{row.dia}</div>
                    <div className="text-xs text-gray-500">{row.fecha_produccion}</div>
                </div>
            )
        },
        {
            key: 'kilos',
            title: 'Kilos',
            render: (_, row) => <span className="font-medium">{formatKg(row.kilos)}</span>
        },
        {
            key: 'fecha_hora_inicio',
            title: 'Horario',
            render: (_, row) => (
                <div className="text-xs">
                    <div className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span>{formatDateTime(row.fecha_hora_inicio)}</span>
                    </div>
                    <div className="inline-flex items-center gap-1">
                        <Flag className="w-3 h-3 text-gray-500 flex-shrink-0" />
                        <span>{formatDateTime(row.fecha_hora_fin)}</span>
                    </div>
                </div>
            )
        },
        {
            key: 'precio_base',
            title: 'Precio Base',
            render: (_, row) => <span className="text-gray-600">{formatCurrency(row.precio_base)}</span>
        },
        {
            key: 'precio_actual',
            title: 'Precio',
            render: (_, row) => {
                const isFinalizada = row.estado_actual === 'FINALIZADA';
                const label = isFinalizada ? 'Precio Final' : 'Precio Actual';
                return (
                    <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">
                            {label}
                        </div>
                        <div className="font-semibold text-gray-900">
                            {formatCurrency(row.precio_actual)}
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'estado_actual',
            title: 'Estado',
            render: (_, row) => (
                <Badge variant={ESTADO_COLORS[row.estado_actual] || 'default'}>
                    <span className="flex items-center gap-1">
                        {row.estado_actual === 'ACTIVA' && <Circle className="w-2 h-2 fill-current" />}
                        {ESTADO_LABELS[row.estado_actual] || row.estado_actual}
                    </span>
                </Badge>
            )
        },
        {
            key: 'total_ofertas',
            title: 'Ofertas',
            align: 'center',
            render: (_, row) => (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                    {row.total_ofertas || 0}
                </span>
            )
        },
        {
            key: 'cliente_ganando',
            title: 'Posición',
            render: (_, row) => {
                const isFinalizada = row.estado_actual === 'FINALIZADA';
                const label = isFinalizada ? 'Ganador' : 'Ganando';

                return row.cliente_ganando ? (
                    <div className="text-xs">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wide mb-0.5">
                            {label}
                        </div>
                        <div className="font-medium text-gray-900 truncate max-w-32">
                            {row.cliente_ganando.nombre}
                        </div>
                        <div className="text-gray-600 text-[11px]">
                            {formatCurrency(row.cliente_ganando.monto)}
                        </div>
                    </div>
                ) : (
                    <span className="text-gray-400 text-xs">Sin ofertas</span>
                );
            }
        },
        {
            key: 'actions',
            title: 'Acciones',
            render: (_, row) => (
                <div className="flex gap-1">
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleVerDetalle(row)}
                    >
                        Ver
                    </Button>
                    {row.estado_actual !== 'FINALIZADA' && row.estado_actual !== 'CANCELADA' && (
                        <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleCancelar(row)}
                        >
                            Cancelar
                        </Button>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subastas</h1>
                    <p className="text-gray-500">Gestión de subastas de producción diaria</p>
                </div>
                <Button onClick={handleNuevaSubasta}>
                    + Nueva Subasta
                </Button>
            </div>

            {/* Resumen de estados */}
            {resumen && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-yellow-700">{resumen.programadas}</div>
                        <div className="text-sm text-yellow-600">Programadas</div>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-700">{resumen.activas}</div>
                        <div className="text-sm text-green-600">
                            <Circle className="w-2 h-2 fill-current inline-block mr-1 relative top-[-1px]" />
                            En Vivo
                        </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-gray-700">{resumen.finalizadas}</div>
                        <div className="text-sm text-gray-600">Finalizadas</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-red-700">{resumen.canceladas}</div>
                        <div className="text-sm text-red-600">Canceladas</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-700">{resumen.total}</div>
                        <div className="text-sm text-blue-600">Total</div>
                    </div>
                </div>
            )}

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <div className="flex gap-4 items-end">
                    <div className="w-48">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estado
                        </label>
                        <Select
                            value={filtroEstado}
                            onChange={(e) => setFiltroEstado(e.target.value)}
                            options={[
                                { value: '', label: 'Todos los estados' },
                                { value: 'PROGRAMADA', label: 'Programadas' },
                                { value: 'ACTIVA', label: 'Activas' },
                                { value: 'FINALIZADA', label: 'Finalizadas' },
                                { value: 'CANCELADA', label: 'Canceladas' }
                            ]}
                        />
                    </div>
                    <Button variant="secondary" onClick={cargarDatos}>
                        <div className="flex items-center gap-1">
                            <RefreshCw className="w-4 h-4" />
                            <span>Actualizar</span>
                        </div>
                    </Button>
                </div>
            </div>

            {/* Errores */}
            {error && (
                <Alert type="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Tabla de subastas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <Table
                    columns={columns}
                    data={subastas}
                    loading={loading}
                    emptyMessage="No hay subastas registradas"
                />
            </div>

            {/* Modal de Detalle */}
            <Modal
                isOpen={showDetalle}
                onClose={() => setShowDetalle(false)}
                title={`Subasta #${selectedSubasta?.id}`}
                size="xl"
            >
                {selectedSubasta && (
                    <SubastaDetalle
                        subasta={selectedSubasta}
                        onClose={() => setShowDetalle(false)}
                        onUpdate={cargarDatos}
                    />
                )}
            </Modal>

            {/* Modal de Formulario */}
            <Modal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                title="Programar Nueva Subasta"
                size="lg"
            >
                <SubastaForm
                    onSuccess={handleSubastaCreada}
                    onCancel={() => setShowForm(false)}
                />
            </Modal>
        </div>
    );
};

export default Subastas;
