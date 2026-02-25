/**
 * Componente Layout - Estructura principal de la aplicación.
 * 
 * Envuelve las páginas con Sidebar y Header.
 * Incluye soporte responsivo completo para móviles y tablets.
 */

import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import SubastaToastContainer from '../common/SubastaToastContainer';
import { SubastasWSProvider } from '../../context/SubastasWSContext';

const Layout = () => {
    // Estado para controlar el sidebar en móviles
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();

    // Cerrar sidebar al cambiar de ruta (en móviles)
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    // Cerrar sidebar al redimensionar a desktop
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setSidebarOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Prevenir scroll del body cuando el sidebar está abierto en móviles
    useEffect(() => {
        if (sidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [sidebarOpen]);

    return (
        <SubastasWSProvider>
            <div className="min-h-screen bg-gray-50">
                {/* Overlay para móviles cuando el sidebar está abierto */}
                {sidebarOpen && (
                    <div 
                        className="fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity"
                        onClick={() => setSidebarOpen(false)}
                        aria-hidden="true"
                    />
                )}

                {/* Sidebar */}
                <Sidebar 
                    isOpen={sidebarOpen} 
                    onClose={() => setSidebarOpen(false)} 
                />

                {/* Header */}
                <Header onMenuClick={() => setSidebarOpen(true)} />

                {/* Notificaciones en tiempo real */}
                <SubastaToastContainer />

                {/* Contenido principal */}
                <main className="lg:ml-64 pt-16 min-h-screen">
                    <div className="p-4 sm:p-6">
                        <Outlet />
                    </div>
                </main>
            </div>
        </SubastasWSProvider>
    );
};

export default Layout;
