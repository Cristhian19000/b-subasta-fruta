/**
 * Formulario de Cliente - Crear/Editar cliente.
 */

import { Button, Input, Select } from '../../components/common';

const ClienteForm = ({ formData, onChange, onSubmit, onCancel, mode }) => {
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        onChange({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {/* Datos de Identificación */}
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Datos de Identificación
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="RUC/DNI"
                        name="ruc_dni"
                        value={formData.ruc_dni}
                        onChange={handleInputChange}
                        required
                        maxLength="11"
                    />
                    <Select
                        label="Tipo"
                        name="tipo"
                        value={formData.tipo}
                        onChange={handleInputChange}
                        required
                        options={[
                            { value: 'persona_natural', label: 'Persona Natural' },
                            { value: 'persona_juridica', label: 'Persona Jurídica' },
                        ]}
                    />
                    <div className="col-span-2">
                        <Input
                            label="Nombre o Razón Social"
                            name="nombre_razon_social"
                            value={formData.nombre_razon_social}
                            onChange={handleInputChange}
                            required
                        />
                    </div>
                    <Input
                        label="Sede"
                        name="sede"
                        value={formData.sede}
                        onChange={handleInputChange}
                        required
                    />
                    <Select
                        label="Estado"
                        name="estado"
                        value={formData.estado}
                        onChange={handleInputChange}
                        required
                        options={[
                            { value: 'habilitado', label: 'Habilitado' },
                            { value: 'deshabilitado', label: 'Deshabilitado' },
                        ]}
                    />
                </div>
            </div>

            {/* Contacto Principal */}
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Contacto Principal
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Nombre"
                        name="contacto_1"
                        value={formData.contacto_1}
                        onChange={handleInputChange}
                        required
                    />
                    <Input
                        label="Cargo"
                        name="cargo_1"
                        value={formData.cargo_1}
                        onChange={handleInputChange}
                        required
                    />
                    <Input
                        label="Teléfono"
                        name="numero_1"
                        value={formData.numero_1}
                        onChange={handleInputChange}
                        required
                    />
                    <Input
                        label="Email"
                        name="correo_electronico_1"
                        type="email"
                        value={formData.correo_electronico_1}
                        onChange={handleInputChange}
                        required
                    />
                </div>
            </div>

            {/* Contacto Secundario */}
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Contacto Secundario (Opcional)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Nombre"
                        name="contacto_2"
                        value={formData.contacto_2}
                        onChange={handleInputChange}
                    />
                    <Input
                        label="Cargo"
                        name="cargo_2"
                        value={formData.cargo_2}
                        onChange={handleInputChange}
                    />
                    <Input
                        label="Teléfono"
                        name="numero_2"
                        value={formData.numero_2}
                        onChange={handleInputChange}
                    />
                    <Input
                        label="Email"
                        name="correo_electronico_2"
                        type="email"
                        value={formData.correo_electronico_2}
                        onChange={handleInputChange}
                    />
                </div>
            </div>

            {/* Estado de Ficha */}
            <div>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                    Estado de Ficha
                </h4>
                <div className="grid grid-cols-2 gap-4">
                    <Select
                        label="Estatus"
                        name="estatus_ficha"
                        value={formData.estatus_ficha}
                        onChange={handleInputChange}
                        required
                        options={[
                            { value: 'pendiente', label: 'Pendiente' },
                            { value: 'recepcionado', label: 'Recepcionado' },
                        ]}
                    />
                    <div className="flex items-end pb-2">
                        <label className="flex items-center text-sm text-gray-700 cursor-pointer">
                            <input
                                type="checkbox"
                                name="confirmacion_correo"
                                checked={formData.confirmacion_correo}
                                onChange={handleInputChange}
                                className="mr-2 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
                            />
                            Correo confirmado
                        </label>
                    </div>
                </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit">
                    {mode === 'create' ? 'Crear' : 'Guardar'}
                </Button>
            </div>
        </form>
    );
};

export default ClienteForm;
