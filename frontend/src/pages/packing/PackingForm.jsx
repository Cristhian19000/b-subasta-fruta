/**
 * Formulario de Registro de Packing Semanal.
 * 
 * Permite registrar la producción semanal empacada por empresa y tipo de fruta.
 * Compuesto por dos secciones: cabecera y detalle (tabla de producción diaria).
 */

import { useState, useEffect } from 'react';
import { Button, Input, Select } from '../../components/common';

const diasSemana = [
    { value: 'lunes', label: 'Lunes' },
    { value: 'martes', label: 'Martes' },
    { value: 'miercoles', label: 'Miércoles' },
    { value: 'jueves', label: 'Jueves' },
    { value: 'viernes', label: 'Viernes' },
    { value: 'sabado', label: 'Sábado' },
];

const PackingForm = ({ packing, empresas, tiposFruta, onSave, onCancel, mode }) => {
    // Estado para la cabecera
    const [cabecera, setCabecera] = useState({
        empresa: '',
        tipo_fruta: '',
        fecha_proyeccion: '',
        observaciones: '',
    });

    // Estado para los detalles (filas de la tabla)
    const [detalles, setDetalles] = useState([]);

    // Estado para errores
    const [errors, setErrors] = useState({});

    // Cargar datos si estamos editando
    useEffect(() => {
        if (packing && mode === 'edit') {
            setCabecera({
                empresa: packing.empresa,
                tipo_fruta: packing.tipo_fruta,
                fecha_proyeccion: packing.fecha_proyeccion,
                observaciones: packing.observaciones || '',
            });
            setDetalles(packing.detalles.map(d => ({
                id: d.id,
                dia: d.dia,
                fecha: d.fecha,
                py: d.py,
                kg: d.kg,
            })));
        } else {
            // Inicializar con filas vacías para cada día
            initializeDetalles();
        }
    }, [packing, mode]);

    // Inicializa los detalles con los días de la semana
    const initializeDetalles = () => {
        const fechaProyeccion = cabecera.fecha_proyeccion || getMonday(new Date());
        const nuevosDetalles = diasSemana.map((dia, index) => ({
            dia: dia.value,
            fecha: calculateDate(fechaProyeccion, index),
            py: '',
            kg: 0,
        }));
        setDetalles(nuevosDetalles);
    };

    // Obtiene el lunes de la semana actual
    const getMonday = (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        d.setDate(diff);
        return d.toISOString().split('T')[0];
    };

    // Calcula la fecha basándose en el lunes + días offset
    const calculateDate = (baseDate, daysOffset) => {
        if (!baseDate) return '';
        const date = new Date(baseDate + 'T00:00:00');
        date.setDate(date.getDate() + daysOffset);
        return date.toISOString().split('T')[0];
    };

    // Maneja cambios en la cabecera
    const handleCabeceraChange = (e) => {
        const { name, value } = e.target;
        setCabecera(prev => ({
            ...prev,
            [name]: value,
        }));

        // Si cambia la fecha de proyección, recalcular fechas de detalles
        if (name === 'fecha_proyeccion' && value) {
            setDetalles(prev => prev.map((detalle, index) => ({
                ...detalle,
                fecha: calculateDate(value, index),
            })));
        }
    };

    // Maneja cambios en una fila del detalle
    const handleDetalleChange = (index, field, value) => {
        setDetalles(prev => prev.map((detalle, i) => {
            if (i === index) {
                return {
                    ...detalle,
                    [field]: field === 'kg' ? parseFloat(value) || 0 : value,
                };
            }
            return detalle;
        }));
    };

    // Agrega una nueva fila de detalle
    const addDetalle = () => {
        const lastDate = detalles.length > 0 
            ? detalles[detalles.length - 1].fecha 
            : cabecera.fecha_proyeccion;
        
        setDetalles(prev => [...prev, {
            dia: 'lunes',
            fecha: lastDate ? calculateDate(lastDate, 1) : '',
            py: '',
            kg: 0,
        }]);
    };

    // Elimina una fila de detalle
    const removeDetalle = (index) => {
        if (detalles.length <= 1) {
            alert('Debe haber al menos un día de producción');
            return;
        }
        setDetalles(prev => prev.filter((_, i) => i !== index));
    };

    // Calcula el total de kilogramos
    const calcularTotal = () => {
        return detalles.reduce((sum, d) => sum + (parseFloat(d.kg) || 0), 0);
    };

    // Valida el formulario
    const validate = () => {
        const newErrors = {};
        
        if (!cabecera.empresa) newErrors.empresa = 'La empresa es requerida';
        if (!cabecera.tipo_fruta) newErrors.tipo_fruta = 'El tipo de fruta es requerido';
        if (!cabecera.fecha_proyeccion) newErrors.fecha_proyeccion = 'La fecha es requerida';

        // Validar que al menos haya un detalle con datos
        const detallesValidos = detalles.filter(d => d.py && d.kg > 0);
        if (detallesValidos.length === 0) {
            newErrors.detalles = 'Debe ingresar al menos un día con PY y KG';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Maneja el envío del formulario
    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!validate()) return;

        // Filtrar detalles vacíos
        const detallesFinales = detalles.filter(d => d.py && d.kg > 0);

        const data = {
            empresa: cabecera.empresa,
            tipo_fruta: cabecera.tipo_fruta,
            fecha_proyeccion: cabecera.fecha_proyeccion,
            observaciones: cabecera.observaciones,
            detalles: detallesFinales.map(d => ({
                dia: d.dia,
                fecha: d.fecha,
                py: d.py,
                kg: d.kg,
            })),
        };

        onSave(data);
    };

    // Formatea números
    const formatKg = (kg) => {
        return new Intl.NumberFormat('es-PE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(kg);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* ============================================= */}
            {/* SECCIÓN 1: CABECERA DEL FORMULARIO */}
            {/* ============================================= */}
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">
                    📋 Datos del Packing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Empresa <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="empresa"
                            value={cabecera.empresa}
                            onChange={handleCabeceraChange}
                            className={`w-full px-3 py-2 border rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                                errors.empresa ? 'border-red-300' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Seleccione una empresa</option>
                            {empresas.map((e) => (
                                <option key={e.id} value={e.id}>{e.nombre}</option>
                            ))}
                        </select>
                        {errors.empresa && (
                            <p className="mt-1 text-xs text-red-600">{errors.empresa}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Fruta <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="tipo_fruta"
                            value={cabecera.tipo_fruta}
                            onChange={handleCabeceraChange}
                            className={`w-full px-3 py-2 border rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                                errors.tipo_fruta ? 'border-red-300' : 'border-gray-300'
                            }`}
                        >
                            <option value="">Seleccione tipo de fruta</option>
                            {tiposFruta.map((t) => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                        </select>
                        {errors.tipo_fruta && (
                            <p className="mt-1 text-xs text-red-600">{errors.tipo_fruta}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Fecha de Proyección (Inicio de Semana) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="date"
                            name="fecha_proyeccion"
                            value={cabecera.fecha_proyeccion}
                            onChange={handleCabeceraChange}
                            className={`w-full px-3 py-2 border rounded-md text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900 ${
                                errors.fecha_proyeccion ? 'border-red-300' : 'border-gray-300'
                            }`}
                        />
                        {errors.fecha_proyeccion && (
                            <p className="mt-1 text-xs text-red-600">{errors.fecha_proyeccion}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Observaciones
                        </label>
                        <input
                            type="text"
                            name="observaciones"
                            value={cabecera.observaciones}
                            onChange={handleCabeceraChange}
                            placeholder="Notas adicionales (opcional)"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                        />
                    </div>
                </div>
            </div>

            {/* ============================================= */}
            {/* SECCIÓN 2: DETALLE - TABLA DE PRODUCCIÓN */}
            {/* ============================================= */}
            <div>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        📊 Producción Diaria
                    </h3>
                    <Button type="button" variant="secondary" size="sm" onClick={addDetalle}>
                        + Agregar Fila
                    </Button>
                </div>

                {errors.detalles && (
                    <p className="mb-2 text-sm text-red-600">{errors.detalles}</p>
                )}

                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-32">
                                    Día
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-36">
                                    Fecha
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    PY
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase w-32">
                                    KG
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-20">
                                    Acción
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {detalles.map((detalle, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-4 py-2">
                                        <select
                                            value={detalle.dia}
                                            onChange={(e) => handleDetalleChange(index, 'dia', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        >
                                            {diasSemana.map((d) => (
                                                <option key={d.value} value={d.value}>{d.label}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="date"
                                            value={detalle.fecha}
                                            onChange={(e) => handleDetalleChange(index, 'fecha', e.target.value)}
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm cursor-pointer focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="text"
                                            value={detalle.py}
                                            onChange={(e) => handleDetalleChange(index, 'py', e.target.value)}
                                            placeholder="Ej: PY-001"
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        />
                                    </td>
                                    <td className="px-4 py-2">
                                        <input
                                            type="number"
                                            value={detalle.kg}
                                            onChange={(e) => handleDetalleChange(index, 'kg', e.target.value)}
                                            min="0"
                                            step="0.01"
                                            placeholder="0.00"
                                            className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-gray-900"
                                        />
                                    </td>
                                    <td className="px-4 py-2 text-center">
                                        <button
                                            type="button"
                                            onClick={() => removeDetalle(index)}
                                            className="text-red-500 hover:text-red-700 cursor-pointer"
                                            title="Eliminar fila"
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100">
                            <tr>
                                <td colSpan="3" className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                    TOTAL SEMANAL:
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                                    {formatKg(calcularTotal())} kg
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* ============================================= */}
            {/* BOTONES DE ACCIÓN */}
            {/* ============================================= */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <Button variant="secondary" type="button" onClick={onCancel}>
                    Cancelar
                </Button>
                <Button type="submit">
                    {mode === 'create' ? 'Guardar Packing' : 'Actualizar Packing'}
                </Button>
            </div>
        </form>
    );
};

export default PackingForm;
