/**
 * Perfiles - Página para gestionar perfiles de permisos.
 * 
 * Permite a los administradores crear, editar y eliminar perfiles de permisos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Plus, Edit2, Trash2, Users, CheckCircle2, XCircle } from 'lucide-react';
import axios from '../../api/axios';
import PermisosEditor from '../../components/permisos/PermisosEditor';
import { usePermissions } from '../../hooks/usePermissions';

const Perfiles = () => {
    const { hasPermission, isAdmin } = usePermissions();
    const [perfiles, setPerfiles] = useState([]);
    const [estructuraPermisos, setEstructuraPermisos] = useState(null);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [perfilActual, setPerfilActual] = useState(null);
    const [viewModalOpen, setViewModalOpen] = useState(false);

    // Formateador de fecha y hora
    const formatDateTime = (dateStr) => {
        if (!dateStr) return '-';
        try {
            return new Date(dateStr).toLocaleString('es-PE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        } catch (e) {
            return dateStr;
        }
    };

    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        activo: true,
        es_superusuario: false,
        permisos: {}
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [resPerfiles, resEstructura] = await Promise.all([
                axios.get('/perfiles-permiso/'),
                axios.get('/perfiles-permiso/estructura_permisos/')
            ]);

            // La API devuelve un objeto con paginación: {count, next, previous, results}
            // Extraer el array de results
            const perfilesData = resPerfiles.data.results || resPerfiles.data;
            setPerfiles(Array.isArray(perfilesData) ? perfilesData : []);
            setEstructuraPermisos(resEstructura.data);
        } catch (error) {
            console.error('Error cargando datos:', error);
            console.error('Error response:', error.response?.data);
            alert('Error al cargar los perfiles de permisos: ' + (error.response?.data?.detail || error.message));
            setPerfiles([]); // Asegurar que perfiles sea un array vacío en caso de error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCreate = () => {
        setModoEdicion(false);
        setPerfilActual(null);
        setFormData({
            nombre: '',
            descripcion: '',
            activo: true,
            es_superusuario: false,
            permisos: {}
        });
        setModalOpen(true);
    };

    const handleView = (perfil) => {
        setPerfilActual(perfil);
        setViewModalOpen(true);
    };

    const handleEdit = (perfil) => {
        setModoEdicion(true);
        setPerfilActual(perfil);
        setFormData({
            nombre: perfil.nombre,
            descripcion: perfil.descripcion || '',
            activo: perfil.activo,
            es_superusuario: perfil.es_superusuario,
            permisos: perfil.permisos || {}
        });
        setModalOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este perfil? Los usuarios asignados perderán sus permisos.')) {
            return;
        }

        try {
            await axios.delete(`/perfiles-permiso/${id}/`);
            alert('Perfil eliminado correctamente');
            fetchData();
        } catch (error) {
            console.error('Error eliminando perfil:', error);
            alert('Error al eliminar el perfil');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            if (modoEdicion && perfilActual) {
                await axios.put(`/perfiles-permiso/${perfilActual.id}/`, formData);
                alert('Perfil actualizado correctamente');
            } else {
                await axios.post('/perfiles-permiso/', formData);
                alert('Perfil creado correctamente');
            }

            setModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error guardando perfil:', error);
            alert('Error al guardar el perfil: ' + (error.response?.data?.nombre?.[0] || 'Error desconocido'));
        }
    };

    if (loading) {
        return (
            <div className="p-4">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-64 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="w-7 h-7 text-black-600" />
                        Perfiles de Permisos
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Gestiona los perfiles y sus permisos para controlar el acceso al sistema
                    </p>
                </div>

                {(isAdmin() || hasPermission('usuarios', 'manage_perfiles')) && (
                    <button
                        onClick={handleCreate}
                        className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <Plus className="w-5 h-5" />
                        Crear Perfil
                    </button>
                )}
            </div>

            {/* Tabla de Perfiles */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Perfil
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Descripción
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Usuarios
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Módulos
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
                        {perfiles.map((perfil) => (
                            <tr key={perfil.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{perfil.nombre}</div>
                                            {perfil.es_superusuario && (
                                                <span className="text-xs text-purple-600 font-medium">Superusuario</span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm text-gray-700 max-w-xs truncate">
                                        {perfil.descripcion || <span className="text-gray-400 italic">Sin descripción</span>}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center text-sm text-gray-700">
                                        <Users className="w-4 h-4 mr-1 text-gray-400" />
                                        {perfil.total_usuarios || 0}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="text-sm text-gray-700">
                                        {Object.keys(perfil.permisos || {}).length} módulos
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {perfil.activo ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">

                                            Activo
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">

                                            Inactivo
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    {(isAdmin() || hasPermission('usuarios', 'view_perfiles')) && (
                                        <button
                                            onClick={() => handleView(perfil)}
                                            className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                        >
                                            Ver
                                        </button>
                                    )}
                                    {(isAdmin() || hasPermission('usuarios', 'manage_perfiles')) ? (
                                        <>
                                            <button
                                                onClick={() => handleEdit(perfil)}
                                                className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                            >
                                                Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(perfil.id)}
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

                {perfiles.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No hay perfiles de permisos creados</p>
                        {(isAdmin() || hasPermission('usuarios', 'manage_perfiles')) && (
                            <button
                                onClick={handleCreate}
                                className="text-blue-600 hover:text-blue-800 text-sm mt-2"
                            >
                                Crear el primer perfil
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Detalle (Solo Lectura) */}
            {viewModalOpen && perfilActual && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-2">
                                <Shield className="w-6 h-6 text-blue-600" />
                                <h2 className="text-xl font-bold text-gray-900">
                                    Detalles del Perfil: {perfilActual.nombre}
                                </h2>
                            </div>
                            <button
                                onClick={() => setViewModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-8">
                            {/* Información General */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Estado</p>
                                    {perfilActual.activo ? (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Activo
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            Inactivo
                                        </span>
                                    )}
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Tipo de Acceso</p>
                                    <p className="text-sm font-medium text-gray-900">
                                        {perfilActual.es_superusuario ? (
                                            <span className="text-purple-600">Superusuario (Total)</span>
                                        ) : (
                                            "Personalizado"
                                        )}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Usuarios Asignados</p>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <p className="text-sm font-medium text-gray-900">{perfilActual.total_usuarios || 0} usuarios</p>
                                    </div>
                                </div>
                            </div>

                            {/* Descripción y Metadatos */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="text-sm font-bold text-gray-900 mb-2">Descripción</h3>
                                    <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-100 min-h-[60px]">
                                        {perfilActual.descripcion || <span className="italic text-gray-400">Sin descripción disponible.</span>}
                                    </p>
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-900 mb-2">Historial</h3>
                                    <div className="text-xs space-y-2 text-gray-600">
                                        <div className="flex justify-between pb-1 border-b border-gray-50">
                                            <span>Creado por:</span>
                                            <span className="font-medium">{perfilActual.nombre_creador || 'Sistema'}</span>
                                        </div>
                                        <div className="flex justify-between pb-1 border-b border-gray-50">
                                            <span>Fecha de creación:</span>
                                            <span className="font-medium">{formatDateTime(perfilActual.fecha_creacion)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Última actualización:</span>
                                            <span className="font-medium">{formatDateTime(perfilActual.fecha_actualizacion)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Permisos */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    Asignación de Permisos
                                </h3>
                                {perfilActual.es_superusuario ? (
                                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                                        <p className="text-sm text-purple-800">
                                            Este perfil tiene acceso <strong>total y absoluto</strong> a todos los módulos del sistema.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {Object.entries(perfilActual.permisos || {}).map(([modulo, permisos]) => {
                                            const infoModulo = estructuraPermisos?.[modulo];
                                            if (!permisos || permisos.length === 0) return null;

                                            return (
                                                <div key={modulo} className="border border-gray-200 rounded-lg overflow-hidden">
                                                    <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between">
                                                        <span className="text-sm font-bold text-gray-800 capitalize">
                                                            {infoModulo?.nombre || modulo}
                                                        </span>
                                                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                                            {permisos.length} permisos
                                                        </span>
                                                    </div>
                                                    <div className="p-3 flex flex-wrap gap-2 bg-white">
                                                        {permisos.map(pCodigo => {
                                                            const pInfo = infoModulo?.permisos?.find(p => p.codigo === pCodigo);
                                                            // Solo mostrar si tiene un nombre legible definido en la estructura
                                                            if (!pInfo) return null;

                                                            return (
                                                                <span
                                                                    key={pCodigo}
                                                                    className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-600 text-[11px] rounded border border-gray-200"
                                                                >
                                                                    {pInfo.nombre}
                                                                </span>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {Object.keys(perfilActual.permisos || {}).length === 0 && (
                                            <div className="col-span-2 text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                                <p className="text-sm text-gray-400">No hay permisos específicos asignados</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-end shrink-0">
                            <button
                                onClick={() => setViewModalOpen(false)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-sm transition-all cursor-pointer"
                            >
                                Cerrar Vista
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Crear/Editar */}
            {modalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">
                                {modoEdicion ? 'Editar Perfil' : 'Crear Nuevo Perfil'}
                            </h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Información Básica */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre del Perfil *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.nombre}
                                        onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="ej. Packing Staff"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descripción
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.descripcion}
                                        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Breve descripción del perfil"
                                    />
                                </div>
                            </div>

                            {/* Opciones */}
                            <div className="flex gap-6">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.activo}
                                        onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">Perfil activo</span>
                                </label>

                                <label className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.es_superusuario}
                                        onChange={(e) => setFormData({ ...formData, es_superusuario: e.target.checked })}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="text-sm text-gray-700">
                                        Es Superusuario <span className="text-xs text-gray-500">(acceso total)</span>
                                    </span>
                                </label>
                            </div>

                            {/* Editor de Permisos */}
                            {!formData.es_superusuario && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-3">
                                        Permisos del Perfil
                                    </label>
                                    <PermisosEditor
                                        permisos={formData.permisos}
                                        onChange={(nuevosPermisos) => setFormData({ ...formData, permisos: nuevosPermisos })}
                                        estructura={estructuraPermisos}
                                    />
                                </div>
                            )}

                            {formData.es_superusuario && (
                                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    <p className="text-sm text-purple-800">
                                        <strong>Nota:</strong> Este perfil tiene acceso total a todos los módulos y permisos del sistema.
                                        No es necesario seleccionar permisos individuales.
                                    </p>
                                </div>
                            )}

                            {/* Botones */}
                            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setModalOpen(false)}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors cursor-pointer"
                                >
                                    {modoEdicion ? 'Guardar Cambios' : 'Crear Perfil'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Perfiles;
