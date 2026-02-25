/**
 * Página de Gestión de Usuarios.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button, Alert, Modal, Badge } from '../../components/common';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../context/AuthContext';
import UsuarioForm from './UsuarioForm';

const initialFormData = {
    username: '',
    first_name: '',
    last_name: '',
    password: '',
    dni: '',
    perfil_permiso_id: '',
};

const Usuarios = () => {
    const { hasPermission, isAdmin } = usePermissions();
    const { user } = useAuth();
    const [usuarios, setUsuarios] = useState([]);
    const [perfiles, setPerfiles] = useState([]); // Perfiles de permisos disponibles
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');

    // Verificar permisos
    const canManage = isAdmin() || hasPermission('usuarios', 'manage_usuarios');

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedUsuario, setSelectedUsuario] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        fetchUsuarios();
        fetchPerfiles(); // Cargar perfiles
    }, []);

    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const response = await api.get('/usuarios/');
            setUsuarios(response.data.results || response.data);
        } catch (err) {
            setError('Error al cargar los usuarios');
        } finally {
            setLoading(false);
        }
    };

    const fetchPerfiles = async () => {
        try {
            const response = await api.get('/perfiles-permiso/');
            // La API devuelve {count, results}, extraer el array
            const perfilesData = response.data.results || response.data;
            setPerfiles(Array.isArray(perfilesData) ? perfilesData : []);
        } catch (err) {
            console.error('Error cargando perfiles:', err);
            // No mostrar error si no puede cargar perfiles
        }
    };

    const handleCreate = () => {
        setFormData(initialFormData);
        setModalMode('create');
        setShowModal(true);
    };

    const handleEdit = async (id) => {
        try {
            const response = await api.get(`/usuarios/${id}/`);
            const user = response.data;
            setFormData({
                username: user.username,
                first_name: user.first_name,
                last_name: user.last_name,
                password: '',
                dni: user.perfil?.dni || '',
                perfil_permiso_id: user.perfil?.perfil_permiso?.id || '',
            });
            setSelectedUsuario(user);
            setModalMode('edit');
            setShowModal(true);
        } catch (err) {
            setError('Error al cargar el usuario');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de desactivar este usuario?')) return;

        try {
            await api.delete(`/usuarios/${id}/`);
            setSuccess('Usuario desactivado correctamente');
            fetchUsuarios();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al desactivar el usuario');
        }
    };

    const handleActivar = async (id) => {
        try {
            await api.post(`/usuarios/${id}/activar/`);
            setSuccess('Usuario activado correctamente');
            fetchUsuarios();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al activar el usuario');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFormErrors({});

        try {
            const dataToSend = { ...formData };

            if (modalMode === 'edit' && !dataToSend.password) {
                delete dataToSend.password;
            }

            if (modalMode === 'create') {
                await api.post('/usuarios/', dataToSend);
                setSuccess('Usuario creado correctamente');
            } else {
                await api.patch(`/usuarios/${selectedUsuario.id}/`, dataToSend);
                setSuccess('Usuario actualizado correctamente');
            }
            setShowModal(false);
            fetchUsuarios();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            const errorData = err.response?.data;

            if (errorData && typeof errorData === 'object') {
                // Si hay un error general (como auto-edición), mostrarlo como mensaje general
                if (errorData.error) {
                    setError(errorData.error);
                    setShowModal(false);
                } else {
                    // Si son errores de campo, guardarlos para mostrarlos en campos individuales
                    setFormErrors(errorData);
                    // NO mostrar mensaje general, solo errores inline en el formulario
                }
            } else {
                // Solo mostrar mensaje general si no son errores de campo
                setError(err.response?.data?.detail || 'Error al guardar el usuario');
            }
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedUsuario(null);
        setFormErrors({});
    };

    const filteredUsuarios = usuarios.filter(usuario =>
        usuario.username?.toLowerCase().includes(search.toLowerCase()) ||
        usuario.dni?.toLowerCase().includes(search.toLowerCase()) ||
        usuario.first_name?.toLowerCase().includes(search.toLowerCase()) ||
        usuario.last_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-light text-gray-900">Usuarios</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gestión de usuarios del sistema
                    </p>
                </div>
                {canManage && (
                    <Button onClick={handleCreate}>
                        Nuevo Usuario
                    </Button>
                )}
            </div>

            {/* Alertas */}
            <Alert type="error" message={error} onClose={() => setError('')} />
            <Alert type="success" message={success} onClose={() => setSuccess('')} />

            {/* Búsqueda */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Buscar por usuario, nombre o DNI..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando...</div>
            ) : filteredUsuarios.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                    <p className="text-gray-500">No hay usuarios registrados</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="overflow-x-auto scrollbar-thin">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Usuario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nombre
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    DNI
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Perfil
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredUsuarios.map(usuario => (
                                <tr key={usuario.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {usuario.username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {`${usuario.first_name || ''} ${usuario.last_name || ''}`.trim() || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {usuario.dni || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {usuario.perfil_permiso ? (
                                            <div className="text-sm">
                                                <div className="text-gray-900 font-medium">
                                                    {usuario.perfil_permiso.nombre}
                                                </div>
                                                {usuario.perfil_permiso.es_superusuario && (
                                                    <div className="text-xs text-purple-600">Acceso Total</div>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-gray-400 text-sm italic">Sin perfil</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={usuario.is_active ? 'success' : 'error'}>
                                            {usuario.is_active ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        {canManage ? (
                                            <>
                                                {usuario.id === user?.id ? (
                                                    <span className="text-gray-400 text-xs" title="No puedes editar tu propio usuario">
                                                        (Tú)
                                                    </span>
                                                ) : (
                                                    <>
                                                        <button
                                                            onClick={() => handleEdit(usuario.id)}
                                                            className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                                        >
                                                            Editar
                                                        </button>
                                                        {usuario.is_active ? (
                                                            <button
                                                                onClick={() => handleDelete(usuario.id)}
                                                                className="text-red-600 hover:text-red-900 cursor-pointer"
                                                            >
                                                                Desactivar
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleActivar(usuario.id)}
                                                                className="text-green-600 hover:text-green-900 cursor-pointer"
                                                            >
                                                                Activar
                                                            </button>
                                                        )}
                                                    </>
                                                )}
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
                onClose={handleCloseModal}
                title={modalMode === 'create' ? 'Nuevo Usuario' : 'Editar Usuario'}
                size="md"
            >
                <UsuarioForm
                    formData={formData}
                    onChange={setFormData}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseModal}
                    mode={modalMode}
                    errors={formErrors}
                    perfiles={perfiles}
                />
            </Modal>
        </div>
    );
};

export default Usuarios;
