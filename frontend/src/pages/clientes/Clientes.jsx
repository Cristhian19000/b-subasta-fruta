/**
 * Página de Gestión de Clientes.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { Button, Alert, Modal, Badge } from '../../components/common';
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
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-light text-gray-900">Clientes</h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Gestión de clientes del sistema
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    Nuevo Cliente
                </Button>
            </div>

            {/* Alertas */}
            <Alert type="error" message={error} onClose={() => setError('')} />
            <Alert type="success" message={success} onClose={() => setSuccess('')} />

            {/* Búsqueda */}
            <div className="mb-6 flex gap-3">
                <input
                    type="text"
                    placeholder="Buscar por RUC/DNI o nombre..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                <Button variant="secondary" onClick={handleSearch}>
                    Buscar
                </Button>
            </div>

            {/* Tabla */}
            {loading ? (
                <div className="text-center py-12 text-gray-500">Cargando...</div>
            ) : filteredClientes.length === 0 ? (
                <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                    <p className="text-gray-500">No hay clientes registrados</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    RUC/DNI
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Nombre/Razón Social
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Sede
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Ficha
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredClientes.map(cliente => (
                                <tr key={cliente.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {cliente.ruc_dni}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {cliente.nombre_razon_social}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {cliente.tipo === 'persona_natural' ? 'Natural' : 'Jurídica'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {cliente.sede}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={cliente.estado === 'habilitado' ? 'success' : 'default'}>
                                            {cliente.estado === 'habilitado' ? 'Habilitado' : 'Deshabilitado'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <Badge variant={cliente.estatus_ficha === 'recepcionado' ? 'info' : 'warning'}>
                                            {cliente.estatus_ficha === 'recepcionado' ? 'Recepcionado' : 'Pendiente'}
                                        </Badge>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => handleView(cliente.id)}
                                            className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                        >
                                            Ver
                                        </button>
                                        <button
                                            onClick={() => handleEdit(cliente.id)}
                                            className="text-gray-600 hover:text-gray-900 mr-3 cursor-pointer"
                                        >
                                            Editar
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cliente.id)}
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
                onClose={handleCloseModal}
                title={
                    modalMode === 'create' ? 'Nuevo Cliente' :
                        modalMode === 'edit' ? 'Editar Cliente' : 'Detalle del Cliente'
                }
                size="lg"
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
