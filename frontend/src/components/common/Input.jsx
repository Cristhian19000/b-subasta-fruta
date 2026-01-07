/**
 * Componente Input - Campo de entrada reutilizable.
 */

const Input = ({
    label,
    name,
    type = 'text',
    value,
    onChange,
    placeholder,
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
            <input
                id={name}
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                disabled={disabled}
                className={`
                    w-full px-3 py-2 border rounded-md text-sm
                    focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900
                    disabled:bg-gray-100 disabled:cursor-not-allowed
                    ${error ? 'border-red-300' : 'border-gray-300'}
                `}
                {...props}
            />
            {error && (
                <p className="mt-1 text-xs text-red-600">{error}</p>
            )}
        </div>
    );
};

export default Input;
