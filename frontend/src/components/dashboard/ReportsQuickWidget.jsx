/**
 * ReportsQuickWidget - Widget compacto y minimalista para generación rápida de reportes
 */

import React, { useState } from 'react';
import { FileText, Package, Users, Download } from 'lucide-react';
import { descargarReporteSubastas, descargarReporteClientes, descargarReportePacking } from '../../api/reportes';
import { usePermissions } from '../../hooks/usePermissions';

const ReportsQuickWidget = () => {
    const { hasPermission, isAdmin } = usePermissions();
    const [loading, setLoading] = useState(null);

    // Estados para fechas de cada reporte
    const [subastasFechaInicio, setSubastasFechaInicio] = useState('');
    const [subastasFechaFin, setSubastasFechaFin] = useState('');
    const [packingFechaInicio, setPackingFechaInicio] = useState('');
    const [packingFechaFin, setPackingFechaFin] = useState('');

    const handleDownload = async (tipo) => {
        setLoading(tipo);

        try {
            let blob;

            switch (tipo) {
                case 'subastas':
                    if (!subastasFechaInicio) {
                        alert('La fecha de inicio es obligatoria');
                        setLoading(null);
                        return;
                    }
                    blob = await descargarReporteSubastas(subastasFechaInicio, subastasFechaFin);
                    break;
                case 'packing':
                    if (!packingFechaInicio) {
                        alert('La fecha de inicio es obligatoria');
                        setLoading(null);
                        return;
                    }
                    blob = await descargarReportePacking(packingFechaInicio, packingFechaFin);
                    break;
                case 'clientes':
                    blob = await descargarReporteClientes();
                    break;
                default:
                    throw new Error('Tipo de reporte desconocido');
            }

            // Crear enlace de descarga
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            link.download = `reporte_${tipo}_${timestamp}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

        } catch (error) {
            console.error('Error al descargar reporte:', error);
            alert('Error al generar el reporte. Intenta nuevamente.');
        } finally {
            setLoading(null);
        }
    };

    const hasAccess = (permission) => {
        return isAdmin() || hasPermission('reportes', permission);
    };

    const ReportRow = ({ tipo, icon: Icon, nombre, color, needsDates, permission, fechaInicio, fechaFin, onFechaInicioChange, onFechaFinChange }) => {
        const hasAccessToReport = hasAccess(permission);

        return (
            <div className={`flex items-center gap-3 p-3 rounded-lg border ${hasAccessToReport ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200 opacity-50'
                }`}>
                {/* Icono y nombre */}
                <div className="flex items-center gap-2 min-w-[100px]">
                    <div className={`w-8 h-8 rounded-lg bg-${color}-100 flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 text-${color}-600`} strokeWidth={2.5} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">{nombre}</span>
                </div>

                {/* Filtros de fecha o espacio */}
                <div className="flex-1 flex items-center gap-2">
                    {needsDates && hasAccessToReport ? (
                        <>
                            <input
                                type="date"
                                value={fechaInicio}
                                onChange={(e) => onFechaInicioChange(e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Inicio"
                            />
                            <span className="text-xs text-gray-400">→</span>
                            <input
                                type="date"
                                value={fechaFin}
                                onChange={(e) => onFechaFinChange(e.target.value)}
                                className="px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Fin"
                            />
                        </>
                    ) : !hasAccessToReport ? (
                        <span className="text-xs text-gray-400 italic">Sin permisos</span>
                    ) : (
                        <span className="text-xs text-gray-500">Todos los registros</span>
                    )}
                </div>

                {/* Botón de descarga - Solo icono */}
                <button
                    onClick={() => handleDownload(tipo)}
                    disabled={loading !== null || !hasAccessToReport}
                    title={loading === tipo ? 'Descargando...' : 'Descargar reporte'}
                    className={`p-2 rounded-lg transition-all ${loading === tipo
                            ? 'bg-gray-400 text-white cursor-not-allowed'
                            : !hasAccessToReport
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                : loading !== null
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : `bg-${color}-600 text-white hover:bg-${color}-700 hover:shadow-md active:scale-95`
                        }`}
                >
                    {loading === tipo ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <Download className="w-4 h-4" />
                    )}
                </button>
            </div>
        );
    };

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            {/* Header compacto */}
            <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-gray-600" />
                <h3 className="text-sm font-semibold text-gray-900">Reportes</h3>
            </div>

            {/* Lista de reportes */}
            <div className="space-y-2">
                <ReportRow
                    tipo="subastas"
                    icon={FileText}
                    nombre="Subastas"
                    color="blue"
                    needsDates={true}
                    permission="generate_auctions"
                    fechaInicio={subastasFechaInicio}
                    fechaFin={subastasFechaFin}
                    onFechaInicioChange={setSubastasFechaInicio}
                    onFechaFinChange={setSubastasFechaFin}
                />

                <ReportRow
                    tipo="packing"
                    icon={Package}
                    nombre="Packing"
                    color="orange"
                    needsDates={true}
                    permission="generate_packings"
                    fechaInicio={packingFechaInicio}
                    fechaFin={packingFechaFin}
                    onFechaInicioChange={setPackingFechaInicio}
                    onFechaFinChange={setPackingFechaFin}
                />

                <ReportRow
                    tipo="clientes"
                    icon={Users}
                    nombre="Clientes"
                    color="green"
                    needsDates={false}
                    permission="generate_clients"
                />
            </div>
        </div>
    );
};

export default ReportsQuickWidget;
