/**
 * Página principal del Módulo de Packing.
 * 
 * Muestra el listado de packings semanales con opciones de
 * crear, editar, ver y eliminar.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, Alert, Modal, Badge } from '../../components/common';
import PackingForm from './PackingForm';
import PackingDetalle from './PackingDetalle';

// Configuración de colores para estados
const ESTADO_COLORS = {
    'PROYECTADO': 'warning',
    'EN_SUBASTA': 'success',
    'FINALIZADO': 'default',
    'ANULADO': 'error'
};

// Función para obtener el número de semana ISO de una fecha
const getWeekNumber = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr + 'T00:00:00');
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

// Función para obtener el año de una fecha
const getYear = (dateStr) => {
    if (!dateStr) return null;
    return new Date(dateStr + 'T00:00:00').getFullYear();
};

const Packing = () => {
    // Estados para datos
    const [packings, setPackings] = useState([]);
    const [packingsFiltrados, setPackingsFiltrados] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [tiposFruta, setTiposFruta] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados para filtros por semana
    const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
    const [filtroSemana, setFiltroSemana] = useState('');

    // Años y semanas disponibles (calculados dinámicamente)
    const [aniosDisponibles, setAniosDisponibles] = useState([]);
    const [semanasDisponibles, setSemanasDisponibles] = useState([]);

    // Estados para modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // create, edit, view
    const [selectedPacking, setSelectedPacking] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    // Efecto para calcular años y semanas disponibles cuando cambian los packings
    useEffect(() => {
        if (packings.length > 0) {
            // Calcular años únicos
            const anios = [...new Set(packings.map(p => getYear(p.fecha_inicio_semana)))].filter(Boolean).sort((a, b) => b - a);
            setAniosDisponibles(anios);

            // Si el año actual no tiene packings, seleccionar el más reciente
            if (anios.length > 0 && !anios.includes(filtroAnio)) {
                setFiltroAnio(anios[0]);
            }
        }
    }, [packings]);

    // Efecto para calcular semanas disponibles cuando cambia el año seleccionado
    useEffect(() => {
        if (packings.length > 0 && filtroAnio) {
            // Filtrar packings del año seleccionado y obtener semanas únicas
            const semanasDelAnio = packings
                .filter(p => getYear(p.fecha_inicio_semana) === parseInt(filtroAnio))
                .map(p => ({
                    semana: getWeekNumber(p.fecha_inicio_semana),
                    fechaInicio: p.fecha_inicio_semana,
                    fechaFin: p.fecha_fin_semana
                }))
                .filter(s => s.semana !== null);

            // Agrupar por semana y obtener únicas
            const semanasUnicas = [...new Map(semanasDelAnio.map(s => [s.semana, s])).values()]
                .sort((a, b) => a.semana - b.semana);

            setSemanasDisponibles(semanasUnicas);
        } else {
            setSemanasDisponibles([]);
        }
    }, [packings, filtroAnio]);

    // Efecto para filtrar packings cuando cambian los filtros
    useEffect(() => {
        aplicarFiltros();
    }, [packings, filtroAnio, filtroSemana]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [packingsRes, empresasRes, tiposFrutaRes] = await Promise.all([
                api.get('/packing-semanal/'),
                api.get('/empresas/'),
                api.get('/tipos-fruta/'),
            ]);
            const data = packingsRes.data.results || packingsRes.data;
            setPackings(data);
            setPackingsFiltrados(data);
            setEmpresas(empresasRes.data.results || empresasRes.data);
            setTiposFruta(tiposFrutaRes.data.results || tiposFrutaRes.data);
        } catch (err) {
            console.error('Error al cargar datos:', err);
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const aplicarFiltros = () => {
        let resultado = [...packings];

        // Filtrar por año
        if (filtroAnio) {
            resultado = resultado.filter(p => getYear(p.fecha_inicio_semana) === parseInt(filtroAnio));
        }

        // Filtrar por semana
        if (filtroSemana) {
            resultado = resultado.filter(p => getWeekNumber(p.fecha_inicio_semana) === parseInt(filtroSemana));
        }

        setPackingsFiltrados(resultado);
    };

    const fetchPackings = async () => {
        try {
            const response = await api.get('/packing-semanal/');
            const data = response.data.results || response.data;
            setPackings(data);
        } catch (err) {
            setError('Error al cargar los packings');
        }
    };

    const handleCreate = () => {
        setSelectedPacking(null);
        setModalMode('create');
        setShowModal(true);
    };

    const handleEdit = async (id) => {
        try {
            const response = await api.get(`/packing-semanal/${id}/`);
            setSelectedPacking(response.data);
            setModalMode('edit');
            setShowModal(true);
        } catch (err) {
            setError('Error al cargar el packing');
        }
    };

    const handleView = async (id) => {
        try {
            const response = await api.get(`/packing-semanal/${id}/`);
            setSelectedPacking(response.data);
            setModalMode('view');
            setShowModal(true);
        } catch (err) {
            setError('Error al cargar el packing');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este packing?')) return;

        try {
            await api.delete(`/packing-semanal/${id}/`);
            setSuccess('Packing eliminado correctamente');
            fetchPackings();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al eliminar el packing');
        }
    };

    const handleSave = async (data) => {
        try {
            if (modalMode === 'create') {
                await api.post('/packing-semanal/', data);
                setSuccess('Packing creado correctamente');
            } else {
                await api.put(`/packing-semanal/${selectedPacking.id}/`, data);
                setSuccess('Packing actualizado correctamente');
            }
            setShowModal(false);
            fetchPackings();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData) {
                const mensajes = Object.values(errorData).flat().join(', ');
                setError(mensajes || 'Error al guardar el packing');
            } else {
                setError('Error al guardar el packing');
            }
        }
    };

    const handleFilter = () => {
        aplicarFiltros();
    };

    const handleClearFilters = () => {
        const anioActual = new Date().getFullYear();
        setFiltroAnio(aniosDisponibles.includes(anioActual) ? anioActual : aniosDisponibles[0] || anioActual);
        setFiltroSemana('');
    };

    const formatDateShort = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', { 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatDateRange = (inicio, fin) => {
        return `${formatDate(inicio)} - ${formatDate(fin)}`;
    };

    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg || 0);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-light text-gray-900">Packing Semanal</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gestión de proyecciones semanales de empaque
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    + Nuevo Packing
                </Button>
            </div>

            {/* Alertas */}
            {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Filtros */}
            <div className="bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Año
                        </label>
                        <select
                            value={filtroAnio}
                            onChange={(e) => {
                                setFiltroAnio(parseInt(e.target.value));
                                setFiltroSemana(''); // Resetear semana al cambiar año
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                        >
                            {aniosDisponibles.map((anio) => (
                                <option key={anio} value={anio}>{anio}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Semana
                        </label>
                        <select
                            value={filtroSemana}
                            onChange={(e) => setFiltroSemana(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                        >
                            <option value="">Todas ({semanasDisponibles.length} semanas)</option>
                            {semanasDisponibles.map((s) => (
                                <option key={s.semana} value={s.semana}>
                                    Sem {s.semana} ({formatDateShort(s.fechaInicio)} - {formatDateShort(s.fechaFin)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <Button variant="ghost" onClick={handleClearFilters}>
                            Limpiar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabla de Packings */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando...</div>
            ) : packingsFiltrados.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No hay packings registrados</p>
                    <Button className="mt-4" onClick={handleCreate}>
                        Crear primer packing
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sem.
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Empresa
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Período
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipos
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    KG Total
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {packingsFiltrados.map((packing) => (
                                <tr key={packing.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold bg-gray-100 text-gray-800">
                                            S{getWeekNumber(packing.fecha_inicio_semana)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {packing.empresa_nombre}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDateRange(packing.fecha_inicio_semana, packing.fecha_fin_semana)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {packing.cantidad_tipos || 0} tipos
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {formatKg(packing.total_kg)} kg
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Badge variant={ESTADO_COLORS[packing.estado] || 'default'}>
                                            {packing.estado_display || packing.estado}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => handleView(packing.id)}
                                            className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                        >
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleEdit(packing.id)}
                                            className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(packing.id)}
                                            className="text-red-600 hover:text-red-900 cursor-pointer"
                                        >
                                            Eliminar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={
                    modalMode === 'create' 
                        ? 'Nuevo Packing Semanal' 
                        : modalMode === 'edit' 
                            ? 'Editar Packing' 
                            : 'Detalle del Packing'
                }
                size="full"
            >
                {modalMode === 'view' ? (
                    <PackingDetalle
                        packing={selectedPacking}
                        onClose={() => setShowModal(false)}
                        onEdit={() => setModalMode('edit')}
                    />
                ) : (
                    <PackingForm
                        packing={selectedPacking}
                        empresas={empresas}
                        tiposFruta={tiposFruta}
                        onSave={handleSave}
                        onCancel={() => setShowModal(false)}
                        mode={modalMode}
                    />
                )}
            </Modal>
        </div>
    );
};

export default Packing;
