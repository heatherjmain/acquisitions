interface BuildAcquisitionsQueryArgs {
  conditions?: string[] | undefined;
  sort_by?: string | undefined;
  sort_order?: string;
  paramIndex: number;
}

interface BuildMetaQueryArgs {
  baseCondition?: string | undefined;
}

export const buildAcquisitionsTableQuery = (): string =>
  `
        CREATE TABLE IF NOT EXISTS acquisitions (
          id BIGINT PRIMARY KEY,
          acquisition_id BIGINT NOT NULL,
          acquiring_object_id TEXT,
          acquired_object_id TEXT,
          term_code TEXT,
          price_amount NUMERIC,
          price_currency_code TEXT,
          acquired_at DATE,
          source_url TEXT,
          source_description TEXT,
          created_at TIMESTAMP,
          updated_at TIMESTAMP
        )
      `;

export const buildCompaniesTableQuery = (): string =>
  `
        CREATE TABLE IF NOT EXISTS companies (
          id TEXT PRIMARY KEY,
          entity_id BIGINT,
          name TEXT NOT NULL,
          category_code TEXT,
          status TEXT,
          country_code TEXT,
          created_at TIMESTAMP,
          updated_at TIMESTAMP
        )
      `;

export const buildIndexQueryArray = (): string[] => {
  const indexQueryPrefix = `CREATE INDEX IF NOT EXISTS`;

  const idxAcquisitionsAcquiredAtQuery = `${indexQueryPrefix} idx_acquisitions_acquired_at ON acquisitions(acquired_at);`;

  const idxAcquisitionsPriceAmountQuery = `${indexQueryPrefix} idx_acquisitions_price_amount ON acquisitions(price_amount);`;

  const idxAcquisitionsTermCodeQuery = `${indexQueryPrefix} idx_acquisitions_term_code ON acquisitions(term_code);`;

  const idxAcquisitionsCurrencyQuery = `${indexQueryPrefix} idx_acquisitions_currency ON acquisitions(price_currency_code);`;

  const idxAcquisitionsAcquiringObjectIdQuery = `${indexQueryPrefix} idx_acquisitions_acquiring_object_id ON acquisitions(acquiring_object_id);`;

  const idxAcquisitionsAcquiredObjectIdQuery = `${indexQueryPrefix} idx_acquisitions_acquired_object_id ON acquisitions(acquired_object_id);`;

  return [
    idxAcquisitionsAcquiredAtQuery,
    idxAcquisitionsPriceAmountQuery,
    idxAcquisitionsTermCodeQuery,
    idxAcquisitionsCurrencyQuery,
    idxAcquisitionsAcquiringObjectIdQuery,
    idxAcquisitionsAcquiredObjectIdQuery,
  ];
};

export const buildGetColumnQuery = (): string =>
  `SELECT column_name 
               FROM information_schema.columns 
               WHERE table_name = $1 
               ORDER BY ordinal_position`;

export const rowCountQuery = (tableName: string): string =>
  `SELECT COUNT(*) FROM "${tableName}"`;

export const insertQuery = (
  tableName: string,
  columns: string[],
  placeholders: string[],
) =>
  `INSERT INTO "${tableName}" (${columns.join(", ")}) VALUES ${placeholders.join(", ")} ON CONFLICT (id) DO NOTHING`;

export const buildAcquisitionsQuery = ({
  conditions = [],
  sort_by,
  sort_order,
  paramIndex,
}: BuildAcquisitionsQueryArgs): string => {
  let query = `
        SELECT 
          a.*, 
          acquired.id AS acquired_id, acquired.name AS acquired_name, acquired.category_code AS acquired_category, acquired.status AS acquired_status, acquired.country_code AS acquired_country,
          acquiring.id AS acquiring_id, acquiring.name AS acquiring_name, acquiring.category_code AS acquiring_category, acquiring.status AS acquiring_status, acquiring.country_code AS acquiring_country
        FROM acquisitions a
        LEFT JOIN companies acquired ON a.acquired_object_id = acquired.id
        LEFT JOIN companies acquiring ON a.acquiring_object_id = acquiring.id
      `;

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  let orderClause = "ORDER BY id";
  if (sort_by) {
    orderClause = `ORDER BY ${sort_by} ${sort_order}, id ASC`;
  }

  query += ` ${orderClause} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;

  return query;
};

export const buildAcquisitionQuery = (): string =>
  `
          SELECT 
            a.*, 
            acquired.id AS acquired_id, acquired.name AS acquired_name, acquired.category_code AS acquired_category, acquired.status AS acquired_status, acquired.country_code AS acquired_country,
            acquiring.id AS acquiring_id, acquiring.name AS acquiring_name, acquiring.category_code AS acquiring_category, acquiring.status AS acquiring_status, acquiring.country_code AS acquiring_country
          FROM acquisitions a
          LEFT JOIN companies acquired ON a.acquired_object_id = acquired.id
          LEFT JOIN companies acquiring ON a.acquiring_object_id = acquiring.id
          WHERE a.id = $1
        `;

export const buildMetaQuery = ({ baseCondition }: BuildMetaQueryArgs): string =>
  `SELECT COUNT(*) AS total, MIN(price_amount) AS min, MAX(price_amount) AS max, AVG(price_amount) AS avg, SUM(price_amount) AS sum, MIN(acquired_at) AS earliest_date, MAX(acquired_at) AS latest_date FROM acquisitions ${baseCondition} ${baseCondition ? " AND" : "WHERE"} price_amount IS NOT NULL`;

export const buildCurrencyMetaQuery = ({
  baseCondition,
}: BuildMetaQueryArgs): string =>
  `SELECT price_currency_code, COUNT(*) as count FROM acquisitions ${baseCondition} GROUP BY price_currency_code`;

export const buildCompanyMetaQuery = ({
  baseCondition,
}: BuildMetaQueryArgs): string =>
  `SELECT COUNT(DISTINCT acquiring_object_id) AS distinct_acquiring_companies, COUNT(DISTINCT acquired_object_id) AS distinct_acquired_companies FROM acquisitions ${baseCondition}`;
