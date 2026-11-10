// Entrada da página de pedidos (/pedir/). Não importa nada do site: só dados e estilos próprios e a configuração compartilhada (src/siteConfig.js).
import React from 'react';
import { createRoot } from 'react-dom/client';
import OrderApp from './OrderApp.jsx';
import '../styles/fonts.css';
import '../styles/base.css';
import '../styles/order.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><OrderApp /></React.StrictMode>);
