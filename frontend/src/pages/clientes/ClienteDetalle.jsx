/**
 * Vista de detalle del Cliente - Solo lectura.
 */

import { Button } from '../../components/common';

const ClienteDetalle = ({ cliente, onEdit, onClose }) => {
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
                <Button onClick={onEdit}>
                    Editar
                </Button>
            </div>
        </div>
    );
};

export default ClienteDetalle;
