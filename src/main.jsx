// Entrada do site (landing page). O cardápio de pedidos é outra página, com entrada própria em src/order/main.jsx.
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/fonts.css';
import './styles/base.css';
import './styles/site.css';

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
