/**
 * Componente de configuración global de subastas.
 * Permite al administrador configurar los parámetros de anti-sniping.
 *
 * Diseño consistente con el resto del panel (Tailwind CSS, fondo blanco).
 */

import { useState, useEffect } from 'react';
import { Button, Alert } from '../../components/common';
import { getConfiguracionSubasta, updateConfiguracionSubasta } from '../../api/subastas';
import { Zap, Clock, RefreshCw, Info } from 'lucide-react';

const ConfiguracionSubasta = ({ onClose }) => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        cargarConfig();
    }, []);

    const cargarConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getConfiguracionSubasta();
            setConfig(res.data);
        } catch (err) {
            setError('Error al cargar la configuración');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setConfig(prev => ({ ...prev, [field]: value }));
        setSuccess(false);
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            await updateConfiguracionSubasta(config);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            setError(err.response?.data?.detail || 'Error al guardar la configuración');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const formatSegundos = (seg) => {
        if (!seg && seg !== 0) return '';
        const min = Math.floor(seg / 60);
        const s = seg % 60;
        if (min === 0) return `${s}s`;
        if (s === 0) return `${min} min`;
        return `${min} min ${s}s`;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Mensajes */}
            {error && (
                <Alert type="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert type="success">
                    ✅ Configuración guardada correctamente
                </Alert>
            )}

            {/* Sección Anti-sniping */}
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">
                        Extensión Automática de Tiempo
                    </h3>
                    <span className="ml-1 text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        Anti-sniping
                    </span>
                </div>

                <p className="text-sm text-gray-500">
                    Cuando alguien puja faltando poco tiempo, el sistema extiende automáticamente
                    el tiempo para dar oportunidad a otros participantes.
                </p>

                {/* Toggle habilitado */}
                <div className="flex items-center justify-between py-3 border-b border-gray-200">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Estado
                        </label>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Activa o desactiva la extensión automática
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => handleChange('antisniping_habilitado', !config?.antisniping_habilitado)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${config?.antisniping_habilitado ? 'bg-blue-600' : 'bg-gray-300'
                            }`}
                    >
                        <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${config?.antisniping_habilitado ? 'translate-x-6' : 'translate-x-1'
                                }`}
                        />
                    </button>
                </div>

                {/* Campos de configuración */}
                <div className={`space-y-4 ${!config?.antisniping_habilitado ? 'opacity-50 pointer-events-none' : ''}`}>

                    {/* Umbral */}
                    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-200">
                        <div className="flex-1">
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                Activar cuando queden menos de
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Si alguien puja dentro de este tiempo antes del fin, se extiende
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                                type="number"
                                min="10"
                                max="3600"
                                value={config?.antisniping_umbral_segundos ?? 120}
                                onChange={e => handleChange('antisniping_umbral_segundos', parseInt(e.target.value))}
                                className="w-20 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-500">seg</span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                = {formatSegundos(config?.antisniping_umbral_segundos)}
                            </span>
                        </div>
                    </div>

                    {/* Extensión */}
                    <div className="flex items-start justify-between gap-4 py-2 border-b border-gray-200">
                        <div className="flex-1">
                            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                                <Zap className="w-3.5 h-3.5 text-gray-400" />
                                Tiempo a agregar
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Cuántos segundos se suman al tiempo de fin cuando se activa
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                                type="number"
                                min="10"
                                max="3600"
                                value={config?.antisniping_extension_segundos ?? 120}
                                onChange={e => handleChange('antisniping_extension_segundos', parseInt(e.target.value))}
                                className="w-20 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-500">seg</span>
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                = {formatSegundos(config?.antisniping_extension_segundos)}
                            </span>
                        </div>
                    </div>

                    {/* Máximo de extensiones */}
                    <div className="flex items-start justify-between gap-4 py-2">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Máximo de extensiones
                            </label>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Cuántas veces se puede extender el tiempo.{' '}
                                <strong>0 = sin límite</strong>
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <input
                                type="number"
                                min="0"
                                max="100"
                                value={config?.antisniping_max_extensiones ?? 5}
                                onChange={e => handleChange('antisniping_max_extensiones', parseInt(e.target.value))}
                                className="w-20 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            <span className="text-sm text-gray-500">
                                {config?.antisniping_max_extensiones === 0 ? 'sin límite' : 'veces'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Resumen visual */}
                {config?.antisniping_habilitado && (
                    <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-blue-700">
                            Si alguien puja cuando quedan menos de{' '}
                            <strong>{formatSegundos(config?.antisniping_umbral_segundos)}</strong>,
                            se agregarán{' '}
                            <strong>{formatSegundos(config?.antisniping_extension_segundos)}</strong> al tiempo.
                            {config?.antisniping_max_extensiones > 0
                                ? ` Máximo ${config.antisniping_max_extensiones} veces.`
                                : ' Sin límite de extensiones.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Botones de acción */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <span className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Guardando...
                        </span>
                    ) : (
                        'Guardar cambios'
                    )}
                </Button>
            </div>
        </div>
    );
};

export default ConfiguracionSubasta;
