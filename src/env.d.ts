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
