import { useState, useEffect } from "react";
import { Button, Alert } from "../../components/common";
import { updateSubasta } from "../../api/subastas";

/**
 * SubastaEditForm - Formulario especializado para editar subastas programadas.
 * Replica el diseño y lógica de edición que se encuentra en el módulo de Packing.
 */
const SubastaEditForm = ({ subasta, onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        fecha_hora_inicio: "",
        duracion_horas: "1",
        precio_base: "",
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cargar datos iniciales de la subasta
    useEffect(() => {
        if (!subasta) return;

        // Formatear fecha para el input datetime-local
        const formatDateForInput = (dateStr) => {
            if (!dateStr) return "";
            const date = new Date(dateStr);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Calcular duración en horas
        const inicio = new Date(subasta.fecha_hora_inicio);
        const fin = new Date(subasta.fecha_hora_fin);
        const duracionMs = fin - inicio;
        const duracionHoras = Math.round(duracionMs / (1000 * 60 * 60));

        setFormData({
            fecha_hora_inicio: formatDateForInput(subasta.fecha_hora_inicio),
            duracion_horas: duracionHoras.toString(),
            precio_base: subasta.precio_base?.toString() || "",
        });
    }, [subasta]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.fecha_hora_inicio || !formData.duracion_horas || !formData.precio_base) {
            setError("Todos los campos son requeridos");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            // Calcular fecha fin basándose en duración
            const fechaInicio = new Date(formData.fecha_hora_inicio);
            const duracionMs = parseInt(formData.duracion_horas) * 60 * 60 * 1000;
            const fechaFin = new Date(fechaInicio.getTime() + duracionMs);

            // Formatear para enviar al backend preservando componentes locales
            const formatForBackend = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, "0");
                const day = String(date.getDate()).padStart(2, "0");
                const hours = String(date.getHours()).padStart(2, "0");
                const minutes = String(date.getMinutes()).padStart(2, "0");
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            await updateSubasta(subasta.id, {
                fecha_hora_inicio: formData.fecha_hora_inicio,
                fecha_hora_fin: formatForBackend(fechaFin),
                precio_base: parseFloat(formData.precio_base),
            });

            onSuccess();
        } catch (err) {
            console.error("Error actualizando subasta:", err);
            const errorMsg =
                err.response?.data?.fecha_hora_inicio?.[0] ||
                err.response?.data?.fecha_hora_fin?.[0] ||
                err.response?.data?.detail ||
                "Error al actualizar la subasta";
            setError(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const formatKg = (kg) => {
        return new Intl.NumberFormat("es-PE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(kg || 0);
    };

    const getDiaLabel = (dia) => {
        const dias = {
            LUNES: "Lunes",
            MARTES: "Martes",
            MIERCOLES: "Miércoles",
            JUEVES: "Jueves",
            VIERNES: "Viernes",
            SABADO: "Sábado",
            DOMINGO: "Domingo",
        };
        return dias[dia] || dia;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Banner Informativo del Producto (Estilo Packing) */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-blue-600 block text-xs uppercase tracking-wider font-semibold">Producto</span>
                        <div className="font-bold text-blue-900">{subasta.tipo_fruta_nombre}</div>
                    </div>
                    <div>
                        <span className="text-blue-600 block text-xs uppercase tracking-wider font-semibold">Producción</span>
                        <div className="font-bold text-blue-900">
                            {getDiaLabel(subasta.dia_display || subasta.dia)} ({subasta.fecha_produccion})
                        </div>
                    </div>
                    <div>
                        <span className="text-blue-600 block text-xs uppercase tracking-wider font-semibold">Cantidad</span>
                        <div className="font-bold text-green-700">{formatKg(subasta.kilos)} kg</div>
                    </div>
                    <div>
                        <span className="text-blue-600 block text-xs uppercase tracking-wider font-semibold">Empresa</span>
                        <div className="font-bold text-blue-900">{subasta.empresa_nombre}</div>
                    </div>
                </div>
            </div>

            {error && (
                <Alert type="error" onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Controles de Formulario */}
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha y Hora de Inicio *
                    </label>
                    <input
                        type="datetime-local"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                        value={formData.fecha_hora_inicio}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                fecha_hora_inicio: e.target.value,
                            }))
                        }
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duración de la Subasta *
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { value: "1", label: "1h" },
                            { value: "2", label: "2h" },
                            { value: "3", label: "3h" },
                            { value: "6", label: "6h" },
                        ].map(({ value, label }) => (
                            <button
                                key={value}
                                type="button"
                                onClick={() =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        duracion_horas: value,
                                    }))
                                }
                                className={`px-3 py-2 rounded-lg border text-sm font-bold transition-all ${formData.duracion_horas === value
                                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                    }`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                    {formData.fecha_hora_inicio && (
                        <p className="mt-2 text-xs text-gray-500 italic">
                            Se cerrará automáticamente a las:{" "}
                            <span className="font-bold text-gray-700">
                                {(() => {
                                    const inicio = new Date(formData.fecha_hora_inicio);
                                    const fin = new Date(
                                        inicio.getTime() +
                                        parseInt(formData.duracion_horas) * 60 * 60 * 1000
                                    );
                                    return fin.toLocaleString("es-PE", {
                                        weekday: "short",
                                        hour: "2-digit",
                                        minute: "2-digit",
                                    });
                                })()}
                            </span>
                        </p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio Base (S/) *
                    </label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-gray-400 font-medium">S/</span>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-semibold"
                            value={formData.precio_base}
                            onChange={(e) =>
                                setFormData((prev) => ({
                                    ...prev,
                                    precio_base: e.target.value,
                                }))
                            }
                            required
                        />
                    </div>
                </div>
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancelar
                </Button>
                <Button
                    type="submit"
                    disabled={loading}
                >
                    {loading ? "Guardando..." : "Guardar Cambios"}
                </Button>
            </div>
        </form>
    );
};

export default SubastaEditForm;
