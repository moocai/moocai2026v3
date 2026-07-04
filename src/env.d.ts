declare module "*.css";
declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.svg";
declare module "*.png";
declare module "*.jpg";
declare module "*.webp";