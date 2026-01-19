/**
 * Componente Table - Tabla reutilizable.
 */

const Table = ({
    columns,
    data,
    loading = false,
    emptyMessage = 'No hay datos disponibles',
}) => {
    // Asegurar que data sea siempre un array
    const tableData = Array.isArray(data) ? data : (data?.results || []);
    
    if (loading) {
        return (
            <div className="text-center py-12 text-gray-500">
                Cargando...
            </div>
        );
    }

    if (!tableData || tableData.length === 0) {
        return (
            <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
                <p className="text-gray-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            {columns.map((column) => (
                                <th
                                    key={column.key}
                                    className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                                        column.align === 'right' ? 'text-right' : 
                                        column.align === 'center' ? 'text-center' : 'text-left'
                                    }`}
                                >
                                    {column.title}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {tableData.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="hover:bg-gray-50">
                                {columns.map((column) => (
                                    <td
                                        key={column.key}
                                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                                            column.align === 'right' ? 'text-right' : 
                                            column.align === 'center' ? 'text-center' : 'text-left'
                                        }`}
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
