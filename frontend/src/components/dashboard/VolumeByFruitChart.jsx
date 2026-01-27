/**
 * VolumeByFruitChart - Gráfico de barras horizontales con volumen por tipo de fruta.
 */

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const VolumeByFruitChart = ({ data, loading = false }) => {
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

    // Formatear kg a toneladas si es mayor a 1000
    const formatKg = (kg) => {
        if (kg >= 1000) {
            return `${(kg / 1000).toFixed(1)} t`;
        }
        return `${kg.toFixed(0)} kg`;
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{payload[0].payload.tipo_fruta}</p>
                    <p className="text-sm" style={{ color: payload[0].payload.color }}>
                        Volumen: <span className="font-semibold">{formatKg(payload[0].value)}</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                    type="number"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    tickFormatter={formatKg}
                />
                <YAxis
                    type="category"
                    dataKey="tipo_fruta"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    width={90}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                    dataKey="kg_total"
                    radius={[0, 8, 8, 0]}
                    animationDuration={1000}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

export default VolumeByFruitChart;
