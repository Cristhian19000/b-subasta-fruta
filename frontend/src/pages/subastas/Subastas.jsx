/**
 * Página principal de Subastas.
 * 
 * Lista todas las subastas con filtros por estado y permite
 * ver el detalle, programar nuevas y monitorear en tiempo real.
 */

import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Button, Badge, Table, Modal, Input, Select, Alert } from '../../components/common';
import { getSubastas, getResumenSubastas, cancelarSubasta, getSubasta } from '../../api/subastas';
import { usePermissions } from '../../hooks/usePermissions';
import { useSubastasContext } from '../../context/SubastasWSContext';
import SubastaDetalle from './SubastaDetalle';
import SubastaForm from './SubastaForm';
import SubastaEditForm from './SubastaEditForm';
import { Circle, Clock, Flag, RefreshCw, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

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
    const { hasPermission, isAdmin } = usePermissions();
    
    // Contexto de WebSocket para actualizaciones en tiempo real
    const { refreshCounter } = useSubastasContext();

    // Estados
    const [subastas, setSubastas] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [totalSubastas, setTotalSubastas] = useState(0);
    const [paginaActual, setPaginaActual] = useState(1);
    const [pageSize] = useState(20);

    // Filtros
    const [filtroEstado, setFiltroEstado] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    // Modales
    const [selectedSubasta, setSelectedSubasta] = useState(null);
    const [showDetalle, setShowDetalle] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [showEditForm, setShowEditForm] = useState(false);

    // Cargar datos
    const cargarDatos = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = {
                page: paginaActual
            };
            if (filtroEstado) params.estado = filtroEstado;
            if (searchQuery) params.search = searchQuery;

            const [subastasRes, resumenRes] = await Promise.all([
                getSubastas(params),
                getResumenSubastas()
            ]);

            // Manejar respuesta paginada o array directo
            const subastasData = subastasRes.data?.results || subastasRes.data || [];
            const subastasArray = Array.isArray(subastasData) ? subastasData : [];
            const total = subastasRes.data?.count || subastasArray.length;

            setSubastas(subastasArray);
            setTotalSubastas(total);
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
    }, [filtroEstado, searchQuery, paginaActual, location.state]);

    // Resetear a página 1 cuando cambian los filtros o búsqueda
    useEffect(() => {
        setPaginaActual(1);
    }, [filtroEstado, searchQuery]);

    // Efecto para Debounce de búsqueda
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(searchTerm);
        }, 500); // 500ms de retraso

        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // Recargar datos automáticamente cuando hay eventos de WebSocket
    useEffect(() => {
        if (refreshCounter > 0) {
            cargarDatos();
        }
    }, [refreshCounter, cargarDatos]);

    // Handlers
    const handleVerDetalle = (subasta) => {
        setSelectedSubasta(subasta);
        setShowDetalle(true);
    };

    const handleNuevaSubasta = () => {
        setSelectedSubasta(null);
        setShowForm(true);
        setShowEditForm(false);
    };


    const handleSubastaCreada = () => {
        setShowForm(false);
        cargarDatos();
    };

    const handleEditar = (subasta) => {
        setSelectedSubasta(subasta);
        setShowEditForm(true);
    };

    // Hacer disponible globalmente para que SubastaDetalle pueda dispararlo
    useEffect(() => {
        window.handleOpenEdit = handleEditar;
        window.openSubastaById = async (id) => {
            try {
                const res = await getSubasta(id);
                if (res && res.data) {
                    setSelectedSubasta(res.data);
                    setShowDetalle(true);
                }
            } catch (e) {
                console.error('Error abriendo subasta por id:', e);
            }
        };

        return () => {
            delete window.handleOpenEdit;
            delete window.openSubastaById;
        };
    }, []);

    const handleSubastaEditada = () => {
        setShowEditForm(false);
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
            key: 'producto',
            title: 'Lote / Producto',
            render: (_, row) => (
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-mono text-[11px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                            #{row.id}
                        </span>
                        <span className="font-semibold text-gray-900 truncate max-w-[120px]" title={row.tipo_fruta_nombre}>
                            {row.tipo_fruta_nombre}
                        </span>
                    </div>
                    <div className="text-xs text-gray-500 truncate max-w-[150px]" title={row.empresa_nombre}>
                        {row.empresa_nombre}
                    </div>
                </div>
            )
        },
        {
            key: 'produccion',
            title: 'Producción',
            render: (_, row) => (
                <div>
                    <div className="font-medium text-gray-800">{formatKg(row.kilos)}</div>
                    <div className="text-[11px] text-gray-500 flex flex-col mt-0.5">
                        <span className="capitalize">{row.dia}</span>
                        <span>{row.fecha_produccion}</span>
                    </div>
                </div>
            )
        },
        {
            key: 'cronograma',
            title: 'Cronograma',
            render: (_, row) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-600">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{formatDateTime(row.fecha_hora_inicio)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
                        <Flag className="w-3 h-3 flex-shrink-0" />
                        <span>{formatDateTime(row.fecha_hora_fin)}</span>
                    </div>
                    <div className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded inline-block">
                        Base: {formatCurrency(row.precio_base)}
                    </div>
                </div>
            )
        },
        {
            key: 'estado_precio',
            title: 'Estado y Precio',
            render: (_, row) => {
                const isActive = row.estado_actual === 'ACTIVA';
                const isFinalizada = row.estado_actual === 'FINALIZADA';
                const isCancelada = row.estado_actual === 'CANCELADA';
                const fueReactivada = row.fue_reactivada === true;

                return (
                    <div className="space-y-2">
                        <div className="flex flex-col gap-1">
                            <Badge variant={ESTADO_COLORS[row.estado_actual] || 'default'}>
                                <span className="flex items-center gap-1.5 px-0.5 py-px">
                                    {isActive && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                        </span>
                                    )}
                                    {ESTADO_LABELS[row.estado_actual] || row.estado_actual}
                                </span>
                            </Badge>
                            {/* Indicador de que fue reactivada */}
                            {isCancelada && fueReactivada && (
                                <Badge variant="info" className="text-[10px]">
                                    Reemplazada
                                </Badge>
                            )}
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-400 uppercase font-medium">
                                {isFinalizada ? 'Precio Final' : 'Precio Actual'}
                            </div>
                            <div className={`font-bold text-base ${isActive ? 'text-green-600' : 'text-gray-900'}`}>
                                {formatCurrency(row.precio_actual)}
                            </div>
                        </div>
                    </div>
                );
            }
        },
        {
            key: 'participacion',
            title: 'Participación',
            render: (_, row) => {
                const isFinalizada = row.estado_actual === 'FINALIZADA';

                return (
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
                                {row.total_ofertas || 0} ofertas
                            </span>
                        </div>
                        {row.cliente_ganando ? (
                            <div className="text-xs bg-gray-50 p-1.5 rounded border border-gray-100 max-w-[140px]">
                                <div className="text-[10px] text-gray-500 uppercase leading-tight mb-0.5">
                                    {isFinalizada ? 'Ganador' : 'Líder'}
                                </div>
                                <div className="font-semibold text-gray-900 truncate">
                                    {row.cliente_ganando.nombre}
                                </div>
                                <div className="text-blue-600 font-medium text-[11px]">
                                    {formatCurrency(row.cliente_ganando.monto)}
                                </div>
                            </div>
                        ) : (
                            <span className="text-gray-400 text-[11px] italic">Sin ofertas</span>
                        )}
                    </div>
                );
            }
        },
        {
            key: 'actions',
            title: '',
            align: 'right',
            render: (_, row) => (
                <div className="flex flex-col gap-1.5 min-w-[100px]">
                    {(isAdmin() || hasPermission('subastas', 'view_detail')) && (
                        <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleVerDetalle(row)}
                            className="w-full text-xs"
                        >
                            Ver Detalle
                        </Button>
                    )}
                    <div className="flex gap-1">
                        {row.estado_actual === 'PROGRAMADA' && (isAdmin() || hasPermission('subastas', 'update')) && (
                            <Button
                                size="sm"
                                variant="warning"
                                onClick={() => handleEditar(row)}
                                className="flex-1 px-2 py-1"
                                title="Editar"
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        {row.estado_actual !== 'FINALIZADA' && row.estado_actual !== 'CANCELADA' && (isAdmin() || hasPermission('subastas', 'cancel')) && (
                            <Button
                                size="sm"
                                variant="danger"
                                onClick={() => handleCancelar(row)}
                                className="flex-1 px-2 py-1"
                                title="Cancelar"
                            >
                                <span className="text-[10px] font-medium">Cancelar</span>
                            </Button>
                        )}
                    </div>
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
                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full md:w-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Buscar subasta
                        </label>
                        <div className="relative">
                            <Input
                                placeholder="Producto, empresa o ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div className="w-full md:w-48">
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

                {/* Paginación */}
                {!loading && subastas.length > 0 && totalSubastas > pageSize && (
                    <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-gray-50">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <Button
                                onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                                disabled={paginaActual === 1}
                                variant="secondary"
                            >
                                Anterior
                            </Button>
                            <Button
                                onClick={() => setPaginaActual(prev => prev + 1)}
                                disabled={paginaActual * pageSize >= totalSubastas}
                                variant="secondary"
                            >
                                Siguiente
                            </Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Mostrando{' '}
                                    <span className="font-medium">
                                        {(paginaActual - 1) * pageSize + 1}
                                    </span>
                                    {' '}a{' '}
                                    <span className="font-medium">
                                        {Math.min(paginaActual * pageSize, totalSubastas)}
                                    </span>
                                    {' '}de{' '}
                                    <span className="font-medium">{totalSubastas}</span> resultados
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <button
                                        onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                                        disabled={paginaActual === 1}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${paginaActual === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="sr-only">Anterior</span>
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>

                                    <div className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                        Página {paginaActual} de {Math.ceil(totalSubastas / pageSize)}
                                    </div>

                                    <button
                                        onClick={() => setPaginaActual(prev => prev + 1)}
                                        disabled={paginaActual * pageSize >= totalSubastas}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${paginaActual * pageSize >= totalSubastas ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                                            }`}
                                    >
                                        <span className="sr-only">Siguiente</span>
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
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
                        openSubastaById={async (id) => {
                            try {
                                const res = await getSubasta(id);
                                if (res && res.data) {
                                    setSelectedSubasta(res.data);
                                    setShowDetalle(true);
                                }
                            } catch (e) {
                                console.error('Error abriendo subasta por id:', e);
                            }
                        }}
                    />
                )}
            </Modal>

            {/* Modal de Formulario de Creación */}
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

            {/* Modal de Formulario de Edición */}
            <Modal
                isOpen={showEditForm}
                onClose={() => setShowEditForm(false)}
                title="Editar Subasta Programada"
                size="md"
            >
                {selectedSubasta && (
                    <SubastaEditForm
                        subasta={selectedSubasta}
                        onSuccess={handleSubastaEditada}
                        onCancel={() => setShowEditForm(false)}
                    />
                )}
            </Modal>
        </div>
    );
};

export default Subastas;
