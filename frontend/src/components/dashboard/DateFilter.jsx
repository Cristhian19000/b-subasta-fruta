/**
 * DateFilter - Selector de período para filtrar datos del dashboard.
 */

const DateFilter = ({ value, onChange }) => {
    const periods = [
        { id: 'semana', label: 'Semana' },
        { id: 'mes', label: 'Mes' },
        { id: 'año', label: 'Año' },
    ];

    return (
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
            {periods.map((period) => (
                <button
                    key={period.id}
                    onClick={() => onChange(period.id)}
                    className={`
                        px-4 py-2 text-sm font-medium rounded-md
                        transition-all duration-200
                        ${value === period.id
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                    `}
                >
                    {period.label}
                </button>
            ))}
        </div>
    );
};

export default DateFilter;
