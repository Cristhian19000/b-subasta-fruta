/**
 * Formulario de Usuario - Crear/Editar usuario.
 */

import { Button, Input } from '../../components/common';

const UsuarioForm = ({ formData, onChange, onSubmit, onCancel, mode, errors = {}, perfiles = [] }) => {
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        onChange({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const getFieldError = (fieldName) => {
        if (!errors[fieldName]) return null;
        const error = errors[fieldName];
        return Array.isArray(error) ? error.join(', ') : error;
    };

    return (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Usuario"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    required
                    disabled={mode === 'edit'}
                    error={getFieldError('username')}
                    placeholder="Sin espacios (ej: jperez)"
                />
                <Input
                    label="DNI"
                    name="dni"
                    value={formData.dni}
                    onChange={handleInputChange}
                    error={getFieldError('dni')}
                    placeholder="Documento de identidad"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input
                    label="Nombre"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                />
                <Input
                    label="Apellido"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                />
            </div>

            <Input
                label={mode === 'create' ? 'Contraseña' : 'Contraseña (dejar vacío para mantener)'}
                name="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange}
                required={mode === 'create'}
                placeholder={mode === 'edit' ? 'Dejar vacío para mantener' : ''}
                error={getFieldError('password')}
            />

            {/* Perfil de Permisos */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Perfil de Permisos
                </label>
                <select
                    name="perfil_permiso_id"
                    value={formData.perfil_permiso_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                >
                    <option value="">Sin perfil asignado</option>
                    {perfiles.filter(p => p.activo).map(perfil => (
                        <option key={perfil.id} value={perfil.id}>
                            {perfil.nombre}
                            {perfil.es_superusuario && ' (Acceso Total)'}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                    Selecciona un perfil con "Acceso Total" para dar permisos de administrador
                </p>
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

export default UsuarioForm;
