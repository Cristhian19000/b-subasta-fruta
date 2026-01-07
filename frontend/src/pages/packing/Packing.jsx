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

const Packing = () => {
    // Estados para datos
    const [packings, setPackings] = useState([]);
    const [empresas, setEmpresas] = useState([]);
    const [tiposFruta, setTiposFruta] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados para filtros
    const [filtroEmpresa, setFiltroEmpresa] = useState('');
    const [filtroTipoFruta, setFiltroTipoFruta] = useState('');

    // Estados para modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // create, edit, view
    const [selectedPacking, setSelectedPacking] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [packingsRes, empresasRes, tiposFrutaRes] = await Promise.all([
                api.get('/packings/'),
                api.get('/empresas/'),
                api.get('/tipos-fruta/'),
            ]);
            setPackings(packingsRes.data.results || packingsRes.data);
            setEmpresas(empresasRes.data.results || empresasRes.data);
            setTiposFruta(tiposFrutaRes.data.results || tiposFrutaRes.data);
        } catch (err) {
            setError('Error al cargar los datos');
        } finally {
            setLoading(false);
        }
    };

    const fetchPackings = async () => {
        try {
            let url = '/packings/';
            const params = new URLSearchParams();
            if (filtroEmpresa) params.append('empresa', filtroEmpresa);
            if (filtroTipoFruta) params.append('tipo_fruta', filtroTipoFruta);
            if (params.toString()) url += `?${params.toString()}`;

            const response = await api.get(url);
            setPackings(response.data.results || response.data);
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
            const response = await api.get(`/packings/${id}/`);
            setSelectedPacking(response.data);
            setModalMode('edit');
            setShowModal(true);
        } catch (err) {
            setError('Error al cargar el packing');
        }
    };

    const handleView = async (id) => {
        try {
            const response = await api.get(`/packings/${id}/`);
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
            await api.delete(`/packings/${id}/`);
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
                await api.post('/packings/', data);
                setSuccess('Packing creado correctamente');
            } else {
                await api.put(`/packings/${selectedPacking.id}/`, data);
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
        fetchPackings();
    };

    const handleClearFilters = () => {
        setFiltroEmpresa('');
        setFiltroTipoFruta('');
        fetchData();
    };

    const formatDate = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-PE', { 
            weekday: 'short', 
            day: '2-digit', 
            month: 'short', 
            year: 'numeric' 
        });
    };

    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg);
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
                            Empresa
                        </label>
                        <select
                            value={filtroEmpresa}
                            onChange={(e) => setFiltroEmpresa(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                        >
                            <option value="">Todas las empresas</option>
                            {empresas.map((e) => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Fruta
                        </label>
                        <select
                            value={filtroTipoFruta}
                            onChange={(e) => setFiltroTipoFruta(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                        >
                            <option value="">Todos los tipos</option>
                            {tiposFruta.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end gap-2">
                        <Button variant="secondary" onClick={handleFilter}>
                            Filtrar
                        </Button>
                        <Button variant="ghost" onClick={handleClearFilters}>
                            Limpiar
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tabla de Packings */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando...</div>
            ) : packings.length === 0 ? (
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
                                    Empresa
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo Fruta
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Semana
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    KG Total
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Días
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {packings.map((packing) => (
                                <tr key={packing.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {packing.empresa_nombre}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant="info">
                                            {packing.tipo_fruta_nombre}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(packing.fecha_proyeccion)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        <span className="text-sm font-semibold text-gray-900">
                                            {formatKg(packing.kg_total)} kg
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className="text-sm text-gray-500">
                                            {packing.cantidad_detalles || 0} días
                                        </span>
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
                size="xl"
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
