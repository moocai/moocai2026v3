declare module "*.css";
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.webp";

declare module "*?worker" {
  const workerConstructor: {
    new (options?: { name?: string }): Worker;
  };
  export default workerConstructor;
}
/** Carpeta (relativa a la base de l'app) on es serveixen els fitxers de Pyodide. Vegeu vite.config.ts. */
declare const __PYODIDE_DIR__: string;
/** Mida en bytes dels fitxers de Pyodide que es descarreguen en carregar-lo (per al progrés). */
declare const __PYODIDE_SIZES__: Record<string, number>;
/**
 * Paquets de Python: `hosted` (nom de l'`import` → paquet) se serveixen i es carreguen quan
 * el programa els importa; `unavailable` són mòduls de la distribució de Pyodide que no se
 * serveixen. Vegeu vite.config.ts.
 */
declare const __PYTHON_PACKAGES__: { hosted: Record<string, string>; unavailable: string[] };
