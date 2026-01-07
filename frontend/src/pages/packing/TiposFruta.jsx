/**
 * Página de Gestión de Tipos de Fruta.
 * 
 * Solo accesible para administradores.
 * Permite crear, editar y eliminar tipos de fruta.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, Alert, Modal, Badge, Input } from '../../components/common';

const TiposFruta = () => {
    const [tiposFruta, setTiposFruta] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Estados para modal
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedTipo, setSelectedTipo] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', activo: true });

    useEffect(() => {
        fetchTiposFruta();
    }, []);

    const fetchTiposFruta = async () => {
        try {
            setLoading(true);
            const response = await api.get('/tipos-fruta/');
            setTiposFruta(response.data.results || response.data);
        } catch (err) {
            setError('Error al cargar los tipos de fruta');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setFormData({ nombre: '', activo: true });
        setModalMode('create');
        setShowModal(true);
    };

    const handleEdit = (tipo) => {
        setFormData({ nombre: tipo.nombre, activo: tipo.activo });
        setSelectedTipo(tipo);
        setModalMode('edit');
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este tipo de fruta? Se eliminarán todos los packings asociados.')) return;

        try {
            await api.delete(`/tipos-fruta/${id}/`);
            setSuccess('Tipo de fruta eliminado correctamente');
            fetchTiposFruta();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al eliminar el tipo de fruta');
        }
    };

    const handleToggleActivo = async (tipo) => {
        try {
            await api.patch(`/tipos-fruta/${tipo.id}/`, { activo: !tipo.activo });
            setSuccess(`Tipo de fruta ${!tipo.activo ? 'activado' : 'desactivado'} correctamente`);
            fetchTiposFruta();
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
                await api.post('/tipos-fruta/', formData);
                setSuccess('Tipo de fruta creado correctamente');
            } else {
                await api.put(`/tipos-fruta/${selectedTipo.id}/`, formData);
                setSuccess('Tipo de fruta actualizado correctamente');
            }
            setShowModal(false);
            fetchTiposFruta();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            const errorData = err.response?.data;
            if (errorData) {
                const mensajes = Object.values(errorData).flat().join(', ');
                setError(mensajes || 'Error al guardar');
            } else {
                setError('Error al guardar el tipo de fruta');
            }
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-light text-gray-900">Tipos de Fruta</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Catálogo de tipos de fruta para packing
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    + Nuevo Tipo
                </Button>
            </div>

            {/* Alertas */}
            {error && <Alert type="error" onClose={() => setError('')}>{error}</Alert>}
            {success && <Alert type="success" onClose={() => setSuccess('')}>{success}</Alert>}

            {/* Tabla */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando...</div>
            ) : tiposFruta.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                    <p className="text-gray-500">No hay tipos de fruta registrados</p>
                    <Button className="mt-4" onClick={handleCreate}>
                        Crear primer tipo
                    </Button>
                </div>
            ) : (
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
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
                            {tiposFruta.map((tipo) => (
                                <tr key={tipo.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {tipo.id}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <span className="text-lg mr-2">🍇</span>
                                            <span className="text-sm font-medium text-gray-900">
                                                {tipo.nombre}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <Badge variant={tipo.activo ? 'success' : 'error'}>
                                            {tipo.activo ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(tipo.fecha_creacion).toLocaleDateString('es-PE')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => handleEdit(tipo)}
                                            className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleToggleActivo(tipo)}
                                            className={`mr-3 cursor-pointer ${
                                                tipo.activo 
                                                    ? 'text-yellow-600 hover:text-yellow-900' 
                                                    : 'text-green-600 hover:text-green-900'
                                            }`}
                                        >
                                            {tipo.activo ? 'Desactivar' : 'Activar'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(tipo.id)}
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
                title={modalMode === 'create' ? 'Nuevo Tipo de Fruta' : 'Editar Tipo de Fruta'}
                size="sm"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Nombre del Tipo"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                        required
                        placeholder="Ej: Arándano, Mango, Uva"
                    />

                    <div className="flex items-center">
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={formData.activo}
                                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                className="mr-2 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                            />
                            Tipo activo
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

export default TiposFruta;
