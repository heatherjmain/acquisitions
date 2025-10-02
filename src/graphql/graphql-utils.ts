export const mapField = <T extends Record<string, any>>(
  row: T | undefined,
  field: keyof T,
  isNumber: boolean = false,
) => {
  const value = row?.[field];
  if (isNumber) {
    return value != null ? Number(value) : null;
  }
  return value != null ? value : null;
};
