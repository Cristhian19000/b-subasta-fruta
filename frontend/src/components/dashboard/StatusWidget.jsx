/**
 * StatusWidget - Un componente simple para mostrar una lista de estados y sus conteos.
 */

const StatusWidget = ({ title, data, loading = false, colorScheme = 'blue', icon }) => {
    if (loading) {
        return (
            <div className="bg-white p-6 rounded-lg border border-gray-200 animate-pulse">
                <div className="flex justify-between mb-4">
                    <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-6 w-6 bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="flex justify-between items-center">
                            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                            <div className="h-5 bg-gray-100 rounded w-10"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const schemes = {
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-700',
            badge: 'bg-blue-100 text-blue-800'
        },
        green: {
            bg: 'bg-green-50',
            text: 'text-green-700',
            badge: 'bg-green-100 text-green-800'
        },
        purple: {
            bg: 'bg-purple-50',
            text: 'text-purple-700',
            badge: 'bg-purple-100 text-purple-800'
        }
    };

    const s = schemes[colorScheme] || schemes.blue;

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    {title}
                </h3>
                <div className={`${s.text} opacity-70`}>
                    {icon}
                </div>
            </div>
            <div className="space-y-3">
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-center group">
                        <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors">
                            {key.charAt(0) + key.slice(1).toLowerCase().replace('_', ' ')}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${value > 0 ? s.badge : 'bg-gray-100 text-gray-400'
                            }`}>
                            {value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default StatusWidget;
