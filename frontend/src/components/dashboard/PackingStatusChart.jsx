/**
 * PackingStatusChart - Gráfico de dona con distribución de estados de packing.
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const PackingStatusChart = ({ data, loading = false }) => {
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

    // Colores semánticos para cada estado
    const COLORS = {
        'PROYECTADO': '#60a5fa',    // Azul claro
        'EN_SUBASTA': '#fbbf24',    // Amarillo
        'FINALIZADO': '#34d399',    // Verde
        'ANULADO': '#f87171',       // Rojo
    };

    // Mapear colores
    const dataWithColors = data.map(item => ({
        ...item,
        color: COLORS[item.estado] || '#6b7280'
    }));

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white px-4 py-2 rounded-lg shadow-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{payload[0].payload.estado}</p>
                    <p className="text-sm text-gray-600">
                        Cantidad: <span className="font-semibold">{payload[0].payload.cantidad}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                        Porcentaje: <span className="font-semibold">{payload[0].payload.porcentaje}%</span>
                    </p>
                </div>
            );
        }
        return null;
    };

    const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="white"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-xs font-semibold"
            >
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={dataWithColors}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={CustomLabel}
                    outerRadius={100}
                    innerRadius={60}
                    fill="#8884d8"
                    dataKey="cantidad"
                    animationDuration={1000}
                >
                    {dataWithColors.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry) => (
                        <span className="text-sm text-gray-700">
                            {entry.payload.estado} ({entry.payload.porcentaje}%)
                        </span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};

export default PackingStatusChart;
