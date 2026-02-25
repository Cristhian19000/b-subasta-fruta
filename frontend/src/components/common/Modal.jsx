/**
 * Componente Modal - Modal reutilizable y responsivo.
 */

import { useEffect } from 'react';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    size = 'md',
    showFooter = false,
    footer,
    fullScreenOnMobile = false,
}) => {
    // Prevenir scroll del body cuando el modal está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Cerrar con tecla Escape
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const sizes = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
        full: 'max-w-6xl',
    };

    // Clases para fullscreen en móviles
    const mobileClasses = fullScreenOnMobile 
        ? 'sm:rounded-lg sm:m-4 sm:max-h-[90vh] rounded-none m-0 max-h-full h-full sm:h-auto' 
        : 'rounded-lg m-2 sm:m-4 max-h-[95vh] sm:max-h-[90vh]';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            {/* Overlay */}
            <div 
                className="fixed inset-0 bg-black/50 transition-opacity cursor-pointer"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div className="flex min-h-full items-center justify-center p-0 sm:p-4">
                <div 
                    className={`relative bg-white shadow-xl ${sizes[size]} w-full ${mobileClasses} overflow-hidden flex flex-col`}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex-shrink-0">
                        <h2 id="modal-title" className="text-base sm:text-lg font-medium text-gray-900 truncate pr-4">
                            {title}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors cursor-pointer flex-shrink-0"
                            aria-label="Cerrar modal"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content - scrollable */}
                    <div className="px-4 sm:px-6 py-4 overflow-y-auto flex-grow scrollbar-thin">
                        {children}
                    </div>

                    {/* Footer */}
                    {showFooter && footer && (
                        <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50">
                            {footer}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Modal;
