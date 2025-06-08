import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import BreadList from './components/BreadList';
import DoughRecipeList from './components/DoughRecipeList';
import FillingRecipeList from './components/FillingRecipeList';
import BreadDetails from './components/BreadDetails';
import Navbar from './components/Navbar';
import IngredientList from './components/IngredientList';
import RawMaterialCalculator from './components/RawMaterialCalculator';
import InventoryCheckPage from './components/InventoryCheckPage';
import OperationGuidePage from './components/OperationGuidePage';
import ProductionWastePage from './components/ProductionWastePage';
import DailyReportPreviewPage from './components/DailyReportPreviewPage';
import DashboardPage from './components/DashboardPage';
import { DataProvider } from "./components/DataContext.jsx";
import BreadTypeEditor from './components/BreadTypeEditor';
import { SnackbarProvider } from './components/SnackbarProvider.jsx';

// Lazy load components
const IngredientsPage = lazy(() => import('./components/IngredientsPage'));
const ReceiveStock = lazy(() => import('./components/ReceiveStock'));

// 创建主题
const theme = createTheme({
  palette: {
    primary: {
      main: '#8B4513', // 棕色作为主色调，适合面包应用
    },
    secondary: {
      main: '#F5DEB3', // 小麦色作为辅助色
    },
    neutral: {
      main: '#F5F5DC', // 米色作为中性色
    }
  },
  typography: {
    fontFamily: [
      'Inter',
      'sans-serif',
    ].join(','),
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <DataProvider>
          <SnackbarProvider>
          <div className="min-h-screen bg-neutral-100">
            <Navbar />
            <main className="container mx-auto px-4 py-6">
              <Suspense fallback={
                <div className="flex justify-center items-center h-[80vh]">
                  <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-primary"></div>
                </div>
              }>
                <Routes>
                  <Route path="/" element={<Navigate replace to="/dashboard" />} />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/breads" element={<BreadList />} />
                  <Route path="/dough-recipes" element={<DoughRecipeList />} />
                  <Route path="/filling-recipes" element={<FillingRecipeList />} />
                  <Route path="/breads/:id" element={<BreadDetails />} />
                  <Route path="/ingredients" element={<IngredientsPage />} />
                  <Route path="/raw-material-calculator" element={<RawMaterialCalculator />} />
                  <Route path="/inventory-check" element={<InventoryCheckPage />} />
                  <Route path="/manage-ingredients" element={<IngredientList />} />
                  <Route path="/operation-guide" element={<OperationGuidePage />} />
                  <Route path="/production-waste-report" element={<ProductionWastePage />} />
                  <Route path="/daily-report-preview" element={<DailyReportPreviewPage />} />
                  <Route path="/receiving" element={<ReceiveStock />} />
                    <Route path="/bread-type-editor" element={<BreadTypeEditor />} />
                    <Route path="/bread-type-editor/:id" element={<BreadTypeEditor />} />
                </Routes>
              </Suspense>
            </main>
          </div>
          </SnackbarProvider>
        </DataProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App; 