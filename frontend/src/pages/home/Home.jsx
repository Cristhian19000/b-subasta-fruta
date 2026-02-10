/**
 * Página de Inicio - Dashboard ejecutivo con métricas y gráficos.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Users,
    ClipboardList
} from 'lucide-react';
import axios from '../../api/axios';
import { usePermissions } from '../../hooks/usePermissions';

// Componentes del Dashboard


import RecentAuctionsTable from '../../components/dashboard/RecentAuctionsTable';
import TopClientsTable from '../../components/dashboard/TopClientsTable';
import StatusDonutWidget from '../../components/dashboard/StatusDonutWidget';
import ReportsQuickWidget from '../../components/dashboard/ReportsQuickWidget';

const Home = () => {
    const { hasPermission, isAdmin } = usePermissions();

    // Verificar permisos
    const canViewSummary = isAdmin() || hasPermission('dashboard', 'view_summary');
    const canViewTables = isAdmin() || hasPermission('dashboard', 'view_tables');
    const canViewReports = isAdmin() || hasPermission('dashboard', 'view_reports');

    const [loading, setLoading] = useState(true);
    const [topLoading, setTopLoading] = useState(false);
    const [error, setError] = useState(null);

    // Estados para los datos necesarios
    const [periodo, setPeriodo] = useState('1m');
    const [resumen, setResumen] = useState(null);
    const [subastasRecientes, setSubastasRecientes] = useState([]);
    const [topClientes, setTopClientes] = useState([]);

    // 1. Cargar datos globales (Solo si tiene permisos)
    const fetchGlobalData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const requests = [];

            // Solo hacer la llamada a resumen si tiene el permiso
            if (canViewSummary) {
                requests.push(axios.get(`/subastas/dashboard/resumen/`));
            }

            // Solo hacer la llamada a subastas-recientes si tiene el permiso
            if (canViewTables) {
                requests.push(axios.get(`/subastas/dashboard/subastas-recientes/`));
            }

            // Si no tiene ningún permiso, no hacer llamadas
            if (requests.length === 0) {
                setLoading(false);
                return;
            }

            const responses = await Promise.all(requests);

            // Procesar respuestas según qué llamadas se hicieron
            let resIndex = 0;
            if (canViewSummary) {
                setResumen(responses[resIndex].data);
                resIndex++;
            }
            if (canViewTables) {
                setSubastasRecientes(responses[resIndex].data);
            }

            setError(null);
        } catch (err) {
            console.error('Error cargando datos globales:', err);
            setError('Error al cargar métricas generales.');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [canViewSummary, canViewTables]);

    // 2. Cargar Ranking (Solo si tiene permiso)
    const fetchTopData = useCallback(async (showLoading = true) => {
        // No hacer la llamada si no tiene permiso
        if (!canViewTables) {
            setTopLoading(false);
            return;
        }

        if (showLoading) setTopLoading(true);
        try {
            const resTop = await axios.get(`/subastas/dashboard/top-clientes/`, { params: { periodo } });
            setTopClientes(resTop.data);
        } catch (err) {
            console.error('Error cargando top clientes:', err);
        } finally {
            if (showLoading) setTopLoading(false);
        }
    }, [periodo, canViewTables]);

    // Efecto 1: Datos Globales (Solo al montar y por intervalo)
    useEffect(() => {
        fetchGlobalData(true);
        const timer = setInterval(() => fetchGlobalData(false), 60000);
        return () => clearInterval(timer);
    }, [fetchGlobalData]);

    // Efecto 2: Datos del Top (Dependen del periodo)
    useEffect(() => {
        fetchTopData(true);
        const timer = setInterval(() => fetchTopData(false), 60000);
        return () => clearInterval(timer);
    }, [fetchTopData]);



    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
                </div>

                {/* Filtro de Tiempo REMOVIDO de aquí y movido a Top Clientes */}
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded shadow-sm">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Resumen de Estados (Métricas Simples) */}
            {canViewSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatusDonutWidget
                        title="Estados de Subastas"
                        data={resumen?.subastas}
                        loading={loading}
                        colorScheme="blue"
                        icon={<ClipboardList size={16} />}
                    />
                    <StatusDonutWidget
                        title="Estados de Packings"
                        data={resumen?.packings}
                        loading={loading}
                        colorScheme="green"
                        icon={<Box size={16} />}
                    />
                    <StatusDonutWidget
                        title="Resumen de Clientes"
                        data={resumen?.clientes}
                        loading={loading}
                        colorScheme="purple"
                        icon={<Users size={16} />}
                    />
                </div>
            )}

            {/* Tablas - Grid Lado a Lado */}
            {canViewTables && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                    <RecentAuctionsTable data={subastasRecientes} loading={loading} />
                    <TopClientsTable
                        data={topClientes}
                        loading={topLoading || loading}
                        periodo={periodo}
                        onPeriodChange={setPeriodo}
                    />
                </div>
            )}

            {/* Widget de Reportes Rápidos */}
            {canViewReports && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <ReportsQuickWidget />
                </div>
            )}

            {/* Mensaje si no tiene ningún permiso */}
            {!canViewSummary && !canViewTables && !canViewReports && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
                    <p className="text-yellow-700">
                        No tienes permisos para ver contenido del dashboard.
                        Contacta al administrador para solicitar acceso.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Home;
