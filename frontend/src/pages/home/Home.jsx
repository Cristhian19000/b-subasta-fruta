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

// Componentes del Dashboard


import RecentAuctionsTable from '../../components/dashboard/RecentAuctionsTable';
import TopClientsTable from '../../components/dashboard/TopClientsTable';
import StatusDonutWidget from '../../components/dashboard/StatusDonutWidget';

const Home = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Estados para los datos necesarios
    const [resumen, setResumen] = useState(null);
    const [subastasRecientes, setSubastasRecientes] = useState([]);
    const [topClientes, setTopClientes] = useState([]);

    const fetchDashboardData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Llamadas paralelas solo para lo que mostramos
            const [
                resResumen,
                resRecientes,
                resTop
            ] = await Promise.all([
                axios.get(`/subastas/dashboard/resumen/`),
                axios.get(`/subastas/dashboard/subastas-recientes/`),
                axios.get(`/subastas/dashboard/top-clientes/?periodo=año`) // Por defecto año para el top
            ]);

            setResumen(resResumen.data);
            setSubastasRecientes(resRecientes.data);
            setTopClientes(resTop.data);

        } catch (err) {
            console.error('Error cargando dashboard:', err);
            setError('No se pudo cargar la información del dashboard. Por favor, intente más tarde.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDashboardData();

        // Auto-refresh cada 30 segundos
        const timer = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(timer);
    }, [fetchDashboardData]);



    return (
        <div className="p-4 space-y-4 bg-gray-50 min-h-screen">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-3 rounded shadow-sm">
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Resumen de Estados (Métricas Simples) */}
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

            {/* Tablas - Grid Lado a Lado (Preferencia del usuario + Compacto para evitar scroll) */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-4">
                <RecentAuctionsTable data={subastasRecientes} loading={loading} />
                <TopClientsTable data={topClientes} loading={loading} />
            </div>
        </div>
    );
};

export default Home;
