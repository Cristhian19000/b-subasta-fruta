/**
 * RevenueChart - Gráfico de área con ingresos por período.
 */

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const RevenueChart = ({ data, loading = false, periodo = 'mes' }) => {
    if (loading) {
        return (
            <div className="w-full h-64 bg-gray-100 rounded-lg animate-pulse flex items-center justify-center">
                <p className="text-gray-400">Cargando datos...</p>
            </div>
        );
    }

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-64 bg-gray-50 rounded-lg flex items-center justify-center border border-gray-200">
                <p className="text-gray-400">No hay datos disponibles</p>
            </div>
        );
    }

    const formatCurrency = (value) => {
        return `S/ ${value.toLocaleString('es-PE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatDate = (dateStr) => {
        try {
            const date = new Date(dateStr + 'T00:00:00'); // Forzar hora local
            if (periodo === 'año') {
                return date.toLocaleDateString('es-PE', { month: 'short', year: 'numeric' });
            }
            return date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' });
        } catch (e) {
            return dateStr;
        }
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{formatDate(payload[0].payload.periodo)}</p>
                    <p className="text-sm text-green-600">
                        Ingresos: <span className="font-semibold">{formatCurrency(payload[0].value)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="periodo"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={formatDate}
                />
                <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={formatCurrency}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                    type="monotone"
                    dataKey="ingresos"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorIngresos)"
                    animationDuration={1000}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
};

export default RevenueChart;
