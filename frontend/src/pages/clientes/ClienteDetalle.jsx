/**
 * Vista de detalle del Cliente - Solo lectura.
 */

import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Button } from '../../components/common';
import { usePermissions } from '../../hooks/usePermissions';

const ClienteDetalle = ({ cliente, onEdit, onClose }) => {
    const { hasPermission } = usePermissions();
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);
    const [errorStats, setErrorStats] = useState('');

    useEffect(() => {
        const fetchStats = async () => {
            if (!cliente?.id) return;
            try {
                setLoadingStats(true);
                setErrorStats('');
                const res = await api.get(`/clientes/${cliente.id}/subasta-stats/`);
                setStats(res.data);
            } catch (err) {
                setErrorStats('Error al cargar estadísticas');
            } finally {
                setLoadingStats(false);
            }
        };
        fetchStats();
    }, [cliente]);

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Datos de Identificación
                </h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-gray-500">RUC/DNI</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.ruc_dni}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Tipo</dt>
                        <dd className="text-gray-900 mt-1">
                            {cliente?.tipo === 'persona_natural' ? 'Persona Natural' : 'Persona Jurídica'}
                        </dd>
                    </div>
                    <div className="col-span-2">
                        <dt className="text-gray-500">Nombre/Razón Social</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.nombre_razon_social}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Sede</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.sede}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Estado</dt>
                        <dd className="text-gray-900 mt-1 capitalize">{cliente?.estado}</dd>
                    </div>
                </dl>
            </div>

            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Contacto Principal
                </h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-gray-500">Nombre</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.contacto_1}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Cargo</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.cargo_1}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Teléfono</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.numero_1}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Email</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.correo_electronico_1}</dd>
                    </div>
                </dl>
            </div>

            {cliente?.contacto_2 && (
                <div>
                    <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                        Contacto Secundario
                    </h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <dt className="text-gray-500">Nombre</dt>
                            <dd className="text-gray-900 mt-1">{cliente?.contacto_2}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Cargo</dt>
                            <dd className="text-gray-900 mt-1">{cliente?.cargo_2}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Teléfono</dt>
                            <dd className="text-gray-900 mt-1">{cliente?.numero_2}</dd>
                        </div>
                        <div>
                            <dt className="text-gray-500">Email</dt>
                            <dd className="text-gray-900 mt-1">{cliente?.correo_electronico_2}</dd>
                        </div>
                    </dl>
                </div>
            )}

            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Estado de Ficha
                </h4>
                <dl className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt className="text-gray-500">Estatus</dt>
                        <dd className="text-gray-900 mt-1 capitalize">{cliente?.estatus_ficha}</dd>
                    </div>
                    <div>
                        <dt className="text-gray-500">Correo Confirmado</dt>
                        <dd className="text-gray-900 mt-1">{cliente?.confirmacion_correo ? 'Sí' : 'No'}</dd>
                    </div>
                </dl>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={onClose}>
                    Cerrar
                </Button>
                {hasPermission('clientes', 'update') && (
                    <Button onClick={onEdit}>
                        Editar
                    </Button>
                )}
            </div>

            <div className="mt-6 bg-gray-50 p-4 rounded-md border border-gray-100">
                <h4 className="text-sm font-medium text-gray-600 uppercase tracking-wide mb-3">Estadísticas de Subastas</h4>
                {loadingStats ? (
                    <div className="text-sm text-gray-500">Cargando estadísticas...</div>
                ) : errorStats ? (
                    <div className="text-sm text-red-600">{errorStats}</div>
                ) : stats ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-3 rounded shadow-sm">
                            <div className="text-xs text-gray-500">Total de ofertas</div>
                            <div className="text-lg font-semibold">{stats.total_ofertas}</div>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm">
                            <div className="text-xs text-gray-500">Subastas participadas</div>
                            <div className="text-lg font-semibold">{stats.subastas_participadas}</div>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm">
                            <div className="text-xs text-gray-500">Subastas ganadas</div>
                            <div className="text-lg font-semibold">{stats.subastas_ganadas}</div>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm text-blue-600 border border-blue-50">
                            <div className="text-xs text-gray-500">Subastas en curso</div>
                            <div className="text-lg font-semibold">{stats.subastas_en_curso}</div>
                        </div>
                        <div className="bg-white p-3 rounded shadow-sm text-red-600 border border-red-50">
                            <div className="text-xs text-gray-500">Subastas perdidas</div>
                            <div className="text-lg font-semibold">{stats.subastas_perdidas}</div>
                        </div>
                        <div className="col-span-2 bg-white p-3 rounded shadow-sm">
                            <div className="text-xs text-gray-500">Última participación</div>
                            <div className="text-sm">{stats.ultima_participacion ? new Date(stats.ultima_participacion).toLocaleString() : '—'}</div>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-500">Sin estadísticas disponibles</div>
                )}
            </div>
        </div>
    );
};

export default ClienteDetalle;
