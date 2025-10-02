import { Pool } from "pg";
import { SecretsManager } from "aws-sdk";
import { getColumnNames, runDbQuery, seedTable } from "./db-util";
import { Acquisition, Company } from "./db-types";
import {
  buildAcquisitionsTableQuery,
  buildCompaniesTableQuery,
  buildIndexQueryArray,
} from "./query-builders";

let dbClient: Pool;

export const getDbCredentials = async () => {
  console.info("ℹ️ Getting DB credentials");
  if (process.env.DB_SECRET_ARN) {
    console.info("ℹ️ Getting credentials from secrets manager");

    try {
      const secretsManager = new SecretsManager({
        region: process.env.AWS_REGION || "us-east-1",
      });

      const secret = await secretsManager
        .getSecretValue({ SecretId: process.env.DB_SECRET_ARN! })
        .promise();

      console.info("ℹ️ Parsing secrets manager response");
      const { username, password } = JSON.parse(secret.SecretString!);

      console.info("✅ Returning credentials from secrets manager");
      return {
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT || 5432),
        user: username,
        password: password,
        database: process.env.DB_NAME,
        ssl: {
          rejectUnauthorized: false,
        },
      };
    } catch (error) {
      console.error(
        "⚠️ Error received when getting db credentials",
        JSON.stringify(error),
      );
      throw new Error("Problem retrieving DB credentials from secrets manager");
    }
  }

  console.info("✅ Returning credentials from local env vars");
  return {
    user:
      process.env.DB_USER ??
      (() => {
        throw new Error("DB_USER missing");
      })(),
    password:
      process.env.DB_PASSWORD ??
      (() => {
        throw new Error("DB_PASSWORD missing");
      })(),
    host:
      process.env.DB_HOST ??
      (() => {
        throw new Error("DB_HOST missing");
      })(),
    port: Number(process.env.DB_PORT || 5432),
    database:
      process.env.DB_NAME ??
      (() => {
        throw new Error("DB_NAME missing");
      })(),
  };
};

export const waitForDb = async (
  dbClient: Pool,
  retries = 5,
  delay = 2000,
): Promise<void> => {
  for (let i = 0; i < retries; i++) {
    try {
      await runDbQuery(dbClient, "SELECT 1");
      console.log("✅ Connected to Postgres");
      return;
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.log(
        `⏳ DB not ready (${err.code}), retrying in ${delay}ms... (${i + 1}/${retries})`,
      );
      await new Promise((res) => setTimeout(res, delay));
    }
  }
  throw new Error("⚠️ Could not connect to Postgres after retries");
};

export const getPool = async (): Promise<Pool> => {
  if (!dbClient) {
    console.info("ℹ️ No postgres pool exists - creating new Pool");

    const dbCredentials = await getDbCredentials();
    console.debug(
      `🐛 Using DB host: ${dbCredentials.host}, database: ${dbCredentials.database})`,
    );

    dbClient = new Pool(dbCredentials);
    await waitForDb(dbClient);
  }
  console.info("✅ Returning postgres pool");
  return dbClient;
};

export const initDb = async () => {
  const dbClient = await getPool();

  try {
    console.info("ℹ️ Creating acquisitions table");
    await runDbQuery(dbClient, buildAcquisitionsTableQuery());

    console.info("ℹ️ Creating companies table");
    await runDbQuery(dbClient, buildCompaniesTableQuery());

    // create indexes
    console.info("ℹ️ Creating indexes for acquisitions table");
    const indexQueries: string[] = buildIndexQueryArray();
    for (const query of indexQueries) {
      console.debug("🐛 Creating index: ", query);
      await runDbQuery(dbClient, query);
    }
  } catch (error) {
    console.error("⚠️ Error when creating tables", JSON.stringify(error));
    throw new Error("Error when creating tables");
  }

  try {
    // seed DB tables
    const batchSize = 500;
    const acquisitionColumns = await getColumnNames(dbClient, "acquisitions");
    const companiesColumns = await getColumnNames(dbClient, "companies");

    await seedTable<Acquisition>(dbClient, batchSize, {
      tableName: "acquisitions",
      csvFile: "data/acquisitions-data.csv",
      columns: acquisitionColumns,
    });

    await seedTable<Company>(dbClient, batchSize, {
      tableName: "companies",
      csvFile: "data/companies-data.csv",
      columns: companiesColumns,
    });
  } catch (error) {
    console.error("⚠️ Error when seeding tables", JSON.stringify(error));
    throw error;
  }
};

// only use this in tests
export const __resetPool = () => {
  dbClient = undefined as unknown as Pool;
};
