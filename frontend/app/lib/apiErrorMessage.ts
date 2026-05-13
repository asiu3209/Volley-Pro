export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string") return error;
  if (Array.isArray(error)) {
    return error
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String(item.msg);
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }
  if (error && typeof error === "object" && "msg" in error) {
    return String(error.msg);
  }
  return fallback;
}
