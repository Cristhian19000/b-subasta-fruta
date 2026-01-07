/**
 * Componente Select - Campo de selección reutilizable.
 */

const Select = ({
    label,
    name,
    value,
    onChange,
    options = [],
    required = false,
    disabled = false,
    error,
    className = '',
    ...props
}) => {
    return (
        <div className={className}>
            {label && (
                <label 
                    htmlFor={name} 
                    className="block text-sm font-medium text-gray-700 mb-1"
                >
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}
            <select
                id={name}
                name={name}
                value={value}
                onChange={onChange}
                required={required}
                disabled={disabled}
                className={`
                    w-full px-3 py-2 border rounded-md text-sm cursor-pointer
                    focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error ? 'border-red-300' : 'border-gray-300'}
                `}
                {...props}
            >
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
};

export default Select;
