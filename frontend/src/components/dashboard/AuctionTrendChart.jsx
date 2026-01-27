/**
 * AuctionTrendChart - Gráfico de línea con tendencia de subastas.
 */

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AuctionTrendChart = ({ data, loading = false, periodo = 'mes' }) => {
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
                    <p className="text-sm font-medium text-gray-900">{formatDate(payload[0].payload.fecha)}</p>
                    <p className="text-sm text-blue-600">
                        Subastas: <span className="font-semibold">{payload[0].value}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorSubastas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    dataKey="fecha"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={formatDate}
                />
                <YAxis
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                    type="monotone"
                    dataKey="cantidad"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                    animationDuration={1000}
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default AuctionTrendChart;
