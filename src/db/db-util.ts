import fs from "fs";
import { parse } from "csv-parse";
import { Pool, QueryResult, QueryResultRow } from "pg";
import { join } from "path";
import { CsvRecord, SeedConfig } from "./db-types";
import {
  buildGetColumnQuery,
  insertQuery,
  rowCountQuery,
} from "./query-builders";

export const runDbQuery = async <T extends QueryResultRow = QueryResultRow>(
  dbClient: Pool,
  sql: string,
  params?: (string | number | boolean | null | undefined | Date | Buffer)[],
): Promise<QueryResult<T>> => {
  const isExplainableQuery = sql.trim().toUpperCase().startsWith("SELECT");

  if (process.env.DEBUG_SQL === "1" && isExplainableQuery) {
    console.debug("🐛 Running DB query in debug mode");
    const explain = params
      ? await dbClient.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`, params)
      : await dbClient.query(`EXPLAIN (ANALYZE, FORMAT JSON) ${sql}`);
    console.debug(
      "🐛 Query plan info: ",
      JSON.stringify(explain.rows[0]["QUERY PLAN"][0], null, 2),
    );
  }
  return params ? dbClient.query<T>(sql, params) : dbClient.query<T>(sql);
};

export const getColumnNames = async (client: Pool, tableName: string) => {
  let columnNames;
  try {
    console.info(`ℹ️ Collecting column names for ${tableName} table`);
    columnNames = (await runDbQuery(client, buildGetColumnQuery(), [tableName]))
      .rows;
  } catch (error) {
    console.error(
      `⚠️ Error when collecting column names for ${tableName} table`,
      JSON.stringify(error),
    );
    throw new Error(
      `Error when collecting column names for ${tableName} table`,
    );
  }

  console.info(
    `✅ Returning ${columnNames.length} column names for ${tableName} table`,
  );
  console.debug(`🐛 ${JSON.stringify(columnNames)}`);
  return columnNames.map((column) => column.column_name);
};

export const loadCsv = async <T = CsvRecord>(
  filePath: string,
): Promise<T[]> => {
  const csvStr = fs.readFileSync(filePath, "utf-8");

  return new Promise<T[]>((resolve, reject) => {
    parse(csvStr, { columns: true, skip_empty_lines: true }, (err, records) => {
      if (err) reject(err);
      else resolve(records as T[]);
    });
  });
};

export const seedingRequired = async (dbClient: Pool, tableName: string) => {
  const countRes = await runDbQuery(dbClient, rowCountQuery(tableName));
  console.debug(`🐛 ${tableName} table has ${countRes.rows[0]?.count} rows`);

  if (parseInt(countRes.rows[0]?.count, 10)) {
    console.info(`ℹ️ No seeding required for ${tableName} table`);
    return false;
  }
  console.info(`ℹ️ Seeding required for ${tableName} table`);
  return true;
};

export const seedTable = async <T extends CsvRecord>(
  client: Pool,
  batchSize: number,
  { tableName, csvFile, columns }: SeedConfig,
) => {
  if (!(await seedingRequired(client, tableName))) {
    return;
  }

  let records: CsvRecord[];
  try {
    console.info(`ℹ️ Loading csv data file ${csvFile}`);
    records = await loadCsv<T>(join(__dirname, csvFile));
  } catch (error) {
    console.error(`⚠️ Error when loading ${csvFile}`, JSON.stringify(error));
    throw new Error(`Error when loading ${csvFile}`);
  }

  console.info(`ℹ️ Seeding ${records.length} rows into ${tableName} table`);
  try {
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);

      const values: (string | number | null | undefined)[] = [];
      const placeholders: string[] = [];

      batch.forEach((record, index) => {
        const baseIndex = index * columns.length;

        placeholders.push(
          `(${columns.map((_, colIndex) => `$${baseIndex + colIndex + 1}`).join(", ")})`,
        );

        columns.forEach((col) => {
          let value = record[col];
          if (value === "") {
            value = col === "name" ? "UNKNOWN" : undefined;
          }
          values.push(value);
        });
      });

      await runDbQuery(
        client,
        insertQuery(tableName, columns, placeholders),
        values,
      );
    }
  } catch (error) {
    console.error(
      `⚠️ Error when seeding ${tableName} table`,
      JSON.stringify(error),
    );
    throw new Error(`Error when seeding ${tableName} table`);
  }

  console.log(`✅ Seeded ${tableName} table successfully`);
};
