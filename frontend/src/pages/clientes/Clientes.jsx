/**
 * Página de Gestión de Clientes.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Button, Alert, Modal, Badge } from '../../components/common';
import { usePermissions } from '../../hooks/usePermissions';
import ClienteForm from './ClienteForm';
import ClienteDetalle from './ClienteDetalle';

const initialFormData = {
    ruc_dni: '',
    nombre_razon_social: '',
    tipo: 'persona_natural',
    sede: '',
    estado: 'habilitado',
    contacto_1: '',
    cargo_1: '',
    numero_1: '',
    correo_electronico_1: '',
    contacto_2: '',
    cargo_2: '',
    numero_2: '',
    correo_electronico_2: '',
    estatus_ficha: 'pendiente',
    confirmacion_correo: false,
};

const Clientes = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { hasPermission } = usePermissions();
    const [clientes, setClientes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [search, setSearch] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedCliente, setSelectedCliente] = useState(null);
    const [formData, setFormData] = useState(initialFormData);
    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        const init = async () => {
            await fetchClientes();

            // Lógica de Deep Link desde el Dashboard
            if (location.state?.openClienteId) {
                handleView(location.state.openClienteId);
                // Limpiar el estado para no reabrir en refrescos
                navigate(location.pathname, { replace: true, state: {} });
            }
        };
        init();
    }, [location.state, navigate, location.pathname]);

    const fetchClientes = async () => {
        try {
            setLoading(true);
            const response = await api.get('/clientes/');
            setClientes(response.data.results || response.data);
        } catch (err) {
            setError('Error al cargar los clientes');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/clientes/?search=${search}`);
            setClientes(response.data.results || response.data);
        } catch (err) {
            setError('Error al buscar clientes');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setFormData(initialFormData);
        setModalMode('create');
        setShowModal(true);
    };

    const handleEdit = async (id) => {
        try {
            const response = await api.get(`/clientes/${id}/`);
            setFormData(response.data);
            setSelectedCliente(response.data);
            setModalMode('edit');
            setShowModal(true);
        } catch (err) {
            setError('Error al cargar el cliente');
        }
    };

    const handleView = async (id) => {
        try {
            const response = await api.get(`/clientes/${id}/`);
            setSelectedCliente(response.data);
            setModalMode('view');
            setShowModal(true);
        } catch (err) {
            setError('Error al cargar el cliente');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Está seguro de eliminar este cliente?')) return;

        try {
            await api.delete(`/clientes/${id}/`);
            setSuccess('Cliente eliminado correctamente');
            fetchClientes();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Error al eliminar el cliente');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setFormErrors({});

        // Filtrar campos de solo lectura antes de enviar
        const { id, fecha_creacion, fecha_actualizacion, ...dataToSend } = formData;

        try {
            if (modalMode === 'create') {
                await api.post('/clientes/', dataToSend);
                setSuccess('Cliente creado correctamente');
            } else {
                await api.put(`/clientes/${selectedCliente.id}/`, dataToSend);
                setSuccess('Cliente actualizado correctamente');
            }
            setShowModal(false);
            fetchClientes();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Error completo:', err.response?.data);
            const errorData = err.response?.data;

            if (errorData && typeof errorData === 'object') {
                // Si son errores de campo, guardarlos para mostrarlos en campos individuales
                setFormErrors(errorData);
                // NO mostrar mensaje general, solo errores inline en el formulario
            } else {
                // Solo mostrar mensaje general si no son errores de campo
                setError(err.response?.data?.detail || 'Error al guardar el cliente');
            }
        }
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedCliente(null);
        setFormErrors({});
    };

    const handleEditFromView = () => {
        setFormData(selectedCliente);
        setModalMode('edit');
    };

    const filteredClientes = clientes.filter(cliente =>
        cliente.ruc_dni?.toLowerCase().includes(search.toLowerCase()) ||
        cliente.nombre_razon_social?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Header - Responsivo */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-light text-gray-900">Clientes</h1>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-gray-500">
                        Gestión de clientes del sistema
                    </p>
                </div>
                {hasPermission('clientes', 'create') && (
                    <Button onClick={handleCreate} className="w-full sm:w-auto">
                        <svg className="w-4 h-4 mr-2 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Nuevo Cliente
                    </Button>
                )}
            </div>

            {/* Alertas */}
            <Alert type="error" message={error} onClose={() => setError('')} />
            <Alert type="success" message={success} onClose={() => setSuccess('')} />

            {/* Búsqueda - Responsiva */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <input
                    type="text"
                    placeholder="Buscar por RUC/DNI o nombre..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                <Button variant="secondary" onClick={handleSearch} className="w-full sm:w-auto">
                    Buscar
                </Button>
            </div>

            {/* Tabla - Responsiva */}
            {loading ? (
                <div className="text-center py-8 sm:py-12 text-gray-500">
                    <svg className="animate-spin h-6 w-6 mx-auto mb-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Cargando...
                </div>
            ) : filteredClientes.length === 0 ? (
                <div className="text-center py-8 sm:py-12 bg-white border border-gray-200 rounded-lg">
                    <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-gray-500 text-sm sm:text-base">No hay clientes registrados</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    {/* Vista de tabla para desktop */}
                    <div className="overflow-x-auto scrollbar-thin">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        RUC/DNI
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Nombre
                                    </th>
                                    <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Tipo
                                    </th>
                                    <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Sede
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ficha
                                    </th>
                                    <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredClientes.map(cliente => (
                                    <tr key={cliente.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900">
                                            {cliente.ruc_dni}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
                                            <div className="max-w-[120px] sm:max-w-none truncate sm:whitespace-normal">
                                                {cliente.nombre_razon_social}
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {cliente.tipo === 'persona_natural' ? 'Natural' : 'Jurídica'}
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {cliente.sede}
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                                            <Badge variant={cliente.estado === 'habilitado' ? 'success' : 'default'}>
                                                <span className="hidden sm:inline">{cliente.estado === 'habilitado' ? 'Habilitado' : 'Deshabilitado'}</span>
                                                <span className="sm:hidden">{cliente.estado === 'habilitado' ? 'Hab.' : 'Des.'}</span>
                                            </Badge>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                                            <Badge variant={cliente.estatus_ficha === 'recepcionado' ? 'info' : 'warning'}>
                                                {cliente.estatus_ficha === 'recepcionado' ? 'Recepcionado' : 'Pendiente'}
                                            </Badge>
                                        </td>
                                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right text-xs sm:text-sm">
                                            <div className="flex items-center justify-end gap-1 sm:gap-2">
                                                {hasPermission('clientes', 'view_detail') && (
                                                    <button
                                                        onClick={() => handleView(cliente.id)}
                                                        className="p-1.5 sm:p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 sm:hover:bg-transparent rounded cursor-pointer"
                                                        title="Ver"
                                                    >
                                                        <span className="hidden sm:inline">Ver</span>
                                                        <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {hasPermission('clientes', 'update') && (
                                                    <button
                                                        onClick={() => handleEdit(cliente.id)}
                                                        className="p-1.5 sm:p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-100 sm:hover:bg-transparent rounded cursor-pointer"
                                                        title="Editar"
                                                    >
                                                        <span className="hidden sm:inline">Editar</span>
                                                        <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {hasPermission('clientes', 'delete') && (
                                                    <button
                                                        onClick={() => handleDelete(cliente.id)}
                                                        className="p-1.5 sm:p-0 text-red-600 hover:text-red-900 hover:bg-red-50 sm:hover:bg-transparent rounded cursor-pointer"
                                                        title="Eliminar"
                                                    >
                                                        <span className="hidden sm:inline">Eliminar</span>
                                                        <svg className="w-4 h-4 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Modal - Responsivo */}
            <Modal
                isOpen={showModal}
                onClose={handleCloseModal}
                title={
                    modalMode === 'create' ? 'Nuevo Cliente' :
                        modalMode === 'edit' ? 'Editar Cliente' : 'Detalle del Cliente'
                }
                size="lg"
                fullScreenOnMobile={true}
            >
                {modalMode === 'view' ? (
                    <ClienteDetalle
                        cliente={selectedCliente}
                        onEdit={handleEditFromView}
                        onClose={handleCloseModal}
                    />
                ) : (
                    <ClienteForm
                        formData={formData}
                        onChange={setFormData}
                        onSubmit={handleSubmit}
                        onCancel={handleCloseModal}
                        mode={modalMode}
                        errors={formErrors}
                    />
                )}
            </Modal>
        </div>
    );
};

export default Clientes;
