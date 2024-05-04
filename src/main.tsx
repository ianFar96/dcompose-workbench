import { ConfirmProvider } from 'material-ui-confirm';
import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createBrowserRouter,
  redirect,
  RouterProvider,
} from 'react-router-dom';

import Scene from './pages/Scene';
import './styles.css';
import Scenes from './pages/Scenes';

const router = createBrowserRouter([{
  element: <Scenes />,
  path: '/',
}, {
  element: <Scenes />,
  path: '/scenes',
}, {
  element: <Scene />,
  path: 'scenes/:sceneName',
}]);

redirect('/scenes');

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ConfirmProvider defaultOptions={{
    cancellationButtonProps: { variant: 'outlined' },
    confirmationButtonProps: { variant: 'outlined' },
  }}>
    <RouterProvider router={router} />
  </ConfirmProvider>
);
