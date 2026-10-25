const actions: Record<string,string> = {
  "article.created":"Artículo creado", "article.updated":"Artículo actualizado", "article.edited_and_unpublished":"Artículo editado y retirado", "article.review":"Revisión aprobada", "article.publish":"Artículo publicado", "article.unpublish":"Artículo despublicado",
  "auth.login": "Inicio de sesión", "auth.logout": "Cierre de sesión", "auth.owner_initialized": "Propietario inicializado", "auth.password_changed": "Contraseña actualizada",
  "content.created": "Contenido creado", "content.updated": "Contenido actualizado", "content.deleted": "Contenido eliminado", "settings.updated": "Configuración actualizada",
};
const entities: Record<string,string> = { User: "Usuario", Article:"Artículo", tools: "Herramientas", "use-cases": "Casos de uso", categories: "Categorías", tags: "Etiquetas", SiteSetting: "Configuración" };
export const auditActionLabel = (action: string) => actions[action] ?? "Operación registrada";
export const auditEntityLabel = (entity: string) => entities[entity] ?? "Registro";
