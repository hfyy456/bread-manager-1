import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import BreadList from './components/BreadList';
import DoughRecipeList from './components/DoughRecipeList';
import FillingRecipeList from './components/FillingRecipeList';
import BreadDetails from './components/BreadDetails';
import Navbar from './components/Navbar';
import IngredientList from './components/IngredientList';

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
        <div className="min-h-screen bg-neutral-100">
          <Navbar />
          <main className="container mx-auto px-4 py-6">
            <Routes>
              <Route path="/" element={<BreadList />} />
              <Route path="/dough-recipes" element={<DoughRecipeList />} />
              <Route path="/filling-recipes" element={<FillingRecipeList />} />
              <Route path="/breads/:id" element={<BreadDetails />} />
              <Route path="/ingredients" element={<IngredientList />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
  