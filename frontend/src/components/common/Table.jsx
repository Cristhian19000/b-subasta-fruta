/**
 * Componente Table - Tabla reutilizable y responsiva.
 */

const Table = ({
    columns,
    data,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
    compact = false,
}) => {
    // Asegurar que data sea siempre un array
    const tableData = Array.isArray(data) ? data : (data?.results || []);

    if (loading) {
        return (
            <div className="text-center py-8 sm:py-12 text-gray-500">
                <svg className="animate-spin h-6 w-6 mx-auto mb-2 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm">Cargando...</span>
            </div>
        );
    }

    if (!tableData || tableData.length === 0) {
        return (
            <div className="text-center py-8 sm:py-12 bg-white border border-gray-200 rounded-lg">
                <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-500 text-sm sm:text-base">{emptyMessage}</p>
            </div>
        );
    }

    // Clases condicionales para modo compacto
    const cellPadding = compact 
        ? 'px-2 py-2 sm:px-3 sm:py-2.5' 
        : 'px-3 py-2.5 sm:px-4 sm:py-3';
    const headerPadding = compact 
        ? 'px-2 py-2 sm:px-3 sm:py-2.5' 
        : 'px-3 py-2.5 sm:px-4 sm:py-3';

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {/* Contenedor scrollable con scrollbar estilizado */}
            <div className="overflow-x-auto scrollbar-thin">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`${headerPadding} text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                                        column.align === 'right' ? 'text-right' :
                                        column.align === 'center' ? 'text-center' : 'text-left'
                                    } ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                                    ${column.className || ''}`}
                                >
                                    {column.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="hover:bg-gray-50 transition-colors">
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`${cellPadding} text-sm ${
                                            column.nowrap !== false ? 'whitespace-nowrap' : 'whitespace-normal'
                                        } ${
                                            column.align === 'right' ? 'text-right' :
                                            column.align === 'center' ? 'text-center' : 'text-left'
                                        } ${column.hideOnMobile ? 'hidden sm:table-cell' : ''}
                                        ${column.cellClassName || ''}`}
                                    >
                                        {column.render
                                            ? column.render(row[column.key], row)
                                            : row[column.key]
                                        }
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default Table;
