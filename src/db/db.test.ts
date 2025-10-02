import AWS from "aws-sdk";
import * as db from "./db";
import * as dbUtil from "./db-util";
import {
  __resetPool,
  getDbCredentials,
  getPool,
  initDb,
  waitForDb,
} from "./db";
import { Pool } from "pg";

describe("db", () => {
  describe("getDbCredentials", () => {
    const setUpLocalConfig = () => {
      // set up env vars
      process.env.DB_USER = "localTestUser";
      process.env.DB_PASSWORD = "localTestPassword";
      process.env.DB_HOST = "localTestHost";
      process.env.DB_PORT = "1234";
      process.env.DB_NAME = "localTestDbName";
    };

    const setUpDeployedConfig = () => {
      // set up env vars
      process.env.DB_SECRET_ARN = "deployed.secret.arn";
      process.env.DB_HOST = "deployedTestHost";
      process.env.DB_PORT = "9876";
      process.env.DB_NAME = "deployedTestDbName";
    };

    let mockGetSecretValue;
    beforeEach(async () => {
      // ensure clean env
      jest.clearAllMocks();
      delete process.env.DB_USER;
      delete process.env.DB_PASSWORD;
      delete process.env.DB_HOST;
      delete process.env.DB_PORT;
      delete process.env.DB_NAM;

      // set up mock response
      mockGetSecretValue = jest.fn().mockReturnValueOnce({
        promise: jest.fn().mockResolvedValueOnce({
          SecretString:
            '{"username": "deployedTestUser", "password": "deployedTestPassword"}',
        }),
      });
      // Types are not required for our mock
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (AWS.SecretsManager as any) = jest.fn().mockImplementation(() => ({
        getSecretValue: mockGetSecretValue,
      }));
    });

    it("should get local credentials when process.env.DB_SECRET_ARN not available", async () => {
      setUpLocalConfig();

      const localCredentials = await getDbCredentials();

      expect(localCredentials.user).toBe("localTestUser");
      expect(localCredentials.password).toBe("localTestPassword");
      expect(localCredentials.host).toBe("localTestHost");
      expect(localCredentials.port).toBe(1234);
      expect(localCredentials.database).toBe("localTestDbName");
    });

    it("should throw error if DB_USER missing", async () => {
      setUpLocalConfig();
      delete process.env.DB_USER;

      try {
        await getDbCredentials();
      } catch (error) {
        expect(error.message).toBe("DB_USER missing");
      }
      expect.assertions(1);
    });

    it("should throw error if DB_PASSWORD missing", async () => {
      setUpLocalConfig();
      delete process.env.DB_PASSWORD;

      try {
        await getDbCredentials();
      } catch (error) {
        expect(error.message).toBe("DB_PASSWORD missing");
      }
      expect.assertions(1);
    });

    it("should throw error if DB_HOST missing", async () => {
      setUpLocalConfig();
      delete process.env.DB_HOST;

      try {
        await getDbCredentials();
      } catch (error) {
        expect(error.message).toBe("DB_HOST missing");
      }
      expect.assertions(1);
    });

    it("should throw error if DB_NAME missing", async () => {
      setUpLocalConfig();
      delete process.env.DB_NAME;

      try {
        await getDbCredentials();
      } catch (error) {
        expect(error.message).toBe("DB_NAME missing");
      }
      expect.assertions(1);
    });

    it("should call secrets manager when process.env.DB_SECRET_ARN is available", async () => {
      setUpDeployedConfig();

      const localCredentials = await getDbCredentials();

      expect(mockGetSecretValue).toHaveBeenCalledTimes(1);
      expect(mockGetSecretValue).toHaveBeenCalledWith({
        SecretId: "deployed.secret.arn",
      });

      expect(localCredentials.user).toBe("deployedTestUser");
      expect(localCredentials.password).toBe("deployedTestPassword");
      expect(localCredentials.host).toBe("deployedTestHost");
      expect(localCredentials.port).toBe(9876);
      expect(localCredentials.database).toBe("deployedTestDbName");
    });

    it("should throw an error if secrets manager errors", async () => {
      setUpDeployedConfig();

      // override mock response with an error
      mockGetSecretValue = jest.fn().mockReturnValueOnce({
        promise: jest.fn().mockRejectedValueOnce(new Error("ITS A SECRET")),
      });

      try {
        await getDbCredentials();
      } catch (error) {
        expect(error.message).toBe(
          "Problem retrieving DB credentials from secrets manager",
        );
      }
      expect.assertions(1);
    });
  });

  describe("getPool", () => {
    const mockDbCredentials = {
      host: "testHost",
      port: 1234,
      user: "testUsername",
      password: "testPassword",
      database: "testDbName",
    };
    let poolSpy: jest.SpyInstance;
    beforeEach(() => {
      jest.clearAllMocks();
      __resetPool();

      jest
        .spyOn(db, "getDbCredentials")
        .mockResolvedValueOnce(mockDbCredentials);

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      poolSpy = jest.spyOn(require("pg"), "Pool").mockImplementation(() => {
        return {
          query: jest.fn().mockResolvedValue({ rows: [] }),
          end: jest.fn(),
        } as unknown as Pool;
      });
    });

    it("should create a new pool if none exists", async () => {
      await getPool();

      expect(poolSpy).toHaveBeenCalledTimes(1);
      expect(poolSpy).toHaveBeenCalledWith(mockDbCredentials);
    });

    it("should only create a new pool once", async () => {
      await getPool();
      await getPool();

      expect(poolSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe("initDb", () => {
    const mockDbCredentials = {
      host: "testHost",
      port: 1234,
      user: "testUsername",
      password: "testPassword",
      database: "testDbName",
    };

    let poolSpy: jest.SpyInstance;
    let getColumnNamesSpy: jest.SpyInstance;
    let seedTableSpy: jest.SpyInstance;
    let mockClient: Pool;

    beforeEach(() => {
      jest.clearAllMocks();
      __resetPool();

      mockClient = {
        query: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            rows: [{}],
          });
        }),
      } as unknown as Pool;

      // eslint-disable-next-line @typescript-eslint/no-require-imports
      poolSpy = jest.spyOn(require("pg"), "Pool").mockImplementation(() => {
        return mockClient as unknown as Pool;
      });

      jest
        .spyOn(db, "getDbCredentials")
        .mockResolvedValueOnce(mockDbCredentials);

      getColumnNamesSpy = jest
        .spyOn(dbUtil, "getColumnNames")
        .mockResolvedValue(["id", "name"]);

      seedTableSpy = jest.spyOn(dbUtil, "seedTable").mockImplementation();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should call getPool once", async () => {
      await initDb();

      expect(poolSpy).toHaveBeenCalledTimes(1);
    });

    it("should call mockClient.query eight times", async () => {
      await initDb();

      expect(mockClient.query).toHaveBeenCalledTimes(9);
      // checking db connection
      expect(mockClient.query).toHaveBeenNthCalledWith(1, `SELECT 1`);
      expect(mockClient.query).toHaveBeenNthCalledWith(
        2,
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
      `,
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        3,
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
      `,
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        4,
        `CREATE INDEX IF NOT EXISTS idx_acquisitions_acquired_at ON acquisitions(acquired_at);`,
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        5,
        `CREATE INDEX IF NOT EXISTS idx_acquisitions_price_amount ON acquisitions(price_amount);`,
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        6,
        `CREATE INDEX IF NOT EXISTS idx_acquisitions_term_code ON acquisitions(term_code);`,
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        7,
        `CREATE INDEX IF NOT EXISTS idx_acquisitions_currency ON acquisitions(price_currency_code);`,
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        8,
        `CREATE INDEX IF NOT EXISTS idx_acquisitions_acquiring_object_id ON acquisitions(acquiring_object_id);`,
      );
      expect(mockClient.query).toHaveBeenNthCalledWith(
        9,
        `CREATE INDEX IF NOT EXISTS idx_acquisitions_acquired_object_id ON acquisitions(acquired_object_id);`,
      );
    });

    it("should call getColumnNames twice", async () => {
      await initDb();

      expect(getColumnNamesSpy).toHaveBeenCalledTimes(2);
      expect(getColumnNamesSpy).toHaveBeenNthCalledWith(
        1,
        mockClient,
        "acquisitions",
      );
      expect(getColumnNamesSpy).toHaveBeenNthCalledWith(
        2,
        mockClient,
        "companies",
      );
    });

    it("should call seedTable twice", async () => {
      await initDb();

      expect(seedTableSpy).toHaveBeenCalledTimes(2);
      expect(seedTableSpy).toHaveBeenNthCalledWith(1, mockClient, 500, {
        tableName: "acquisitions",
        csvFile: "data/acquisitions-data.csv",
        columns: ["id", "name"],
      });
      expect(seedTableSpy).toHaveBeenNthCalledWith(2, mockClient, 500, {
        tableName: "companies",
        csvFile: "data/companies-data.csv",
        columns: ["id", "name"],
      });
    });
  });

  describe("waitForDb", () => {
    it("should retry and eventually throw if pool.query fails", async () => {
      const poolMock = {
        query: jest.fn().mockRejectedValue(new Error("DB not ready")),
      } as unknown as Pool;

      try {
        await waitForDb(poolMock, 2, 1);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toMatch(/Could not connect/);
      }
      expect(poolMock.query).toHaveBeenCalledTimes(2);
    });
  });
});
