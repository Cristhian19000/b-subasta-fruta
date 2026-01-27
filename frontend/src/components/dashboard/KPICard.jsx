/**
 * KPICard - Tarjeta para mostrar indicadores clave de rendimiento (KPIs).
 */

const KPICard = ({ title, value, description, icon, loading = false, trend = null }) => {
    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-24 mb-3"></div>
                        <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-32"></div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500 mb-1">
                        {title}
                    </p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-light text-gray-900">
                            {value}
                        </p>
                        {trend && (
                            <span className={`text-xs font-medium ${trend.direction === 'up'
                                    ? 'text-green-600'
                                    : trend.direction === 'down'
                                        ? 'text-red-600'
                                        : 'text-gray-500'
                                }`}>
                                {trend.direction === 'up' && '↑'}
                                {trend.direction === 'down' && '↓'}
                                {trend.value}
                            </span>
                        )}
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                        {description}
                    </p>
                </div>
                <div className="ml-4">
                    {icon}
                </div>
            </div>
        </div>
    );
};

export default KPICard;
