/**
 * Página de Reportes - Generación de reportes del sistema.
 */

import { useState } from 'react';
import { descargarReporteSubastas, descargarReporteClientes } from '../../api/reportes';

const Reportes = () => {
    const [fechaInicio, setFechaInicio] = useState('');
    const [fechaFin, setFechaFin] = useState('');
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState(null);

    /**
     * Maneja la descarga del reporte de subastas Excel.
     */
    const handleDescargarReporteSubastas = async () => {
        // Validaciones
        if (!fechaInicio && !fechaFin) {
            setMensaje({
                tipo: 'error',
                texto: 'Por favor, selecciona al menos una fecha (inicio o fin) para el reporte de subastas.'
            });
            return;
        }

        if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
            setMensaje({
                tipo: 'error',
                texto: 'La fecha de inicio no puede ser posterior a la fecha de fin.'
            });
            return;
        }

        await descargarReporte('subastas', () => descargarReporteSubastas(fechaInicio, fechaFin));
    };

    /**
     * Maneja la descarga del reporte de clientes Excel.
     */
    const handleDescargarReporteClientes = async () => {
        await descargarReporte('clientes', () => descargarReporteClientes());
    };

    /**
     * Función genérica para descargar reportes.
     */
    const descargarReporte = async (tipo, downloadFunction) => {
        setLoading(true);
        setMensaje(null);

        try {
            // Descargar el archivo
            const blob = await downloadFunction();

            // Crear un enlace temporal para descargar el archivo
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;

            // Generar nombre de archivo con timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `reporte_${tipo}_${timestamp}.xlsx`;

            // Hacer click automático para descargar
            document.body.appendChild(link);
            link.click();

            // Limpiar
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            setMensaje({
                tipo: 'success',
                texto: `¡Reporte de ${tipo} descargado exitosamente!`
            });
        } catch (error) {
            console.error(`Error al generar reporte de ${tipo}:`, error);
            setMensaje({
                tipo: 'error',
                texto: `Error al generar el reporte de ${tipo}. Por favor, intenta nuevamente.`
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Encabezado */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">
                            Reportes del Sistema
                        </h1>
                        <p className="mt-1 text-sm text-gray-500">
                            Genera reportes profesionales en formato Excel con información completa
                        </p>
                    </div>
                    <div className="flex-shrink-0">
                        <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Grid de reportes disponibles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Reporte de Subastas */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">
                                Reporte de Subastas
                            </h2>
                            <p className="text-sm text-gray-600">
                                Información completa: empresa, tipo de fruta, ganadores, ofertas y precios
                            </p>
                        </div>
                    </div>

                    {/* Filtros de fecha */}
                    <div className="space-y-4 mb-4">
                        <div>
                            <label htmlFor="fecha_inicio" className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Inicio
                            </label>
                            <input
                                type="date"
                                id="fecha_inicio"
                                value={fechaInicio}
                                onChange={(e) => setFechaInicio(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label htmlFor="fecha_fin" className="block text-sm font-medium text-gray-700 mb-2">
                                Fecha de Fin
                            </label>
                            <input
                                type="date"
                                id="fecha_fin"
                                value={fechaFin}
                                onChange={(e) => setFechaFin(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Botón de descarga */}
                    <button
                        onClick={handleDescargarReporteSubastas}
                        disabled={loading}
                        className={`
                            w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white
                            transition-all duration-200 shadow-sm
                            ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700 hover:shadow-md active:scale-95'
                            }
                        `}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Generando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Descargar Excel</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Reporte de Clientes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">
                                Reporte de Clientes
                            </h2>
                            <p className="text-sm text-gray-600">
                                Listado completo con datos de contacto y estadísticas de participación
                            </p>
                        </div>
                    </div>

                    {/* Información del reporte */}
                    <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start">
                            <svg className="w-5 h-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                            <div className="flex-1">
                                <h3 className="text-sm font-medium text-green-900 mb-1">
                                    Contenido del Reporte
                                </h3>
                                <ul className="text-sm text-green-700 space-y-1">
                                    <li>• Información completa del cliente</li>
                                    <li>• Datos de contacto (2 contactos)</li>
                                    <li>• Total de ofertas realizadas</li>
                                    <li>• Número de subastas ganadas</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Botón de descarga */}
                    <button
                        onClick={handleDescargarReporteClientes}
                        disabled={loading}
                        className={`
                            w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-white
                            transition-all duration-200 shadow-sm
                            ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 hover:shadow-md active:scale-95'
                            }
                        `}
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Generando...</span>
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <span>Descargar Excel</span>
                            </>
                        )}
                    </button>
                </div>

            </div>

            {/* Mensajes de estado */}
            {mensaje && (
                <div className={`
                    p-4 rounded-lg border flex items-start gap-3
                    ${mensaje.tipo === 'success'
                        ? 'bg-green-50 border-green-200 text-green-800'
                        : 'bg-red-50 border-red-200 text-red-800'
                    }
                `}>
                    {mensaje.tipo === 'success' ? (
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                    ) : (
                        <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    )}
                    <p className="text-sm font-medium">
                        {mensaje.texto}
                    </p>
                </div>
            )}
        </div>
    );
};

export default Reportes;
