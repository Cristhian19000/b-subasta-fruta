/**
 * Configuración global de subastas — Anti-sniping.
 */

import { useState, useEffect } from 'react';
import { Button, Alert } from '../../components/common';
import { getConfiguracionSubasta, updateConfiguracionSubasta } from '../../api/subastas';
import { Zap, Clock, RefreshCw, AlertTriangle } from 'lucide-react';

const fmtSeg = (seg) => {
    if (seg == null) return '';
    const min = Math.floor(seg / 60);
    const s = seg % 60;
    if (min === 0) return `${s}s`;
    if (s === 0) return `${min} min`;
    return `${min} min ${s}s`;
};

/* ─── Fila de campo ─── */
const Campo = ({ label, sublabel, children }) => (
    <div className="flex items-start justify-between gap-6 py-3 border-b border-gray-100 last:border-0">
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800">{label}</p>
            {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
        </div>
        <div className="flex-shrink-0">{children}</div>
    </div>
);

/* ─── Input numérico con badge de conversión ─── */
const InputSeg = ({ value, onChange, min = 10, max = 3600 }) => (
    <div className="flex items-center gap-2">
        <input
            type="number"
            min={min}
            max={max}
            value={value ?? ''}
            onChange={e => onChange(parseInt(e.target.value) || 0)}
            className="w-20 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
        />
        <span className="text-xs text-gray-400">seg</span>
        {value > 0 && (
            <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                {fmtSeg(value)}
            </span>
        )}
    </div>
);

/* ─── Resumen en lenguaje natural ─── */
const Resumen = ({ config }) => {
    if (!config?.antisniping_habilitado) return null;
    const umbral = config.antisniping_umbral_segundos ?? 120;
    const extension = config.antisniping_extension_segundos ?? 120;
    const maxExt = config.antisniping_max_extensiones ?? 0;

    return (
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600 leading-relaxed">
            Si alguien puja cuando quedan menos de{' '}
            <span className="font-semibold text-gray-900">{fmtSeg(umbral)}</span>,
            se añadirán{' '}
            <span className="font-semibold text-gray-900">{fmtSeg(extension)}</span>
            {' '}al reloj.{' '}
            {maxExt === 0
                ? <span>Puede extenderse <span className="font-semibold text-gray-900">sin límite</span>.</span>
                : <span>Máximo <span className="font-semibold text-gray-900">{maxExt} {maxExt === 1 ? 'vez' : 'veces'}</span>.</span>
            }
            {maxExt === 0 && (
                <span className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Sin límite: la subasta puede extenderse indefinidamente.
                </span>
            )}
        </div>
    );
};

/* ─── Componente principal ─── */
const ConfiguracionSubasta = ({ onClose }) => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => { cargarConfig(); }, []);

    const cargarConfig = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await getConfiguracionSubasta();
            setConfig(res.data);
        } catch {
            setError('Error al cargar la configuración');
        } finally {
            setLoading(false);
        }
    };

    const set = (field, value) => {
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
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-10">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-900" />
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Mensajes */}
            {error && <Alert type="error" onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert type="success">Configuración guardada correctamente</Alert>}

            {/* Encabezado + toggle */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-50 rounded-lg border border-amber-200">
                        <Zap className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-800">Extensión automática de tiempo</span>
                            <span className="text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                Anti-sniping
                            </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Extiende el reloj si alguien puja justo antes del final
                        </p>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={() => set('antisniping_habilitado', !config?.antisniping_habilitado)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-1
                        ${config?.antisniping_habilitado ? 'bg-gray-900' : 'bg-gray-300'}`}
                >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform
                        ${config?.antisniping_habilitado ? 'translate-x-6' : 'translate-x-1'}`}
                    />
                </button>
            </div>

            {/* Parámetros */}
            <div className={`transition-opacity duration-150 ${!config?.antisniping_habilitado ? 'opacity-40 pointer-events-none' : ''}`}>
                <Campo
                    label="Activar cuando queden menos de…"
                    sublabel="Si alguien puja dentro de esta ventana de tiempo, se activa la extensión"
                >
                    <InputSeg
                        value={config?.antisniping_umbral_segundos}
                        onChange={v => set('antisniping_umbral_segundos', v)}
                        min={10} max={3600}
                    />
                </Campo>

                <Campo
                    label="Tiempo que se agrega"
                    sublabel="Segundos que se suman al reloj cuando se activa"
                >
                    <InputSeg
                        value={config?.antisniping_extension_segundos}
                        onChange={v => set('antisniping_extension_segundos', v)}
                        min={10} max={3600}
                    />
                </Campo>

                <Campo
                    label="Máximo de extensiones"
                    sublabel="Cuántas veces puede extenderse en una misma subasta · 0 = sin límite"
                >
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            min={0}
                            max={50}
                            value={config?.antisniping_max_extensiones ?? ''}
                            onChange={e => set('antisniping_max_extensiones', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1.5 text-sm text-center border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
                        />
                        <span className="text-xs text-gray-400">
                            {config?.antisniping_max_extensiones === 0 ? 'sin límite' : 'veces'}
                        </span>
                    </div>
                </Campo>

                {/* Resumen */}
                <Resumen config={config} />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button type="button" variant="secondary" onClick={onClose}>
                    Cancelar
                </Button>
                <Button type="button" onClick={handleSave} disabled={saving}>
                    {saving
                        ? <span className="flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Guardando…
                        </span>
                        : 'Guardar cambios'
                    }
                </Button>
            </div>
        </div>
    );
};

export default ConfiguracionSubasta;
