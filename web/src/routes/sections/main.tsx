import { lazy, Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';

import { MainLayout } from 'src/layouts/main';

import { SplashScreen } from 'src/components/loading-screen';

// Product
const ProductListPage = lazy(() => import('src/pages/product/list'));
const ProductDetailsPage = lazy(() => import('src/pages/product/details'));
const ProductCheckoutPage = lazy(() => import('src/pages/product/checkout'));
// Error
const Page500 = lazy(() => import('src/pages/error/500'));
const Page403 = lazy(() => import('src/pages/error/403'));
const Page404 = lazy(() => import('src/pages/error/404'));

export const mainRoutes = [
  {
    element: (
      <Suspense fallback={<SplashScreen />}>
        <Outlet />
      </Suspense>
    ),
    children: [
      {
        element: (
          <MainLayout>
            <Outlet />
          </MainLayout>
        ),
        children: [
          // The shop is the front door: landing on a redirect said nothing about
          // what this project does.
          { path: '/', element: <ProductListPage />, index: true },
          {
            path: 'product',
            children: [
              { element: <Navigate to="/" replace />, index: true },
              { path: 'list', element: <Navigate to="/" replace /> },
              { path: ':id', element: <ProductDetailsPage /> },
              { path: 'checkout', element: <ProductCheckoutPage /> },
            ],
          },
        ],
      },
      { path: '500', element: <Page500 /> },
      { path: '404', element: <Page404 /> },
      { path: '403', element: <Page403 /> },
    ],
  },
];
