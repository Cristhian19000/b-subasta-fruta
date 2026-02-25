/**
 * Página de Gestión de Empresas.
 * 
 * Solo accesible para administradores.
 * Permite crear, editar y eliminar empresas.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, Alert, Modal, Badge, Input } from '../../components/common';
import { usePermissions } from '../../hooks/usePermissions';

const Empresas = () => {
    const { hasPermission, isAdmin } = usePermissions();
    const [empresas, setEmpresas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Verificar permisos
    const canManage = isAdmin() || hasPermission('catalogos', 'manage_empresas');

    // Estados para modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedEmpresa, setSelectedEmpresa] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', activo: true });

    useEffect(() => {
        fetchEmpresas();
    }, []);

    const fetchEmpresas = async () => {
        try {
            setLoading(true);
            const response = await api.get('/empresas/');
            setEmpresas(response.data.results || response.data);
        } catch (err) {
            setError('Error al cargar las empresas');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setFormData({ nombre: '', activo: true });
        setModalMode('create');
        setShowModal(true);
    };

    const handleEdit = (empresa) => {
        setFormData({ nombre: empresa.nombre, activo: empresa.activo });
        setSelectedEmpresa(empresa);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar esta empresa? Se eliminarán todos los packings asociados.')) return;

        try {
            await api.delete(`/empresas/${id}/`);
            setSuccess('Empresa eliminada correctamente');
            fetchEmpresas();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al eliminar la empresa');
        }
    };

    const handleToggleActivo = async (empresa) => {
        try {
            await api.patch(`/empresas/${empresa.id}/`, { activo: !empresa.activo });
            setSuccess(`Empresa ${!empresa.activo ? 'activada' : 'desactivada'} correctamente`);
            fetchEmpresas();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al cambiar el estado');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.nombre.trim()) {
            setError('El nombre es requerido');
            return;
        }

        try {
            if (modalMode === 'create') {
                await api.post('/empresas/', formData);
                setSuccess('Empresa creada correctamente');
            } else {
                await api.put(`/empresas/${selectedEmpresa.id}/`, formData);
                setSuccess('Empresa actualizada correctamente');
            }
            setShowModal(false);
            fetchEmpresas();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData) {
                const mensajes = Object.values(errorData).flat().join(', ');
                setError(mensajes || 'Error al guardar');
            } else {
                setError('Error al guardar la empresa');
            }
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-light text-gray-900">Empresas</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gestión de empresas agroindustriales
                    </p>
                </div>
                {canManage && (
                    <Button onClick={handleCreate}>
                        + Nueva Empresa
                    </Button>
                )}
            </div>

            {/* Alertas */}
            {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Tabla */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando...</div>
            ) : empresas.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No hay empresas registradas</p>
                    <Button className="mt-4" onClick={handleCreate}>
                        Crear primera empresa
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Creación
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {empresas.map((empresa) => (
                                <tr key={empresa.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {empresa.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {empresa.nombre}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Badge variant={empresa.activo ? 'success' : 'error'}>
                                            {empresa.activo ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(empresa.fecha_creacion).toLocaleDateString('es-PE')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        {canManage ? (
                                            <>
                                                <button
                                                    onClick={() => handleEdit(empresa)}
                                                    className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                                >
                                                    Editar
                                                </button>
                                                <button
                                                    onClick={() => handleToggleActivo(empresa)}
                                                    className={`mr-3 cursor-pointer ${empresa.activo
                                                            ? 'text-yellow-600 hover:text-yellow-900'
                                                            : 'text-green-600 hover:text-green-900'
                                                        }`}
                                                >
                                                    {empresa.activo ? 'Desactivar' : 'Activar'}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(empresa.id)}
                                                    className="text-red-600 hover:text-red-900 cursor-pointer"
                                                >
                                                    Eliminar
                                                </button>
                                            </>
                                        ) : (
                                            <span className="text-gray-400 text-xs">Sin permisos</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    </div>
                </div>
            )}

            {/* Modal */}
            <Modal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                title={modalMode === 'create' ? 'Nueva Empresa' : 'Editar Empresa'}
                size="sm"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nombre de la Empresa"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        placeholder="Ej: AgroExport SAC"
                    />

                    <div className="flex items-center">
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.activo}
                                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                className="mr-2 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                            />
                            Empresa activa
                        </label>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                        <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            {modalMode === 'create' ? 'Crear' : 'Guardar'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default Empresas;
