import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Auth_Provider } from './Auth_Context';
import './index.css';
import './user_app.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth_Provider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </Auth_Provider>
  </React.StrictMode>
);


