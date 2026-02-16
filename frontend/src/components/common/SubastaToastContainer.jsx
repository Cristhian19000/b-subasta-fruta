/**
 * Componente de Toast para notificaciones en tiempo real.
 * 
 * Muestra notificaciones de subastas provenientes del contexto WebSocket.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSubastasContext } from '../../context/SubastasWSContext';

// Iconos simples en SVG
const CheckIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const XIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

const BellIcon = () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
);

const CloseIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);

/**
 * Toast individual
 */
const Toast = ({ notification, onClose }) => {
    const { tipo, titulo, mensaje, subasta } = notification;

    const bgColors = {
        success: 'bg-green-50 border-green-200',
        error: 'bg-red-50 border-red-200',
        warning: 'bg-yellow-50 border-yellow-200',
        info: 'bg-blue-50 border-blue-200',
    };

    const iconColors = {
        success: 'text-green-500',
        error: 'text-red-500',
        warning: 'text-yellow-500',
        info: 'text-blue-500',
    };

    const icons = {
        success: <CheckIcon />,
        error: <XIcon />,
        warning: <BellIcon />,
        info: <BellIcon />,
    };

    return (
        <div className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${bgColors[tipo]} animate-slide-in`}>
            <div className={`flex-shrink-0 ${iconColors[tipo]}`}>
                {icons[tipo]}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{titulo}</p>
                <p className="text-sm text-gray-600 mt-0.5">{mensaje}</p>
                {subasta && (
                    <p className="text-xs text-gray-500 mt-1">
                        {subasta.tipo_fruta?.nombre} · {subasta.empresa?.nombre}
                    </p>
                )}
            </div>
            <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
                <CloseIcon />
            </button>
        </div>
    );
};

/**
 * Contenedor de toasts con integración al contexto WebSocket
 */
const SubastaToastContainer = () => {
    const [notifications, setNotifications] = useState([]);
    
    // Obtener eventos del contexto
    const { 
        isConnected, 
        subastaCreada, 
        subastaActualizada,
        subastaCancelada,
        subastaEliminada,
        subastaIniciada, 
        subastaFinalizada 
    } = useSubastasContext();
    
    // Agregar notificación
    const addNotification = useCallback((notification) => {
        const id = Date.now() + Math.random();
        setNotifications(prev => [...prev, { ...notification, id }]);
        
        // Auto-remove después de 8 segundos
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id));
        }, 8000);
    }, []);

    // Remover notificación
    const removeNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    }, []);

    // Reaccionar a eventos del contexto
    useEffect(() => {
        if (subastaCreada) {
            addNotification({
                tipo: 'success',
                titulo: '🎉 Nueva Subasta',
                mensaje: subastaCreada.mensaje || 'Nueva subasta disponible',
                subasta: subastaCreada.subasta
            });
        }
    }, [subastaCreada, addNotification]);

    useEffect(() => {
        if (subastaActualizada) {
            const cambios = subastaActualizada.cambios || [];
            const cambiosTexto = cambios.length > 0 
                ? `Cambios: ${cambios.join(', ')}` 
                : 'Datos actualizados';
            addNotification({
                tipo: 'info',
                titulo: '✏️ Subasta Editada',
                mensaje: `La subasta #${subastaActualizada.subasta?.id} ha sido modificada. ${cambiosTexto}`,
                subasta: subastaActualizada.subasta
            });
        }
    }, [subastaActualizada, addNotification]);

    useEffect(() => {
        if (subastaCancelada) {
            addNotification({
                tipo: 'error',
                titulo: '❌ Subasta Cancelada',
                mensaje: `La subasta #${subastaCancelada.subasta?.id} ha sido cancelada`,
                subasta: subastaCancelada.subasta
            });
        }
    }, [subastaCancelada, addNotification]);

    useEffect(() => {
        if (subastaEliminada) {
            addNotification({
                tipo: 'error',
                titulo: '🗑️ Subasta Eliminada',
                mensaje: subastaEliminada.mensaje || `La subasta #${subastaEliminada.subastaId} ha sido eliminada`
            });
        }
    }, [subastaEliminada, addNotification]);

    useEffect(() => {
        if (subastaIniciada) {
            addNotification({
                tipo: 'info',
                titulo: '🚀 Subasta Iniciada',
                mensaje: `La subasta #${subastaIniciada.subasta?.id} está activa`,
                subasta: subastaIniciada.subasta
            });
        }
    }, [subastaIniciada, addNotification]);

    useEffect(() => {
        if (subastaFinalizada) {
            const { ganador, montoFinal } = subastaFinalizada;
            addNotification({
                tipo: 'warning',
                titulo: '🏆 Subasta Finalizada',
                mensaje: ganador 
                    ? `Ganador: ${ganador.nombre} - S/ ${montoFinal}`
                    : 'La subasta ha finalizado sin ofertas',
                subasta: subastaFinalizada.subasta
            });
        }
    }, [subastaFinalizada, addNotification]);

    return (
        <>
            {/* Indicador de conexión WebSocket */}
            <div className="fixed bottom-4 left-4 z-40">
                <div 
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm cursor-help
                        ${isConnected 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'}`}
                    title={isConnected 
                        ? 'Conexión en tiempo real activa. Recibirás notificaciones de subastas al instante.' 
                        : 'Sin conexión en tiempo real. Las notificaciones no llegarán hasta reconectarse.'}
                >
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {isConnected ? 'Conectado' : 'Desconectado'}
                </div>
            </div>

            {/* Contenedor de toasts */}
            <div className="fixed top-4 right-4 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {notifications.map(notification => (
                    <div key={notification.id} className="pointer-events-auto">
                        <Toast
                            notification={notification}
                            onClose={() => removeNotification(notification.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Estilos de animación */}
            <style>{`
                @keyframes slide-in {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                .animate-slide-in {
                    animation: slide-in 0.3s ease-out;
                }
            `}</style>
        </>
    );
};

export default SubastaToastContainer;
