import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme] = useState("light");

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("light-theme");
    root.classList.remove("dark-theme");
    localStorage.setItem("theme", "light");
  }, []);

  const toggleTheme = () => {}; // Theme toggle disabled — light only

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);